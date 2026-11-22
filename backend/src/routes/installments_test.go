package routes

import (
	"backend/src/models"
	"backend/src/repositories"
	"context"
	"os"
	"testing"
)

func TestInstallmentsPostgres(t *testing.T) {
	d, exec := checkoutTestDB(t)
	ctx := context.Background()
	migration := func(dir string) string {
		b, e := os.ReadFile("../../migrations/000053_checkout_installments." + dir + ".sql")
		if e != nil {
			t.Fatal(e)
		}
		return string(b)
	}
	exec("INSERT INTO checkout_orders(user_id,request_key,address,payment_method,total_cents) VALUES(1,'legacy-installment','{}','card',1234)")
	exec(migration("down"))
	exec(migration("up"))
	var legacy models.CheckoutOrder
	legacy, e := (repositories.CheckoutRepository{DB: d}).Get(ctx, 1, 1)
	if e != nil || legacy.Installments != nil || legacy.Total != 1234 {
		t.Fatal("legacy changed", e)
	}
	exec("UPDATE products SET price=10.01;UPDATE shipping_ranges SET price_cents=1290")
	n := 6
	input := models.CheckoutRequest{RequestKey: "installment-checkout", Address: coveredCheckoutAddress(), PaymentMethod: "card", Installments: &n, ExpectedTotalCents: 2291}
	repo := repositories.CheckoutRepository{DB: d}
	o, e := repo.Create(ctx, 1, input)
	if e != nil {
		t.Fatal(e)
	}
	if o.Installments == nil || *o.Installments != 6 || len(o.InstallmentAmounts) != 6 {
		t.Fatal("missing snapshot")
	}
	var sum models.Money
	for _, v := range o.InstallmentAmounts {
		sum += v
	}
	if sum != o.Total || o.Total != 2291 {
		t.Fatal("monetary mismatch")
	}
	two := 2
	input.Installments = &two
	again, e := repo.Create(ctx, 1, input)
	if e != nil || again.ID != o.ID || *again.Installments != 6 {
		t.Fatal("retry changed plan", e)
	}
	detail, e := repo.GetOrderDetails(ctx, 1, o.ID)
	if e != nil || *detail.Installments != 6 {
		t.Fatal("history", e)
	}
	cancelled, _, e := repo.CancelOrder(ctx, 1, o.ID, models.CancellationReason{ReasonCode: "changed_mind"})
	if e != nil || *cancelled.Installments != 6 || cancelled.Total != 2291 {
		t.Fatal("cancel lost plan", e)
	}
	if _, e = d.Exec("UPDATE checkout_orders SET installments=7 WHERE id=2"); e == nil {
		t.Fatal("constraint bypass")
	}
	if _, e = d.Exec(migration("down")); e == nil {
		t.Fatal("unsafe rollback allowed")
	}
}
