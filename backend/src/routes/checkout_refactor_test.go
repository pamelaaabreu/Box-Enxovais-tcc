package routes

import (
	"backend/src/handlers"
	"backend/src/models"
	"backend/src/repositories"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/lib/pq"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

func TestCheckoutRefactorRollbackPostgres(t *testing.T) {
	for _, scenario := range []string{"empty", "inactive", "price changed", "invalid variant", "variant required", "item insert error", "item insert skipped", "stock update error", "stock update skipped", "second debit skipped", "cart clear error", "promotion expired", "promotion active", "negative shipping", "negative price", "subtotal overflow", "gross overflow", "variant debit skipped", "duplicate address", "missing coverage", "invalid CEP", "foreign address"} {
		t.Run(scenario, func(t *testing.T) {
			db, exec := checkoutTestDB(t)
			ctx := context.Background()
			repo := repositories.CheckoutRepository{DB: db}
			input := models.CheckoutRequest{RequestKey: "checkout-refactor-001", Address: coveredCheckoutAddress(), PaymentMethod: "pix", ExpectedTotalCents: 1000, SaveAddress: true}
			success := false
			want := repositories.ErrCheckoutConflict
			switch scenario {
			case "empty":
				exec(`DELETE FROM cart_items WHERE cart_id=(SELECT id FROM carts WHERE user_id=1)`)
			case "inactive":
				exec(`UPDATE products SET status='inactive'`)
			case "price changed":
				exec(`UPDATE products SET price=11`)
			case "invalid variant":
				exec(`ALTER TABLE cart_items DROP CONSTRAINT cart_items_variant_product_fk;UPDATE cart_items SET variant_id=999 WHERE cart_id=(SELECT id FROM carts WHERE user_id=1)`)
			case "variant required":
				exec(`INSERT INTO product_variants(id,product_id,size,price,quantity) VALUES(31,1,'Queen',10,1)`)
			case "item insert error", "item insert skipped":
				body := `RAISE EXCEPTION 'isolated item error';`
				if scenario == "item insert skipped" {
					body = `RETURN NULL;`
				}
				exec(`CREATE FUNCTION checkout_item_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN ` + body + ` END $$;CREATE TRIGGER checkout_item_failure BEFORE INSERT ON checkout_order_items FOR EACH ROW EXECUTE FUNCTION checkout_item_failure()`)
				want = nil
			case "stock update error", "stock update skipped", "second debit skipped":
				body := `RETURN NULL;`
				if scenario == "stock update error" {
					body = `RAISE EXCEPTION 'isolated stock error';`
					want = nil
				}
				condition := "true"
				if scenario == "second debit skipped" {
					exec(`INSERT INTO products(id,name,price,quantity,status) VALUES(2,'Segundo',10,1,'active');INSERT INTO cart_items(cart_id,product_id,quantity) SELECT id,2,1 FROM carts WHERE user_id=1`)
					input.ExpectedTotalCents = 2000
					condition = "OLD.id=2"
				}
				exec(`CREATE FUNCTION checkout_stock_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF ` + condition + ` THEN ` + body + ` END IF; RETURN NEW; END $$;CREATE TRIGGER checkout_stock_failure BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION checkout_stock_failure()`)
			case "cart clear error":
				exec(`CREATE FUNCTION checkout_clear_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'isolated clear error';END $$;CREATE TRIGGER checkout_clear_failure BEFORE DELETE ON cart_items FOR EACH ROW EXECUTE FUNCTION checkout_clear_failure()`)
				want = nil
			case "promotion expired", "promotion active":
				until := `now()-interval '1 day'`
				if scenario == "promotion active" {
					until = `now()+interval '1 day'`
					input.ExpectedTotalCents = 800
				}
				exec(`INSERT INTO promotions VALUES(1,'active',now()-interval '2 days',` + until + `);INSERT INTO promotion_products VALUES(1,1,8)`)
				success = true

			case "negative shipping":
				exec(`ALTER TABLE shipping_ranges DROP CONSTRAINT shipping_ranges_price_cents_check;UPDATE shipping_ranges SET price_cents=-1`)
			case "negative price":
				exec(`UPDATE products SET price=-1`)
			case "subtotal overflow", "gross overflow":
				exec(`UPDATE products SET price=46116860184273879.04,quantity=2;UPDATE cart_items SET quantity=2 WHERE cart_id=(SELECT id FROM carts WHERE user_id=1)`)
				if scenario == "gross overflow" {
					exec(`INSERT INTO promotions VALUES(1,'active',now()-interval '1 day',now()+interval '1 day');INSERT INTO promotion_products VALUES(1,1,1)`)
				}
			case "variant debit skipped":
				exec(`INSERT INTO product_variants(id,product_id,size,price,quantity) VALUES(31,1,'Queen',10,1);UPDATE cart_items SET variant_id=31 WHERE cart_id=(SELECT id FROM carts WHERE user_id=1);CREATE FUNCTION skip_variant_debit() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NULL;END $$;CREATE TRIGGER skip_variant_debit BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION skip_variant_debit()`)
			case "duplicate address":
				address := coveredCheckoutAddress()
				address.ZipCode = "01001-000"
				if _, err := (repositories.AccountRepository{DB: db}).SaveAddress(ctx, 1, 0, models.UserAddress{ShippingAddress: address, Label: "Casa"}); err != nil {
					t.Fatal(err)
				}
				success = true
			case "missing coverage":
				exec(`UPDATE shipping_ranges SET active=false`)
				want = repositories.ErrCheckoutDeliveryUnavailable
			case "invalid CEP":
				input.Address.ZipCode = "123"
				want = repositories.ErrCheckoutPostalCode
			case "foreign address":
				saved, err := (repositories.AccountRepository{DB: db}).SaveAddress(ctx, 2, 0, models.UserAddress{ShippingAddress: coveredCheckoutAddress(), Label: "Outro"})
				if err != nil {
					t.Fatal(err)
				}
				input.AddressID = saved.ID
				input.SaveAddress = false
				want = repositories.ErrCheckoutAddress
			}
			var beforeOrders int
			var beforeItems int
			var beforeStock int
			var beforeAddresses int
			if err := db.QueryRow(`SELECT (SELECT count(*) FROM checkout_orders),(SELECT count(*) FROM cart_items),(SELECT quantity FROM products WHERE id=1),(SELECT count(*) FROM user_addresses)`).Scan(&beforeOrders, &beforeItems, &beforeStock, &beforeAddresses); err != nil {
				t.Fatal(err)
			}
			order, err := repo.Create(ctx, 1, input)
			if success {
				if err != nil || len(order.ReceiptItems) != 1 || order.ReceiptItems[0].Subtotal != order.Total {
					t.Fatal("normal checkout/receipt", err)
				}
				if scenario == "duplicate address" {
					var count int
					if err = db.QueryRow(`SELECT count(*) FROM user_addresses WHERE user_id=1`).Scan(&count); err != nil || count != 1 {
						t.Fatal("duplicate address saved", err)
					}
				}
				return
			}
			if err == nil || (want != nil && !errors.Is(err, want)) {
				t.Fatal("expected checkout failure", err)
			}
			var orders int
			var items int
			var stock int
			var addresses int
			if err = db.QueryRow(`SELECT (SELECT count(*) FROM checkout_orders),(SELECT count(*) FROM cart_items),(SELECT quantity FROM products WHERE id=1),(SELECT count(*) FROM user_addresses)`).Scan(&orders, &items, &stock, &addresses); err != nil || orders != beforeOrders || items != beforeItems || stock != beforeStock || addresses != beforeAddresses {
				t.Fatal("transaction not rolled back", err)
			}
		})
	}
}
func TestCheckoutIdempotencyNotificationsPostgres(t *testing.T) {
	db, exec := checkoutTestDB(t)
	exec(`UPDATE products SET quantity=5`)
	ctx := context.Background()
	repo := repositories.CheckoutRepository{DB: db}
	t.Setenv("JWT_SECRET", "favorites-tests-only")
	var notifications atomic.Int32
	mux := http.NewServeMux()
	InitRoutesCheckout(mux, handlers.CheckoutHandler{Store: repo, Notify: func(_ int, order models.CheckoutOrder) {
		notifications.Add(1)
		if len(order.ReceiptItems) != 1 || order.ReceiptItems[0].Subtotal != 1000 {
			t.Error("incomplete financial receipt")
		}
	}})
	installments := 3
	input := models.CheckoutRequest{RequestKey: "checkout-repeat-0001", Address: coveredCheckoutAddress(), PaymentMethod: "card", Installments: &installments, ExpectedTotalCents: 1000}
	send := func(requestBody models.CheckoutRequest) (int64, error) {
		raw, err := json.Marshal(requestBody)
		if err != nil {
			return 0, err
		}
		request := httptest.NewRequest("POST", "/checkout", strings.NewReader(string(raw)))
		request.Header.Set("Authorization", "Bearer "+favoriteTestToken(t, 1))
		recorder := httptest.NewRecorder()
		mux.ServeHTTP(recorder, request)
		if recorder.Code != 200 {
			return 0, fmt.Errorf("HTTP %d", recorder.Code)
		}
		var response struct {
			Data struct {
				ID           int64
				Installments int
			}
		}
		if err = json.Unmarshal(recorder.Body.Bytes(), &response); err != nil {
			return 0, err
		}
		if response.Data.ID <= 0 || response.Data.Installments != 3 {
			return 0, errors.New("wrong idempotent HTTP snapshot")
		}
		return response.Data.ID, nil
	}
	ids := make(chan int64, 2)
	operation := func() error { id, err := send(input); ids <- id; return err }
	for _, err := range checkoutParallel(operation, operation) {
		if err != nil {
			t.Fatal(err)
		}
	}
	firstID := <-ids
	secondID := <-ids
	if firstID != secondID || notifications.Load() != 1 {
		t.Fatal("duplicate order or notification")
	}
	original, err := repo.Get(ctx, 1, firstID)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = (repositories.CartRepository{DB: db}).Apply(ctx, 1, repositories.CartAdd, 1, 2); err != nil {
		t.Fatal(err)
	}
	changed := input
	changed.PaymentMethod = "pix"
	changed.Installments = nil
	changed.ExpectedTotalCents = 99999
	changed.Address.ZipCode = "99999999"
	changed.SaveAddress = true
	if id, err := send(changed); err != nil || id != original.ID || notifications.Load() != 1 {
		t.Fatal("HTTP retry notification", err)
	}
	repeat, err := repo.Create(ctx, 1, changed)
	if err != nil || repeat.ID != original.ID || repeat.Total != original.Total || repeat.Installments == nil || *repeat.Installments != 3 || len(repeat.ReceiptItems) != 0 {
		t.Fatal("original idempotent snapshot not preserved", err)
	}
	state, err := (repositories.CartRepository{DB: db}).Apply(ctx, 1, repositories.CartGet, 0, 0)
	if err != nil || state.TotalItems != 2 {
		t.Fatal("retry cleared newer cart", err)
	}
	if _, err = repo.Get(ctx, 2, original.ID); !errors.Is(err, sql.ErrNoRows) {
		t.Fatal("order owner bypass", err)
	}
	var stock int
	if err = db.QueryRow(`SELECT quantity FROM products WHERE id=1`).Scan(&stock); err != nil || stock != 4 {
		t.Fatal("retry debited stock", err)
	}
}
func TestCheckoutSameTotalCompositionPostgres(t *testing.T) {
	db, exec := checkoutTestDB(t)
	ctx := context.Background()
	repo := repositories.CheckoutRepository{DB: db}
	// O cliente revisou o produto 1; outro fluxo troca por produto 2, de mesmo preço.
	exec(`INSERT INTO products(id,name,price,quantity,status) VALUES(2,'Outro de mesmo preço',10,1,'active');UPDATE cart_items SET product_id=2 WHERE cart_id=(SELECT id FROM carts WHERE user_id=1)`)
	order, err := repo.Create(ctx, 1, models.CheckoutRequest{RequestKey: "composition-same-total", Address: coveredCheckoutAddress(), PaymentMethod: "pix", ExpectedTotalCents: 1000})
	if err != nil || order.ReceiptItems[0].ProductID != 2 {
		t.Fatal("existing contract changed unexpectedly", err)
	}
	// Registra a limitação real, sem fingir que ExpectedTotalCents valida a composição.
}
func TestCheckoutVariantStockAfterLockPostgres(t *testing.T) {
	db, exec := checkoutTestDB(t)
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	exec(`INSERT INTO product_variants(id,product_id,size,price,quantity) VALUES(31,1,'Queen',12.90,0);UPDATE cart_items SET variant_id=31`)
	writer, err := db.BeginTx(ctx, nil)
	if err != nil {
		t.Fatal(err)
	}
	defer writer.Rollback()
	if _, err = writer.ExecContext(ctx, `UPDATE product_variants SET quantity=1 WHERE id=31`); err != nil {
		t.Fatal(err)
	}
	done := make(chan error, 1)
	go func() {
		_, err := (repositories.CheckoutRepository{DB: db}).Create(ctx, 1, models.CheckoutRequest{RequestKey: "variant-restock-wait", Address: coveredCheckoutAddress(), PaymentMethod: "pix", ExpectedTotalCents: 1290})
		done <- err
	}()
	select {
	case err := <-done:
		t.Fatalf("validated stale stock before variant lock: %v", err)
	case <-time.After(100 * time.Millisecond):
	}
	if err = writer.Commit(); err != nil {
		t.Fatal(err)
	}
	if err = <-done; err != nil {
		t.Fatal(err)
	}
	var stock int
	if err = db.QueryRow(`SELECT quantity FROM product_variants WHERE id=31`).Scan(&stock); err != nil || stock != 0 {
		t.Fatal("wrong variant debit", err)
	}
}
func TestCheckoutCancellationLockOrderPostgres(t *testing.T) {
	db, exec := checkoutTestDB(t)
	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()
	exec(`DELETE FROM cart_items;INSERT INTO products(id,name,price,quantity,status) VALUES(2,'Simples',10,2,'active');INSERT INTO product_variants(id,product_id,size,price,quantity) VALUES(31,1,'Queen',10,2);INSERT INTO cart_items(cart_id,product_id,variant_id,quantity) SELECT id,1,31,1 FROM carts;INSERT INTO cart_items(cart_id,product_id,quantity) SELECT id,2,1 FROM carts`)
	repo := repositories.CheckoutRepository{DB: db}
	input := models.CheckoutRequest{RequestKey: "mixed-lock-original", Address: coveredCheckoutAddress(), PaymentMethod: "pix", ExpectedTotalCents: 2000}
	order, err := repo.Create(ctx, 1, input)
	if err != nil {
		t.Fatal(err)
	}
	controllerDB, err := openTestDatabase(t)
	if err != nil {
		t.Fatal(err)
	}
	defer controllerDB.Close()
	controller, err := controllerDB.Conn(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer controller.Close()
	var schema string
	if err = db.QueryRow(`SELECT current_schema()`).Scan(&schema); err != nil {
		t.Fatal(err)
	}
	if _, err = controller.ExecContext(ctx, `SET search_path TO `+pq.QuoteIdentifier(schema)); err != nil {
		t.Fatal(err)
	}
	key := time.Now().UnixNano()%1000000000 + 1
	if _, err = controller.ExecContext(ctx, `SELECT pg_advisory_lock($1)`, key); err != nil {
		t.Fatal(err)
	}
	defer controller.ExecContext(context.Background(), `SELECT pg_advisory_unlock($1)`, key)
	exec(fmt.Sprintf(`CREATE FUNCTION wait_variant_change() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM pg_advisory_xact_lock(%d);RETURN NEW;END $$;CREATE TRIGGER wait_variant_change BEFORE UPDATE ON product_variants FOR EACH ROW EXECUTE FUNCTION wait_variant_change()`, key))
	cancelDone := make(chan error, 1)
	go func() {
		_, _, err := repo.CancelOrder(ctx, 1, order.ID, models.CancellationReason{ReasonCode: "changed_mind"})
		cancelDone <- err
	}()
	ready := false
	deadline := time.Now().Add(5 * time.Second)
	for time.Now().Before(deadline) {
		if err = controller.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM pg_locks WHERE locktype='advisory' AND objid=$1::oid AND NOT granted)`, key).Scan(&ready); err != nil {
			t.Fatal(err)
		}
		if ready {
			break
		}
		time.Sleep(5 * time.Millisecond)
	}
	if !ready {
		t.Fatal("cancellation did not reach synchronization point")
	}
	purchaseDone := make(chan error, 1)
	go func() {
		next := input
		next.RequestKey = "mixed-lock-next"
		_, err := repo.Create(ctx, 2, next)
		purchaseDone <- err
	}()
	select {
	case err := <-purchaseDone:
		t.Fatalf("checkout failed before release: %v", err)
	case <-time.After(100 * time.Millisecond):
	}
	if _, err = controller.ExecContext(ctx, `SELECT pg_advisory_unlock($1)`, key); err != nil {
		t.Fatal(err)
	}
	if err = <-cancelDone; err != nil {
		t.Fatal("cancellation deadlock", err)
	}
	if err = <-purchaseDone; err != nil {
		t.Fatal("checkout deadlock", err)
	}
	var simple int
	var variant int
	if err = db.QueryRow(`SELECT (SELECT quantity FROM products WHERE id=2),(SELECT quantity FROM product_variants WHERE id=31)`).Scan(&simple, &variant); err != nil || simple != 1 || variant != 1 {
		t.Fatal("mixed stock integrity", err)
	}
}
