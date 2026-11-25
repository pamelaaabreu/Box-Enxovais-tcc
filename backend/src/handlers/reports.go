package handlers

import (
	"backend/src/models"
	"backend/src/response"
	"context"
	"encoding/csv"
	"errors"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"
	"unicode"
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
	if len(f.Search) > 160 {
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

		w.Header().Set("Cache-Control", "no-store")

		// Valida os filtros recebidos.
		f, err := reportFilter(r, kind)

		if err != nil {
			response.Error(w, 400, err.Error())
			return
		}

		// Impede a exportação do relatório de clientes.
		if export && kind == "customers" {
			response.Error(w, 404, "Exportação indisponível.")
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

		data, err := h.Service.Store.Report(ctx, f)

		if err != nil {
			response.Error(w, 500, "Não foi possível carregar o relatório. Tente novamente.")
			return
		}

		// A consulta comum retorna JSON.
		if !export {
			response.JSON(w, 200, data)
			return
		}

		// Impede exportações acima do limite.
		if data.Total > 10000 {
			response.Error(w, 422, "A exportação permite até 10.000 registros. Refine os filtros.")
			return
		}

		// Configura os cabeçalhos do arquivo CSV.
		w.Header().Set(
			"Content-Type",
			"text/csv; charset=utf-8",
		)

		w.Header().Set(
			"Content-Disposition",
			`attachment; filename="relatorio-`+kind+`.csv"`,
		)

		// Escreve o BOM UTF-8.
		_, _ = w.Write([]byte{0xef, 0xbb, 0xbf})

		writer := csv.NewWriter(w)

		// Define o separador utilizado no CSV.
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

		_ = writer.Write(header)

		loc, _ := time.LoadLocation("America/Sao_Paulo")

		// Percorre os registros recuperados.
		for _, v := range data.Rows {

			var row []string

			switch kind {

			case "sales":

				date, _ := time.Parse(
					time.RFC3339Nano,
					v.CreatedAt,
				)

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
			if writer.Write(row) != nil {
				return
			}
		}

		// Envia os dados restantes armazenados no buffer.
		writer.Flush()
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
