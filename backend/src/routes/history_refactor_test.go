package routes

import (
	"backend/src/models"
	"backend/src/repositories"
	"context"
	"errors"
	"strings"
	"testing"
	"time"
)

func TestHistoryRefactorPostgres(t *testing.T) {
	db, exec := checkoutTestDB(t)
	ctx := context.Background()
	repo := repositories.CheckoutRepository{DB: db}
	exec(`INSERT INTO checkout_orders(user_id,request_key,address,payment_method,total_cents,created_at,status) VALUES(1,'one','{}','pix',300,'2026-01-01T12:00Z','simulated_approved'),(1,'two','{}','pix',100,'2026-01-02T12:00Z','cancelled'),(2,'private','{}','pix',100,'2026-01-03T12:00Z','simulated_approved');
 INSERT INTO checkout_orders(id,user_id,request_key,address,payment_method,total_cents,created_at) OVERRIDING SYSTEM VALUE VALUES(9223372036854775807,1,'max','{}','pix',100,'2026-01-04T12:00Z');
 INSERT INTO product_variants(id,product_id,size,price,quantity) VALUES(31,1,'Queen',10,1),(32,1,'Casal',10,1);
 INSERT INTO checkout_order_items(order_id,product_id,name,quantity,unit_price_cents,variant_id) VALUES(1,1,'Cama 100%_Natural',1,100,31),(1,1,'Outro',2,100,NULL),(2,1,'Cancelado',1,100,NULL),(3,1,'Privado',1,100,NULL),(9223372036854775807,1,'Limite',1,100,NULL);
 INSERT INTO product_images(id,product_id,image_path,is_primary,variant_id) VALUES(1,1,'general.jpg',true,NULL),(2,1,'wrong.jpg',true,32),(3,1,'queen.jpg',true,31)`)
	for term, want := range map[string]int{"": 3, "#1": 1, "9223372036854775807": 1, "9223372036854775808": 0, strings.Repeat("9", 100): 0, "%": 1, "_": 1, "100%_Natural": 1, "Privado": 0, "' OR 1=1 --": 0} {
		t.Run(term, func(t *testing.T) {
			filter := models.OrderFilters{Search: term}
			page, total, err := repo.ListOrdersPage(ctx, 1, 20, 0, filter)
			if err != nil || total != want || len(page) != want {
				t.Fatalf("list/count %d/%d want %d: %v", len(page), total, want, err)
			}
			count, err := repo.CountOrders(ctx, 1, filter)
			if err != nil || count != want {
				t.Fatal("count mismatch", err)
			}
		})
	}
	from := time.Date(2026, 1, 2, 0, 0, 0, 0, time.UTC)
	until := from.AddDate(0, 0, 1)
	page, total, err := repo.ListOrdersPage(ctx, 1, 10, 0, models.OrderFilters{From: &from, Until: &until, CancelledOnly: true})
	if err != nil || total != 1 || len(page) != 1 || page[0].ID != 2 {
		t.Fatal("period/status", err)
	}
	page, total, err = repo.ListOrdersPage(ctx, 1, 1, 0, models.OrderFilters{Oldest: true})
	if err != nil || total != 3 || len(page) != 1 || len(page[0].Items) != 2 || page[0].Items[0].Image != "queen.jpg" || page[0].Items[1].Image != "general.jpg" {
		t.Fatal("page/images", err)
	}
	exec(`UPDATE products SET status='inactive',name='Changed',price=999`)
	details, err := repo.GetOrderDetails(ctx, 1, 1)
	if err != nil || details.Items[0].ProductID != 0 || details.Items[0].Name != "Cama 100%_Natural" || details.Items[0].UnitPrice != 100 {
		t.Fatal("history changed", err)
	}
	exec(`UPDATE checkout_order_items SET quantity=2,unit_price_cents=9223372036854775807 WHERE order_id=1`)
	if _, err = repo.GetOrderDetails(ctx, 1, 1); err == nil {
		t.Fatal("subtotal overflow accepted")
	}
}
func TestCancellationRefactorPostgres(t *testing.T) {
	for _, scenario := range []string{"authorized", "simple overflow", "variant overflow", "missing variant", "zero quantity", "partial rollback"} {
		t.Run(scenario, func(t *testing.T) {
			db, exec := checkoutTestDB(t)
			ctx := context.Background()
			repo := repositories.CheckoutRepository{DB: db}
			exec(`ALTER TABLE users ADD COLUMN role text DEFAULT 'customer'`)
			input := models.CheckoutRequest{RequestKey: "cancel-refactor", Address: coveredCheckoutAddress(), PaymentMethod: "pix", ExpectedTotalCents: 1000}
			if scenario == "variant overflow" || scenario == "missing variant" {
				exec(`INSERT INTO product_variants(id,product_id,size,price,quantity) VALUES(31,1,'Queen',10,1);UPDATE cart_items SET variant_id=31 WHERE cart_id=(SELECT id FROM carts WHERE user_id=1)`)
			}
			if scenario == "partial rollback" {
				exec(`INSERT INTO products(id,name,price,quantity,status) VALUES(2,'Second',10,1,'active');INSERT INTO cart_items(cart_id,product_id,quantity) SELECT id,2,1 FROM carts WHERE user_id=1`)
				input.ExpectedTotalCents = 2000
			}
			order, err := repo.Create(ctx, 1, input)
			if err != nil {
				t.Fatal(err)
			}
			reason := models.CancellationReason{ReasonCode: "changed_mind"}
			if scenario == "authorized" {
				if _, changed, err := repo.CancelAdminOrder(ctx, 2, order.ID, reason); changed || !errors.Is(err, repositories.ErrOrderForbidden) {
					t.Fatal("non-admin bypass", err)
				}
				if _, changed, err := repo.CancelOrder(ctx, 0, order.ID, reason); changed || !errors.Is(err, repositories.ErrOrderForbidden) {
					t.Fatal("zero owner bypass", err)
				}
				exec(`UPDATE users SET role='admin' WHERE id=2`)
				for _, err := range checkoutParallel(func() error { _, _, err := repo.CancelOrder(ctx, 1, order.ID, reason); return err }, func() error { _, _, err := repo.CancelAdminOrder(ctx, 2, order.ID, reason); return err }) {
					if err != nil {
						t.Fatal(err)
					}
				}
				result, changed, err := repo.CancelAdminOrder(ctx, 2, order.ID, models.CancellationReason{ReasonCode: "other", ReasonDetails: "new"})
				if err != nil || changed || result.OwnerID != 1 || result.Cancellation == nil || result.Cancellation.ReasonCode != "changed_mind" {
					t.Fatal("retry changed reason", err)
				}
				var stock int
				var debited bool
				if err = db.QueryRow(`SELECT (SELECT quantity FROM products WHERE id=1),(SELECT stock_debited FROM checkout_orders WHERE id=1)`).Scan(&stock, &debited); err != nil || stock != 1 || !debited {
					t.Fatal("stock historical flag", err)
				}
				exec(`UPDATE users SET role='customer' WHERE id=2`)
				if _, _, err = repo.CancelAdminOrder(ctx, 2, order.ID, reason); !errors.Is(err, repositories.ErrOrderForbidden) {
					t.Fatal("revoked admin", err)
				}
				return
			}
			switch scenario {
			case "simple overflow":
				exec(`UPDATE products SET quantity=2147483647 WHERE id=1`)
			case "variant overflow":
				exec(`UPDATE product_variants SET quantity=2147483647 WHERE id=31`)
			case "missing variant":
				exec(`ALTER TABLE checkout_order_items DROP CONSTRAINT checkout_order_items_variant_product_fk;DELETE FROM product_variants WHERE id=31`)
			case "zero quantity":
				exec(`ALTER TABLE checkout_order_items DROP CONSTRAINT checkout_order_items_quantity_check;UPDATE checkout_order_items SET quantity=0`)
			case "partial rollback":
				exec(`UPDATE products SET quantity=2147483647 WHERE id=2`)
			}
			if _, changed, err := repo.CancelOrder(ctx, 1, order.ID, reason); changed || !errors.Is(err, repositories.ErrOrderRestock) {
				t.Fatal("invalid restock", err)
			}
			var status string
			var count int
			var stock int
			if err = db.QueryRow(`SELECT (SELECT status FROM checkout_orders WHERE id=1),(SELECT count(*) FROM order_cancellations),(SELECT quantity FROM products WHERE id=1)`).Scan(&status, &count, &stock); err != nil || status != models.OrderStatusApproved || count != 0 || (scenario == "partial rollback" && stock != 0) {
				t.Fatal("rollback incomplete", err)
			}
		})
	}
}
