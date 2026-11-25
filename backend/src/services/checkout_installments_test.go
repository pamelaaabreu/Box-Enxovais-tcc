package services

import (
	"backend/src/models"
	"strings"
	"testing"
)

func TestCheckoutInstallmentTemplates(t *testing.T) {
	for _, n := range []int{1, 4, 6} {
		o := models.CheckoutOrder{ID: 1, Total: 57270, PaymentPlan: models.PaymentPlan{Installments: &n}}
		if e := o.PopulateInstallments(o.Total); e != nil {
			t.Fatal(e)
		}
		for _, cancelled := range []bool{false, true} {
			msg, e := buildOrderEmail("qa@example.invalid", "Cliente QA", o, cancelled, "../templates")
			if e != nil {
				t.Fatal(e)
			}
			_, parts := decodeEmailForTest(t, msg)
			body := parts["text/html"]
			if strings.Contains(body, "parcela(s)") || strings.Contains(body, " · </p>") {
				t.Fatal("incorrect plan grammar")
			}
			if !strings.Contains(body, "Pagamento à vista") && n == 1 {
				t.Fatal("singular plan missing")
			}
			if n == 4 && (!strings.Contains(body, "2x de R$ 143,18") || !strings.Contains(body, "2x de R$ 143,17")) {
				t.Fatal("cents split missing")
			}
			if !strings.Contains(body, "Arial, Helvetica, sans-serif") || !strings.Contains(body, "Georgia") {
				t.Fatal("email typography missing")
			}
		}
	}
}
