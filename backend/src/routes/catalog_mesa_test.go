package routes

import (
	"backend/src/handlers"
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/services"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"testing"
	"time"
)

func TestCatalogMesaPostgres(t *testing.T) {
	database, err := openTestDatabase(t)
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()
	database.SetMaxOpenConns(1)
	execute := func(q string) {
		t.Helper()
		if _, err := database.Exec(q); err != nil {
			t.Fatal(err)
		}
	}
	read := func(q string) string {
		t.Helper()
		var s string
		if err := database.QueryRow(q).Scan(&s); err != nil {
			t.Fatal(err)
		}
		return s
	}
	schema := fmt.Sprintf("catalog_mesa_test_%d", time.Now().UnixNano())
	execute("CREATE SCHEMA " + schema)
	defer database.Exec("DROP SCHEMA " + schema + " CASCADE")
	execute("SET search_path TO " + schema)
	for _, name := range []string{"000001_initial_schema", "000002_simplify_customer_registration", "000003_cart", "000005_favorites", "000006_checkout", "000051_order_shipping", "000053_checkout_installments", "000007_order_cancellation", "000008_order_cancellation_reason", "000009_account_addresses", "000010_business_phone", "000011_user_cnpj", "000013_product_variants", "000024_catalog_brand_editorial", "000048_product_external_sku"} {
		b, err := os.ReadFile("../../migrations/" + name + ".up.sql")
		if err != nil {
			t.Fatal(err)
		}
		execute(string(b))
	}
	execute(`INSERT INTO brands(name) VALUES('Box Enxovais'); INSERT INTO products(name,price,quantity,status) VALUES('Produto anterior',40,7,'active'); INSERT INTO users(id,full_name,email,password) VALUES(1,'Teste Mesa','mesa@example.test','unused')`)
	migration := func(direction string) string {
		t.Helper()
		b, err := os.ReadFile("../../migrations/000040_catalog_mesa." + direction + ".sql")
		if err != nil {
			t.Fatal(err)
		}
		return string(b)
	}
	before := read("SELECT jsonb_agg(to_jsonb(p) ORDER BY id)::text FROM products p")
	execute(migration("up"))
	if read("SELECT count(*)::text FROM catalog_mesa_seed_000040") != "10" || read("SELECT count(*)::text FROM product_variants") != "0" {
		t.Fatal("catalog counts")
	}
	execute("ALTER TABLE catalog_mesa_seed_000040 RENAME TO saved_products; ALTER TABLE catalog_mesa_category_000040 RENAME TO saved_categories")
	execute(migration("up"))
	if read("SELECT count(*)::text FROM catalog_mesa_seed_000040") != "0" || read("SELECT count(*)::text FROM products") != "11" {
		t.Fatal("duplicate import")
	}
	execute("DROP TABLE catalog_mesa_seed_000040,catalog_mesa_category_000040; ALTER TABLE saved_products RENAME TO catalog_mesa_seed_000040; ALTER TABLE saved_categories RENAME TO catalog_mesa_category_000040")
	execute(migration("down"))
	if read("SELECT jsonb_agg(to_jsonb(p) ORDER BY id)::text FROM products p") != before {
		t.Fatal("rollback changed existing products")
	}
	execute(migration("up"))
	mux := http.NewServeMux()
	InitRoutesProducts(mux, handlers.ProductHandler{Service: services.ProductService{Store: repositories.ProductRepository{DB: database}}}, handlers.ProductImageHandler{})
	get := func(path string) []byte {
		t.Helper()
		r := httptest.NewRecorder()
		mux.ServeHTTP(r, httptest.NewRequest(http.MethodGet, path, nil))
		if r.Code != 200 {
			t.Fatalf("%s: %d %s", path, r.Code, r.Body)
		}
		return r.Body.Bytes()
	}
	page := func(filters string, want int) []models.Product {
		t.Helper()
		var r struct{ Items []models.Product }
		if err := json.Unmarshal(get("/products?category_name=Mesa&limit=100"+filters), &r); err != nil {
			t.Fatal(err)
		}
		if len(r.Items) != want {
			t.Fatalf("%s: got %d want %d", filters, len(r.Items), want)
		}
		return r.Items
	}
	products := page("", 10)
	var manifest []struct {
		Name        string `json:"nome"`
		Price       int    `json:"preco_centavos"`
		Stock       int    `json:"estoque"`
		Key         string
		Description string
		Summary     string
		Care        string
		Attributes  map[string]string
		Images      []struct{ File string }
	}
	data, err := os.ReadFile("../../demo-assets/mesa-2026/catalogo.json")
	if err != nil {
		t.Fatal(err)
	}
	if err = json.Unmarshal(data, &manifest); err != nil {
		t.Fatal(err)
	}
	for _, p := range products {
		matched := false
		for _, m := range manifest {
			if p.Measurements["catalog_import_key"] != m.Key {
				continue
			}
			matched = true
			if p.Name != m.Name || p.Price != float64(m.Price)/100 || p.Quantity != m.Stock || p.BrandName != "Box Enxovais" || len(p.Variants) != 0 || len(p.ImagePaths) != len(m.Images) || p.Description == nil || *p.Description != m.Description || p.PurchaseSummary == nil || *p.PurchaseSummary != m.Summary || p.CareInstructions == nil || strings.ReplaceAll(*p.CareInstructions, "\r\n", "\n") != m.Care {
				t.Fatalf("manifest mismatch: %s", m.Name)
			}
			for k, v := range m.Attributes {
				if p.Measurements[k] != v {
					t.Fatalf("attribute %s %s", m.Name, k)
				}
			}
			for i, im := range m.Images {
				if p.ImagePaths[i] != "uploads/"+im.File {
					t.Fatal("gallery order")
				}
				if _, err := os.Stat("../../uploads/" + im.File); err != nil {
					t.Fatal(err)
				}
			}
		}
		if !matched {
			t.Fatal("missing manifest product")
		}
		var detail models.Product
		if err := json.Unmarshal(get(fmt.Sprintf("/products/%d", p.ID)), &detail); err != nil || detail.Name != p.Name {
			t.Fatal("detail", err)
		}
	}
	page("&type="+url.QueryEscape("Toalhas de mesa"), 3)
	page("&type="+url.QueryEscape("Caminhos de mesa"), 3)
	page("&type="+url.QueryEscape("Jogos americanos"), 4)
	page("&color="+url.QueryEscape("Verde oliva")+"&collection=mesa-essencia-oliva", 3)
	page("&price__lte=85&stock__gte=1", 3)
	page("&name__contains=inexistente", 0)
	sorted := page("&sort=price_desc", 10)
	for i := 1; i < len(sorted); i++ {
		if sorted[i].Price > sorted[i-1].Price {
			t.Fatal("sort")
		}
	}
	olive := page("&type="+url.QueryEscape("Toalhas de mesa")+"&color="+url.QueryEscape("Verde oliva"), 1)[0]
	execute(fmt.Sprintf("UPDATE products SET quantity=0 WHERE measurements->>'Tipo'='Caminhos de mesa' AND measurements->>'Cor'='Verde oliva'"))
	var related []models.Product
	if err := json.Unmarshal(get(fmt.Sprintf("/products/%d/related", olive.ID)), &related); err != nil || len(related) == 0 || related[0].Measurements["collection_slug"] != "mesa-essencia-oliva" || related[0].Measurements["Tipo"] == olive.Measurements["Tipo"] {
		t.Fatal("complementary recommendations", err)
	}
	for _, p := range related {
		if p.Quantity <= 0 || p.ID == olive.ID {
			t.Fatal("unavailable/self recommendation")
		}
	}
	cart := repositories.CartRepository{DB: database}
	state, err := cart.Apply(context.Background(), 1, "add", olive.ID, 1)
	if err != nil || len(state.Items) != 1 || state.Items[0].VariantID != 0 {
		t.Fatal("cart", err)
	}
	stockSQL := fmt.Sprintf("SELECT quantity::text FROM products WHERE id=%d", olive.ID)
	if read(stockSQL) != "8" {
		t.Fatal("cart reserved stock")
	}
	if _, err := database.Exec(migration("down")); err == nil {
		t.Fatal("unsafe rollback accepted")
	}
	execute("ROLLBACK")
	ensureCheckoutCoverage(t, database)
	checkout := repositories.CheckoutRepository{DB: database}
	request := models.CheckoutRequest{Address: coveredCheckoutAddress(), RequestKey: "mesa-checkout", PaymentMethod: "pix", ExpectedTotalCents: 15990}
	order, err := checkout.Create(context.Background(), 1, request)
	if err != nil {
		t.Fatal(err)
	}
	if read(stockSQL) != "7" {
		t.Fatal("checkout stock")
	}
	repeated, err := checkout.Create(context.Background(), 1, request)
	if err != nil || repeated.ID != order.ID || read(stockSQL) != "7" {
		t.Fatal("idempotency", err)
	}
	if !strings.Contains(read(fmt.Sprintf("SELECT name FROM checkout_order_items WHERE order_id=%d", order.ID)), "Toalha de Mesa") {
		t.Fatal("order snapshot")
	}
	if _, _, err := checkout.CancelOrder(context.Background(), 1, order.ID, models.CancellationReason{ReasonCode: "wrong_product"}); err != nil {
		t.Fatal(err)
	}
	if read(stockSQL) != "8" {
		t.Fatal("cancel stock")
	}
}
