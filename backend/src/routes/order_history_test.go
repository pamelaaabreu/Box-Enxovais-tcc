package routes

import (
	"backend/src/handlers"
	middlewares "backend/src/middleware"
	"backend/src/models"
	"backend/src/repositories"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestOrderHistoryPostgres(t *testing.T) {
	db, err := openTestDatabase(t)
	if err != nil {
		t.Fatal("test database unavailable")
	}
	defer db.Close()
	db.SetMaxOpenConns(1)
	migration, err := os.ReadFile("../../migrations/000006_checkout.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(`
        SET search_path TO pg_temp;
        CREATE TEMP TABLE products (id integer PRIMARY KEY, status text);
        CREATE TEMP TABLE users (id integer PRIMARY KEY);
        CREATE TEMP TABLE product_images (id integer PRIMARY KEY, product_id integer, image_path text, is_primary boolean);
        INSERT INTO users VALUES (1), (2), (3);
        INSERT INTO product_images VALUES (1, 7, 'uploads/test.png', true);
    ` + strings.ReplaceAll(string(migration), "CREATE TABLE ", "CREATE TEMP TABLE ") + `
        INSERT INTO checkout_orders (user_id, request_key, address, payment_method, total_cents, created_at)
        VALUES (1, 'old', '{}', 'pix', 1000, '2025-01-01T00:00:00Z'), (1, 'new', '{}', 'pix', 2500, '2025-01-02T00:00:00Z'),
               (2, 'other', '{}', 'card', 3000, '2025-01-03');
        INSERT INTO checkout_order_items (order_id, product_id, name, quantity, unit_price_cents)
        VALUES (2, 7, 'Toalha', 2, 1250), (2, 8, 'Manta', 1, 0), (3, 7, 'Privado', 1, 3000);
    `); err != nil {
		t.Fatal(err)
	}
	cancellation, err := os.ReadFile("../../migrations/000007_order_cancellation.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	if _, err := db.Exec(string(cancellation)); err != nil {
		t.Fatal(err)
	}
	const secret = "orders-tests-only"
	t.Setenv("JWT_SECRET", secret)
	mux := http.NewServeMux()
	handler := handlers.OrderHistoryHandler{Store: repositories.CheckoutRepository{DB: db}}
	mux.HandleFunc("GET /orders", middlewares.AuthMiddleware(handler.ServeHTTP))
	mux.HandleFunc("GET /orders/{id}", middlewares.AuthMiddleware(handler.ServeHTTP))

	request := func(path string, userID int, want int) []byte {
		t.Helper()
		r := httptest.NewRequest("GET", path, nil)
		if userID > 0 {
			claims := models.Claims{UserID: userID, Role: "customer", RegisteredClaims: jwt.RegisteredClaims{
				Issuer: "box-enxovais-api", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
			}}
			token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(secret))
			if err != nil {
				t.Fatal(err)
			}
			r.Header.Set("Authorization", "Bearer "+token)
		}
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		if w.Code != want {
			t.Fatalf("status %d, want %d", w.Code, want)
		}
		return w.Body.Bytes()
	}
	type summary struct {
		ID    int64
		Items []struct {
			Image    string
			Quantity int64
		}
	}
	call := func(userID, want int) []summary {
		var envelope struct{ Data struct{ Orders []summary } }
		if err := json.Unmarshal(request("/orders?user_id=2", userID, want), &envelope); err != nil {
			t.Fatal(err)
		}
		return envelope.Data.Orders
	}
	request("/orders/2", 0, 401)
	request("/orders/2", 2, 404)
	request("/orders/999", 1, 404)
	detail := string(request("/orders/2", 1, 200))
	for _, field := range []string{`"paymentMethod":"pix"`, `"unitPrice":12.50`, `"subtotal":25.00`, `"address":`} {
		if !strings.Contains(detail, field) {
			t.Fatalf("missing detail field %s", field)
		}
	}

	call(0, 401)
	own := call(1, 200)
	if len(own) != 2 || own[0].ID != 2 || own[1].ID != 1 ||
		len(own[0].Items) != 2 || own[0].Items[0].Image != "uploads/test.png" ||
		own[0].Items[0].Quantity != 2 || len(own[1].Items) != 0 {
		t.Fatal("unexpected order history for first user")
	}
	for _, path := range []string{
		"/orders?sort=invalid", "/orders?dateFrom=2026-02-30",
		"/orders?dateFrom=2026-11-09&dateTo=2026-11-08",
	} {
		request(path, 1, 400)
	}
	filtered := func(query string) []summary {
		t.Helper()
		var envelope struct{ Data struct{ Orders []summary } }
		if err := json.Unmarshal(request("/orders?"+query, 1, 200), &envelope); err != nil {
			t.Fatal(err)
		}
		return envelope.Data.Orders
	}
	if orders := filtered("sort=oldest"); len(orders) != 2 || orders[0].ID != 1 || orders[1].ID != 2 {
		t.Fatal("unexpected ascending order")
	}
	if orders := filtered("dateFrom=2024-12-31&dateTo=2025-01-01"); len(orders) != 2 {
		t.Fatal("expected both dates in the inclusive São Paulo interval")
	}
	if orders := filtered("dateFrom=2025-01-01&dateTo=2025-01-01"); len(orders) != 1 || orders[0].ID != 2 {
		t.Fatal("unexpected orders for a single São Paulo date")
	}
	if orders := filtered("page=2&dateFrom=2025-01-01"); len(orders) != 0 {
		t.Fatal("pagination must run after filtering")
	}
	if orders := filtered("search=toAlha"); len(orders) != 1 || orders[0].ID != 2 || len(orders[0].Items) != 2 {
		t.Fatal("search should match historical names and preserve all order items")
	}
	if orders := filtered("search=%232"); len(orders) != 1 || orders[0].ID != 2 {
		t.Fatal("expected exact order number")
	}
	if orders := filtered("search=Privado"); len(orders) != 0 {
		t.Fatal("search must not expose another customer's order")
	}
	if _, err := db.Exec("UPDATE checkout_orders SET status='cancelled' WHERE id=2"); err != nil {
		t.Fatal(err)
	}
	if orders := filtered("status=cancelled&search=Toalha"); len(orders) != 1 || orders[0].ID != 2 {
		t.Fatal("expected only the matching cancelled order")
	}

	if _, err := db.Exec(`UPDATE checkout_order_items SET name='Toalha 100%_natural' WHERE id=2;`); err != nil {
		t.Fatal(err)
	}
	for _, term := range []string{"2", "%232", "Toalha", "TOA", "%25_", "Toalha+100%25_natural"} {
		if orders := filtered("search=" + term + "&dateFrom=2025-01-01&dateTo=2025-01-01&sort=oldest"); len(orders) != 1 || orders[0].ID != 2 || len(orders[0].Items) != 2 {
			t.Fatalf("expected one complete order for %s", term)
		}
	}
	for _, query := range []string{"search=%5C", "search=999", "search=3", "search=Toalha&dateFrom=2025-01-02", "search=Toalha&page=2"} {
		if orders := filtered(query); len(orders) != 0 {
			t.Fatalf("unexpected match for %s", query)
		}
	}
	other := call(2, 200)
	if len(other) != 1 || other[0].ID != 3 {
		t.Fatal("unexpected order history for second user")
	}
	if empty := call(3, 200); empty == nil || len(empty) != 0 {
		t.Fatal("expected empty array")
	}
	if _, err := db.Exec(`INSERT INTO checkout_orders (user_id, request_key, address, payment_method, total_cents, created_at)
      SELECT 1, 'extra-' || n, '{}', 'pix', 100, '2025-01-03' FROM generate_series(1,9) n`); err != nil {
		t.Fatal(err)
	}
	var first, second struct {
		Data struct {
			Orders  []summary
			HasMore bool
		}
	}
	if err := json.Unmarshal(request("/orders?page=1", 1, 200), &first); err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(request("/orders?page=2", 1, 200), &second); err != nil {
		t.Fatal(err)
	}
	if len(first.Data.Orders) != 10 || !first.Data.HasMore || first.Data.Orders[0].ID != 12 ||
		len(second.Data.Orders) != 1 || second.Data.Orders[0].ID != 1 || second.Data.HasMore {
		t.Fatal("unexpected pagination")
	}

}
