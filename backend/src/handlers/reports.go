package handlers

import (
	"backend/src/models"
	"backend/src/response"
	"bytes"
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode"
	"unicode/utf8"
)

// Interpreta e valida os filtros do relatório.
func reportFilter(r *http.Request, kind string) (models.ReportFilter, error) {

	f := models.ReportFilter{
		Kind:     kind,
		Search:   strings.TrimSpace(r.URL.Query().Get("search")),
		Status:   r.URL.Query().Get("status"),
		Sort:     r.URL.Query().Get("sort"),
		Page:     1,
		PageSize: 20,
	}

	var err error

	// Valida os tipos de relatórios disponíveis.
	if kind != "sales" &&
		kind != "products" &&
		kind != "customers" &&
		kind != "stock" {

		return f, errors.New("Relatório inválido.")
	}

	// O relatório de estoque não utiliza período,
	// pois representa a situação atual.
	if kind != "stock" {

		f.Period, err = dashboardPeriod(r, time.Now())

		if err != nil {
			return f, err
		}
	}

	// Limita o tamanho da pesquisa.
	if utf8.RuneCountInString(f.Search) > 160 || strings.ContainsRune(f.Search, 0) {
		return f, errors.New("A busca deve ter até 160 caracteres.")
	}

	// Valida os status conforme o tipo de relatório.
	if f.Status != "" &&
		!((kind == "sales" &&
			(f.Status == "simulated_approved" ||
				f.Status == "cancelled")) ||
			(kind == "stock" &&
				(f.Status == "low" ||
					f.Status == "out" ||
					f.Status == "available"))) {

		return f, errors.New("Status inválido.")
	}

	// Valida as ordenações permitidas.
	if f.Sort != "" &&
		f.Sort != "date" &&
		f.Sort != "revenue" &&
		f.Sort != "units" &&
		f.Sort != "name" {

		return f, errors.New("Ordenação inválida.")
	}

	// Processa os parâmetros de paginação.
	for key, target := range map[string]*int{
		"page":     &f.Page,
		"pageSize": &f.PageSize,
	} {

		if raw := r.URL.Query().Get(key); raw != "" {

			*target, err = strconv.Atoi(raw)

			if err != nil ||
				*target < 1 ||
				*target > 100000 {

				return f, errors.New("Paginação inválida.")
			}
		}
	}

	if f.PageSize > 100 {
		return f, errors.New("Use até 100 registros por página.")
	}

	return f, nil
}

// Cria um handler para consultar ou exportar determinado relatório.
func (h ProductHandler) Report(kind string, export bool) http.HandlerFunc {

	return func(w http.ResponseWriter, r *http.Request) {
		if !allowMethods(w, r, http.MethodGet) {
			return
		}

		w.Header().Set("Cache-Control", "no-store")

		// Valida os filtros recebidos.
		f, err := reportFilter(r, kind)

		if err != nil {
			response.Error(w, http.StatusBadRequest, err.Error())
			return
		}

		// Define um timeout para a consulta.
		ctx, cancel := context.WithTimeout(
			r.Context(),
			15*time.Second,
		)

		defer cancel()

		// Na exportação, recupera até 10.001 registros.
		if export {
			f.Page = 1
			f.PageSize = 10001
		}

		data, err := h.Service.Report(ctx, f)

		if err != nil {
			response.Error(w, http.StatusInternalServerError, "Não foi possível carregar o relatório. Tente novamente.")
			return
		}

		// A consulta comum retorna JSON.
		if !export {
			response.JSON(w, http.StatusOK, data)
			return
		}

		// Impede exportações acima do limite.
		if data.Total > 10000 {
			response.Error(w, http.StatusUnprocessableEntity, "A exportação permite até 10.000 registros. Refine os filtros.")
			return
		}

		format := r.URL.Query().Get("format")
		if format != "" && format != "csv" && format != "xlsx" {
			response.Error(w, 400, "Formato de exportação inválido.")
			return
		}
		content, err := buildReportCSV(kind, data.Rows)
		if err == nil && format == "xlsx" {
			content, err = buildReportXLSX(content)
		}
		if err != nil {
			log.Println("Falha ao preparar CSV")
			response.Error(w, http.StatusInternalServerError, "Não foi possível preparar o relatório.")
			return
		}
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		extension := "csv"
		if format == "xlsx" {
			extension = "xlsx"
			w.Header().Set("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
		}
		names := map[string]string{"sales": "vendas", "products": "produtos", "customers": "clientes", "stock": "estoque"}
		w.Header().Set("Content-Disposition", `attachment; filename="relatorio-`+names[kind]+`.`+extension+`"`)
		if err := writeReportCSV(w, content); err != nil {
			log.Println("Falha na transmissão do CSV")
		}

	}
}

// Formata valores monetários em centavos.
func reportMoney(cents int64) string {
	return fmt.Sprintf("%d,%02d", cents/100, cents%100)
}

// Protege células contra interpretação como fórmulas.
func reportCSVText(value string) string {

	v := strings.TrimLeftFunc(value, func(r rune) bool {
		return unicode.IsSpace(r) ||
			unicode.IsControl(r) ||
			r == '\ufeff'
	})

	if len(v) > 0 &&
		strings.ContainsRune("=+-@", rune(v[0])) {

		return "'" + value
	}

	return value
}

// Traduz as formas de pagamento.
func reportPayment(s string) string {

	switch s {

	case "pix":
		return "Pix"

	case "card":
		return "Cartão"

	case "boleto":
		return "Boleto"
	}

	return s
}

// Traduz os status dos pedidos e estoques.
func reportStatus(s string) string {

	switch s {

	case "simulated_approved":
		return "Aprovado em simulação"

	case "cancelled":
		return "Cancelado"

	case "low":
		return "Estoque baixo"

	case "out":
		return "Esgotado"

	case "available":
		return "Em estoque"
	}

	return s
}

// Diferencia valores monetários ausentes de valores iguais a zero.
func optionalReportMoney(cents *int64) string {

	if cents == nil {
		return "Não registrado"
	}

	return reportMoney(*cents)
}

func buildReportCSV(kind string, rows []models.ReportRow) ([]byte, error) {
	var buffer bytes.Buffer
	if _, err := buffer.Write([]byte{0xef, 0xbb, 0xbf}); err != nil {
		return nil, err
	}
	writer := csv.NewWriter(&buffer)
	writer.Comma = ';'
	var header []string

	// Define as colunas de acordo com o relatório.
	switch kind {

	case "sales":
		header = []string{
			"Pedido",
			"Data (São Paulo)",
			"Itens",
			"Total (R$)",
			"Pagamento demonstrativo",
			"Status",
			"Subtotal produtos (R$)",
			"Descontos (R$)",
			"Frete (R$)",
		}

	case "products":
		header = []string{
			"Produto",
			"SKU atual",
			"Categoria atual",
			"Marca atual",
			"Unidades vendidas",
			"Faturamento (R$)",
			"Participação (%)",
		}

	case "customers":
		header = []string{"Cliente", "E-mail", "Pedidos aprovados", "Total gasto (R$)", "Última compra (São Paulo)"}
	case "stock":
		header = []string{
			"Produto",
			"SKU",
			"Variante",
			"Categoria",
			"Disponível",
			"Situação",
		}
	}

	if err := writer.Write(header); err != nil {
		return nil, err
	}

	loc, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		return nil, err
	}

	// Percorre os registros recuperados.
	for _, v := range rows {

		var row []string

		switch kind {

		case "sales":

			date, err := time.Parse(
				time.RFC3339Nano,
				v.CreatedAt,
			)

			if err != nil {
				return nil, errors.New("Data do relatório inválida")
			}
			row = []string{
				strconv.FormatInt(v.ID, 10),
				date.In(loc).Format("02/01/2006 15:04"),
				strconv.FormatInt(v.Units, 10),
				reportMoney(v.RevenueCents),
				reportPayment(v.Payment),
				reportStatus(v.Status),
				optionalReportMoney(v.ProductsSubtotalCents),
				optionalReportMoney(v.DiscountCents),
				optionalReportMoney(v.ShippingCents),
			}

		case "products":

			row = []string{
				v.Name,
				v.SKU,
				v.Category,
				v.Brand,
				strconv.FormatInt(v.Units, 10),
				reportMoney(v.RevenueCents),
				strings.ReplaceAll(
					fmt.Sprintf("%.2f", v.Share),
					".",
					",",
				),
			}

		case "customers":
			last := ""
			if v.LastPurchase != "" {
				date, e := time.Parse(time.RFC3339Nano, v.LastPurchase)
				if e != nil {
					return nil, e
				}
				last = date.In(loc).Format("02/01/2006 15:04")
			}
			row = []string{v.Name, v.Email, strconv.FormatInt(v.Orders, 10), reportMoney(v.RevenueCents), last}
		case "stock":

			row = []string{
				v.Name,
				v.SKU,
				v.Variant,
				v.Category,
				strconv.FormatInt(v.Units, 10),
				reportStatus(v.Status),
			}
		}

		// Aplica a proteção contra CSV Injection.
		for i := range row {
			row[i] = reportCSVText(row[i])
		}

		// Escreve o registro no arquivo.
		if err := writer.Write(row); err != nil {
			return nil, err
		}
	}

	// Envia os dados restantes armazenados no buffer.
	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}
func writeReportCSV(w io.Writer, content []byte) error {
	n, err := w.Write(content)
	if err != nil {
		return err
	}
	if n != len(content) {
		return io.ErrShortWrite
	}
	return nil
}
