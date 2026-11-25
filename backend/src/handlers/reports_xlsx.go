package handlers

import (
	"archive/zip"
	"bytes"
	"encoding/csv"
	"fmt"
	"html"
	"io"
	"strconv"
	"strings"
)

func buildReportXLSX(content []byte) ([]byte, error) {
	reader := csv.NewReader(strings.NewReader(strings.TrimPrefix(string(content), "\ufeff")))
	reader.Comma = ';'
	rows, err := reader.ReadAll()
	if err != nil {
		return nil, err
	}
	if len(rows) == 0 {
		return nil, fmt.Errorf("empty export")
	}
	var sheet strings.Builder
	sheet.WriteString(`<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>`)
	for i, h := range rows[0] {
		width := 20
		if strings.Contains(h, "Produto") || strings.Contains(h, "Cliente") || strings.Contains(h, "Categoria") {
			width = 42
		}
		fmt.Fprintf(&sheet, `<col min="%d" max="%d" width="%d" customWidth="1"/>`, i+1, i+1, width)
	}
	sheet.WriteString(`</cols><sheetData>`)
	for i, row := range rows {
		fmt.Fprintf(&sheet, `<row r="%d">`, i+1)
		for j, value := range row {
			col := string(rune('A' + j))
			cell := fmt.Sprintf("%s%d", col, i+1)
			h := rows[0][j]
			numeric := strings.Contains(h, "(R$)") || strings.Contains(h, "(%)") || strings.Contains(h, "Unidades") || h == "Itens" || h == "Disponível" || h == "Pedidos aprovados"
			number := strings.ReplaceAll(value, ",", ".")
			_, parse := strconv.ParseFloat(number, 64)
			if i > 0 && numeric && parse == nil {
				style := 0
				if strings.Contains(h, "(%)") {
					style = 3
					value, _ := strconv.ParseFloat(number, 64)
					number = strconv.FormatFloat(value/100, 'f', -1, 64)
				}
				if strings.Contains(h, "(R$)") {
					style = 2
				}
				fmt.Fprintf(&sheet, `<c r="%s" s="%d"><v>%s</v></c>`, cell, style, number)
			} else {
				style := 0
				if i == 0 {
					style = 1
				}
				fmt.Fprintf(&sheet, `<c r="%s" s="%d" t="inlineStr"><is><t>%s</t></is></c>`, cell, style, html.EscapeString(value))
			}
		}
		sheet.WriteString(`</row>`)
	}
	fmt.Fprintf(&sheet, `</sheetData><autoFilter ref="A1:%s%d"/></worksheet>`, string(rune('A'+len(rows[0])-1)), len(rows))
	files := map[string]string{
		"[Content_Types].xml":        `<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>`,
		"_rels/.rels":                `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`,
		"xl/workbook.xml":            `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Relatório" sheetId="1" r:id="rId1"/></sheets></workbook>`,
		"xl/_rels/workbook.xml.rels": `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
		"xl/styles.xml":              `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="&quot;R$&quot; #,##0.00"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF3D4836"/><bgColor indexed="64"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" applyFont="1" applyFill="1"/><xf numFmtId="164" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/><xf numFmtId="10" fontId="0" fillId="0" borderId="0" applyNumberFormat="1"/></cellXfs></styleSheet>`,
		"xl/worksheets/sheet1.xml":   sheet.String()}
	var buffer bytes.Buffer
	z := zip.NewWriter(&buffer)
	for name, text := range files {
		w, e := z.Create(name)
		if e != nil {
			return nil, e
		}
		if _, e = io.WriteString(w, text); e != nil {
			return nil, e
		}
	}
	if err = z.Close(); err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}
