package routes

import (
	"backend/src/handlers"
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/services"
	"context"
	"github.com/golang-jwt/jwt/v5"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestDashboardPostgres(t *testing.T) {
	db, exec := checkoutTestDB(t)
	exec("CREATE TABLE product_types(id INT PRIMARY KEY, name TEXT); ALTER TABLE products ADD COLUMN product_type_id INT")
	repo := repositories.ProductRepository{DB: db}
	mux := http.NewServeMux()
	InitRoutesProducts(mux, handlers.ProductHandler{Service: services.ProductService{Store: repo}}, handlers.ProductImageHandler{})
	w := httptest.NewRecorder()
	mux.ServeHTTP(w, httptest.NewRequest(http.MethodGet, "/admin/dashboard", nil))
	if w.Code != http.StatusUnauthorized {
		t.Fatalf("unexpected anonymous status: %d", w.Code)
	}
	t.Setenv("JWT_SECRET", "dashboard-tests-only-secret")
	for role, status := range map[string]int{"customer": http.StatusForbidden, "admin": http.StatusOK} {
		token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, models.Claims{UserID: 1, Role: role, RegisteredClaims: jwt.RegisteredClaims{Issuer: "box-enxovais-api", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Minute))}}).SignedString([]byte("dashboard-tests-only-secret"))
		if err != nil {
			t.Fatal(err)
		}
		r := httptest.NewRequest(http.MethodGet, "/admin/dashboard", nil)
		r.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		if w.Code != status {
			t.Fatalf("role %s: got %d, want %d", role, w.Code, status)
		}
	}
	exec("DELETE FROM cart_items; DELETE FROM products")
	empty, err := repo.Dashboard(context.Background())
	if err != nil || empty.Orders != 0 || empty.Products != 0 || string(empty.Months) != "[]" || string(empty.Categories) != "[]" {
		t.Fatalf("invalid empty summary: %+v %v", empty, err)
	}
	exec(`INSERT INTO product_types VALUES(1,'Cama');
 INSERT INTO products(id,name,price,quantity,status,product_type_id) VALUES(1,'Jogo',10,5,'active',1),(2,'Outro',10,1,'inactive',NULL);
 INSERT INTO checkout_orders(user_id,request_key,address,payment_method,status,total_cents,created_at) VALUES
 (1,'a','{}','pix','simulated_approved',2000,'2026-01-20T12:00Z'),(2,'b','{}','pix','cancelled',9000,'2026-02-20T12:00Z');
 INSERT INTO checkout_order_items(order_id,product_id,name,quantity,unit_price_cents)
 SELECT id,1,'Jogo',CASE WHEN status='cancelled' THEN 9 ELSE 2 END,1000 FROM checkout_orders;`)
	actual, err := repo.Dashboard(context.Background())
	if err != nil || actual.Orders != 2 || actual.RevenueCents != 2000 || actual.Products != 2 || actual.LowStock != 1 {
		t.Fatalf("invalid summary: %+v %v", actual, err)
	}
	if got := string(actual.Categories); got != "[{\"name\":\"Cama\",\"units\":2}]" {
		t.Fatalf("unexpected categories: %s", got)
	}
	if got := strings.Join(strings.Fields(string(actual.Months)), " "); got != "[{\"month\":\"2026-01\",\"total\":1,\"cancelled\":0}, {\"month\":\"2026-02\",\"total\":1,\"cancelled\":1}]" {
		t.Fatalf("unexpected months: %s", got)
	}
}
