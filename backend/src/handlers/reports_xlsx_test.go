package handlers

import (
	"archive/zip"
	"backend/src/models"
	"bytes"
	"io"
	"strings"
	"testing"
)

func TestFinalReportSpreadsheet(t *testing.T) {
	csv, e := buildReportCSV("products", []models.ReportRow{{ID: 1, Name: "=malicioso;ação", SKU: "BX-001", Units: 2, RevenueCents: 57270, Share: 25}})
	if e != nil {
		t.Fatal(e)
	}
	if !bytes.HasPrefix(csv, []byte{239, 187, 191}) || !strings.Contains(string(csv), "572,70") {
		t.Fatal("CSV encoding/money")
	}
	x, e := buildReportXLSX(csv)
	if e != nil {
		t.Fatal(e)
	}
	z, e := zip.NewReader(bytes.NewReader(x), int64(len(x)))
	if e != nil {
		t.Fatal(e)
	}
	files := map[string]string{}
	for _, f := range z.File {
		r, e := f.Open()
		if e != nil {
			t.Fatal(e)
		}
		b, e := io.ReadAll(r)
		r.Close()
		if e != nil {
			t.Fatal(e)
		}
		files[f.Name] = string(b)
	}
	sheet := files["xl/worksheets/sheet1.xml"]
	for _, v := range []string{`<autoFilter`, `state="frozen"`, `<v>572.70</v>`, `t="inlineStr"`} {
		if !strings.Contains(sheet, v) {
			t.Fatal("missing spreadsheet feature", v)
		}
	}
	if strings.Contains(sheet, "<f>") {
		t.Fatal("formula injection")
	}
	if len(files) != 6 {
		t.Fatal("invalid workbook package")
	}
}
