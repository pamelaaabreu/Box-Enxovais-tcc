package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/lib/pq"
	"time"
)

var ErrProductConflict = errors.New("O produto foi alterado. Recarregue os dados antes de salvar novamente.")

func (repo ProductRepository) Update(ctx context.Context, id int64, product models.ProductUpdateRequest) error {
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var updated time.Time
	if err = tx.QueryRowContext(ctx, `SELECT updated_at
FROM products
WHERE id = $1
FOR UPDATE`, id).Scan(&updated); err != nil {
		return err
	}
	if !updated.Equal(product.ExpectedUpdatedAt) {
		return ErrProductConflict
	}
	if _, err = saveVariants(ctx, tx, id, product.Variants, product.ExpectedVariants, product.Commerce); err != nil {
		return err
	}
	attributes, err := json.Marshal(product.Measurements)
	if err != nil {
		return err
	}
	_, err = tx.ExecContext(ctx, `
UPDATE products
SET name = $2,
description = $3,
care_instructions = $4,
brand_id = $5,
product_type_id = $6,
status = $7,
measurements = $8,
updated_at = clock_timestamp()
WHERE id = $1
`, id, product.Name, product.Description, product.CareInstructions, product.BrandID, product.ProductTypeID, product.Status, attributes)
	if err != nil {
		return err
	}
	return tx.Commit()
}

func (repo ProductRepository) Remove(ctx context.Context, id int64) (string, error) {
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return "", err
	}
	defer tx.Rollback()
	var status string
	if err = tx.QueryRowContext(ctx, `SELECT status
FROM products
WHERE id = $1
FOR UPDATE`, id).Scan(&status); err != nil {
		return "", err
	}
	var linked bool
	if err = tx.QueryRowContext(ctx, `
SELECT
    EXISTS (
    SELECT
        1
    FROM checkout_order_items
    WHERE product_id = $1
)
`, id).Scan(&linked); err != nil {
		return "", err
	}
	rows, err := tx.QueryContext(ctx, `
SELECT
    DISTINCT ns.nspname,
    t.relname,
    a.attname,
    c.confrelid = 'product_variants'::regclass
FROM pg_constraint c
JOIN pg_class t ON t.oid = c.conrelid
JOIN pg_namespace ns ON ns.oid = t.relnamespace
CROSS JOIN LATERAL unnest(c.conkey, c.confkey) AS key(local_id, foreign_id)
JOIN pg_attribute a ON a.attrelid = c.conrelid
    AND a.attnum = key.local_id
JOIN pg_attribute target ON target.attrelid = c.confrelid
    AND target.attnum = key.foreign_id
WHERE c.contype = 'f'
    AND c.confrelid IN ('products'::regclass,
'product_variants'::regclass)
    AND c.conrelid NOT IN ('product_images'::regclass,
'product_variants'::regclass)
    AND target.attname = 'id'
`)
	if err != nil {
		return "", err
	}
	type reference struct {
		schema  string
		table   string
		column  string
		variant bool
	}
	refs := []reference{}
	for rows.Next() {
		var ref reference
		if err = rows.Scan(&ref.schema, &ref.table, &ref.column, &ref.variant); err != nil {
			rows.Close()
			return "", err
		}
		refs = append(refs, ref)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return "", err
	}
	for _, ref := range refs {
		where := pq.QuoteIdentifier(ref.column) + "=$1"
		if ref.variant {
			where = pq.QuoteIdentifier(ref.column) + `
IN
    (SELECT id
     FROM product_variants
     WHERE product_id = $1)`
		}
		var exists bool
		if err = tx.QueryRowContext(ctx, fmt.Sprintf(`SELECT EXISTS
    (SELECT 1
     FROM %s.%s
     WHERE %s)`, pq.QuoteIdentifier(ref.schema), pq.QuoteIdentifier(ref.table), where), id).Scan(&exists); err != nil {
			return "", err
		}
		linked = linked || exists
	}
	action := "deleted"
	if linked {
		action = "archived"
		_, err = tx.ExecContext(ctx, `
UPDATE products
SET status = 'archived',
updated_at = clock_timestamp()
WHERE id = $1
`, id)
	} else {
		if _, err = tx.ExecContext(ctx, `DELETE
FROM product_images
WHERE product_id = $1`, id); err == nil {
			_, err = tx.ExecContext(ctx, `DELETE
FROM product_variants
WHERE product_id = $1`, id)
		}
		if err == nil {
			_, err = tx.ExecContext(ctx, `DELETE
FROM products
WHERE id = $1`, id)
		}
	}
	if err != nil {
		return "", err
	}
	return action, tx.Commit()
}

func imageScope(ctx context.Context, tx *sql.Tx, productID int64) error {
	var id int64
	return tx.QueryRowContext(ctx, `SELECT id
FROM products
WHERE id = $1
FOR UPDATE`, productID).Scan(&id)
}
