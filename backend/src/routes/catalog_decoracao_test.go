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

	"testing"
	"time"
)

func TestCatalogDecoracaoPostgres(t *testing.T) {
	d, e := openTestDatabase(t)
	if e != nil {
		t.Fatal(e)
	}
	defer d.Close()
	d.SetMaxOpenConns(1)
	exec := func(q string) {
		t.Helper()
		if _, e := d.Exec(q); e != nil {
			t.Fatal(e)
		}
	}
	read := func(q string) string {
		t.Helper()
		var s string
		if e := d.QueryRow(q).Scan(&s); e != nil {
			t.Fatal(e)
		}
		return s
	}
	mig := func(n, dir string) string {
		t.Helper()
		b, e := os.ReadFile("../../migrations/" + n + "." + dir + ".sql")
		if e != nil {
			t.Fatal(e)
		}
		return string(b)
	}
	schema := fmt.Sprintf("decor_test_%d", time.Now().UnixNano())
	exec("CREATE SCHEMA " + schema)
	defer d.Exec("DROP SCHEMA " + schema + " CASCADE")
	exec("SET search_path TO " + schema)
	for _, n := range []string{"000001_initial_schema", "000002_simplify_customer_registration", "000003_cart", "000005_favorites", "000006_checkout", "000007_order_cancellation", "000008_order_cancellation_reason", "000009_account_addresses", "000010_business_phone", "000011_user_cnpj", "000013_product_variants", "000024_catalog_brand_editorial"} {
		exec(mig(n, "up"))
	}
	exec("INSERT INTO brands(name) VALUES('Box Enxovais');INSERT INTO products(name,price,quantity,status) VALUES('Legado',10,3,'active'); INSERT INTO users(id,full_name,email,password) VALUES(1,'Teste','decor@example.test','unused')")
	before := read("SELECT jsonb_agg(to_jsonb(p) ORDER BY id)::text FROM products p")
	up := mig("000042_catalog_decoracao", "up")
	down := mig("000042_catalog_decoracao", "down")
	exec(up)
	if read("SELECT count(*)::text FROM catalog_decor_seed_000042") != "22" || read("SELECT count(*)::text FROM product_images") != "66" {
		t.Fatal("counts")
	}
	exec("ALTER TABLE catalog_decor_seed_000042 RENAME TO saved_products;ALTER TABLE catalog_decor_category_000042 RENAME TO saved_categories")
	exec(up)
	if read("SELECT count(*)::text FROM products") != "23" {
		t.Fatal("duplicates")
	}
	exec("DROP TABLE catalog_decor_seed_000042,catalog_decor_category_000042;ALTER TABLE saved_products RENAME TO catalog_decor_seed_000042;ALTER TABLE saved_categories RENAME TO catalog_decor_category_000042")
	exec(down)
	if read("SELECT jsonb_agg(to_jsonb(p) ORDER BY id)::text FROM products p") != before {
		t.Fatal("rollback")
	}
	exec(up)
	mux := http.NewServeMux()
	t.Run("rug_covers_up_down_up", func(t *testing.T) {
		productsBefore := read("SELECT jsonb_agg(to_jsonb(p) ORDER BY id)::text FROM products p")
		imagesBefore := read("SELECT jsonb_agg(to_jsonb(i) ORDER BY id)::text FROM product_images i")
		coverUp := mig("000043_decor_rug_covers", "up")
		coverDown := mig("000043_decor_rug_covers", "down")
		exec(coverUp)
		imagesAfter := read("SELECT jsonb_agg(to_jsonb(i) ORDER BY id)::text FROM product_images i")
		if read("SELECT count(*)::text FROM catalog_decor_cover_000043") != "7" ||
			read("SELECT count(*)::text FROM product_images WHERE image_path LIKE 'uploads/decoracao-tapete-043-%' AND is_primary AND variant_id IS NULL") != "7" ||
			read("SELECT jsonb_agg(to_jsonb(p) ORDER BY id)::text FROM products p") != productsBefore ||
			read("SELECT count(*)::text FROM product_images") != "66" || imagesBefore == imagesAfter {
			t.Fatal("rug cover changes")
		}
		if read("SELECT count(*)::text FROM product_images i JOIN catalog_decor_cover_000043 j ON j.image_id=i.id WHERE (to_jsonb(i)-'image_path') IS DISTINCT FROM (SELECT value-'image_path' FROM jsonb_array_elements('"+imagesBefore+"'::jsonb) WHERE (value->>'id')::integer=i.id)") != "0" {
			t.Fatal("image identity changed")
		}
		exec(coverUp)
		if read("SELECT jsonb_agg(to_jsonb(i) ORDER BY id)::text FROM product_images i") != imagesAfter {
			t.Fatal("cover duplicates")
		}
		exec(coverDown)
		if read("SELECT jsonb_agg(to_jsonb(i) ORDER BY id)::text FROM product_images i") != imagesBefore {
			t.Fatal("cover rollback")
		}
		exec(coverUp)
		if read("SELECT jsonb_agg(to_jsonb(i) ORDER BY id)::text FROM product_images i") != imagesAfter {
			t.Fatal("cover reapply")
		}
		exec(mig("000044_decor_cover_journal_cascade", "up"))
		exec("BEGIN; DELETE FROM product_images WHERE id=(SELECT min(image_id) FROM catalog_decor_cover_000043)")
		if read("SELECT count(*)::text FROM catalog_decor_cover_000043") != "6" {
			t.Fatal("cover journal blocks gallery management")
		}
		exec("ROLLBACK")
		exec(mig("000044_decor_cover_journal_cascade", "down"))
		exec(mig("000044_decor_cover_journal_cascade", "up"))
		geometryBefore := read("SELECT jsonb_agg(to_jsonb(i) ORDER BY id)::text FROM product_images i")
		exec(mig("000046_decor_rug_geometry", "up"))
		if read("SELECT count(*)::text FROM product_images WHERE image_path LIKE 'uploads/decoracao-tapete-046-%'") != "7" {
			t.Fatal("geometry covers")
		}
		exec(mig("000046_decor_rug_geometry", "down"))
		if read("SELECT jsonb_agg(to_jsonb(i) ORDER BY id)::text FROM product_images i") != geometryBefore {
			t.Fatal("geometry rollback")
		}
		exec(mig("000046_decor_rug_geometry", "up"))
		exec(mig("000046_decor_rug_geometry", "down"))
		exec(coverDown)
	})
	InitRoutesProducts(mux, handlers.ProductHandler{Service: services.ProductService{Store: repositories.ProductRepository{DB: d}}}, handlers.ProductImageHandler{})
	page := func(query string, n int) []models.Product {
		t.Helper()
		r := httptest.NewRecorder()
		mux.ServeHTTP(r, httptest.NewRequest("GET", "/products?category_name="+url.QueryEscape("Decoração")+"&limit=100"+query, nil))
		var v struct{ Items []models.Product }
		if r.Code != 200 || json.Unmarshal(r.Body.Bytes(), &v) != nil || len(v.Items) != n {
			t.Fatalf("page %s: %d %s", query, r.Code, r.Body)
		}
		return v.Items
	}
	products := page("", 22)
	var original struct {
		Produtos []struct {
			Codigo    string
			Nome      string
			Price     int `json:"preco_centavos"`
			Estoque   int
			Dimensoes string `json:"dimensoes"`
			Conteudo  string
			Cor       string
		}
	}
	b, e := os.ReadFile("../../demo-assets/decoracao-2026/catalogo-origem.json")
	if e != nil {
		t.Fatal(e)
	}
	if e = json.Unmarshal(b, &original); e != nil {
		t.Fatal(e)
	}
	for _, p := range products {
		matched := false
		for _, m := range original.Produtos {
			if p.Measurements["catalog_import_key"] != "decoracao-2026-"+m.Codigo {
				continue
			}
			matched = true
			if p.Name != m.Nome || p.Price != float64(m.Price)/100 || p.Quantity != m.Estoque || p.Measurements["Dimensões"] != m.Dimensoes || p.Measurements["Conteúdo"] != m.Conteudo || p.Measurements["Cor"] != m.Cor || len(p.ImagePaths) != 3 || len(p.Variants) != 0 {
				t.Fatal("manifest mismatch", m.Codigo)
			}
		}
		if !matched {
			t.Fatal("unknown SKU")
		}
	}

	var editorial struct {
		Products []struct {
			Codigo      string
			Attributes  map[string]string
			Description string
			Summary     string
		}
	}
	file, err := os.ReadFile("../../demo-assets/decoracao-2026/catalogo.json")
	if err != nil || json.Unmarshal(file, &editorial) != nil {
		t.Fatal("editorial manifest")
	}
	for _, product := range products {
		for _, entry := range editorial.Products {
			if product.Measurements["catalog_import_key"] != "decoracao-2026-"+entry.Codigo {
				continue
			}
			for key, value := range entry.Attributes {
				if product.Measurements[key] != value {
					t.Fatal("technical attribute", entry.Codigo, key)
				}
			}
			if product.Description == nil || *product.Description != entry.Description || product.PurchaseSummary == nil || *product.PurchaseSummary != entry.Summary {
				t.Fatal("editorial content")
			}
		}
	}
	page("&type="+url.QueryEscape("Cortinas"), 9)
	page("&opacity=blackout", 2)
	page("&type="+url.QueryEscape("Tapetes para banheiro / saída de box"), 7)
	page("&type="+url.QueryEscape("Tapetes para quarto e sala"), 6)
	page("&name__contains=missing", 0)

	exec("INSERT INTO product_types(name) VALUES('Toalhas'); INSERT INTO products(name,price,quantity,status,product_type_id,measurements) SELECT 'Toalha coordenada',80,8,'active',id,'{\"Cor\":\"Areia\"}' FROM product_types WHERE name='Toalhas'")
	baths := page("&type="+url.QueryEscape("Tapetes para banheiro / saída de box"), 7)
	response := httptest.NewRecorder()
	mux.ServeHTTP(response, httptest.NewRequest("GET", fmt.Sprintf("/products/%d/related", baths[0].ID), nil))
	var related []models.Product
	if response.Code != 200 || json.Unmarshal(response.Body.Bytes(), &related) != nil || len(related) == 0 || related[0].Name != "Toalha coordenada" {
		t.Fatal("bathroom recommendation")
	}
	material := products[0].Measurements["Material"]
	expected := 0
	for _, item := range products {
		if item.Measurements["Material"] == material {
			expected++
		}
	}
	page("&material="+url.QueryEscape(material), expected)
	p := products[0]
	cart := repositories.CartRepository{DB: d}
	state, e := cart.Apply(context.Background(), 1, "add", p.ID, 1)
	if e != nil || len(state.Items) != 1 {
		t.Fatal(e)
	}
	if read(fmt.Sprintf("SELECT quantity::text FROM products WHERE id=%d", p.ID)) != fmt.Sprint(p.Quantity) {
		t.Fatal("cart stock")
	}
	checkout := repositories.CheckoutRepository{DB: d}
	order, e := checkout.Create(context.Background(), 1, models.CheckoutRequest{RequestKey: "decor-test", PaymentMethod: "pix", ExpectedTotalCents: int64(p.Price * 100)})
	if e != nil {
		t.Fatal(e)
	}
	if _, _, e = checkout.CancelOrder(context.Background(), 1, order.ID, models.CancellationReason{ReasonCode: "wrong_product"}); e != nil {
		t.Fatal(e)
	}
	if read(fmt.Sprintf("SELECT quantity::text FROM products WHERE id=%d", p.ID)) != fmt.Sprint(p.Quantity) {
		t.Fatal("restore stock")
	}
	if _, e = d.Exec(down); e == nil {
		t.Fatal("unsafe rollback")
	}
	exec("ROLLBACK")

}
