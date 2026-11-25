package routes

import (
	"backend/src/handlers"
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/services"
	"context"
	"errors"
	"fmt"
	"net/http/httptest"
	"net/url"
	"os"
	"strings"
	"sync"
	"testing"
	"time"
)

func TestProductSKUPostgres(t *testing.T) {
	conn, err := openTestDatabase(t)
	if err != nil {
		t.Fatal(err)
	}
	defer conn.Close()
	conn.SetMaxOpenConns(1)
	schema := fmt.Sprintf("product_sku_test_%d", time.Now().UnixNano())
	if _, err = conn.Exec("CREATE SCHEMA " + schema); err != nil {
		t.Fatal(err)
	}
	defer conn.Exec("DROP SCHEMA " + schema + " CASCADE")
	if _, err = conn.Exec("SET search_path TO " + schema); err != nil {
		t.Fatal(err)
	}
	apply := func(name string) {
		t.Helper()
		sql, err := os.ReadFile("../../migrations/" + name + ".sql")
		if err != nil {
			t.Fatal(err)
		}
		if _, err = conn.Exec(string(sql)); err != nil {
			t.Fatal(err)
		}
	}
	for _, name := range []string{"000001_initial_schema.up", "000002_simplify_customer_registration.up", "000003_cart.up", "000006_checkout.up", "000013_product_variants.up", "000024_catalog_brand_editorial.up"} {
		apply(name)
	}
	if _, err = conn.Exec(`INSERT INTO product_types(id,name) VALUES(12,'Cama / Edredons'),(13,'Toalhas'); INSERT INTO products(id,name,price,quantity,product_type_id) VALUES(405,'Edredom teste',239.90,8,12),(706,'Toalha teste',79.90,8,13)`); err != nil {
		t.Fatal(err)
	}
	fingerprint := func() string {
		t.Helper()
		var value string
		if err := conn.QueryRow(`SELECT md5(string_agg((to_jsonb(p)-'sku')::text,',' ORDER BY id)) FROM products p`).Scan(&value); err != nil {
			t.Fatal(err)
		}
		return value
	}
	before := fingerprint()
	apply("000048_product_external_sku.up")
	if before != fingerprint() {
		t.Fatal("commercial data changed")
	}
	var sku string
	if err = conn.QueryRow("SELECT sku FROM products WHERE id=405").Scan(&sku); err != nil || sku != "BX-EDR-001" {
		t.Fatalf("independent SKU backfill: %s %v", sku, err)
	}
	apply("000048_product_external_sku.down")
	if before != fingerprint() {
		t.Fatal("rollback changed commercial data")
	}
	apply("000048_product_external_sku.up")
	service := services.ProductService{Store: repositories.ProductRepository{DB: conn}}
	ctx := context.Background()
	quantity := int32(3)
	categoryID := 13
	id, err := service.Create(ctx, models.Product{ProductTypeID: &categoryID, Name: "Código próprio", SKU: " bx-toa-999 ", Price: 20, Status: "active", Measurements: map[string]string{}}, &quantity)
	if err != nil {
		t.Fatal(err)
	}
	detail, err := service.Get(ctx, int64(id))
	if err != nil || len(detail) != 1 || !strings.HasPrefix(detail[0].SKU, "BX-TOA-") || detail[0].SKU == "BX-TOA-999" {
		t.Fatalf("detail SKU: %v %v", detail, err)
	}
	generatedSKU := detail[0].SKU
	handler := handlers.ProductHandler{Service: service}
	response := httptest.NewRecorder()
	handler.GetProduct(response, httptest.NewRequest("GET", fmt.Sprintf("/products/%d", id), nil))
	if response.Code != 200 || !strings.Contains(response.Body.String(), `"sku":"`+generatedSKU+`"`) {
		t.Fatalf("detail response: %d %s", response.Code, response.Body.String())
	}
	for _, scenario := range []struct {
		sku    string
		status int
	}{{"BX-TOA-999", 201}, {"BX SKU", 201}} {
		response = httptest.NewRecorder()
		handler.CreateProduct(response, httptest.NewRequest("POST", "/products", strings.NewReader(fmt.Sprintf(`{"name":"Teste","product_type_id":13,"sku":%q,"price":20,"quantity":3,"status":"active"}`, scenario.sku))))
		if response.Code != scenario.status {
			t.Fatalf("HTTP SKU validation: %d", response.Code)
		}
	}
	for _, term := range []string{strings.ToLower(generatedSKU), "Código próprio"} {
		query, err := service.ParsePage(url.Values{"search__contains": {term}}, false)
		if err != nil {
			t.Fatal(err)
		}
		page, err := service.List(ctx, query)
		if err != nil || len(page.Items) != 1 || page.Items[0].SKU != generatedSKU {
			t.Fatalf("search %s: %v %v", term, page, err)
		}
	}
	if _, err = conn.Exec("UPDATE products SET name='Nome editado',product_type_id=13,price=249.90,quantity=7,description='Descrição editada' WHERE id=405"); err != nil {
		t.Fatal(err)
	}
	if err = conn.QueryRow("SELECT sku FROM products WHERE id=405").Scan(&sku); err != nil || sku != "BX-EDR-001" {
		t.Fatal("SKU changed when editing commercial fields")
	}
	if _, err = conn.Exec("UPDATE products SET name='Novo nome',product_type_id=13,sku='' WHERE id=405"); err != nil {
		t.Fatal(err)
	}
	if err = conn.QueryRow("SELECT sku FROM products WHERE id=405").Scan(&sku); err != nil || sku != "BX-EDR-001" {
		t.Fatal("SKU changed on update")
	}
	id, err = service.Create(ctx, models.Product{ProductTypeID: &categoryID, Name: "Automático", Price: 20, Status: "active", Measurements: map[string]string{}}, &quantity)
	if err != nil {
		t.Fatal(err)
	}
	if err = conn.QueryRow("SELECT sku FROM products WHERE id=$1", id).Scan(&sku); err != nil || sku == "" {
		t.Fatal("automatic generation failed")
	}
	response = httptest.NewRecorder()
	handler.CreateProduct(response, httptest.NewRequest("POST", "/products", strings.NewReader(`{"name":"Sem SKU manual","price":20,"quantity":3,"status":"active","product_type_id":13}`)))
	if response.Code != 201 {
		t.Fatalf("automatic HTTP creation failed: %d", response.Code)
	}

	t.Run("bounded_collision_retry", func(t *testing.T) {
		if _, err := conn.Exec(`CREATE SEQUENCE retry_sku_counter;
   CREATE FUNCTION force_sku_collision() RETURNS trigger LANGUAGE plpgsql AS $$
   BEGIN
     IF nextval('retry_sku_counter') <= 2 THEN
       RAISE EXCEPTION 'collision fixture' USING ERRCODE='23505',CONSTRAINT='products_sku_key';
     END IF;
     RETURN NEW;
   END $$;
   CREATE TRIGGER aaa_sku_collision BEFORE INSERT ON products FOR EACH ROW EXECUTE FUNCTION force_sku_collision()`); err != nil {
			t.Fatal(err)
		}
		defer conn.Exec(`DROP TRIGGER aaa_sku_collision ON products; DROP FUNCTION force_sku_collision(); DROP SEQUENCE retry_sku_counter`)
		product := models.Product{ProductTypeID: &categoryID, Name: "Retry", Price: 20, Status: "active"}
		if _, err := service.Create(ctx, product, &quantity); err != nil {
			t.Fatalf("retry failed: %v", err)
		}
		var attempts int
		if err := conn.QueryRow(`SELECT last_value FROM retry_sku_counter`).Scan(&attempts); err != nil || attempts != 3 {
			t.Fatalf("attempts=%d err=%v", attempts, err)
		}
		if _, err := conn.Exec(`ALTER SEQUENCE retry_sku_counter RESTART WITH 0 MINVALUE 0; CREATE OR REPLACE FUNCTION force_sku_collision() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN PERFORM nextval('retry_sku_counter'); RAISE EXCEPTION 'collision fixture' USING ERRCODE='23505',CONSTRAINT='products_sku_key'; END $$`); err != nil {
			t.Fatal(err)
		}
		var beforeCount, afterCount int
		if err := conn.QueryRow(`SELECT count(*) FROM products`).Scan(&beforeCount); err != nil {
			t.Fatal(err)
		}
		if _, err := service.Create(ctx, product, &quantity); !errors.Is(err, services.ErrProductSKU) {
			t.Fatalf("expected generation failure: %v", err)
		}
		if err := conn.QueryRow(`SELECT count(*) FROM products`).Scan(&afterCount); err != nil || beforeCount != afterCount {
			t.Fatal("failed retry persisted product")
		}
		if err := conn.QueryRow(`SELECT last_value FROM retry_sku_counter`).Scan(&attempts); err != nil || attempts != 2 {
			t.Fatalf("retry not limited: %d %v", attempts, err)
		}
	})

	parallelDB, err := openTestDatabase(t)
	if err != nil {
		t.Fatal(err)
	}
	defer parallelDB.Close()
	parallelDB.SetMaxOpenConns(8)
	const workers = 24
	results := make(chan string, workers)
	failures := make(chan error, workers)
	var wg sync.WaitGroup
	for i := 0; i < workers; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			tx, err := parallelDB.BeginTx(ctx, nil)
			if err != nil {
				failures <- err
				return
			}
			defer tx.Rollback()
			if _, err = tx.Exec("SET LOCAL search_path TO " + schema); err != nil {
				failures <- err
				return
			}
			var generated string
			if err = tx.QueryRow("INSERT INTO products(name,price,quantity,product_type_id) VALUES($1,20,3,13) RETURNING sku", fmt.Sprintf("Simultâneo %d", i)).Scan(&generated); err != nil {
				failures <- err
				return
			}
			if err = tx.Commit(); err != nil {
				failures <- err
				return
			}
			results <- generated
		}(i)
	}
	wg.Wait()
	close(results)
	close(failures)
	for err := range failures {
		t.Error(err)
	}
	seen := map[string]bool{}
	for generated := range results {
		if !strings.HasPrefix(generated, "BX-TOA-") || seen[generated] {
			t.Errorf("invalid or duplicated automatic SKU: %s", generated)
		}
		seen[generated] = true
	}
	if len(seen) != workers {
		t.Fatalf("expected %d unique concurrent SKUs, got %d", workers, len(seen))
	}

}
