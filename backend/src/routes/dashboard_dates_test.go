package routes

import (
	"backend/src/handlers"
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/services"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func TestDashboardDateFiltersPostgres(t *testing.T) {
	database, exec := checkoutTestDB(t)
	exec(`ALTER TABLE users ADD COLUMN role text NOT NULL DEFAULT 'customer';
        ALTER TABLE users ADD COLUMN created_at timestamptz;
        UPDATE users SET created_at='2020-01-01T03:00:00Z', role=CASE id WHEN 2 THEN 'admin' ELSE 'customer' END;
        CREATE TABLE product_types(id integer PRIMARY KEY,name text);
        INSERT INTO product_types VALUES(1,'Cama');
        ALTER TABLE products ADD COLUMN product_type_id integer;
        UPDATE products SET name='Jogo de Cama Essência Floral Verde Oliva 100% Algodão', product_type_id=1;
        INSERT INTO product_variants(product_id,size,price,quantity,dimensions) VALUES(1,'Casal',10,1,'220 × 240 cm'),(1,'Queen',20,2,'240 × 260 cm');`)
	location, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		t.Fatal(err)
	}
	now := time.Now().In(location)
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, location)
	dates := []time.Time{today.AddDate(0, 0, -30), today.AddDate(0, 0, -29), today.AddDate(0, 0, -6).Add(-time.Second), today.AddDate(0, 0, -6), today.Add(-time.Second), today, today.AddDate(0, 0, 1).Add(-time.Second), today.AddDate(0, 0, 1)}
	for _, raw := range []string{"2025-12-31T02:59:59Z", "2025-12-31T03:00:00Z", "2026-01-01T02:59:59Z", "2026-01-01T03:00:00Z", "2026-01-02T02:59:59Z", "2026-01-02T03:00:00Z", "2026-02-01T02:59:59Z", "2026-02-01T03:00:00Z"} {
		instant, parseErr := time.Parse(time.RFC3339, raw)
		if parseErr != nil {
			t.Fatal(parseErr)
		}
		dates = append(dates, instant)
	}
	for index, instant := range dates {
		if _, err := database.Exec(`INSERT INTO users(id,full_name,email,role,created_at) VALUES($1,'Cliente de teste',$2,'customer',$3)`, index+3, fmt.Sprintf("period-%d@example.test", index), instant); err != nil {
			t.Fatal(err)
		}
		if _, err := database.Exec(`INSERT INTO checkout_orders(user_id,request_key,address,payment_method,status,total_cents,created_at) VALUES(1,$1,'{}','pix',$2,$3,$4)`, fmt.Sprintf("period-%d", index), []string{"simulated_approved", "cancelled"}[index%2], int64(index+1)*100, instant); err != nil {
			t.Fatal(err)
		}
	}
	exec(`INSERT INTO checkout_order_items(order_id,product_id,name,quantity,unit_price_cents) SELECT id,1,'Jogo de Cama Essência Floral Verde Oliva 100% Algodão',1,total_cents FROM checkout_orders;`)
	const secret = "dashboard-date-test-only"
	t.Setenv("JWT_SECRET", secret)
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, models.Claims{UserID: 2, Role: "admin", RegisteredClaims: jwt.RegisteredClaims{Issuer: "box-enxovais-api", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))}}).SignedString([]byte(secret))
	if err != nil {
		t.Fatal(err)
	}
	handler := handlers.ProductHandler{Service: services.ProductService{Store: repositories.ProductRepository{DB: database}}}
	mux := http.NewServeMux()
	adminRoute(mux, http.MethodGet, "GET /admin/dashboard", handler.GetDashboard)
	queries := []string{
		"period=7d&group=day", "period=30d&group=auto", "period=30d&group=day", "period=month&group=month",
		"period=custom&dateFrom=2026-01-01&dateTo=2026-01-01&group=day",
		"period=custom&dateFrom=2026-01-30&dateTo=2026-02-02&group=day",
		"period=custom&dateFrom=2025-12-31&dateTo=2026-01-02&group=day",
		"period=custom&dateFrom=2025-12-31&dateTo=2026-01-02&group=month",
		"period=custom&dateFrom=2025-12-01&dateTo=2026-04-30&group=auto",
		"period=custom&dateFrom=2020-05-01&dateTo=2020-05-07&group=day",
	}
	for _, query := range queries {
		t.Run(query, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodGet, "/admin/dashboard?"+query, nil)
			request.Header.Set("Authorization", "Bearer "+token)
			recorder := httptest.NewRecorder()
			mux.ServeHTTP(recorder, request)
			if recorder.Code != http.StatusOK {
				t.Fatalf("status %d: %s", recorder.Code, recorder.Body.String())
			}
			var result models.Dashboard
			if err := json.Unmarshal(recorder.Body.Bytes(), &result); err != nil {
				t.Fatal(err)
			}
			var points []struct {
				Bucket                          string
				Orders, RevenueCents, Customers int64
			}
			if err := json.Unmarshal(result.Series, &points); err != nil {
				t.Fatal(err)
			}
			type totals struct{ orders, revenue, customers int64 }
			expected := map[string]totals{}
			for day := result.Period.From.In(location); day.Before(result.Period.Until); day = day.AddDate(0, 0, 1) {
				key := day.Format(time.DateOnly)
				if result.Period.Group == "month" {
					key = day.Format("2006-01") + "-01"
				}
				expected[key] = totals{}
			}
			var orders, revenue, customers int64
			for index, instant := range dates {
				if instant.Before(result.Period.From) || !instant.Before(result.Period.Until) {
					continue
				}
				key := instant.In(location).Format(time.DateOnly)
				if result.Period.Group == "month" {
					key = instant.In(location).Format("2006-01") + "-01"
				}
				item := expected[key]
				item.orders++
				item.customers++
				orders++
				customers++
				if index%2 == 0 {
					amount := int64(index+1) * 100
					item.revenue += amount
					revenue += amount
				}
				expected[key] = item
			}
			if len(points) != len(expected) || result.Orders != orders || result.RevenueCents != revenue || result.NewCustomers != customers {
				t.Fatalf("calendar or card totals differ: points=%d want=%d", len(points), len(expected))
			}
			for _, point := range points {
				want, ok := expected[point.Bucket]
				if !ok || point.Orders != want.orders || point.RevenueCents != want.revenue || point.Customers != want.customers {
					t.Fatalf("bucket mismatch %s: %+v want %+v", point.Bucket, point, want)
				}
			}
		})
	}
	t.Run("unsupported_weekly_group_is_rejected", func(t *testing.T) {
		request := httptest.NewRequest(http.MethodGet, "/admin/dashboard?group=week", nil)
		request.Header.Set("Authorization", "Bearer "+token)
		recorder := httptest.NewRecorder()
		mux.ServeHTTP(recorder, request)
		if recorder.Code != http.StatusBadRequest {
			t.Fatal(recorder.Code)
		}
	})
	if os.Getenv("DASHBOARD_DATES_SERVER") != "1" {
		return
	}
	server := http.Server{Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "http://127.0.0.1:4287")
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		mux.ServeHTTP(w, r)
	}), ReadHeaderTimeout: 5 * time.Second}
	listener, err := net.Listen("tcp", "127.0.0.1:8086")
	if err != nil {
		t.Fatal(err)
	}
	defer server.Close()
	go server.Serve(listener)
	t.Log("DASHBOARD_DATES_READY")
	stop := os.Getenv("DASHBOARD_DATES_STOP")
	if stop == "" {
		t.Fatal("stop marker path required")
	}
	deadline := time.NewTimer(10 * time.Minute)
	defer deadline.Stop()
	ticker := time.NewTicker(200 * time.Millisecond)
	defer ticker.Stop()
	for {
		select {
		case <-deadline.C:
			t.Fatal("browser validation timeout")
		case <-ticker.C:
			if _, err := os.Stat(stop); err == nil {
				return
			}
		}
	}
}
