package routes

import (
	"backend/src/models"
	"backend/src/repositories"
	"context"
	"errors"
	"os"
	"testing"
)

func TestOrderShippingSnapshotPostgres(t *testing.T) {
	d, exec := checkoutTestDB(t)
	ctx := context.Background()
	r := repositories.CheckoutRepository{DB: d}
	exec("UPDATE shipping_ranges SET price_cents=1290,min_days=1,max_days=2;INSERT INTO promotions VALUES(1,'active',now()-interval '1 day',now()+interval '1 day');INSERT INTO promotion_products VALUES(1,1,8)")
	input := models.CheckoutRequest{Address: coveredCheckoutAddress(), RequestKey: "paid-shipping-snapshot", PaymentMethod: "pix", ExpectedTotalCents: 2090}
	wrong := input
	wrong.ExpectedTotalCents = 800
	if _, e := r.Create(ctx, 1, wrong); !errors.Is(e, repositories.ErrCheckoutConflict) {
		t.Fatal("client cannot omit freight", e)
	}
	o, e := r.Create(ctx, 1, input)
	if e != nil {
		t.Fatal(e)
	}
	if o.Total != 2090 || o.Shipping == nil || *o.Shipping != 1290 || o.Discount == nil || *o.Discount != 200 || *o.ProductsSubtotal != 1000 || *o.ShippingMinDays != 1 || *o.ShippingMaxDays != 2 || *o.ShippingMethod != "delivery" {
		t.Fatalf("wrong snapshot %+v", o)
	}
	exec("UPDATE shipping_ranges SET price_cents=9999;UPDATE products SET price=99")
	repeated, e := r.Create(ctx, 1, input)
	if e != nil || repeated.ID != o.ID || repeated.Total != 2090 || *repeated.Shipping != 1290 {
		t.Fatal("retry must preserve historical amount", e)
	}
	detail, e := r.GetOrderDetails(ctx, 1, o.ID)
	if e != nil || *detail.Shipping != 1290 || detail.Items[0].UnitPrice != 800 {
		t.Fatal("historical detail", e)
	}
	cancelled, changed, e := r.CancelOrder(ctx, 1, o.ID, models.CancellationReason{ReasonCode: "changed_mind"})
	if e != nil || !changed || cancelled.Total != 2090 || *cancelled.Shipping != 1290 {
		t.Fatal("cancel preserves financial history", e)
	}
	var stock int
	if e = d.QueryRow("SELECT quantity FROM products WHERE id=1").Scan(&stock); e != nil || stock != 1 {
		t.Fatal("restock", e, stock)
	}
	down, e := os.ReadFile("../../migrations/000051_order_shipping.down.sql")
	if e != nil {
		t.Fatal(e)
	}
	if _, e = d.Exec(string(down)); e == nil {
		t.Fatal("rollback must not discard snapshots")
	}
}
func TestShippingPRSeedPostgres(t *testing.T) {
	d, exec := checkoutTestDB(t)
	ctx := context.Background()
	exec("DELETE FROM shipping_ranges")
	conn, e := d.Conn(ctx)
	if e != nil {
		t.Fatal(e)
	}
	defer conn.Close()
	seed, e := os.ReadFile("../../../db/seeds/shipping-pr-20261121.sql")
	if e != nil {
		t.Fatal(e)
	}
	for range 2 {
		if _, e = conn.ExecContext(ctx, string(seed)); e != nil {
			t.Fatal(e)
		}
	}
	var count int
	if e = conn.QueryRowContext(ctx, "SELECT count(*) FROM shipping_ranges").Scan(&count); e != nil || count != 11 {
		t.Fatal("seed must be idempotent", e, count)
	}
	for _, c := range []struct{ cep, price, min, max int }{{87502100, 1290, 1, 2}, {87400004, 1690, 2, 3}, {87480000, 1690, 2, 3}, {87485000, 1690, 2, 3}, {87535000, 1690, 2, 3}, {87538000, 1690, 2, 3}, {87550002, 1990, 3, 4}, {87560000, 1990, 3, 4}, {87200001, 2490, 3, 5}, {87701000, 2490, 3, 5}, {87065200, 2990, 4, 6}} {
		q, e := repositories.QuoteShipping(ctx, conn, c.cep)
		if e != nil || q.PriceCents != c.price || q.MinDays != c.min || q.MaxDays != c.max {
			t.Fatal("city quote", c.cep, q, e)
		}
	}
	if _, e = repositories.QuoteShipping(ctx, conn, 87110000); e == nil {
		t.Fatal("Sarandi must not be covered")
	}
	if _, e = conn.ExecContext(ctx, "UPDATE shipping_ranges SET price_cents=1 WHERE start_cep=87500001"); e != nil {
		t.Fatal(e)
	}
	if _, e = conn.ExecContext(ctx, string(seed)); e == nil {
		t.Fatal("conflicting record must interrupt seed")
	}
	conn.ExecContext(ctx, "ROLLBACK")
}
func TestShippingMigrationRollbackPostgres(t *testing.T) {
	d, exec := checkoutTestDB(t)
	exec("INSERT INTO checkout_orders(user_id,request_key,address,payment_method,total_cents) VALUES(1,'legacy','{}','pix',1234)")
	down, e := os.ReadFile("../../migrations/000051_order_shipping.down.sql")
	if e != nil {
		t.Fatal(e)
	}
	exec(string(down))
	up, e := os.ReadFile("../../migrations/000051_order_shipping.up.sql")
	if e != nil {
		t.Fatal(e)
	}
	exec(string(up))
	var total int
	var absent bool
	if e = d.QueryRow("SELECT total_cents,shipping_cents IS NULL FROM checkout_orders WHERE request_key='legacy'").Scan(&total, &absent); e != nil || total != 1234 || !absent {
		t.Fatal("legacy totals must be unchanged", e)
	}
}
