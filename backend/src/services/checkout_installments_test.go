package services

import (
	"backend/src/models"
	"bytes"
	"fmt"
	"html/template"
	"strings"
	"testing"
)

func TestCheckoutInstallmentTemplates(t *testing.T) {
	n := 6
	o := models.CheckoutOrder{ID: 1, Total: 14281, PaymentPlan: models.PaymentPlan{Installments: &n}}
	if e := o.PopulateInstallments(o.Total); e != nil {
		t.Fatal(e)
	}
	for _, name := range []string{"checkout_receipt.html", "order_cancelled.html"} {
		tmpl, e := template.New(name).Funcs(template.FuncMap{"money": func(m models.Money) string { return fmt.Sprintf("R$ %d,%02d", m/100, m%100) }}).ParseFiles("../templates/" + name)
		if e != nil {
			t.Fatal(e)
		}
		var out bytes.Buffer
		if e = tmpl.Execute(&out, struct {
			Name  string
			Order models.CheckoutOrder
		}{"Auditoria", o}); e != nil {
			t.Fatal(e)
		}
		if !strings.Contains(out.String(), "6 parcela(s)") || !strings.Contains(out.String(), "23,81") {
			t.Fatal("missing installment details", name)
		}
	}
}
