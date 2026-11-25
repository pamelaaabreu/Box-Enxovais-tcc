package routes

import (
	"backend/src/handlers"
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/services"
	"encoding/json"
	"github.com/golang-jwt/jwt/v5"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestAdminCustomersPostgres(t *testing.T) {
	database, exec := checkoutTestDB(t)
	exec(`ALTER TABLE users ADD COLUMN role text NOT NULL DEFAULT 'customer';ALTER TABLE users ADD COLUMN created_at timestamptz;ALTER TABLE users ADD COLUMN password text DEFAULT 'sensitive-hash';
 UPDATE users SET full_name=CASE id WHEN 1 THEN 'Ana Cliente' ELSE 'Administrador' END,email=CASE id WHEN 1 THEN 'ana@example.test' ELSE 'admin@example.test' END,role=CASE id WHEN 2 THEN 'admin' ELSE 'customer' END,created_at='2026-01-01';
 INSERT INTO users(id,full_name,email,created_at) SELECT n,'Cliente '||n,'cliente'||n||'@example.test','2026-01-01'::timestamptz+n*interval '1 day' FROM generate_series(3,15)n;
 INSERT INTO checkout_orders(user_id,request_key,address,payment_method,total_cents,created_at) SELECT CASE WHEN n=14 THEN 3 ELSE 1 END,'customer-order-'||n,'{}','pix',CASE WHEN n=2 THEN 9000 ELSE 1000 END,'2026-02-01'::timestamptz+n*interval '1 day' FROM generate_series(1,14)n;
 UPDATE checkout_orders SET status='cancelled' WHERE id=2;
 INSERT INTO user_addresses(user_id,label,recipient,zip_code,street,number,neighborhood,city,state,is_default) VALUES(1,'Casa','Ana','01001000','Rua Teste','123','Centro','São Paulo','SP',true),(3,'Outro cliente','Pessoa 3','01001000','Rua Privada','3','Centro','São Paulo','SP',true);`)
	const secret = "customer-admin-test-only"
	t.Setenv("JWT_SECRET", secret)
	mux := http.NewServeMux()
	InitRoutesAdminCustomers(mux, handlers.AdminCustomerHandler{Service: services.AdminCustomerService{Store: repositories.AdminCustomerRepository{DB: database}}})
	call := func(method, path, role string, want int) []byte {
		t.Helper()
		req := httptest.NewRequest(method, path, nil)
		if role != "" {
			token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, models.Claims{UserID: 1, Role: role, RegisteredClaims: jwt.RegisteredClaims{Issuer: "box-enxovais-api", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Minute))}}).SignedString([]byte(secret))
			if err != nil {
				t.Fatal(err)
			}
			req.Header.Set("Authorization", "Bearer "+token)
		}
		out := httptest.NewRecorder()
		mux.ServeHTTP(out, req)
		if out.Code != want {
			t.Fatalf("%s %s HTTP %d expected %d", method, path, out.Code, want)
		}
		return out.Body.Bytes()
	}
	t.Run("admin_only_readonly_routes", func(t *testing.T) {
		for _, path := range []string{"/admin/customers", "/admin/customers/1", "/admin/customers/1/orders"} {
			call("GET", path, "", 401)
			call("GET", path, "customer", 403)
		}
		for _, method := range []string{"POST", "PATCH", "DELETE"} {
			call(method, "/admin/customers/1", "admin", 405)
		}
	})
	t.Run("list_metrics_pagination_order_and_private_fields", func(t *testing.T) {
		raw := call("GET", "/admin/customers", "admin", 200)
		var e struct {
			Data struct {
				Total         int
				WithOrders    int
				WithoutOrders int
				Customers     []struct {
					ID         int
					TotalSpent float64
				}
			}
		}
		json.Unmarshal(raw, &e)
		if e.Data.Total != 14 || e.Data.WithOrders != 2 || e.Data.WithoutOrders != 12 || len(e.Data.Customers) != 10 || e.Data.Customers[0].ID != 15 {
			t.Fatalf("unexpected list metrics: %+v", e.Data)
		}
		var second struct {
			Data struct{ Customers []struct{ ID int } }
		}
		json.Unmarshal(call("GET", "/admin/customers?page=2", "admin", 200), &second)
		if len(second.Data.Customers) != 4 || second.Data.Customers[3].ID != 1 {
			t.Fatal("pagination incorrect")
		}
		for _, secret := range []string{"password", "nationalId", "birthDate", "sensitive-hash", "otp", "token"} {
			if strings.Contains(string(raw), secret) {
				t.Fatal("unnecessary private field returned")
			}
		}
	})
	t.Run("search_name_email_empty_and_injection", func(t *testing.T) {
		for _, q := range []string{"Ana", "ana%40example.test"} {
			var e struct{ Data struct{ Total int } }
			json.Unmarshal(call("GET", "/admin/customers?search="+q, "admin", 200), &e)
			if e.Data.Total != 1 {
				t.Fatal("search mismatch")
			}
		}
		for _, q := range []string{"inexistente", "%27%20OR%201=1--"} {
			var e struct{ Data struct{ Total int } }
			json.Unmarshal(call("GET", "/admin/customers?search="+q, "admin", 200), &e)
			if e.Data.Total != 0 {
				t.Fatal("unsafe or incorrect search")
			}
		}
	})
	t.Run("detail_address_historical_spending_cancel_excluded", func(t *testing.T) {
		var e struct {
			Data struct {
				Name            string
				Orders          int
				ValidOrders     int
				CancelledOrders int
				TotalSpent      float64
				LastPurchase    *time.Time
				Addresses       []models.UserAddress
			}
		}
		json.Unmarshal(call("GET", "/admin/customers/1", "admin", 200), &e)
		if e.Data.Name != "Ana Cliente" || e.Data.Orders != 13 || e.Data.ValidOrders != 12 || e.Data.CancelledOrders != 1 || e.Data.TotalSpent != 120 || e.Data.LastPurchase == nil || len(e.Data.Addresses) != 1 || e.Data.Addresses[0].Street != "Rua Teste" {
			t.Fatalf("incorrect historical detail: %+v", e.Data)
		}
	})
	t.Run("customer_without_orders_and_null_registration", func(t *testing.T) {
		exec("UPDATE users SET created_at=NULL WHERE id=4")
		var e struct {
			Data struct {
				Orders       int
				TotalSpent   float64
				CreatedAt    *time.Time
				LastPurchase *time.Time
				Addresses    []models.UserAddress
			}
		}
		json.Unmarshal(call("GET", "/admin/customers/4", "admin", 200), &e)
		if e.Data.Orders != 0 || e.Data.TotalSpent != 0 || e.Data.CreatedAt != nil || e.Data.LastPurchase != nil || len(e.Data.Addresses) != 0 {
			t.Fatal("invented data for customer without orders")
		}
	})
	t.Run("history_is_scoped_paginated_and_cancelled_visible", func(t *testing.T) {
		var e struct {
			Data struct {
				Total  int
				Orders []struct {
					ID         int
					CustomerID int
					Status     string
				}
			}
		}
		json.Unmarshal(call("GET", "/admin/customers/1/orders?page=2", "admin", 200), &e)
		if e.Data.Total != 13 || len(e.Data.Orders) != 3 {
			t.Fatal("history pagination mismatch")
		}
		cancelled := false
		for _, o := range e.Data.Orders {
			if o.CustomerID != 1 || o.ID == 14 {
				t.Fatal("another customer order leaked")
			}
			cancelled = cancelled || o.Status == "cancelled"
		}
		if !cancelled {
			t.Fatal("cancelled order absent")
		}
		var other struct{ Data struct{ Total int } }
		json.Unmarshal(call("GET", "/admin/customers/3/orders", "admin", 200), &other)
		if other.Data.Total != 1 {
			t.Fatal("other customer history mismatch")
		}
	})
	t.Run("invalid_missing_and_admin_ids", func(t *testing.T) {
		for _, id := range []string{"abc", "0", "-1", "2147483648", "99999", "2"} {
			call("GET", "/admin/customers/"+id, "admin", 404)
			call("GET", "/admin/customers/"+id+"/orders", "admin", 404)
		}
		for _, q := range []string{"page=0", "page=invalid", "search=" + strings.Repeat("a", 201)} {
			call("GET", "/admin/customers?"+q, "admin", 400)
		}
	})
	t.Run("unavailable_database_generic_error_and_recovery", func(t *testing.T) {
		exec("ALTER TABLE checkout_orders RENAME TO temporarily_unavailable_orders")
		raw := call("GET", "/admin/customers", "admin", 500)
		if strings.Contains(string(raw), "relation") || strings.Contains(string(raw), "SELECT") {
			t.Fatal("internal error exposed")
		}
		exec("ALTER TABLE temporarily_unavailable_orders RENAME TO checkout_orders")
		call("GET", "/admin/customers", "admin", 200)
	})
}
