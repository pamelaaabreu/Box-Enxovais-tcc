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

func TestCatalogCushionCoversPostgres(t *testing.T) {
	database, err := openTestDatabase(t)
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()
	database.SetMaxOpenConns(1)
	schema := fmt.Sprintf("catalog_cushions_test_%d", time.Now().UnixNano())
	execute := func(sql string) {
		t.Helper()
		if _, err := database.Exec(sql); err != nil {
			t.Fatal(err)
		}
	}
	execute("CREATE SCHEMA " + schema)
	defer database.Exec("DROP SCHEMA " + schema + " CASCADE")
	execute("SET search_path TO " + schema)
	for _, name := range []string{"000001_initial_schema", "000002_simplify_customer_registration", "000003_cart", "000005_favorites", "000006_checkout", "000007_order_cancellation", "000008_order_cancellation_reason", "000009_account_addresses", "000010_business_phone", "000011_user_cnpj", "000013_product_variants", "000024_catalog_brand_editorial", "000048_product_external_sku"} {
		content, err := os.ReadFile("../../migrations/" + name + ".up.sql")
		if err != nil {
			t.Fatal(err)
		}
		execute(string(content))
	}
	execute(`INSERT INTO brands(name) VALUES('Box Enxovais');
 INSERT INTO product_types(name) VALUES('Cama / Mantas e peseiras'),('Cama / Jogos de cama');
 INSERT INTO products(name,price,quantity,status,measurements,product_type_id)
 SELECT 'Manta Oliva',120,8,'active','{"Cor":"Verde oliva"}',id FROM product_types WHERE name='Cama / Mantas e peseiras';
 INSERT INTO products(name,price,quantity,status,measurements,product_type_id)
 SELECT 'Jogo Areia',200,8,'active','{"Cor":"Areia"}',id FROM product_types WHERE name='Cama / Jogos de cama';
 INSERT INTO users(id,full_name,email,password) VALUES(1,'Teste Capas','capas@example.test','unused');`)
	read := func(sql string) string {
		t.Helper()
		var s string
		if err := database.QueryRow(sql).Scan(&s); err != nil {
			t.Fatal(err)
		}
		return s
	}
	up, err := os.ReadFile("../../migrations/000039_catalog_cushion_covers.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	down, err := os.ReadFile("../../migrations/000039_catalog_cushion_covers.down.sql")
	if err != nil {
		t.Fatal(err)
	}
	before := read("SELECT jsonb_agg(to_jsonb(p) ORDER BY id)::text FROM products p")
	execute(string(up))
	if read("SELECT count(*)::text FROM catalog_cushion_seed_000039") != "8" || read("SELECT count(*)::text FROM product_images") != "40" || read("SELECT count(*)::text FROM product_variants") != "0" {
		t.Fatal("unexpected catalog counts")
	}
	execute("ALTER TABLE catalog_cushion_seed_000039 RENAME TO saved_products; ALTER TABLE catalog_cushion_category_000039 RENAME TO saved_categories")
	execute(string(up))
	if read("SELECT count(*)::text FROM catalog_cushion_seed_000039") != "0" || read("SELECT count(*)::text FROM products") != "10" {
		t.Fatal("duplicate import")
	}
	execute("DROP TABLE catalog_cushion_seed_000039,catalog_cushion_category_000039; ALTER TABLE saved_products RENAME TO catalog_cushion_seed_000039; ALTER TABLE saved_categories RENAME TO catalog_cushion_category_000039")
	execute(string(down))
	if read("SELECT jsonb_agg(to_jsonb(p) ORDER BY id)::text FROM products p") != before {
		t.Fatal("rollback changed existing products")
	}
	execute(string(up))
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
		var result struct{ Items []models.Product }
		if err := json.Unmarshal(get("/products?category_name=Almofadas&limit=100"+filters), &result); err != nil {
			t.Fatal(err)
		}
		if len(result.Items) != want {
			t.Fatalf("filter %s: got %d want %d", filters, len(result.Items), want)
		}
		return result.Items
	}
	products := page("", 8)
	var manifest struct {
		Products []struct {
			Slug        string
			Name        string
			PriceCents  int `json:"price_cents"`
			Stock       int
			Color       string
			Size        string
			Contents    string
			Summary     string
			Description string
			Care        []string
			Attributes  map[string]string
		}
	}
	data, err := os.ReadFile("../../demo-assets/almofadas-2026/catalogo.json")
	if err != nil {
		t.Fatal(err)
	}
	if err = json.Unmarshal(data, &manifest); err != nil {
		t.Fatal(err)
	}
	for _, p := range products {
		matched := false
		for _, item := range manifest.Products {
			if p.Measurements["catalog_import_key"] != "almofadas-2026-"+item.Slug {
				continue
			}
			matched = true
			if p.Name != item.Name || p.Price != float64(item.PriceCents)/100 || p.Quantity != item.Stock || p.BrandName != "Box Enxovais" || p.Measurements["Cor"] != item.Color || p.Measurements["Conteúdo"] != item.Contents || p.Measurements["Tamanho"] != strings.ReplaceAll(item.Size, " x ", " × ") || p.Description == nil || *p.Description != item.Description || p.PurchaseSummary == nil || *p.PurchaseSummary != item.Summary || p.CareInstructions == nil || strings.ReplaceAll(*p.CareInstructions, "\r\n", "\n") != strings.Join(item.Care, "\n") {
				t.Fatalf("manifest mismatch %s: name=%t price=%t stock=%t brand=%t color=%t content=%t size=%t description=%t summary=%t care=%t", item.Slug, p.Name == item.Name, p.Price == float64(item.PriceCents)/100, p.Quantity == item.Stock, p.BrandName == "Box Enxovais", p.Measurements["Cor"] == item.Color, p.Measurements["Conteúdo"] == item.Contents, p.Measurements["Tamanho"] == strings.ReplaceAll(item.Size, " x ", " × "), p.Description != nil && *p.Description == item.Description, p.PurchaseSummary != nil && *p.PurchaseSummary == item.Summary, p.CareInstructions != nil && strings.ReplaceAll(*p.CareInstructions, "\r\n", "\n") == strings.Join(item.Care, "\n"))
			}
			for key, value := range item.Attributes {
				if p.Measurements[key] != value {
					t.Fatalf("attribute mismatch %s %s", item.Slug, key)
				}
			}
		}
		if !matched || len(p.ImagePaths) != 5 || len(p.Variants) != 0 {
			t.Fatal("catalog mismatch", p.ID)
		}
		var detail models.Product
		if err = json.Unmarshal(get(fmt.Sprintf("/products/%d", p.ID)), &detail); err != nil || detail.Name != p.Name {
			t.Fatal("detail", err)
		}
	}
	page("&type="+url.QueryEscape("Tricô"), 5)
	page("&type=Retangulares", 3)
	page("&size="+url.QueryEscape("50 × 50 cm"), 3)
	page("&color=Oliva&collection=almofadas-tricot-losangos", 1)
	page("&price__lte=60&stock__gte=1", 3)
	page("&name__contains=inexistente", 0)
	sorted := page("&sort=price_desc", 8)
	for i := 1; i < len(sorted); i++ {
		if sorted[i].Price > sorted[i-1].Price {
			t.Fatal("sorting")
		}
	}
	olive := page("&color=Oliva", 1)[0]
	var related []models.Product
	if err = json.Unmarshal(get(fmt.Sprintf("/products/%d/related", olive.ID)), &related); err != nil || len(related) == 0 || related[0].Name != "Manta Oliva" {
		t.Fatal("coordinated recommendation", err)
	}
	for _, p := range related {
		if p.ID == olive.ID {
			t.Fatal("self recommendation")
		}
	}
	cart := repositories.CartRepository{DB: database}
	state, err := cart.Apply(context.Background(), 1, "add", olive.ID, 1)
	if err != nil || len(state.Items) != 1 || state.Items[0].VariantID != 0 || !strings.HasPrefix(state.Items[0].Name, "Capa de Almofada") {
		t.Fatal("cart", err)
	}
	if read(fmt.Sprintf("SELECT quantity::text FROM products WHERE id=%d", olive.ID)) != "8" {
		t.Fatal("cart consumed stock")
	}
	if _, err = database.Exec(string(down)); err == nil {
		t.Fatal("unsafe rollback accepted")
	}
	execute("ROLLBACK")
	checkout := repositories.CheckoutRepository{DB: database}
	order, err := checkout.Create(context.Background(), 1, models.CheckoutRequest{RequestKey: "cushion-cover-checkout", PaymentMethod: "pix", ExpectedTotalCents: 6990})
	if err != nil {
		t.Fatal(err)
	}
	if read(fmt.Sprintf("SELECT quantity::text FROM products WHERE id=%d", olive.ID)) != "7" {
		t.Fatal("checkout stock")
	}
	if read(fmt.Sprintf("SELECT name FROM checkout_order_items WHERE order_id=%d", order.ID)) != olive.Name {
		t.Fatal("order name")
	}
	if _, _, err = checkout.CancelOrder(context.Background(), 1, order.ID, models.CancellationReason{ReasonCode: "wrong_product"}); err != nil {
		t.Fatal(err)
	}
	if read(fmt.Sprintf("SELECT quantity::text FROM products WHERE id=%d", olive.ID)) != "8" {
		t.Fatal("cancel stock")
	}
}
