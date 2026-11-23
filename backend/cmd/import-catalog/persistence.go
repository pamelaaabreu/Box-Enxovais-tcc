package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/lib/pq"
	"os"
	"strings"
)

func resolveCatalogOption(ctx context.Context, tx *sql.Tx, table, name string, create bool) (int, error) {
	if name == "" {
		return 0, nil
	}
	rows, err := tx.QueryContext(ctx, `SELECT id
FROM
`+table+`
WHERE lower(btrim(name)) = lower($1)`, name)
	if err != nil {
		return 0, err
	}
	var id int
	for rows.Next() {
		if id != 0 {
			rows.Close()
			return 0, fmt.Errorf("nome ambíguo: %s", name)
		}
		if err = rows.Scan(&id); err != nil {
			rows.Close()
			return 0, err
		}
	}
	err = rows.Err()
	rows.Close()
	if err != nil || id != 0 || !create {
		return id, err
	}
	err = tx.QueryRowContext(ctx, `INSERT INTO
`+table+"(name) VALUES($1) RETURNING id", name).Scan(&id)
	return id, err
}

func productExists(ctx context.Context, tx *sql.Tx, p manifestProduct) (bool, error) {
	var found bool
	err := tx.QueryRowContext(ctx, `SELECT EXISTS
    (SELECT 1
     FROM products
     WHERE lower(btrim(name)) = lower($1)
     UNION ALL SELECT 1
     FROM product_images
     WHERE starts_with(replace(image_path, chr(92), '/'), 'uploads/catalog-' || $2 || '--'))`, p.Name, p.Key).Scan(&found)
	return found, err
}

func optionalCareInstructions(care string) any {
	if strings.TrimSpace(care) == "" {
		return nil
	}
	return care
}

func applyProduct(ctx context.Context, database *sql.DB, dir string, r preparedProduct, allowCreate bool, schema string) (bool, error) {
	tx, err := database.BeginTx(ctx, nil)
	if err != nil {
		return false, err
	}
	defer tx.Rollback()
	if _, err = tx.ExecContext(ctx, "SET LOCAL search_path TO "+pq.QuoteIdentifier(schema)); err != nil {
		return false, err
	}
	if _, err = tx.ExecContext(ctx, "LOCK TABLE product_types, brands, products, product_images IN SHARE ROW EXCLUSIVE MODE"); err != nil {
		return false, err
	}
	found, err := productExists(ctx, tx, r.manifestProduct)
	if found || err != nil {
		return false, err
	}
	category, err := resolveCatalogOption(ctx, tx, "product_types", r.Category, allowCreate)
	if err != nil {
		return false, err
	}
	brand, err := resolveCatalogOption(ctx, tx, "brands", r.Brand, allowCreate)
	if err != nil {
		return false, err
	}
	if category == 0 || r.Brand != "" && brand == 0 {
		return false, errors.New("cadastros auxiliares ausentes")
	}
	var brandID any
	if brand != 0 {
		brandID = brand
	}
	characteristics, err := json.Marshal(r.Characteristics)
	if err != nil {
		return false, err
	}
	var id int
	price := fmt.Sprintf("%d.%02d", *r.Price/100, *r.Price%100)
	err = tx.QueryRowContext(ctx, `INSERT INTO products (
    name,
    description,
    care_instructions,
    measurements,
    price,
    quantity,
    brand_id,
    product_type_id,
    status
)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
RETURNING id`,
		r.Name, r.Description, optionalCareInstructions(r.Care), characteristics, price, *r.Stock, brandID, category, r.Status).Scan(&id)
	if err != nil {
		return false, err
	}
	if err = os.MkdirAll(dir, 0755); err != nil {
		return false, err
	}
	for _, a := range r.assets {
		if err = writeAsset(dir, a); err != nil {
			return false, err
		}
		_, err = tx.ExecContext(ctx, `INSERT INTO product_images(product_id, image_path, alt_text, is_primary)
VALUES($1,$2,$3,$4)`, id, "uploads/"+a.filename, a.Alt, a.Primary)
		if err != nil {
			return false, err
		}
	}
	// Keep content-addressed files on failure so a retry can reuse them, even if commit status was ambiguous.
	return true, tx.Commit()
}
