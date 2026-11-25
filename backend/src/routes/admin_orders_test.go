package routes

import (
	"backend/src/handlers"
	middlewares "backend/src/middleware"
	"backend/src/models"
	"backend/src/repositories"
	"context"
	"encoding/json"
	"github.com/golang-jwt/jwt/v5"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync/atomic"
	"testing"
	"time"
)

type adminTestPage struct {
	Orders    []struct{ ID int64 }
	Total     int
	Approved  int
	Cancelled int
}
type adminTestDetails struct {
	Total    float64
	Subtotal float64
	Items    []struct {
		UnitPrice float64
		VariantID int64
		Name      string
		SKU       string
	}
	Discount  *float64
	Shipping  *float64
	Address   models.ShippingAddress
	Events    []models.AdminOrderEvent
	CanCancel bool
	Status    string
}

func TestAdminOrdersPostgres(t *testing.T) {
	database, exec := checkoutTestDB(t)
	exec(`ALTER TABLE users ADD COLUMN role text NOT NULL DEFAULT 'customer';ALTER TABLE products ADD COLUMN sku text;ALTER TABLE product_images ADD COLUMN sort_order integer NOT NULL DEFAULT 0;
 UPDATE users SET full_name=CASE id WHEN 1 THEN 'Ana Cliente' ELSE 'Bruno Cliente' END,role=CASE id WHEN 2 THEN 'admin' ELSE 'customer' END;
 UPDATE products SET sku='BX-CAM-001',price=999;
 INSERT INTO product_variants(product_id,size,price,quantity,dimensions) VALUES(1,'Queen',999,4,'240 x 260 cm');
 INSERT INTO checkout_orders(user_id,request_key,address,payment_method,total_cents,created_at,stock_debited)
 SELECT CASE WHEN n=1 THEN 2 ELSE 1 END,'admin-order-'||n,'{"recipient":"Ana","street":"Rua Teste","number":"123","zipCode":"01001000","city":"São Paulo","state":"SP"}'::jsonb,'pix',2500,'2026-01-01'::timestamptz+n*interval '1 day',n<>2 FROM generate_series(1,13)n;
 INSERT INTO checkout_order_items(order_id,product_id,name,quantity,unit_price_cents,variant_id)
 SELECT id,1,'Produto histórico — Queen',2,1250,CASE WHEN id=13 THEN 1 ELSE NULL END FROM checkout_orders;
 UPDATE checkout_orders SET status='cancelled' WHERE id=3;
 INSERT INTO order_cancellations(order_id,reason_code,cancelled_by) VALUES(3,'changed_mind',1);`)
	const secret = "admin-order-test-only"
	t.Setenv("JWT_SECRET", secret)
	var notified atomic.Int32
	mux := http.NewServeMux()
	InitRoutesAdminOrders(mux, handlers.AdminOrdersHandler{Store: repositories.CheckoutRepository{DB: database}, NotifyCancelled: func(user int, _ models.OrderDetails) {
		if user != 1 {
			t.Errorf("notification owner=%d", user)
		}
		notified.Add(1)
	}})
	customer := handlers.OrderHistoryHandler{Store: repositories.CheckoutRepository{DB: database}}
	mux.HandleFunc("GET /orders/{id}", middlewares.AuthMiddleware(customer.ServeHTTP))
	call := func(method, path, role, body string, want int) []byte {
		t.Helper()
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		if role != "" {
			token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, models.Claims{UserID: 2, Role: role, RegisteredClaims: jwt.RegisteredClaims{Issuer: "box-enxovais-api", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Minute))}}).SignedString([]byte(secret))
			if err != nil {
				t.Fatal(err)
			}
			req.Header.Set("Authorization", "Bearer "+token)
		}
		out := httptest.NewRecorder()
		mux.ServeHTTP(out, req)
		if out.Code != want {
			t.Fatalf("%s %s status=%d expected=%d body=%s", method, path, out.Code, want, out.Body.String())
		}
		return out.Body.Bytes()
	}
	list := func(path string) adminTestPage {
		var envelope struct{ Data adminTestPage }
		if err := json.Unmarshal(call("GET", path, "admin", "", 200), &envelope); err != nil {
			t.Fatal(err)
		}
		return envelope.Data
	}
	t.Run("authorization", func(t *testing.T) {
		for _, path := range []string{"/admin/orders", "/admin/orders/13"} {
			call("GET", path, "", "", 401)
			call("GET", path, "customer", "", 403)
		}
		call("POST", "/admin/orders/13/cancel", "customer", `{}`, 403)
		call("GET", "/orders/13", "customer", "", 404)
	})
	t.Run("pagination_and_recent_order", func(t *testing.T) {
		a := list("/admin/orders")
		b := list("/admin/orders?page=2")
		if a.Total != 13 || a.Approved != 12 || a.Cancelled != 1 || len(a.Orders) != 10 || len(b.Orders) != 3 || a.Orders[0].ID != 13 || b.Orders[0].ID != 3 {
			t.Fatalf("pagination unexpected: %+v %+v", a, b)
		}
	})
	t.Run("search_and_filters", func(t *testing.T) {
		for path, want := range map[string]int{"/admin/orders?search=Bruno": 1, "/admin/orders?search=%2313": 1, "/admin/orders?status=cancelled": 1, "/admin/orders?status=simulated_approved": 12, "/admin/orders?dateFrom=2026-01-05&dateTo=2026-01-06": 2, "/admin/orders?search=inexistente": 0} {
			if got := list(path).Total; got != want {
				t.Fatalf("%s total %d want %d", path, got, want)
			}
		}
	})
	t.Run("invalid_requests", func(t *testing.T) {
		for _, path := range []string{"/admin/orders?page=0", "/admin/orders?status=shipped", "/admin/orders?dateFrom=invalid", "/admin/orders?dateFrom=2026-02-01&dateTo=2026-01-01", "/admin/orders?sort=oldest"} {
			call("GET", path, "admin", "", 400)
		}
		call("GET", "/admin/orders/abc", "admin", "", 404)
		call("GET", "/admin/orders/9999", "admin", "", 404)
	})
	t.Run("historical_values_variant_delivery_and_events", func(t *testing.T) {
		var e struct{ Data adminTestDetails }
		json.Unmarshal(call("GET", "/admin/orders/13", "admin", "", 200), &e)
		o := e.Data
		if o.Total != 25 || o.Subtotal != 25 || o.Items[0].UnitPrice != 12.5 || o.Items[0].VariantID != 1 || o.Items[0].Name != "Produto histórico — Queen" || o.Items[0].SKU != "BX-CAM-001" || o.Discount != nil || o.Shipping != nil || o.Address.Recipient != "Ana" || len(o.Events) != 1 || !o.CanCancel {
			t.Fatalf("historical order unexpected: %+v", o)
		}
		call("GET", "/admin/orders/1", "admin", "", 200)
	})
	reason := `{"reasonCode":"other","reasonDetails":"Solicitação administrativa"}`
	t.Run("reason_validation_and_denied_transition", func(t *testing.T) {
		call("POST", "/admin/orders/13/cancel", "admin", `{"reasonCode":"invalid"}`, 400)
		call("POST", "/admin/orders/2/cancel", "admin", reason, 409)
	})
	t.Run("variant_concurrent_idempotent_cancel", func(t *testing.T) {
		repo := repositories.CheckoutRepository{DB: database}
		errs := checkoutParallel(func() error {
			_, _, e := repo.CancelAdminOrder(context.Background(), 2, 13, models.CancellationReason{ReasonCode: "changed_mind"})
			return e
		}, func() error {
			_, _, e := repo.CancelAdminOrder(context.Background(), 2, 13, models.CancellationReason{ReasonCode: "changed_mind"})
			return e
		})
		for _, err := range errs {
			if err != nil {
				t.Fatal(err)
			}
		}
		call("POST", "/admin/orders/13/cancel", "admin", reason, 200)
		var stock, count, actor int
		database.QueryRow("SELECT quantity FROM product_variants WHERE id=1").Scan(&stock)
		database.QueryRow("SELECT count(*),max(cancelled_by) FROM order_cancellations WHERE order_id=13").Scan(&count, &actor)
		if stock != 6 || count != 1 || actor != 2 {
			t.Fatalf("stock=%d cancellation count=%d actor=%d", stock, count, actor)
		}
	})
	t.Run("simple_cancel_owner_and_notify_once", func(t *testing.T) {
		call("POST", "/admin/orders/12/cancel", "admin", reason, 200)
		call("POST", "/admin/orders/12/cancel", "admin", reason, 200)
		var stock int
		database.QueryRow("SELECT quantity FROM products WHERE id=1").Scan(&stock)
		if stock != 3 || notified.Load() != 1 {
			t.Fatalf("stock=%d notification=%d", stock, notified.Load())
		}
		var e struct{ Data adminTestDetails }
		json.Unmarshal(call("GET", "/admin/orders/12", "admin", "", 200), &e)
		if len(e.Data.Events) != 2 || e.Data.CanCancel || e.Data.Status != "cancelled" {
			t.Fatalf("cancel history=%+v", e.Data)
		}
	})
	t.Run("restock_failure_is_atomic", func(t *testing.T) {
		exec(`INSERT INTO checkout_order_items(order_id,product_id,name,quantity,unit_price_cents) VALUES(11,999,'Indisponível',1,0)`)
		call("POST", "/admin/orders/11/cancel", "admin", reason, 409)
		var stock, count int
		var status string
		database.QueryRow("SELECT quantity FROM products WHERE id=1").Scan(&stock)
		database.QueryRow("SELECT status FROM checkout_orders WHERE id=11").Scan(&status)
		database.QueryRow("SELECT count(*) FROM order_cancellations WHERE order_id=11").Scan(&count)
		if stock != 3 || status != "simulated_approved" || count != 0 {
			t.Fatalf("partial update stock=%d status=%s count=%d", stock, status, count)
		}
	})
	t.Run("database_failure", func(t *testing.T) {
		exec("ALTER TABLE checkout_orders RENAME TO temporarily_unavailable_orders")
		call("GET", "/admin/orders", "admin", "", 500)
		exec("ALTER TABLE temporarily_unavailable_orders RENAME TO checkout_orders")
	})
}
