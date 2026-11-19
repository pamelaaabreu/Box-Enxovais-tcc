package routes

import (
	"backend/src/handlers"
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/services"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"
)

func TestMesaGalleryRolesPostgres(t *testing.T) {
	database, err := openTestDatabase(t)
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()
	database.SetMaxOpenConns(1)
	schema := fmt.Sprintf("mesa_gallery_test_%d", time.Now().UnixNano())
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
	migration := func(name, direction string) string {
		t.Helper()
		b, err := os.ReadFile("../../migrations/" + name + "." + direction + ".sql")
		if err != nil {
			t.Fatal(err)
		}
		return string(b)
	}
	execute("CREATE SCHEMA " + schema)
	defer database.Exec("DROP SCHEMA " + schema + " CASCADE")
	execute("SET search_path TO " + schema)
	for _, name := range []string{"000001_initial_schema", "000002_simplify_customer_registration", "000003_cart", "000005_favorites", "000006_checkout", "000007_order_cancellation", "000008_order_cancellation_reason", "000009_account_addresses", "000010_business_phone", "000011_user_cnpj", "000013_product_variants", "000024_catalog_brand_editorial", "000048_product_external_sku"} {
		execute(migration(name, "up"))
	}
	execute("INSERT INTO brands(name) VALUES('Box Enxovais'); INSERT INTO products(name,price,quantity,status) VALUES('Produto preservado',88.9,5,'active'); INSERT INTO product_images(product_id,image_path,is_primary,alt_text) SELECT id,'uploads/preserved.png',true,'Original' FROM products")
	execute(migration("000040_catalog_mesa", "up"))
	productsBefore := read("SELECT jsonb_agg(to_jsonb(p) ORDER BY id)::text FROM products p")
	imagesBefore := read("SELECT jsonb_agg(to_jsonb(i) ORDER BY id)::text FROM product_images i")
	up := migration("000041_mesa_gallery_roles", "up")
	down := migration("000041_mesa_gallery_roles", "down")
	verify := func() {
		t.Helper()
		if read("SELECT jsonb_agg(to_jsonb(p) ORDER BY id)::text FROM products p") != productsBefore {
			t.Fatal("commercial data changed")
		}
		if read("SELECT count(*)::text FROM catalog_mesa_gallery_000041") != "10" {
			t.Fatal("missing products")
		}
		if read("SELECT count(*)::text FROM product_images WHERE product_id IN(SELECT product_id FROM catalog_mesa_gallery_000041)") != "30" {
			t.Fatal("unexpected gallery count")
		}
		if read("SELECT count(*)::text FROM product_images WHERE product_id IN(SELECT product_id FROM catalog_mesa_gallery_000041) AND is_primary") != "10" {
			t.Fatal("primary count")
		}
		mux := http.NewServeMux()
		InitRoutesProducts(mux, handlers.ProductHandler{Service: services.ProductService{Store: repositories.ProductRepository{DB: database}}}, handlers.ProductImageHandler{})
		var ids []int64
		rows, err := database.Query("SELECT product_id FROM catalog_mesa_gallery_000041 ORDER BY product_id")
		if err != nil {
			t.Fatal(err)
		}
		for rows.Next() {
			var id int64
			rows.Scan(&id)
			ids = append(ids, id)
		}
		rows.Close()
		for _, id := range ids {
			r := httptest.NewRecorder()
			mux.ServeHTTP(r, httptest.NewRequest(http.MethodGet, fmt.Sprintf("/products/%d", id), nil))
			var p models.Product
			if r.Code != 200 || json.Unmarshal(r.Body.Bytes(), &p) != nil {
				t.Fatal("product detail")
			}
			key := p.Measurements["catalog_import_key"]
			slug := strings.TrimPrefix(key, "mesa-2026-")
			if len(p.ImagePaths) != 3 || !strings.HasSuffix(p.ImagePaths[2], "-03-trama.png") {
				t.Fatal("detail not preserved", key)
			}
			var mode string
			if err = database.QueryRow("SELECT mode FROM catalog_mesa_gallery_000041 WHERE product_id=$1", id).Scan(&mode); err != nil {
				t.Fatal(err)
			}
			if mode == "objetiva" {
				if p.ImagePaths[0] != "uploads/"+key+"-01.png" || p.ImagePaths[1] != "uploads/mesa-galerias-041-"+slug+"-objetiva.webp" {
					t.Fatal("objective gallery order", key)
				}
			} else if p.ImagePaths[0] != "uploads/mesa-galerias-041-"+slug+"-ambientacao.webp" || p.ImagePaths[1] != "uploads/"+key+"-01.png" {
				t.Fatal("ambient gallery order", key)
			}
		}
	}
	execute(up)
	verify()
	imagesAfter := read("SELECT jsonb_agg(to_jsonb(i) ORDER BY id)::text FROM product_images i")
	execute("ALTER TABLE catalog_mesa_gallery_000041 RENAME TO saved_gallery")
	execute(up)
	if read("SELECT count(*)::text FROM catalog_mesa_gallery_000041") != "0" || read("SELECT jsonb_agg(to_jsonb(i) ORDER BY id)::text FROM product_images i") != imagesAfter {
		t.Fatal("non-idempotent")
	}
	execute("DROP TABLE catalog_mesa_gallery_000041; ALTER TABLE saved_gallery RENAME TO catalog_mesa_gallery_000041")
	execute(down)
	if read("SELECT jsonb_agg(to_jsonb(i) ORDER BY id)::text FROM product_images i") != imagesBefore {
		t.Fatal("down failed to restore gallery")
	}
	execute(up)
	verify()
	execute("UPDATE product_images SET alt_text='Edição posterior' WHERE id=(SELECT min(id) FROM product_images WHERE product_id IN(SELECT product_id FROM catalog_mesa_gallery_000041))")
	if _, err = database.Exec(down); err == nil {
		t.Fatal("down destroyed later image edit")
	}
	execute("ROLLBACK")
}
