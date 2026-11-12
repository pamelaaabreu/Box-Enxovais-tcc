package routes

import (
	"backend/src/handlers"
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/services"
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"github.com/golang-jwt/jwt/v5"
	"io"
	"mime/multipart"
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
	t.Run("catalog attributes and upload", func(t *testing.T) {
		if _, err := conn.Exec("INSERT INTO brands (id,name) VALUES(91,'Marca teste'); INSERT INTO product_types (id,name) VALUES(92,'Toalhas')"); err != nil {
			t.Fatal(err)
		}
		var created struct{ ID int }
		if err := json.Unmarshal(call(`{"name":"Toalha","price":0,"quantity":5,"status":"archived","brand_id":91,"product_type_id":92,"measurements":{"Largura":"70 cm"}}`, admin, 201), &created); err != nil {
			t.Fatal(err)
		}
		upload := func(payload []byte, bearer string, want int) {
			t.Helper()
			var body bytes.Buffer
			writer := multipart.NewWriter(&body)
			if err := writer.WriteField("productId", fmt.Sprint(created.ID)); err != nil {
				t.Fatal(err)
			}
			file, err := writer.CreateFormFile("image", "produto.png")
			if err != nil {
				t.Fatal(err)
			}
			if _, err = file.Write(payload); err != nil {
				t.Fatal(err)
			}
			if err = writer.Close(); err != nil {
				t.Fatal(err)
			}
			r := httptest.NewRequest(http.MethodPost, "/upload-image", &body)
			r.Header.Set("Content-Type", writer.FormDataContentType())
			r.Header.Set("Authorization", "Bearer "+bearer)
			w := httptest.NewRecorder()
			mux.ServeHTTP(w, r)
			if w.Code != want {
				t.Fatalf("upload got %d want %d: %s", w.Code, want, w.Body.String())
			}
		}
		png, err := base64.StdEncoding.DecodeString("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/Z0cAAAAASUVORK5CYII=")
		if err != nil {
			t.Fatal(err)
		}
		upload(png, token("customer"), http.StatusForbidden)
		upload([]byte("not an image"), admin, http.StatusUnsupportedMediaType)
		upload(make([]byte, 10*1024*1024+1), admin, http.StatusBadRequest)
		upload(png, admin, http.StatusCreated)
		r := httptest.NewRequest(http.MethodGet, fmt.Sprintf("/products/%d", created.ID), nil)
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		var product models.Product
		if err := json.Unmarshal(w.Body.Bytes(), &product); err != nil || w.Code != 200 || product.BrandID == nil || *product.BrandID != 91 || product.CategoryName != "Toalhas" || product.Measurements["Largura"] != "70 cm" || len(product.ImagePaths) != 1 {
			t.Fatalf("unexpected product: %s", w.Body.String())
		}
		r = httptest.NewRequest(http.MethodGet, "/admin/products/brands", nil)
		r.Header.Set("Authorization", "Bearer "+admin)
		w = httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		if w.Code != 200 || !strings.Contains(w.Body.String(), "Marca teste") {
			t.Fatalf("unexpected brands: %s", w.Body.String())
		}
	})
}
