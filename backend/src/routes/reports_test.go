package routes

import (
	"backend/src/handlers"
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/services"
	"context"
	"encoding/csv"
	"encoding/json"
	"github.com/golang-jwt/jwt/v5"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestReportsPostgres(t *testing.T) {
	db, exec := checkoutTestDB(t)
	exec(`ALTER TABLE users ADD COLUMN role text NOT NULL DEFAULT 'customer';ALTER TABLE users ADD COLUMN created_at timestamptz DEFAULT now();UPDATE users SET role='admin' WHERE id=2;INSERT INTO users(id,full_name,email,created_at) VALUES(3,'Sem compras','none@test.example','2026-01-02T12:00Z');UPDATE users SET created_at='2026-01-01T03:00Z' WHERE id=1;
 CREATE TABLE product_types(id integer PRIMARY KEY,name text);INSERT INTO product_types VALUES(1,'Cama');CREATE TABLE brands(id integer PRIMARY KEY,name text);INSERT INTO brands VALUES(1,'Box Enxovais');ALTER TABLE products ADD COLUMN product_type_id integer;ALTER TABLE products ADD COLUMN brand_id integer;ALTER TABLE products ADD COLUMN sku text;UPDATE products SET sku='BX-CAM-001',product_type_id=1,brand_id=1,price=999,quantity=5;
 INSERT INTO products(id,name,price,quantity,status,sku,product_type_id,brand_id) VALUES(2,'Nome atual',999,0,'inactive','BX-EDR-002',1,1),(3,'Variações',999,999,'active','BX-CAM-003',1,1),(4,'Esgotado',1,0,'active','BX-CAM-004',1,1),(5,'=Fórmula teste',1,10,'active','BX-CAM-005',1,1);
 INSERT INTO product_variants(product_id,size,price,quantity,dimensions) VALUES(3,'Casal',10,3,'A'),(3,'Queen',20,7,'B');
 INSERT INTO checkout_orders(user_id,request_key,address,payment_method,status,total_cents,created_at) VALUES
 (1,'before','{}','pix','simulated_approved',99999,'2026-01-01T02:59:59Z'),(1,'first','{}','pix','simulated_approved',1001,'2026-01-01T03:00:00Z'),(1,'second','{}','card','simulated_approved',2100,'2026-01-15T12:00:00Z'),(1,'cancelled','{}','boleto','cancelled',9000,'2026-01-20T12:00:00Z'),(2,'admin','{}','pix','simulated_approved',1000,'2026-01-21T12:00:00Z'),(1,'after','{}','pix','simulated_approved',99999,'2026-02-01T03:00:00Z');
 INSERT INTO checkout_order_items(order_id,product_id,name,quantity,unit_price_cents) SELECT id,CASE WHEN request_key='second' THEN 2 ELSE 1 END,CASE WHEN request_key='second' THEN 'Nome histórico' ELSE 'Produto histórico' END,CASE WHEN request_key='second' THEN 3 ELSE 1 END,CASE WHEN request_key='second' THEN 700 ELSE total_cents END FROM checkout_orders;`)
	loc, _ := time.LoadLocation("America/Sao_Paulo")
	period := models.DashboardPeriod{Preset: "custom", From: time.Date(2026, 1, 1, 0, 0, 0, 0, loc), Until: time.Date(2026, 2, 1, 0, 0, 0, 0, loc), Group: "day", Timezone: "America/Sao_Paulo"}
	repo := repositories.ProductRepository{DB: db}
	f := repositories.ReportFilter{Kind: "sales", Page: 1, PageSize: 1, Period: period}
	get := func(f repositories.ReportFilter) repositories.Report {
		t.Helper()
		v, e := repo.Report(context.Background(), f)
		if e != nil {
			t.Fatal(e)
		}
		return v
	}
	t.Run("sales_match_dashboard_across_pages", func(t *testing.T) {
		s := get(f)
		d, e := repo.Dashboard(context.Background(), period)
		if e != nil {
			t.Fatal(e)
		}
		if s.Total != 4 || len(s.Rows) != 1 || s.Stats["revenueCents"] != d.RevenueCents || s.Stats["averageTicketCents"] != d.AverageTicketCents || s.Stats["revenueCents"] != 4101 || s.Stats["averageTicketCents"] != 1367 {
			t.Fatalf("incorrect sales %+v", s)
		}
	})
	t.Run("cancelled_search_and_empty", func(t *testing.T) {
		x := f
		x.Status = "cancelled"
		s := get(x)
		if s.Total != 1 || s.Stats["revenueCents"] != 0 {
			t.Fatal(s)
		}
		x.Status = ""
		x.Search = "notfound"
		s = get(x)
		if s.Total != 0 || len(s.Rows) != 0 || s.Stats["orders"] != 0 {
			t.Fatal(s)
		}
		x.Search = "%"
		if get(x).Total != 0 {
			t.Fatal("unescaped wildcard")
		}
	})
	t.Run("historical_products_and_ranking", func(t *testing.T) {
		x := f
		x.Kind = "products"
		x.PageSize = 100
		x.Sort = "units"
		s := get(x)
		if s.Total != 5 || s.Rows[0].ID != 2 || s.Rows[0].Name != "Nome histórico" || !s.Rows[0].Archived || s.Rows[0].Units != 3 || s.Rows[0].RevenueCents != 2100 || s.Stats["soldProducts"] != 2 || s.Stats["units"] != 5 || s.Stats["unsoldProducts"] != 3 {
			t.Fatalf("incorrect products %+v", s)
		}
		x.Search = "BX-EDR-002"
		if get(x).Total != 1 {
			t.Fatal("sku search")
		}
		x.Search = ""
		x.Sort = "revenue"
		if get(x).Rows[0].ID != 2 {
			t.Fatal("revenue sort")
		}
	})
	t.Run("variant_sales_and_shipping_preserve_historical_amounts", func(t *testing.T) {
		exec(`INSERT INTO checkout_orders(user_id,request_key,address,payment_method,status,total_cents,created_at) VALUES(1,'variant-sale','{}','pix','simulated_approved',3500,'2026-01-25T12:00:00Z');
 INSERT INTO checkout_order_items(order_id,product_id,variant_id,name,quantity,unit_price_cents) SELECT id,3,(SELECT min(id) FROM product_variants WHERE product_id=3),'Variação histórica Casal',2,1650 FROM checkout_orders WHERE request_key='variant-sale'; UPDATE checkout_orders SET products_subtotal_cents=3600,discount_cents=300,shipping_cents=200,shipping_min_days=1,shipping_max_days=2,shipping_method='delivery' WHERE request_key='variant-sale';`)
		defer exec(`DELETE FROM checkout_order_items WHERE order_id IN(SELECT id FROM checkout_orders WHERE request_key='variant-sale');DELETE FROM checkout_orders WHERE request_key='variant-sale'`)
		x := f
		x.Kind = "products"
		x.Search = "BX-CAM-003"
		s := get(x)
		if s.Total != 1 || s.Rows[0].Units != 2 || s.Rows[0].RevenueCents != 3300 || s.Rows[0].Name != "Variação histórica Casal" {
			t.Fatal("variant historical sale mismatch", s)
		}
		x = f
		s = get(x)
		d, e := repo.Dashboard(context.Background(), period)
		if e != nil || s.Stats["revenueCents"] != d.RevenueCents || d.RevenueCents != 7601 || d.ShippingCents != 200 {
			t.Fatal("shipping must remain in historical order total", e)
		}
	})
	t.Run("customers_without_purchases_and_recurring_exclude_admin", func(t *testing.T) {
		x := f
		x.Kind = "customers"
		x.PageSize = 100
		s := get(x)
		if s.Total != 2 || s.Stats["buyers"] != 1 || s.Stats["recurringCustomers"] != 1 || s.Stats["newCustomers"] != 2 || s.Stats["averageCustomerCents"] != 3101 || s.Rows[0].Orders != 2 || s.Rows[1].Orders != 0 {
			t.Fatalf("incorrect customers %+v", s)
		}
	})
	t.Run("stock_current_simple_and_variants_without_double_count", func(t *testing.T) {
		x := f
		x.Kind = "stock"
		x.PageSize = 100
		s := get(x)
		if s.Total != 5 || s.Stats["activeProducts"] != 4 || s.Stats["units"] != 25 || s.Stats["lowStock"] != 1 || s.Stats["outOfStock"] != 1 {
			t.Fatalf("incorrect stock %+v", s)
		}
		x.Status = "low"
		s = get(x)
		if s.Total != 2 || s.Stats["units"] != 8 || s.Stats["lowStock"] != 1 {
			t.Fatalf("filtered stock %+v", s)
		}
		x.Period.From = x.Period.From.AddDate(-5, 0, 0)
		if get(x).Total != s.Total {
			t.Fatal("stock must ignore period")
		}
	})
	t.Setenv("JWT_SECRET", "reports-test-only")
	mux := http.NewServeMux()
	InitRoutesProducts(mux, handlers.ProductHandler{Service: services.ProductService{Store: repo}}, handlers.ProductImageHandler{})
	token := func(role string) string {
		v, e := jwt.NewWithClaims(jwt.SigningMethodHS256, models.Claims{UserID: 1, Role: role, RegisteredClaims: jwt.RegisteredClaims{Issuer: "box-enxovais-api", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Minute))}}).SignedString([]byte("reports-test-only"))
		if e != nil {
			t.Fatal(e)
		}
		return v
	}
	call := func(path, role string) *httptest.ResponseRecorder {
		r := httptest.NewRequest("GET", path, nil)
		if role != "" {
			r.Header.Set("Authorization", "Bearer "+token(role))
		}
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		return w
	}
	query := "?period=custom&dateFrom=2026-01-01&dateTo=2026-01-31&pageSize=1&page=2"
	t.Run("protected_queries_exports_and_no_customer_export", func(t *testing.T) {
		for _, k := range []string{"sales", "products", "customers", "stock"} {
			for role, want := range map[string]int{"": 401, "customer": 403, "admin": 200} {
				if w := call("/admin/reports/"+k+query, role); w.Code != want {
					t.Fatalf("%s %s %d %s", k, role, w.Code, w.Body.String())
				}
			}
		}
		if call("/admin/reports/customers/export", "admin").Code != 404 {
			t.Fatal("PII export exposed")
		}
	})
	t.Run("csv_full_filtered_excel_safe_and_no_pii", func(t *testing.T) {
		for _, kind := range []string{"sales", "products", "stock"} {
			w := call("/admin/reports/"+kind+"/export"+query, "admin")
			if w.Code != 200 || !strings.HasPrefix(w.Body.String(), "\ufeff") {
				t.Fatal(w.Code, w.Body.String())
			}
			reader := csv.NewReader(strings.NewReader(strings.TrimPrefix(w.Body.String(), "\ufeff")))
			reader.Comma = ';'
			rows, e := reader.ReadAll()
			if e != nil || len(rows) < 3 {
				t.Fatal("export only current page", e)
			}
			if strings.Contains(w.Body.String(), "test.example") || strings.Contains(rows[0][0], "Cliente") {
				t.Fatal("PII leaked")
			}
			if kind == "products" && !strings.Contains(w.Body.String(), "'=Fórmula teste") {
				t.Fatal("CSV injection")
			}
			if kind == "sales" && !strings.Contains(w.Body.String(), "10,01") {
				t.Fatal("money mismatch")
			}
		}
		w := call("/admin/reports/sales/export"+query+"&status=cancelled", "admin")
		if !strings.Contains(w.Body.String(), "Cancelado") || strings.Contains(w.Body.String(), "Aprovado") {
			t.Fatal("export filters ignored")
		}
	})
	t.Run("errors_and_recovery", func(t *testing.T) {
		if call("/admin/reports/sales?page=0", "admin").Code != 400 {
			t.Fatal("invalid query accepted")
		}
		exec("ALTER TABLE checkout_orders RENAME TO unavailable_orders")
		w := call("/admin/reports/sales", "admin")
		exec("ALTER TABLE unavailable_orders RENAME TO checkout_orders")
		if w.Code != 500 || strings.Contains(w.Body.String(), "SELECT") {
			t.Fatal("unsafe DB error")
		}
		w = call("/admin/reports/sales"+query, "admin")
		var s repositories.Report
		if w.Code != 200 || json.Unmarshal(w.Body.Bytes(), &s) != nil {
			t.Fatal("recovery failed")
		}
	})
	t.Run("empty_results_for_all_four_reports", func(t *testing.T) {
		for _, kind := range []string{"sales", "products", "customers", "stock"} {
			x := f
			x.Kind = kind
			x.Search = "no-results-unique"
			s := get(x)
			if s.Total != 0 || len(s.Rows) != 0 {
				t.Fatal("unexpected empty result", kind)
			}
			for _, v := range s.Stats {
				if v != 0 {
					t.Fatal("nonzero empty indicator", kind)
				}
			}
		}
	})
	t.Run("export_limit", func(t *testing.T) {
		exec(`INSERT INTO products(id,name,price,quantity,status) SELECT n,'Extra',1,1,'active' FROM generate_series(100,10100) n`)
		if w := call("/admin/reports/stock/export", "admin"); w.Code != 422 {
			t.Fatal("unbounded export", w.Code, w.Body.String()[:100])
		}
	})
}
