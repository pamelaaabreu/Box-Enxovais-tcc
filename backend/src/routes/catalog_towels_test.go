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

func TestCatalogTowelsPostgres(t *testing.T) {
	database, err := openTestDatabase(t)
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()
	database.SetMaxOpenConns(1)
	schema := fmt.Sprintf("catalog_towels_test_%d", time.Now().UnixNano())
	execute := func(statement string) {
		t.Helper()
		if _, err := database.Exec(statement); err != nil {
			t.Fatal(err)
		}
	}
	execute("CREATE SCHEMA " + schema)
	defer database.Exec("DROP SCHEMA " + schema + " CASCADE")
	execute("SET search_path TO " + schema)
	for _, name := range []string{
		"000001_initial_schema", "000002_simplify_customer_registration", "000003_cart",
		"000005_favorites", "000006_checkout", "000007_order_cancellation", "000008_order_cancellation_reason",
		"000009_account_addresses", "000010_business_phone", "000011_user_cnpj", "000013_product_variants",
		"000024_catalog_brand_editorial", "000048_product_external_sku",
	} {
		content, err := os.ReadFile("../../migrations/" + name + ".up.sql")
		if err != nil {
			t.Fatal(err)
		}
		execute(string(content))
	}
	execute(`INSERT INTO brands(name) VALUES('Box Enxovais');
 INSERT INTO product_types(name) VALUES('Cama / Colchas e cobre-leitos');
 INSERT INTO products(name,price,quantity,status,product_type_id)
 SELECT 'Toalha de Banho Premium 100% Algodão',10,2,'inactive',id FROM product_types;
 INSERT INTO users(id,full_name,email,password) VALUES(1,'Teste','toalhas@example.test','unused');`)
	up, err := os.ReadFile("../../migrations/000038_catalog_towels.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	down, err := os.ReadFile("../../migrations/000038_catalog_towels.down.sql")
	if err != nil {
		t.Fatal(err)
	}
	read := func(query string) string {
		t.Helper()
		var value string
		if err := database.QueryRow(query).Scan(&value); err != nil {
			t.Fatal(err)
		}
		return value
	}
	before := read("SELECT jsonb_agg(to_jsonb(p) ORDER BY id)::text FROM products p")
	execute(string(up))
	if read("SELECT count(*)::text FROM catalog_towel_seed_000038") != "10" ||
		read("SELECT count(*)::text FROM product_images") != "50" ||
		read("SELECT count(*)::text FROM product_variants") != "0" {
		t.Fatal("unexpected catalog count")
	}
	execute("ALTER TABLE catalog_towel_seed_000038 RENAME TO saved_products; ALTER TABLE catalog_towel_category_000038 RENAME TO saved_categories; ALTER TABLE catalog_towel_legacy_000038 RENAME TO saved_legacy")
	execute(string(up))
	if read("SELECT count(*)::text FROM catalog_towel_seed_000038") != "0" || read("SELECT count(*)::text FROM products") != "11" {
		t.Fatal("duplicate import")
	}
	execute("DROP TABLE catalog_towel_seed_000038,catalog_towel_category_000038,catalog_towel_legacy_000038; ALTER TABLE saved_products RENAME TO catalog_towel_seed_000038; ALTER TABLE saved_categories RENAME TO catalog_towel_category_000038; ALTER TABLE saved_legacy RENAME TO catalog_towel_legacy_000038")
	execute(string(down))
	if read("SELECT jsonb_agg(to_jsonb(p) ORDER BY id)::text FROM products p") != before {
		t.Fatal("rollback changed existing products")
	}
	execute(string(up))
	mux := http.NewServeMux()
	InitRoutesProducts(mux, handlers.ProductHandler{Service: services.ProductService{Store: repositories.ProductRepository{DB: database}}}, handlers.ProductImageHandler{})
	get := func(path string) []byte {
		t.Helper()
		response := httptest.NewRecorder()
		mux.ServeHTTP(response, httptest.NewRequest(http.MethodGet, path, nil))
		if response.Code != http.StatusOK {
			t.Fatalf("%s: %d %s", path, response.Code, response.Body)
		}
		return response.Body.Bytes()
	}
	page := func(filters string, want int) []models.Product {
		t.Helper()
		var result struct{ Items []models.Product }
		if err := json.Unmarshal(get("/products?limit=100"+filters), &result); err != nil {
			t.Fatal(err)
		}
		if len(result.Items) != want {
			t.Fatalf("filter %s: got %d want %d", filters, len(result.Items), want)
		}
		return result.Items
	}
	towels := page("&category_name=Toalhas", 10)
	var manifest struct {
		Items []struct {
			ID         string
			Name       string
			Price      int
			Stock      int
			Color      string
			GSM        int
			Dimensions string
			Pieces     []string
			Summary    string
			Detail     string
			Material   string
			Kind       string
			Care       []string
		}
	}
	catalog, err := os.ReadFile("../../demo-assets/toalhas-2026/catalogo.json")
	if err != nil {
		t.Fatal(err)
	}
	if err := json.Unmarshal(catalog, &manifest); err != nil {
		t.Fatal(err)
	}
	if len(manifest.Items) != 10 {
		t.Fatal("manifest must contain ten SKUs")
	}
	for _, product := range towels {
		matched := false
		for _, item := range manifest.Items {
			if product.Measurements["catalog_import_key"] != "toalhas-2026-"+item.ID {
				continue
			}
			matched = true
			if product.Name != item.Name || product.Price != float64(item.Price)/100 ||
				product.Quantity != item.Stock || product.BrandName != "Box Enxovais" ||
				product.Measurements["Cor"] != item.Color || product.Measurements["Tipo"] != item.Kind ||
				product.Measurements["Gramatura"] != fmt.Sprintf("%d g/m²", item.GSM) ||
				product.Measurements["Dimensões"] != item.Dimensions ||
				product.Measurements["Conteúdo"] != strings.Join(item.Pieces, "; ") ||
				product.Description == nil || *product.Description != item.Detail ||
				product.PurchaseSummary == nil || *product.PurchaseSummary != item.Summary ||
				product.CareInstructions == nil || *product.CareInstructions != strings.Join(item.Care, "\n") {
				t.Fatalf("manifest mismatch for %s", item.ID)
			}
		}
		if !matched {
			t.Fatal("unexpected towel")
		}
		if len(product.ImagePaths) != 5 || len(product.Variants) != 0 ||
			product.Measurements["Material"] != "100% algodão" || product.Measurements["Gramatura"] == "" {
			t.Fatalf("incomplete towel %d", product.ID)
		}
		var detail models.Product
		if err := json.Unmarshal(get(fmt.Sprintf("/products/%d", product.ID)), &detail); err != nil || detail.Name != product.Name {
			t.Fatal("detail mismatch", err)
		}
	}
	unit := page("&type="+url.QueryEscape("Toalha de banho"), 3)
	page("&color="+url.QueryEscape("Azul pó"), 1)
	page("&collection=toalhas-salvia", 2)
	page("&category_name=Toalhas&price__lte=90&stock__gte=1", 3)
	sorted := page("&category_name=Toalhas&sort=price_desc", 10)
	for i := 1; i < len(sorted); i++ {
		if sorted[i].Price > sorted[i-1].Price {
			t.Fatal("sorting")
		}
	}
	page("&category_name=Toalhas&name__contains=missing", 0)
	sage := page("&color="+url.QueryEscape("Verde sálvia"), 1)[0]
	var related []models.Product
	if err := json.Unmarshal(get(fmt.Sprintf("/products/%d/related", sage.ID)), &related); err != nil {
		t.Fatal(err)
	}
	if len(related) == 0 || !strings.Contains(related[0].Name, "Sálvia e Creme") {
		t.Fatal("coordinated towel recommendation")
	}
	cart := repositories.CartRepository{DB: database}
	state, err := cart.Apply(context.Background(), 1, "add", unit[0].ID, 1)
	if err != nil || len(state.Items) != 1 || state.Items[0].VariantID != 0 {
		t.Fatal("fixed composition cart", err)
	}
	quantity := read(fmt.Sprintf("SELECT quantity::text FROM products WHERE id=%d", unit[0].ID))
	if quantity != "12" {
		t.Fatal("cart consumed stock")
	}
	if _, err := database.Exec(string(down)); err == nil {
		t.Fatal("rollback accepted a used product")
	}
	execute("ROLLBACK")
	checkout := repositories.CheckoutRepository{DB: database}
	order, err := checkout.Create(context.Background(), 1, models.CheckoutRequest{
		RequestKey: "towels-fixed-composition", PaymentMethod: "pix", ExpectedTotalCents: int64(unit[0].Price * 100),
	})
	if err != nil {
		t.Fatal(err)
	}
	if read(fmt.Sprintf("SELECT quantity::text FROM products WHERE id=%d", unit[0].ID)) != "11" {
		t.Fatal("checkout stock")
	}
	if _, _, err := checkout.CancelOrder(context.Background(), 1, order.ID, models.CancellationReason{ReasonCode: "wrong_product"}); err != nil {
		t.Fatal(err)
	}
	if read(fmt.Sprintf("SELECT quantity::text FROM products WHERE id=%d", unit[0].ID)) != "12" {
		t.Fatal("cancel did not restore stock")
	}
}
