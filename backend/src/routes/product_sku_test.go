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
	id, err := service.Create(ctx, models.Product{Name: "Código próprio", SKU: " bx-toa-999 ", Price: 20, Status: "active", Measurements: map[string]string{}}, &quantity)
	if err != nil {
		t.Fatal(err)
	}
	detail, err := service.Get(ctx, int64(id))
	if err != nil || len(detail) != 1 || detail[0].SKU != "BX-TOA-999" {
		t.Fatalf("detail SKU: %v %v", detail, err)
	}
	handler := handlers.ProductHandler{Service: service}
	response := httptest.NewRecorder()
	handler.GetProduct(response, httptest.NewRequest("GET", fmt.Sprintf("/products/%d", id), nil))
	if response.Code != 200 || !strings.Contains(response.Body.String(), `"sku":"BX-TOA-999"`) {
		t.Fatalf("detail response: %d %s", response.Code, response.Body.String())
	}
	for _, scenario := range []struct {
		sku    string
		status int
	}{{"BX-TOA-999", 409}, {"BX SKU", 400}} {
		response = httptest.NewRecorder()
		handler.CreateProduct(response, httptest.NewRequest("POST", "/products", strings.NewReader(fmt.Sprintf(`{"name":"Teste","sku":%q,"price":20,"quantity":3,"status":"active"}`, scenario.sku))))
		if response.Code != scenario.status {
			t.Fatalf("HTTP SKU validation: %d", response.Code)
		}
	}
	_, err = service.Create(ctx, models.Product{Name: "Duplicado", SKU: "BX-TOA-999", Price: 20, Status: "active"}, &quantity)
	if !errors.Is(err, services.ErrProductSKUConflict) {
		t.Fatalf("duplicate accepted: %v", err)
	}
	_, err = service.Create(ctx, models.Product{Name: "Inválido", SKU: "BX SKU", Price: 20, Status: "active"}, &quantity)
	if !errors.Is(err, services.ErrProductSKU) {
		t.Fatalf("invalid accepted: %v", err)
	}
	for _, term := range []string{"bx-toa-999", "Código próprio"} {
		query, err := service.ParsePage(url.Values{"search__contains": {term}}, false)
		if err != nil {
			t.Fatal(err)
		}
		page, err := service.List(ctx, query)
		if err != nil || len(page.Items) != 1 || page.Items[0].SKU != "BX-TOA-999" {
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
	id, err = service.Create(ctx, models.Product{Name: "Automático", Price: 20, Status: "active", Measurements: map[string]string{}}, &quantity)
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
