package routes

import (
	"backend/src/handlers"
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/services"
	"context"
	"encoding/json"
	"fmt"
	"github.com/golang-jwt/jwt/v5"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"
)

func TestAdminProductVariantsPostgres(t *testing.T) {
	db, err := openTestDatabase(t)
	if err != nil {
		t.Fatal(err)
	}
	defer db.Close()
	db.SetMaxOpenConns(1)
	schema := fmt.Sprintf("admin_variants_%d", time.Now().UnixNano())
	if _, err = db.Exec("CREATE SCHEMA " + schema); err != nil {
		t.Fatal(err)
	}
	defer db.Exec("DROP SCHEMA " + schema + " CASCADE")
	if _, err = db.Exec("SET search_path TO " + schema); err != nil {
		t.Fatal(err)
	}
	for _, file := range []string{"000001_initial_schema.up.sql", "000002_simplify_customer_registration.up.sql", "000003_cart.up.sql", "000006_checkout.up.sql", "000051_order_shipping.up.sql", "000053_checkout_installments.up.sql", "000013_product_variants.up.sql", "000024_catalog_brand_editorial.up.sql", "000048_product_external_sku.up.sql"} {
		data, e := os.ReadFile("../../migrations/" + file)
		if e != nil {
			t.Fatal(e)
		}
		if _, e = db.Exec(string(data)); e != nil {
			t.Fatal(e)
		}
	}
	if _, err = db.Exec("INSERT INTO product_types(id,name) VALUES(1,'Cama / Edredons'); INSERT INTO users(id,full_name,email,password) VALUES(1,'Teste','variants@example.test','test')"); err != nil {
		t.Fatal(err)
	}
	t.Setenv("JWT_SECRET", "variant-admin-test")
	token := func(role string) string {
		value, e := jwt.NewWithClaims(jwt.SigningMethodHS256, models.Claims{UserID: 1, Role: role, RegisteredClaims: jwt.RegisteredClaims{Issuer: "box-enxovais-api", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))}}).SignedString([]byte("variant-admin-test"))
		if e != nil {
			t.Fatal(e)
		}
		return value
	}
	repo := repositories.ProductRepository{DB: db}
	service := services.ProductService{Store: repo}
	handler := handlers.ProductHandler{Service: service}
	mux := http.NewServeMux()
	InitRoutesProducts(mux, handler, handlers.ProductImageHandler{})
	call := func(method, path string, body any, auth string, want int) *httptest.ResponseRecorder {
		t.Helper()
		data, _ := json.Marshal(body)
		request := httptest.NewRequest(method, path, strings.NewReader(string(data)))
		request.Header.Set("Content-Type", "application/json")
		if auth != "" {
			request.Header.Set("Authorization", "Bearer "+auth)
		}
		result := httptest.NewRecorder()
		mux.ServeHTTP(result, request)
		if result.Code != want {
			t.Fatalf("%s %s: got %d want %d: %s", method, path, result.Code, want, result.Body.String())
		}
		return result
	}
	items := []models.ProductVariant{{Size: "Solteiro", Dimensions: "160 × 220 cm", Price: 249.90, Stock: 2}, {Size: "Casal", Dimensions: "220 × 240 cm", Price: 289.90, Stock: 3}, {Size: "Queen", Dimensions: "240 × 260 cm", Price: 329.90, Stock: 3}}
	request := models.Product{Name: "Edredom teste", Status: "active", Price: 1, Quantity: 1, ProductTypeID: func() *int { v := 1; return &v }(), Measurements: map[string]string{}, Variants: items}
	response := call("POST", "/products", request, token("admin"), 201)
	var created struct{ ID int }
	json.Unmarshal(response.Body.Bytes(), &created)
	detail, e := service.Get(context.Background(), int64(created.ID))
	if e != nil || len(detail) != 1 {
		t.Fatal(e)
	}
	product := detail[0]
	if len(product.Variants) != 3 || product.Quantity != 8 || product.Price != 249.90 || !strings.HasPrefix(product.SKU, "BX-EDR-") {
		t.Fatalf("invalid created product: %+v", product)
	}
	old := append([]models.ProductVariant(nil), product.Variants...)
	edited := append([]models.ProductVariant(nil), old...)
	edited[0].Price = 259.90
	edited[0].Stock = 4
	path := fmt.Sprintf("/admin/products/%d/variants", created.ID)
	body := func(v, expected []models.ProductVariant) any {
		return map[string]any{"variants": v, "expected_variants": expected}
	}
	call("PUT", path, body(edited, old), "", 401)
	call("PUT", path, body(edited, old), token("customer"), 403)
	response = call("PUT", path, body(edited, old), token("admin"), 200)
	var saved struct {
		Variants []models.ProductVariant `json:"variants"`
	}
	json.Unmarshal(response.Body.Bytes(), &saved)
	if saved.Variants[0].ID != old[0].ID || saved.Variants[0].Stock != 4 {
		t.Fatal("variant identity or stock lost")
	}
	call("PUT", path, body(edited, old), token("admin"), 409)
	detail, e = service.Get(context.Background(), int64(created.ID))
	if e != nil || detail[0].SKU != product.SKU || detail[0].Quantity != 10 {
		t.Fatal("SKU or aggregate changed incorrectly")
	}
	cart := repositories.CartRepository{DB: db}
	state, e := cart.Apply(context.Background(), 1, "add", int64(created.ID), 1, old[2].ID)
	if e != nil || state.Total != 32990 {
		t.Fatalf("variant cart: %v %v", state, e)
	}
	call("PUT", path, body(saved.Variants[:2], saved.Variants), token("admin"), 409)
	if _, e = db.Exec("UPDATE product_variants SET quantity=quantity-1 WHERE id=$1", old[2].ID); e != nil {
		t.Fatal(e)
	}
	call("PUT", path, body(saved.Variants, saved.Variants), token("admin"), 409)
	current, e := service.Get(context.Background(), int64(created.ID))
	if e != nil {
		t.Fatal(e)
	}
	keep := []models.ProductVariant{current[0].Variants[0], current[0].Variants[2]}
	call("PUT", path, body(keep, current[0].Variants), token("admin"), 200)
	for _, bad := range [][]models.ProductVariant{{{Size: "Casal", Dimensions: "x", Price: 10, Stock: 1}, {Size: " casal ", Dimensions: "x", Price: 20, Stock: 1}}, {{Size: "Novo", Dimensions: "", Price: 20, Stock: 1}}, {{Size: "Novo", Dimensions: "x", Price: -1, Stock: 1}}, {{Size: "Novo", Dimensions: "x", Price: 20, Stock: -1}}} {
		request.Variants = bad
		call("POST", "/products", request, token("admin"), 400)
	}
	var count int
	if e = db.QueryRow("SELECT count(*) FROM products").Scan(&count); e != nil || count != 1 {
		t.Fatal("invalid create left partial products")
	}
	request.Variants = nil
	quantity := int32(2)
	id, e := service.Create(context.Background(), request, &quantity)
	if e != nil {
		t.Fatal(e)
	}
	if _, e = cart.Apply(context.Background(), 1, "add", int64(id), 1); e != nil {
		t.Fatal(e)
	}
	call("PUT", fmt.Sprintf("/admin/products/%d/variants", id), body(items, []models.ProductVariant{}), token("admin"), 409)
	simplePath := fmt.Sprintf("/admin/products/%d/variants", id)
	var simpleSKU string
	if e = db.QueryRow("SELECT sku FROM products WHERE id=$1", id).Scan(&simpleSKU); e != nil {
		t.Fatal(e)
	}
	change := map[string]any{"variants": []models.ProductVariant{}, "expected_variants": []models.ProductVariant{}, "commerce": models.ProductCommerceChange{Price: 99.90, Quantity: 5, ExpectedPrice: request.Price, ExpectedQuantity: 2}}
	call("PUT", simplePath, change, token("admin"), 200)
	call("PUT", simplePath, change, token("admin"), 409)
	var gotPrice float64
	var gotQuantity int
	var gotSKU string
	if e = db.QueryRow("SELECT price,quantity,sku FROM products WHERE id=$1", id).Scan(&gotPrice, &gotQuantity, &gotSKU); e != nil || gotPrice != 99.90 || gotQuantity != 5 || gotSKU != simpleSKU {
		t.Fatal("simple commerce or SKU mismatch")
	}
	change["commerce"] = models.ProductCommerceChange{Price: -1, Quantity: 5, ExpectedPrice: 99.90, ExpectedQuantity: 5}
	call("PUT", simplePath, change, token("admin"), 400)

}
