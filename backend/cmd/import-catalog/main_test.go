package main

import (
	"backend/src/config"
	"backend/src/db"
	"context"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"testing"
	"time"

	"github.com/lib/pq"
)

func fixture(t *testing.T) (string, manifest) {
	t.Helper()
	root := t.TempDir()
	if err := os.WriteFile(filepath.Join(root, "cover.jpg"), []byte{0xff, 0xd8, 0xff, 0xe0}, 0600); err != nil {
		t.Fatal(err)
	}
	price, stock := int64(15990), 0
	return root, manifest{1, []product{{Key: "cama-teste", Name: "Produto teste", Category: "Cama", Brand: "Marca teste", Description: "Descrição", Care: "Cuidados", Characteristics: map[string]string{"Material": "Algodão"}, Price: &price, Stock: &stock, Status: "inactive", Approved: true, Images: []imageEntry{{"cover.jpg", "Capa", true}}}}}
}

func TestDecodeAndPrepare(t *testing.T) {
	for _, raw := range []string{
		"{", `{"version":2,"products":[]}`, `{"version":1,"products":[{"key":"a","name":"A"},{"key":"a","name":"B"}]}`, `{"version":1,"products":[{"key":"a","name":"A","typo":1}]}`,
	} {
		if _, err := decode(strings.NewReader(raw)); err == nil {
			t.Fatalf("accepted %s", raw)
		}
	}
	if _, err := decode(strings.NewReader(`{"version":1,"products":[{"key":"a","name":"A"}]}`)); err != nil {
		t.Fatal(err)
	}
	root, m := fixture(t)
	if got := prepare(root, m)[0]; len(got.pending) > 0 || len(got.assets) != 1 {
		t.Fatalf("unexpected preparation: %v", got.pending)
	}
	m.Products[0].Images = append(m.Products[0].Images, imageEntry{"cover.jpg", "Duplicada", false}, imageEntry{"missing.jpg", "Ausente", false})
	pending := strings.Join(prepare(root, m)[0].pending, " ")
	for _, needle := range []string{"imagem idêntica", "missing.jpg"} {
		if !strings.Contains(pending, needle) {
			t.Fatal(pending)
		}
	}
}

func TestImportIsolatedPostgres(t *testing.T) {
	if os.Getenv("CART_TEST_LOCAL") != "1" {
		t.Skip("set CART_TEST_LOCAL=1")
	}
	cfg, err := config.Load("../../.env")
	if err != nil {
		t.Fatal(err)
	}
	if cfg.Database.Name != "bd_box" || cfg.Database.Host != "localhost" && cfg.Database.Host != "127.0.0.1" && cfg.Database.Host != "::1" {
		t.Fatal("expected local test server")
	}
	ctx := context.Background()
	database, err := db.Open(ctx, cfg.Database)
	if err != nil {
		t.Fatal(err)
	}
	defer database.Close()
	schema := fmt.Sprintf("catalog_import_test_%d", time.Now().UnixNano())
	quoted := pq.QuoteIdentifier(schema)
	if _, err = database.Exec("CREATE SCHEMA " + quoted); err != nil {
		t.Fatal(err)
	}
	defer database.Exec("DROP SCHEMA " + quoted + " CASCADE")
	migration, err := os.ReadFile("../../migrations/000001_initial_schema.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	tx, err := database.Begin()
	if err != nil {
		t.Fatal(err)
	}
	defer tx.Rollback()
	if _, err = tx.Exec("SET LOCAL search_path TO " + quoted); err != nil {
		t.Fatal(err)
	}
	if _, err = tx.Exec(string(migration)); err != nil {
		t.Fatal(err)
	}
	if err = tx.Commit(); err != nil {
		t.Fatal(err)
	}
	root, m := fixture(t)
	r := prepare(root, m)[0]
	dest := t.TempDir()
	if _, err = applyProduct(ctx, database, dest, r, false, schema); err == nil {
		t.Fatal("missing category should block import")
	}
	if err = os.WriteFile(filepath.Join(dest, r.assets[0].filename), []byte("wrong"), 0600); err != nil {
		t.Fatal(err)
	}
	if _, err = applyProduct(ctx, database, dest, r, true, schema); err == nil {
		t.Fatal("conflicting file should roll back")
	}
	var count int
	if err = database.QueryRow("SELECT count(*) FROM " + quoted + ".products").Scan(&count); err != nil || count != 0 {
		t.Fatalf("partial product: %d %v", count, err)
	}
	if err = os.Remove(filepath.Join(dest, r.assets[0].filename)); err != nil {
		t.Fatal(err)
	}
	if created, err := applyProduct(ctx, database, dest, r, true, schema); err != nil || !created {
		t.Fatalf("retry: %t %v", created, err)
	}
	r.Name = "Renomeado no manifesto"
	if created, err := applyProduct(ctx, database, dest, r, true, schema); err != nil || created {
		t.Fatalf("duplicate: %t %v", created, err)
	}
	var material, alt, category, brand string
	var primary bool
	err = database.QueryRow(fmt.Sprintf("SELECT p.measurements->>'Material',i.alt_text,i.is_primary,c.name,b.name FROM %[1]s.products p JOIN %[1]s.product_images i ON i.product_id=p.id JOIN %[1]s.product_types c ON c.id=p.product_type_id JOIN %[1]s.brands b ON b.id=p.brand_id", quoted)).Scan(&material, &alt, &primary, &category, &brand)
	if err != nil || material != "Algodão" || alt != "Capa" || !primary || category != "Cama" || brand != "Marca teste" {
		t.Fatalf("association: %s %s %t %s %s %v", material, alt, primary, category, brand, err)
	}
	second := m.Products[0]
	second.Key += "-azul"
	second.Name += " - Azul"
	second.Images = []imageEntry{{"blue.jpg", "Capa azul", true}}
	if err := os.WriteFile(filepath.Join(root, "blue.jpg"), []byte{0xff, 0xd8, 0xff, 0xe1}, 0600); err != nil {
		t.Fatal(err)
	}
	m.Products = append(m.Products, second)
	blue := prepare(root, m)[1]
	if len(blue.pending) != 0 {
		t.Fatal(blue.pending)
	}
	if created, err := applyProduct(ctx, database, dest, blue, true, schema); err != nil || !created {
		t.Fatalf("second color: %t %v", created, err)
	}
	if created, err := applyProduct(ctx, database, dest, blue, true, schema); err != nil || created {
		t.Fatalf("duplicate color: %t %v", created, err)
	}
	err = database.QueryRow(fmt.Sprintf("SELECT count(DISTINCT product_id) FROM %s.product_images WHERE is_primary", quoted)).Scan(&count)
	if err != nil || count != 2 {
		t.Fatalf("distinct products with primary images: %d %v", count, err)
	}
}
