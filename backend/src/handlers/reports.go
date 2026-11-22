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

func reportFilter(r *http.Request, kind string) (models.ReportFilter, error) {
	f := models.ReportFilter{Kind: kind, Search: strings.TrimSpace(r.URL.Query().Get("search")), Status: r.URL.Query().Get("status"), Sort: r.URL.Query().Get("sort"), Page: 1, PageSize: 20}
	var err error
	if kind != "sales" && kind != "products" && kind != "customers" && kind != "stock" {
		return f, errors.New("Relatório inválido.")
	}
	if kind != "stock" {
		f.Period, err = dashboardPeriod(r, time.Now())
		if err != nil {
			return f, err
		}
	}
	if len(f.Search) > 160 {
		return f, errors.New("A busca deve ter até 160 caracteres.")
	}
	if f.Status != "" && !((kind == "sales" && (f.Status == "simulated_approved" || f.Status == "cancelled")) || (kind == "stock" && (f.Status == "low" || f.Status == "out" || f.Status == "available"))) {
		return f, errors.New("Status inválido.")
	}
	if f.Sort != "" && f.Sort != "date" && f.Sort != "revenue" && f.Sort != "units" && f.Sort != "name" {
		return f, errors.New("Ordenação inválida.")
	}
	for key, target := range map[string]*int{"page": &f.Page, "pageSize": &f.PageSize} {
		if raw := r.URL.Query().Get(key); raw != "" {
			*target, err = strconv.Atoi(raw)
			if err != nil || *target < 1 || *target > 100000 {
				return f, errors.New("Paginação inválida.")
			}
		}
	}
	if f.PageSize > 100 {
		return f, errors.New("Use até 100 registros por página.")
	}
	return f, nil
}

func (h ProductHandler) Report(kind string, export bool) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		f, err := reportFilter(r, kind)
		if err != nil {
			response.Error(w, 400, err.Error())
			return
		}
		if export && kind == "customers" {
			response.Error(w, 404, "Exportação indisponível.")
			return
		}
		ctx, cancel := context.WithTimeout(r.Context(), 15*time.Second)
		defer cancel()
		if export {
			f.Page = 1
			f.PageSize = 10001
		}
		data, err := h.Service.Store.Report(ctx, f)
		if err != nil {
			response.Error(w, 500, "Não foi possível carregar o relatório. Tente novamente.")
			return
		}
		if !export {
			response.JSON(w, 200, data)
			return
		}
		if data.Total > 10000 {
			response.Error(w, 422, "A exportação permite até 10.000 registros. Refine os filtros.")
			return
		}
		w.Header().Set("Content-Type", "text/csv; charset=utf-8")
		w.Header().Set("Content-Disposition", `attachment; filename="relatorio-`+kind+`.csv"`)
		_, _ = w.Write([]byte{0xef, 0xbb, 0xbf})
		writer := csv.NewWriter(w)
		writer.Comma = ';'
		var header []string
		switch kind {
		case "sales":
			header = []string{"Pedido", "Data (São Paulo)", "Itens", "Total (R$)", "Pagamento demonstrativo", "Status", "Subtotal produtos (R$)", "Descontos (R$)", "Frete (R$)"}
		case "products":
			header = []string{"Produto", "SKU atual", "Categoria atual", "Marca atual", "Unidades vendidas", "Faturamento (R$)", "Participação (%)"}
		case "stock":
			header = []string{"Produto", "SKU", "Variante", "Categoria", "Disponível", "Situação"}
		}
		_ = writer.Write(header)
		loc, _ := time.LoadLocation("America/Sao_Paulo")
		for _, v := range data.Rows {
			var row []string
			switch kind {
			case "sales":
				date, _ := time.Parse(time.RFC3339Nano, v.CreatedAt)
				row = []string{strconv.FormatInt(v.ID, 10), date.In(loc).Format("02/01/2006 15:04"), strconv.FormatInt(v.Units, 10), reportMoney(v.RevenueCents), reportPayment(v.Payment), reportStatus(v.Status), optionalReportMoney(v.ProductsSubtotalCents), optionalReportMoney(v.DiscountCents), optionalReportMoney(v.ShippingCents)}
			case "products":
				row = []string{v.Name, v.SKU, v.Category, v.Brand, strconv.FormatInt(v.Units, 10), reportMoney(v.RevenueCents), strings.ReplaceAll(fmt.Sprintf("%.2f", v.Share), ".", ",")}
			case "stock":
				row = []string{v.Name, v.SKU, v.Variant, v.Category, strconv.FormatInt(v.Units, 10), reportStatus(v.Status)}
			}
			for i := range row {
				row[i] = reportCSVText(row[i])
			}
			if writer.Write(row) != nil {
				return
			}
		}
		writer.Flush()
	}
}
func reportMoney(cents int64) string { return fmt.Sprintf("%d,%02d", cents/100, cents%100) }
func reportCSVText(value string) string {
	v := strings.TrimLeftFunc(value, func(r rune) bool { return unicode.IsSpace(r) || unicode.IsControl(r) || r == '\ufeff' })
	if len(v) > 0 && strings.ContainsRune("=+-@", rune(v[0])) {
		return "'" + value
	}
	return value
}
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

func optionalReportMoney(cents *int64) string {
	if cents == nil {
		return "Não registrado"
	}
	return reportMoney(*cents)
}
