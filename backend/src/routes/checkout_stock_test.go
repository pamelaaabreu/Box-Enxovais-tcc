package routes

import (
	"backend/src/handlers"
	middlewares "backend/src/middleware"
	"backend/src/models"
	"backend/src/repositories"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
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
	exec(`CREATE TABLE users(id INTEGER PRIMARY KEY);
 CREATE TABLE products(id INTEGER PRIMARY KEY,name TEXT,price NUMERIC,quantity INTEGER NOT NULL CHECK(quantity>=0),status TEXT,updated_at TIMESTAMPTZ);
 CREATE TABLE promotions(id INTEGER PRIMARY KEY,status TEXT,start_date TIMESTAMPTZ,end_date TIMESTAMPTZ);
 CREATE TABLE promotion_products(product_id INTEGER,promotion_id INTEGER,promotional_price NUMERIC);
 CREATE TABLE product_images(id INTEGER PRIMARY KEY,product_id INTEGER,image_path TEXT,is_primary BOOLEAN);
 INSERT INTO users VALUES(1),(2);`)
	for _, name := range []string{"000003_cart.up.sql", "000006_checkout.up.sql", "000007_order_cancellation.up.sql"} {
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
	for _, scenario := range []string{"concurrent and repeated", "historical", "missing product", "failure after restock"} {
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
			if _, _, err := repo.CancelOrder(ctx, 2, order.ID); !errors.Is(err, sql.ErrNoRows) {
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
					result, applied, err := repo.CancelOrder(ctx, 1, order.ID)
					if err != nil {
						return err
					}
					if result.Status != "cancelled" || result.CanCancel || result.Total != 3000 || len(result.Items) != 2 || result.Items[0].UnitPrice != 1000 {
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
				if err := cancel(); err != nil {
					t.Fatal(err)
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
				case "failure after restock":
					exec("ALTER TABLE checkout_orders ADD CONSTRAINT fail_cancel CHECK (status <> 'cancelled')")
				}
				if _, changed, err := repo.CancelOrder(ctx, 1, order.ID); changed || err == nil || (want != nil && !errors.Is(err, want)) {
					t.Fatalf("unexpected error %v", err)
				}
				assertCheckoutState(t, db, 0, 1, 1)
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
	call := func(user int, id int64, want int) {
		t.Helper()
		r := httptest.NewRequest(http.MethodPost, fmt.Sprintf("/orders/%d/cancel", id), nil)
		if user != 0 {
			r.Header.Set("Authorization", "Bearer "+favoriteTestToken(t, user))
		}
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		if w.Code != want {
			t.Fatalf("status %d, want %d", w.Code, want)
		}
	}
	call(0, order.ID, 401)
	call(2, order.ID, 404)
	call(1, order.ID+1, 404)
	call(1, order.ID, 200)
	call(1, order.ID, 200)
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
