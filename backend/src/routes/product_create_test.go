package routes

import (
	"backend/src/handlers"
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/services"
	"encoding/json"
	"fmt"
	"github.com/golang-jwt/jwt/v5"
	"io"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"
)

// Real HTTP + PostgreSQL, isolated from application tables.
func TestProductCreatePostgres(t *testing.T) {
	conn, err := openTestDatabase(t)
	if err != nil {
		t.Fatal("cannot open test database")
	}
	defer conn.Close()
	conn.SetMaxOpenConns(1)
	if err = conn.Ping(); err != nil {
		t.Fatal("test PostgreSQL unavailable")
	}
	var negativeCount int
	if err := conn.QueryRow(`SELECT count(*) FROM public.products WHERE quantity < 0`).Scan(&negativeCount); err != nil {
		t.Fatal(err)
	}
	t.Logf("Read-only preflight: public.products negative quantities = %d (not modified)", negativeCount)
	schema := fmt.Sprintf("product_create_test_%d", time.Now().UnixNano())
	if _, err = conn.Exec(`CREATE SCHEMA ` + schema); err != nil {
		t.Fatal(err)
	}
	defer conn.Exec(`DROP SCHEMA ` + schema + ` CASCADE`)
	if _, err = conn.Exec(`SET search_path TO ` + schema); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"000001_initial_schema.up.sql", "000002_simplify_customer_registration.up.sql", "000003_cart.up.sql"} {
		migration, err := os.ReadFile("../../migrations/" + name)
		if err != nil {
			t.Fatal(err)
		}
		if _, err = conn.Exec(string(migration)); err != nil {
			t.Fatal(err)
		}
	}

	migration, err := os.ReadFile("../../migrations/000004_products_quantity_nonnegative.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	t.Run("migration_refuses_existing_negative_without_changing_it", func(t *testing.T) {
		if _, err := conn.Exec(`INSERT INTO products(name,price,quantity) VALUES('Negative fixture',1,-1)`); err != nil {
			t.Fatal(err)
		}
		if _, err := conn.Exec(string(migration)); err == nil {
			t.Fatal("migration accepted negative stock")
		}
		var quantity int
		if err := conn.QueryRow(`SELECT quantity FROM products WHERE name='Negative fixture'`).Scan(&quantity); err != nil || quantity != -1 {
			t.Fatalf("negative fixture changed: %d, %v", quantity, err)
		}
		if _, err := conn.Exec(`DELETE FROM products WHERE name='Negative fixture'`); err != nil {
			t.Fatal(err)
		}
	})
	if _, err := conn.Exec(string(migration)); err != nil {
		t.Fatal(err)
	}
	t.Run("database_rejects_negative", func(t *testing.T) {
		if _, err := conn.Exec(`INSERT INTO products(name,price,quantity) VALUES('Invalid',1,-1)`); err == nil {
			t.Fatal("constraint missing")
		}
	})
	t.Setenv("JWT_SECRET", "product-create-tests-only")
	token := func(role string) string {
		signed, err := jwt.NewWithClaims(jwt.SigningMethodHS256, models.Claims{UserID: 1, Role: role, RegisteredClaims: jwt.RegisteredClaims{Issuer: "box-enxovais-api", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))}}).SignedString([]byte("product-create-tests-only"))
		if err != nil {
			t.Fatal(err)
		}
		return signed
	}
	products := handlers.ProductHandler{Service: services.ProductService{Store: repositories.ProductRepository{DB: conn}}}
	images := handlers.ProductImageHandler{Service: services.ProductImageService{
		Store: repositories.ProductImageRepository{DB: conn}, Directory: t.TempDir(),
	}}
	mux := http.NewServeMux()
	InitRoutesProducts(mux, products, images)
	server := httptest.NewServer(mux)
	defer server.Close()
	call := func(body, auth string, want int) []byte {
		t.Helper()
		request, err := http.NewRequest(http.MethodPost, server.URL+"/products", strings.NewReader(body))
		if err != nil {
			t.Fatal(err)
		}
		request.Header.Set("Content-Type", "application/json")
		if auth != "" {
			request.Header.Set("Authorization", "Bearer "+auth)
		}
		response, err := server.Client().Do(request)
		if err != nil {
			t.Fatal(err)
		}
		defer response.Body.Close()
		data, err := io.ReadAll(response.Body)
		if err != nil {
			t.Fatal(err)
		}
		if response.StatusCode != want {
			t.Fatalf("got %d want %d: %s", response.StatusCode, want, data)
		}
		if want == 400 && (!json.Valid(data) || !strings.Contains(string(data), "message")) {
			t.Fatalf("missing JSON error envelope: %s", data)
		}
		return data
	}
	admin := token("admin")
	for _, quantity := range []int{0, 3} {
		t.Run(fmt.Sprintf("accept_%d", quantity), func(t *testing.T) {
			data := call(fmt.Sprintf(`{"name":"Test creation","price":10,"status":"active","quantity":%d,"measurements":{}}`, quantity), admin, 201)
			var result struct {
				ID int `json:"id"`
			}
			if err := json.Unmarshal(data, &result); err != nil || result.ID == 0 {
				t.Fatal("missing ID")
			}
			var saved int
			if err := conn.QueryRow(`SELECT quantity FROM products WHERE id=$1`, result.ID).Scan(&saved); err != nil || saved != quantity {
				t.Fatalf("saved %d want %d: %v", saved, quantity, err)
			}
			response, err := server.Client().Get(fmt.Sprintf("%s/products/%d", server.URL, result.ID))
			if err != nil {
				t.Fatal(err)
			}
			defer response.Body.Close()
			var product models.Product
			if err := json.NewDecoder(response.Body).Decode(&product); err != nil || response.StatusCode != 200 || product.Stock != quantity || product.Quantity != quantity {
				t.Fatalf("detail mismatch: %+v %v", product, err)
			}
		})
	}
	for _, value := range []string{"-1", "1.5", `"texto"`, `"3"`, "null", "2147483648"} {
		t.Run("reject_"+value, func(t *testing.T) {
			call(`{"name":"Invalid","price":10,"status":"active","quantity":`+value+`}`, admin, 400)
		})
	}
	t.Run("reject_missing", func(t *testing.T) { call(`{"name":"Invalid","price":10,"status":"active"}`, admin, 400) })
	t.Run("reject_trailing_json", func(t *testing.T) { call(`{"quantity":3} {}`, admin, 400) })
	t.Run("permissions", func(t *testing.T) { call(`{"quantity":3}`, "", 401); call(`{"quantity":3}`, token("customer"), 403) })
	var count int
	if err := conn.QueryRow(`SELECT count(*) FROM products`).Scan(&count); err != nil || count != 2 {
		t.Fatalf("invalid requests inserted rows: %d %v", count, err)
	}
}
