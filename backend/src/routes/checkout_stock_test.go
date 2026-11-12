package routes

import (
	"backend/src/handlers"
	middlewares "backend/src/middleware"
	"backend/src/models"
	"backend/src/repositories"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"
)

func checkoutTestDB(t *testing.T) (*sql.DB, func(string)) {
	t.Helper()
	db, err := openTestDatabase(t)
	if err != nil {
		t.Fatal("test database unavailable")
	}
	t.Cleanup(func() { db.Close() })
	schema := fmt.Sprintf("checkout_test_%d", time.Now().UnixNano())
	exec := func(query string) {
		t.Helper()
		if _, err := db.Exec(query); err != nil {
			t.Fatal(err)
		}
	}
	exec("CREATE SCHEMA " + schema)
	t.Cleanup(func() { db.Exec("DROP SCHEMA " + schema + " CASCADE") })
	db.SetMaxOpenConns(2)
	db.SetMaxIdleConns(2)
	var connections []*sql.Conn
	for range 2 {
		conn, err := db.Conn(context.Background())
		if err != nil {
			t.Fatal(err)
		}
		connections = append(connections, conn)
		if _, err = conn.ExecContext(context.Background(), "SET search_path TO "+schema); err != nil {
			t.Fatal(err)
		}
	}
	for _, conn := range connections {
		conn.Close()
	}
	exec(`CREATE TABLE users(id INTEGER PRIMARY KEY,full_name TEXT NOT NULL DEFAULT 'Cliente',email TEXT NOT NULL DEFAULT 'test@example.com',phone VARCHAR(20), national_id VARCHAR(14) UNIQUE, birth_date DATE);
 CREATE TABLE products(id INTEGER PRIMARY KEY,name TEXT,price NUMERIC,quantity INTEGER NOT NULL CHECK(quantity>=0),status TEXT,updated_at TIMESTAMPTZ);
 CREATE TABLE promotions(id INTEGER PRIMARY KEY,status TEXT,start_date TIMESTAMPTZ,end_date TIMESTAMPTZ);
 CREATE TABLE promotion_products(product_id INTEGER,promotion_id INTEGER,promotional_price NUMERIC);
 CREATE TABLE product_images(id INTEGER PRIMARY KEY,product_id INTEGER,image_path TEXT,is_primary BOOLEAN);
 INSERT INTO users VALUES(1),(2);`)
	for _, name := range []string{"000003_cart.up.sql", "000006_checkout.up.sql", "000007_order_cancellation.up.sql", "000008_order_cancellation_reason.up.sql", "000009_account_addresses.up.sql", "000010_business_phone.up.sql", "000011_user_cnpj.up.sql"} {
		if name == "000010_business_phone.up.sql" {
			exec("UPDATE users SET phone = '+55 (11) 2345-6789' WHERE id = 2")
		}
		migration, err := os.ReadFile("../../migrations/" + name)
		if err != nil {
			t.Fatal(err)
		}
		exec(string(migration))
	}
	exec(`INSERT INTO products VALUES(1,'Produto',10,1,'active',now());
 INSERT INTO carts(user_id) VALUES(1),(2);
 INSERT INTO cart_items(cart_id,product_id,quantity) SELECT id,1,1 FROM carts;`)
	return db, exec
}

func checkoutParallel(a, b func() error) []error {
	start := make(chan struct{})
	result := make([]error, 2)
	var wg sync.WaitGroup
	for i, f := range []func() error{a, b} {
		wg.Add(1)
		go func() { defer wg.Done(); <-start; result[i] = f() }()
	}
	close(start)
	wg.Wait()
	return result
}

func assertCheckoutState(t *testing.T, db *sql.DB, stock, orders, cartItems int) {
	t.Helper()
	var gotStock, gotOrders, gotCartItems int
	err := db.QueryRow("SELECT (SELECT quantity FROM products WHERE id=1),(SELECT count(*) FROM checkout_orders),(SELECT count(*) FROM cart_items)").Scan(&gotStock, &gotOrders, &gotCartItems)
	if err != nil || gotStock != stock || gotOrders != orders || gotCartItems != cartItems {
		t.Fatalf("stock/orders/cart = %d/%d/%d, want %d/%d/%d (%v)", gotStock, gotOrders, gotCartItems, stock, orders, cartItems, err)
	}
}

func TestCheckoutStockPostgres(t *testing.T) {
	for _, scenario := range []string{"last unit", "same key", "insufficient", "rollback"} {
		t.Run(scenario, func(t *testing.T) {
			db, exec := checkoutTestDB(t)
			repo := repositories.CheckoutRepository{DB: db}
			buy := func(user int, key string) error {
				_, err := repo.Create(context.Background(), user, models.CheckoutRequest{RequestKey: key, PaymentMethod: "pix", ExpectedTotalCents: 1000})
				return err
			}
			switch scenario {
			case "last unit":
				r := checkoutParallel(func() error { return buy(1, "first") }, func() error { return buy(2, "second") })
				if !((r[0] == nil && errors.Is(r[1], repositories.ErrCheckoutConflict)) || (r[1] == nil && errors.Is(r[0], repositories.ErrCheckoutConflict))) {
					t.Fatalf("unexpected results: %v", r)
				}
				assertCheckoutState(t, db, 0, 1, 1)
			case "same key":
				for _, err := range checkoutParallel(func() error { return buy(1, "same") }, func() error { return buy(1, "same") }) {
					if err != nil {
						t.Fatal(err)
					}
				}
				assertCheckoutState(t, db, 0, 1, 1)
			case "insufficient":
				exec("UPDATE products SET quantity=0")
				if err := buy(1, "insufficient"); !errors.Is(err, repositories.ErrCheckoutConflict) {
					t.Fatal(err)
				}
				assertCheckoutState(t, db, 0, 0, 2)
			case "rollback":
				exec(`ALTER TABLE carts ADD CONSTRAINT no_checkout_timestamp_change CHECK (updated_at <= '2000-01-01') NOT VALID;`)
				if err := buy(1, "rollback"); err == nil || errors.Is(err, repositories.ErrCheckoutConflict) {
					t.Fatalf("expected database failure, got %v", err)
				}
				assertCheckoutState(t, db, 1, 0, 2)
			}
		})
	}
}
func TestOrderCancellationPostgres(t *testing.T) {
	for _, scenario := range []string{"concurrent and repeated", "historical", "missing product", "failure inserting reason", "failure after restock"} {
		t.Run(scenario, func(t *testing.T) {
			db, exec := checkoutTestDB(t)
			ctx := context.Background()
			repo := repositories.CheckoutRepository{DB: db}
			exec(`INSERT INTO products VALUES(2,'Outro',20,1,'active',now());
     INSERT INTO cart_items(cart_id,product_id,quantity) SELECT id,2,1 FROM carts WHERE user_id=1;`)
			order, err := repo.Create(ctx, 1, models.CheckoutRequest{RequestKey: "test-cancel", PaymentMethod: "pix", ExpectedTotalCents: 3000})
			if err != nil {
				t.Fatal(err)
			}
			if _, _, err := repo.CancelOrder(ctx, 2, order.ID, models.CancellationReason{ReasonCode: "wrong_product"}); !errors.Is(err, sql.ErrNoRows) {
				t.Fatalf("ownership: %v", err)
			}
			before, err := repo.GetOrderDetails(ctx, 1, order.ID)
			if err != nil || !before.CanCancel {
				t.Fatalf("expected eligible order: %v", err)
			}
			switch scenario {
			case "concurrent and repeated":
				changed := make(chan bool, 3)
				cancel := func() error {
					result, applied, err := repo.CancelOrder(ctx, 1, order.ID, models.CancellationReason{ReasonCode: "wrong_product"})
					if err != nil {
						return err
					}
					if result.Cancellation == nil || result.Cancellation.ReasonCode != "wrong_product" || result.Status != "cancelled" || result.CanCancel || result.Total != 3000 || len(result.Items) != 2 || result.Items[0].UnitPrice != 1000 {
						return errors.New("unexpected cancelled order")
					}
					changed <- applied
					return nil
				}
				for _, err := range checkoutParallel(cancel, cancel) {
					if err != nil {
						t.Fatal(err)
					}
				}
				repeated, applied, err := repo.CancelOrder(ctx, 1, order.ID, models.CancellationReason{ReasonCode: "other", ReasonDetails: "Retry"})
				if err != nil || applied || repeated.Cancellation == nil || repeated.Cancellation.ReasonCode != "wrong_product" {
					t.Fatalf("retry overwrote the cancellation reason: %v", err)
				}
				close(changed)
				count := 0
				for applied := range changed {
					if applied {
						count++
					}
				}
				if count != 1 {
					t.Fatalf("applied %d times", count)
				}
				history, err := repo.ListOrders(ctx, 1, 10, 0, models.OrderFilters{})
				if err != nil || len(history) != 1 || history[0].Status != "cancelled" {
					t.Fatalf("history: %v", err)
				}
				assertCheckoutState(t, db, 1, 1, 1)
				var stock int
				if err := db.QueryRow("SELECT quantity FROM products WHERE id=2").Scan(&stock); err != nil || stock != 1 {
					t.Fatalf("second stock %d: %v", stock, err)
				}
			default:
				var want error
				switch scenario {
				case "historical":
					exec("UPDATE checkout_orders SET stock_debited=false")
					want = repositories.ErrOrderNotCancellable
				case "missing product":
					exec("DELETE FROM products WHERE id=2")
					want = repositories.ErrOrderRestock
				case "failure inserting reason":
					exec("ALTER TABLE order_cancellations ADD CONSTRAINT fail_reason CHECK (reason_code <> 'wrong_product')")
				case "failure after restock":
					exec("ALTER TABLE checkout_orders ADD CONSTRAINT fail_cancel CHECK (status <> 'cancelled')")
				}
				if _, changed, err := repo.CancelOrder(ctx, 1, order.ID, models.CancellationReason{ReasonCode: "wrong_product"}); changed || err == nil || (want != nil && !errors.Is(err, want)) {
					t.Fatalf("unexpected error %v", err)
				}
				assertCheckoutState(t, db, 0, 1, 1)
				var reasons int
				if err := db.QueryRow("SELECT count(*) FROM order_cancellations").Scan(&reasons); err != nil || reasons != 0 {
					t.Fatalf("cancellation reason survived rollback: %v", err)
				}
				result, err := repo.GetOrderDetails(ctx, 1, order.ID)
				if err != nil || result.Status != "simulated_approved" || result.Total != 3000 {
					t.Fatalf("order must survive rollback: %v", err)
				}
			}
		})
	}
}
func TestOrderCancellationNotificationPostgres(t *testing.T) {
	db, _ := checkoutTestDB(t)
	repo := repositories.CheckoutRepository{DB: db}
	order, err := repo.Create(context.Background(), 1, models.CheckoutRequest{RequestKey: "test-notify", PaymentMethod: "pix", ExpectedTotalCents: 1000})
	if err != nil {
		t.Fatal(err)
	}
	t.Setenv("JWT_SECRET", "favorites-tests-only")
	notifications := 0
	handler := handlers.OrderHistoryHandler{Store: repo, NotifyCancelled: func(user int, details models.OrderDetails) {
		notifications++
		// Read through a separate transaction, as the mail service would.
		committed, err := repo.GetOrderDetails(context.Background(), user, details.ID)
		if err != nil || committed.Status != "cancelled" {
			t.Fatalf("notification before commit: %v", err)
		}
		// Simulate a notifier that returns without sending mail.
	}}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /orders/{id}/cancel", middlewares.AuthMiddleware(handler.ServeHTTP))
	call := func(user int, id int64, want int, body string) {
		t.Helper()
		r := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/orders/%d/cancel", id), strings.NewReader(body))
		if user != 0 {
			r.Header.Set("Authorization", "Bearer "+favoriteTestToken(t, user))
		}
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		if w.Code != want {
			t.Fatalf("status %d, want %d", w.Code, want)
		}
	}
	valid := "{\"reasonCode\":\"wrong_product\"}"
	call(0, order.ID, 401, valid)
	call(2, order.ID, 404, valid)
	call(1, order.ID+1, 404, valid)
	for _, invalid := range []string{
		"{}", "{\"reasonCode\":\"arbitrary\"}", "{\"reasonCode\":\"other\",\"reasonDetails\":\"  \"}",
		fmt.Sprintf("{\"reasonCode\":\"other\",\"reasonDetails\":%q}", strings.Repeat("a", 501)),
	} {
		call(1, order.ID, 400, invalid)
	}
	call(1, order.ID, 200, valid)
	for _, reason := range []string{"changed_mind", "wrong_address", "duplicate_order"} {
		call(1, order.ID, 200, fmt.Sprintf("{\"reasonCode\":%q}", reason))
	}
	call(1, order.ID, 200, "{\"reasonCode\":\"other\",\"reasonDetails\":\"Detalhe de teste\"}")
	if notifications != 1 {
		t.Fatalf("notified %d times", notifications)
	}
	assertCheckoutState(t, db, 1, 1, 1)
}
func TestReorderPostgres(t *testing.T) {
	db, exec := checkoutTestDB(t)
	ctx := context.Background()
	checkout := repositories.CheckoutRepository{DB: db}
	cart := repositories.CartRepository{DB: db}
	exec(`INSERT INTO products VALUES(2,'Outro',20,2,'active',now());
 INSERT INTO cart_items(cart_id,product_id,quantity) SELECT id,2,1 FROM carts WHERE user_id=1;`)
	order, err := checkout.Create(ctx, 1, models.CheckoutRequest{RequestKey: "reorder", PaymentMethod: "pix", ExpectedTotalCents: 3000})
	if err != nil {
		t.Fatal(err)
	}
	if _, err := cart.Apply(ctx, 2, "reorder", order.ID, 0); !errors.Is(err, repositories.ErrCartOrderNotFound) {
		t.Fatalf("ownership: %v", err)
	}
	exec("UPDATE products SET quantity=3,price=15 WHERE id=1; UPDATE products SET status='inactive' WHERE id=2")
	if _, err := cart.Apply(ctx, 1, "reorder", order.ID, 0); !errors.Is(err, repositories.ErrCartProduct) {
		t.Fatalf("inactive: %v", err)
	}
	current, err := cart.Apply(ctx, 1, "get", 0, 0)
	if err != nil || current.TotalItems != 0 {
		t.Fatalf("partial mutation: %v", err)
	}
	exec("DELETE FROM products WHERE id=2")
	if _, err := cart.Apply(ctx, 1, "reorder", order.ID, 0); !errors.Is(err, repositories.ErrCartProduct) {
		t.Fatalf("deleted: %v", err)
	}
	exec("INSERT INTO products VALUES(2,'Outro',25,0,'active',now())")
	if _, err := cart.Apply(ctx, 1, "reorder", order.ID, 0); !errors.Is(err, repositories.ErrCartQuantity) {
		t.Fatalf("stock: %v", err)
	}
	exec("UPDATE products SET quantity=2 WHERE id=2; UPDATE checkout_orders SET status='cancelled'")
	if _, err := cart.Apply(ctx, 1, "add", 1, 1); err != nil {
		t.Fatal(err)
	}
	current, err = cart.Apply(ctx, 1, "reorder", order.ID, 0)
	if err != nil || current.TotalItems != 3 || current.Total != 5500 {
		t.Fatalf("reorder total/items: %v/%v (%v)", current.Total, current.TotalItems, err)
	}
}
func TestOrderCancellationAtAnyAgePostgres(t *testing.T) {
	for _, scenario := range []string{"15 minutes", "60 minutes", "24 hours", "1 year"} {
		t.Run(scenario, func(t *testing.T) {
			db, exec := checkoutTestDB(t)
			ctx := context.Background()
			repo := repositories.CheckoutRepository{DB: db}
			order, err := repo.Create(ctx, 1, models.CheckoutRequest{RequestKey: "deadline", PaymentMethod: "pix", ExpectedTotalCents: 1000})
			if err != nil {
				t.Fatal(err)
			}
			exec("UPDATE checkout_orders SET created_at=clock_timestamp()-interval '" + scenario + "'")
			details, err := repo.GetOrderDetails(ctx, 1, order.ID)
			if err != nil || !details.CanCancel || details.Status != "simulated_approved" {
				t.Fatalf("expected approved order eligible for cancellation: %+v (%v)", details, err)
			}
			_, changed, err := repo.CancelOrder(ctx, 1, order.ID, models.CancellationReason{ReasonCode: "wrong_product"})
			if err != nil || !changed {
				t.Fatalf("cancel: %v", err)
			}
			assertCheckoutState(t, db, 1, 1, 1)
		})
	}
}

func TestAccountAddressesAndCheckoutPostgres(t *testing.T) {
	db, _ := checkoutTestDB(t)
	ctx := context.Background()
	account := repositories.AccountRepository{DB: db}
	checkout := repositories.CheckoutRepository{DB: db}
	name, profilePhone := "Pessoa Teste", "11912345678"
	profile, err := account.UpdateProfile(ctx, 1, models.AccountProfilePatch{Name: &name, Phone: &profilePhone})
	if err != nil || profile.Email != "test@example.com" {
		t.Fatalf("profile update failed: %v", err)
	}
	profile, err = account.Profile(ctx, 1)
	if err != nil || profile.Name != "Pessoa Teste" || profile.Phone != "11912345678" {
		t.Fatalf("profile read failed: %v", err)
	}
	address := models.UserAddress{Label: "Casa", ShippingAddress: models.ShippingAddress{
		Recipient: "Pessoa Teste", ZipCode: "01001-000", Street: "Rua Teste",
		Number: "8", Neighborhood: "Centro", City: "São Paulo", State: "SP",
	}}
	first, err := account.SaveAddress(ctx, 1, 0, address)
	if err != nil || !first.IsDefault {
		t.Fatalf("first address: %v", err)
	}
	second, err := account.SaveAddress(ctx, 1, 0, address)
	if err != nil || second.IsDefault {
		t.Fatalf("second address: %v", err)
	}
	for _, err := range checkoutParallel(
		func() error { return account.SetDefaultAddress(ctx, 1, first.ID) },
		func() error { return account.SetDefaultAddress(ctx, 1, second.ID) },
	) {
		if err != nil {
			t.Fatal(err)
		}
	}
	if err := account.SetDefaultAddress(ctx, 2, first.ID); !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("default ownership: %v", err)
	}
	addresses, err := account.Addresses(ctx, 1)
	if err != nil || len(addresses) != 2 || !addresses[0].IsDefault || addresses[1].IsDefault {
		t.Fatalf("default address consistency: %v", err)
	}
	t.Setenv("JWT_SECRET", "favorites-tests-only")
	mux := http.NewServeMux()
	handler := middlewares.AuthMiddleware(handlers.AccountHandler{Store: account}.ServeHTTP)
	mux.HandleFunc("PUT /me/addresses/{id}/default", handler)
	mux.HandleFunc("GET /me/addresses", handler)
	call := func(method, path string, user int, want int) *httptest.ResponseRecorder {
		t.Helper()
		request := httptest.NewRequest(method, path, nil)
		request.Header.Set("Authorization", "Bearer "+favoriteTestToken(t, user))
		result := httptest.NewRecorder()
		mux.ServeHTTP(result, request)
		if result.Code != want {
			t.Fatalf("%s %s: status %d, want %d", method, path, result.Code, want)
		}
		return result
	}
	path := fmt.Sprintf("/me/addresses/%d/default", second.ID)
	call(http.MethodPut, path, 2, http.StatusNotFound)
	call(http.MethodPut, path, 1, http.StatusOK)
	reloaded := call(http.MethodGet, "/me/addresses", 1, http.StatusOK)
	var response struct{ Data []models.UserAddress }
	if err := json.Unmarshal(reloaded.Body.Bytes(), &response); err != nil {
		t.Fatal(err)
	}
	addresses = response.Data
	if len(addresses) != 2 || addresses[0].ID != second.ID || !addresses[0].IsDefault || addresses[1].IsDefault {
		t.Fatal("default address did not persist after reloading")
	}
	input := models.CheckoutRequest{
		RequestKey: "checkout-address", AddressID: first.ID, PaymentMethod: "pix",
		ExpectedTotalCents: 1000, ContactPhone: "11987654321",
	}
	if _, err := checkout.Create(ctx, 2, input); !errors.Is(err, repositories.ErrCheckoutAddress) {
		t.Fatalf("address ownership at checkout: %v", err)
	}
	order, err := checkout.Create(ctx, 1, input)
	if err != nil {
		t.Fatal(err)
	}
	address.Number = "99"
	if _, err = account.SaveAddress(ctx, 1, first.ID, address); err != nil {
		t.Fatal(err)
	}
	var phone string
	if err = db.QueryRow("SELECT contact_phone FROM checkout_orders WHERE id=$1", order.ID).Scan(&phone); err != nil || phone != input.ContactPhone {
		t.Fatalf("contact snapshot: %v", err)
	}
	details, err := checkout.GetOrderDetails(ctx, 1, order.ID)
	if err != nil || details.Address.Number != "8" {
		t.Fatalf("address snapshot: %v", err)
	}
	retry, err := checkout.Create(ctx, 1, input)
	if err != nil || retry.ID != order.ID || len(retry.ReceiptItems) != 0 {
		t.Fatalf("checkout retry: %v", err)
	}
	if err := account.DeleteAddress(ctx, 1, addresses[0].ID); err != nil {
		t.Fatal(err)
	}
	addresses, err = account.Addresses(ctx, 1)
	if err != nil || len(addresses) != 1 || !addresses[0].IsDefault {
		t.Fatalf("default promotion: %v", err)
	}

	secondary, err := account.SaveAddress(ctx, 1, 0, address)
	if err != nil || secondary.IsDefault {
		t.Fatalf("create secondary address: %v", err)
	}
	if err := account.DeleteAddress(ctx, 2, secondary.ID); !errors.Is(err, sql.ErrNoRows) {
		t.Fatalf("delete ownership: %v", err)
	}
	if err := account.DeleteAddress(ctx, 1, secondary.ID); err != nil {
		t.Fatal(err)
	}
	reloadedAddresses, err := account.Addresses(ctx, 1)
	if err != nil || len(reloadedAddresses) != 1 || reloadedAddresses[0].ID != addresses[0].ID || !reloadedAddresses[0].IsDefault {
		t.Fatalf("deleting secondary address changed the default: %v", err)
	}
	if err := account.DeleteAddress(ctx, 1, addresses[0].ID); err != nil {
		t.Fatal(err)
	}
	reloadedAddresses, err = account.Addresses(ctx, 1)
	if err != nil || len(reloadedAddresses) != 0 {
		t.Fatalf("expected no addresses after deleting the last one: %v", err)
	}
}

func TestAccountProfilePatchPostgres(t *testing.T) {
	db, _ := checkoutTestDB(t)
	t.Setenv("JWT_SECRET", "favorites-tests-only")
	mux := http.NewServeMux()
	handler := handlers.AccountHandler{Store: repositories.AccountRepository{DB: db}}
	mux.HandleFunc("GET /me", middlewares.AuthMiddleware(handler.ServeHTTP))
	mux.HandleFunc("PATCH /me", middlewares.AuthMiddleware(handler.ServeHTTP))
	call := func(method string, user int, body string, want int) string {
		t.Helper()
		r := httptest.NewRequest(method, "/me", strings.NewReader(body))
		r.Header.Set("Authorization", "Bearer "+favoriteTestToken(t, user))
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		if w.Code != want {
			t.Fatalf("status = %d, want %d", w.Code, want)
		}
		return w.Body.String()
	}
	profileJSON := call("GET", 1, "", 200)
	if strings.Contains(profileJSON, "\"cnpj\"") || strings.Contains(profileJSON, "\"businessPhone\"") {
		t.Fatal("profile exposed removed fields")
	}
	call("GET", 1, "", 200)
	var legacyMobile sql.NullString
	var legacyBusiness string
	if err := db.QueryRow("SELECT phone, business_phone FROM users WHERE id=2").Scan(&legacyMobile, &legacyBusiness); err != nil || legacyMobile.Valid || legacyBusiness != "+55 (11) 2345-6789" {
		t.Fatal("migration did not preserve the legacy landline")
	}
	for _, body := range []string{
		`{"nationalId":"111.111.111-11"}`,
		`{"birthDate":"2001-02-29"}`,
		`{"birthDate":"2999-01-01"}`,
		`{"role":"admin"}`,
	} {
		call("PATCH", 1, body, 400)
	}
	call("PATCH", 1, `{"nationalId":"529.982.247-25","birthDate":"2000-02-29"}`, 200)
	call("PATCH", 1, `{"phone":"(11) 91234-5678"}`, 200)
	call("PATCH", 2, `{"nationalId":"52998224725"}`, 409)
	result := call("PATCH", 1, `{"name":"Pessoa Teste"}`, 200)
	for _, expected := range []string{"52998224725", "2000-02-29", "Pessoa Teste", "11912345678"} {
		if !strings.Contains(result, expected) {
			t.Fatal("patch discarded profile data")
		}
	}
	call("PATCH", 1, `{"birthDate":"2004-06-15"}`, 200)
	var persisted string
	if err := db.QueryRow("SELECT birth_date::text FROM users WHERE id=1").Scan(&persisted); err != nil || persisted != "2004-06-15" {
		t.Fatal("birth date was not persisted")
	}
	if !strings.Contains(call("GET", 1, "", 200), "2004-06-15") {
		t.Fatal("profile reload did not preserve the birth date")
	}
	call("PATCH", 1, `{"nationalId":"","birthDate":""}`, 200)
	var cleared bool
	if err := db.QueryRow("SELECT national_id IS NULL AND birth_date IS NULL FROM users WHERE id=1").Scan(&cleared); err != nil || !cleared {
		t.Fatal("optional fields were not cleared")
	}
}
