package routes

import (
	"backend/src/handlers"
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/services"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"github.com/golang-jwt/jwt/v5"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"
)

func TestAdminProductCRUDPostgres(t *testing.T) {
	database, err := openTestDatabase(t)
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()
	database.SetMaxOpenConns(1)
	schema := fmt.Sprintf("product_crud_%d", time.Now().UnixNano())
	if _, err = database.Exec("CREATE SCHEMA " + schema); err != nil {
		t.Fatal(err)
	}
	defer database.Exec("DROP SCHEMA " + schema + " CASCADE")
	if _, err = database.Exec("SET search_path TO " + schema); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"000001_initial_schema", "000002_simplify_customer_registration", "000003_cart", "000005_favorites", "000006_checkout", "000051_order_shipping", "000053_checkout_installments", "000013_product_variants", "000024_catalog_brand_editorial", "000048_product_external_sku", "000050_product_image_order"} {
		data, e := os.ReadFile("../../migrations/" + name + ".up.sql")
		if e != nil {
			t.Fatal(e)
		}
		if _, e = database.Exec(string(data)); e != nil {
			t.Fatal(e)
		}
	}
	if _, err = database.Exec(`INSERT INTO users(id,full_name,email,password) VALUES(1,'Auditoria','crud@example.test','fixture');INSERT INTO brands(id,name) VALUES(1,'Box Enxovais'),(2,'Marca Edição');INSERT INTO product_types(id,name) VALUES(1,'Cama / Edredons'),(2,'Toalhas')`); err != nil {
		t.Fatal(err)
	}
	t.Setenv("JWT_SECRET", "crud-isolated-only")
	bearer := func(role string) string {
		value, e := jwt.NewWithClaims(jwt.SigningMethodHS256, models.Claims{UserID: 1, Role: role, RegisteredClaims: jwt.RegisteredClaims{Issuer: "box-enxovais-api", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))}}).SignedString([]byte("crud-isolated-only"))
		if e != nil {
			t.Fatal(e)
		}
		return value
	}
	admin, customer := bearer("admin"), bearer("customer")
	imagesDir := t.TempDir()
	mux := http.NewServeMux()
	repo := repositories.ProductRepository{DB: database}
	InitRoutesProducts(mux, handlers.ProductHandler{Service: services.ProductService{Store: repo}}, handlers.ProductImageHandler{Service: services.ProductImageService{Store: repositories.ProductImageRepository{DB: database}, Directory: imagesDir}})
	InitRoutesCart(mux, handlers.CartHandler{Store: repositories.CartRepository{DB: database}})
	call := func(method, path string, body any, auth string, want int) *httptest.ResponseRecorder {
		t.Helper()
		data, _ := json.Marshal(body)
		request := httptest.NewRequest(method, path, bytes.NewReader(data))
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
	get := func(id int64) models.Product {
		t.Helper()
		var p models.Product
		w := call("GET", fmt.Sprintf("/admin/products/%d", id), nil, admin, 200)
		if e := json.Unmarshal(w.Body.Bytes(), &p); e != nil {
			t.Fatal(e)
		}
		return p
	}
	create := func(name string, variants []models.ProductVariant) models.Product {
		t.Helper()
		body := map[string]any{"name": name, "price": 129.90, "quantity": 8, "status": "active", "product_type_id": 1, "brand_id": 1, "measurements": map[string]string{"Material": "Algodão", "coordinated_family": "preservada"}, "variants": variants}
		w := call("POST", "/products", body, admin, 201)
		var result struct {
			ID int64 `json:"id"`
		}
		json.Unmarshal(w.Body.Bytes(), &result)
		return get(result.ID)
	}
	request := func(p models.Product) models.ProductUpdateRequest {
		t.Helper()
		value := models.ProductUpdateRequest{Name: p.Name, Description: "Descrição editada", CareInstructions: "Lavar delicadamente", BrandID: p.BrandID, ProductTypeID: *p.ProductTypeID, Status: p.Status, Measurements: p.Measurements, Variants: append([]models.ProductVariant{}, p.Variants...), ExpectedVariants: append([]models.ProductVariant{}, p.Variants...), ExpectedUpdatedAt: p.UpdatedAt}
		if len(p.Variants) == 0 {
			value.Commerce = &models.ProductCommerceChange{Price: p.Price, Quantity: p.Quantity, ExpectedPrice: p.Price, ExpectedQuantity: p.Quantity}
		}
		return value
	}
	simple := create("Produto simples CRUD", nil)
	variant := create("Produto variantes CRUD", []models.ProductVariant{{Size: "Solteiro", Dimensions: "160 × 220 cm", Price: 249.90, Stock: 2}, {Size: "Queen", Dimensions: "240 × 260 cm", Price: 329.90, Stock: 3}})
	t.Run("authorization and strict contracts", func(t *testing.T) {
		for _, method := range []string{"GET", "PATCH", "DELETE"} {
			call(method, fmt.Sprintf("/admin/products/%d", simple.ID), nil, "", 401)
			call(method, fmt.Sprintf("/admin/products/%d", simple.ID), nil, customer, 403)
		}
		for _, method := range []string{"GET", "PUT"} {
			call(method, fmt.Sprintf("/admin/products/%d/images", simple.ID), nil, customer, 403)
		}
		call("PATCH", fmt.Sprintf("/admin/products/%d", simple.ID), map[string]any{"sku": "BX-CHANGED-001"}, admin, 400)
		call("GET", "/admin/products/999999", nil, admin, 404)
	})
	t.Run("edit metadata commerce SKU and conflict rollback", func(t *testing.T) {
		body := request(simple)
		body.Name = "Produto completo revisado"
		body.ProductTypeID = 2
		brand := 2
		body.BrandID = &brand
		body.Measurements = map[string]string{"Material": "Percal", "Cor": "Oliva", "Acabamento": "Barra", "coordinated_family": "preservada"}
		body.Commerce.Price = 159.90
		body.Commerce.Quantity = 5
		call("PATCH", fmt.Sprintf("/admin/products/%d", simple.ID), body, admin, 200)
		actual := get(simple.ID)
		if actual.SKU != simple.SKU || actual.Name != body.Name || actual.Price != 159.90 || actual.Quantity != 5 || actual.Description == nil || *actual.Description != body.Description || *actual.ProductTypeID != 2 || *actual.BrandID != 2 || actual.Measurements["Cor"] != "Oliva" {
			t.Fatal("metadata or SKU not preserved")
		}
		call("PATCH", fmt.Sprintf("/admin/products/%d", simple.ID), body, admin, 409)
		body = request(actual)
		body.Commerce.Price = 0
		call("PATCH", fmt.Sprintf("/admin/products/%d", simple.ID), body, admin, 400)
		body = request(actual)
		body.ProductTypeID = 999999
		call("PATCH", fmt.Sprintf("/admin/products/%d", simple.ID), body, admin, 409)
		if get(simple.ID).Name != actual.Name {
			t.Fatal("failed edit changed product")
		}
	})
	t.Run("atomic existing variant editor", func(t *testing.T) {
		body := request(variant)
		body.Name = "Variantes revisadas"
		body.Variants[0].Price = 259.90
		body.Variants[0].Stock = 6
		call("PATCH", fmt.Sprintf("/admin/products/%d", variant.ID), body, admin, 200)
		actual := get(variant.ID)
		if actual.SKU != variant.SKU || actual.Price != 259.90 || actual.Quantity != 9 || actual.Variants[0].ID != variant.Variants[0].ID {
			t.Fatal("variant data diverged")
		}
		variant = actual
	})
	upload := func(productID int64, variantID *int64, want int) string {
		t.Helper()
		var data bytes.Buffer
		writer := multipart.NewWriter(&data)
		writer.WriteField("productId", strconv.FormatInt(productID, 10))
		if variantID != nil {
			writer.WriteField("variantId", strconv.FormatInt(*variantID, 10))
		}
		part, _ := writer.CreateFormFile("image", "fixture.png")
		png := validPNGFixture(t)
		part.Write(png)
		writer.Close()
		r := httptest.NewRequest("POST", "/upload-image", &data)
		r.Header.Set("Content-Type", writer.FormDataContentType())
		r.Header.Set("Authorization", "Bearer "+admin)
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		if w.Code != want {
			t.Fatalf("upload status %d: %s", w.Code, w.Body.String())
		}
		var result struct {
			Path string `json:"filePath"`
		}
		json.Unmarshal(w.Body.Bytes(), &result)
		return result.Path
	}
	imageList := func(id int64) []models.ProductImage {
		t.Helper()
		w := call("GET", fmt.Sprintf("/admin/products/%d/images", id), nil, admin, 200)
		var images []models.ProductImage
		json.Unmarshal(w.Body.Bytes(), &images)
		return images
	}
	t.Run("upload order primary ownership removal and variant gallery", func(t *testing.T) {
		first := upload(simple.ID, nil, 201)
		second := upload(simple.ID, nil, 201)
		images := imageList(simple.ID)
		if len(images) != 2 {
			t.Fatal("missing images")
		}
		order := models.ProductImageOrder{IDs: []int64{images[1].ID, images[0].ID}, ExpectedIDs: []int64{images[0].ID, images[1].ID}, PrimaryID: images[1].ID}
		call("PUT", fmt.Sprintf("/admin/products/%d/images", simple.ID), order, admin, 200)
		actual := get(simple.ID)
		if actual.ImagePaths[0] != second || actual.ImagePaths[1] != first {
			t.Fatal("public order differs")
		}
		call("PUT", fmt.Sprintf("/admin/products/%d/images", simple.ID), order, admin, 409)
		v := variant.Variants[0].ID
		upload(simple.ID, &v, 409)
		upload(variant.ID, &v, 201)
		if len(get(variant.ID).Variants[0].ImagePaths) != 1 || len(imageList(simple.ID)) != 2 {
			t.Fatal("variant ownership changed")
		}
		foreign := imageList(variant.ID)[0].ID
		call("DELETE", fmt.Sprintf("/admin/products/%d/images/%d", simple.ID, foreign), nil, admin, 404)
		call("DELETE", fmt.Sprintf("/admin/products/%d/images/%d", simple.ID, images[1].ID), nil, admin, 200)
		if len(imageList(simple.ID)) != 1 || get(simple.ID).ImagePaths[0] != first {
			t.Fatal("replacement cover missing")
		}
		if _, e := os.Stat(filepath.Join(imagesDir, filepath.Base(second))); e != nil {
			t.Fatal("asset removed before retention decision")
		}
	})
	t.Run("physical deletion only without references", func(t *testing.T) {
		p := create("Sem vínculos", nil)
		upload(p.ID, nil, 201)
		w := call("DELETE", fmt.Sprintf("/admin/products/%d", p.ID), nil, admin, 200)
		if !strings.Contains(w.Body.String(), "deleted") {
			t.Fatal("not deleted")
		}
		call("GET", fmt.Sprintf("/admin/products/%d", p.ID), nil, admin, 404)
	})
	t.Run("order without foreign key forces archive", func(t *testing.T) {
		p := create("Com histórico", nil)
		var orderID int64
		if e := database.QueryRow(`INSERT INTO checkout_orders(user_id,request_key,address,payment_method,total_cents) VALUES(1,'crud-history','{}','pix',12990) RETURNING id`).Scan(&orderID); e != nil {
			t.Fatal(e)
		}
		if _, e := database.Exec("INSERT INTO checkout_order_items(order_id,product_id,name,quantity,unit_price_cents) VALUES($1,$2,$3,1,12990)", orderID, p.ID, p.Name); e != nil {
			t.Fatal(e)
		}
		w := call("DELETE", fmt.Sprintf("/admin/products/%d", p.ID), nil, admin, 200)
		if !strings.Contains(w.Body.String(), "archived") {
			t.Fatal("history deleted")
		}
		actual := get(p.ID)
		if actual.Status != "archived" || actual.Quantity != p.Quantity || actual.SKU != p.SKU {
			t.Fatal("archive changed commerce")
		}
		var count int
		if e := database.QueryRow("SELECT count(*) FROM checkout_order_items WHERE product_id=$1", p.ID).Scan(&count); e != nil || count != 1 {
			t.Fatal("history missing")
		}
		call("POST", "/cart/items", map[string]any{"productId": p.ID, "quantity": 1}, customer, 409)
		w = call("GET", "/products?search__contains=Com%20histórico", nil, "", 200)
		var page struct {
			Items []models.Product `json:"items"`
		}
		json.Unmarshal(w.Body.Bytes(), &page)
		if len(page.Items) != 0 {
			t.Fatal("archived product listed")
		}
	})
	for _, kind := range []string{"cart", "favorite", "promotion", "other"} {
		t.Run("archive linked "+kind, func(t *testing.T) {
			p := create("Referência "+kind, nil)
			switch kind {
			case "cart":
				_, err = database.Exec("INSERT INTO carts(user_id) VALUES(1) ON CONFLICT(user_id) DO NOTHING")
				if err == nil {
					_, err = database.Exec("INSERT INTO cart_items(cart_id,product_id,quantity) SELECT id,$1,1 FROM carts WHERE user_id=1", p.ID)
				}
			case "favorite":
				_, err = database.Exec("INSERT INTO favorites(user_id,product_id) VALUES(1,$1)", p.ID)
			case "promotion":
				_, err = database.Exec("INSERT INTO promotions(name,status) VALUES('CRUD','active')")
				if err == nil {
					_, err = database.Exec("INSERT INTO promotion_products(promotion_id,product_id,promotional_price) SELECT max(id),$1,100 FROM promotions", p.ID)
				}
			case "other":
				_, err = database.Exec("CREATE TABLE extra_history(product_id INTEGER REFERENCES products(id) ON DELETE CASCADE)")
				if err == nil {
					_, err = database.Exec("INSERT INTO extra_history VALUES($1)", p.ID)
				}
			}
			if err != nil {
				t.Fatal(err)
			}
			call("DELETE", fmt.Sprintf("/admin/products/%d", p.ID), nil, admin, 200)
			if get(p.ID).Status != "archived" {
				t.Fatal("linked product deleted")
			}
		})
	}
	t.Run("image migration rollback preserves commerce", func(t *testing.T) {
		fingerprint := func() string {
			var value string
			if e := database.QueryRow("SELECT md5(string_agg(row_to_json(p)::text,'' ORDER BY id)) FROM products p").Scan(&value); e != nil {
				t.Fatal(e)
			}
			return value
		}
		before := fingerprint()
		for _, direction := range []string{"down", "up"} {
			data, e := os.ReadFile("../../migrations/000050_product_image_order." + direction + ".sql")
			if e != nil {
				t.Fatal(e)
			}
			if _, e = database.Exec(string(data)); e != nil {
				t.Fatal(e)
			}
		}
		if fingerprint() != before {
			t.Fatal("migration changed commerce")
		}
	})
	if err = database.PingContext(context.Background()); err != nil {
		t.Fatal(err)
	}
	t.Run("missing_readback_after_patch", func(t *testing.T) {
		product := create("Readback fixture", nil)
		// An AFTER UPDATE trigger removes an otherwise unreferenced fixture; the edit must not index an empty result.
		if _, err := database.Exec(`CREATE FUNCTION remove_updated_fixture() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN IF NEW.name='Readback fixture' THEN DELETE FROM products WHERE id=NEW.id; END IF; RETURN NEW; END $$; CREATE TRIGGER remove_updated_fixture AFTER UPDATE ON products FOR EACH ROW EXECUTE FUNCTION remove_updated_fixture()`); err != nil {
			t.Fatal(err)
		}
		defer database.Exec(`DROP TRIGGER remove_updated_fixture ON products;DROP FUNCTION remove_updated_fixture();`)
		call("PATCH", fmt.Sprintf("/admin/products/%d", product.ID), request(product), admin, 404)
	})

}
