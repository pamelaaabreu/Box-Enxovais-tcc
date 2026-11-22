package repositories

import (
	"context"
	"database/sql"
)

type ProductImageRepository struct{ DB *sql.DB }

func (repo ProductImageRepository) Create(ctx context.Context, productID int, path string, variant ...*int64) error {
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err = imageScope(ctx, tx, int64(productID)); err != nil {
		return err
	}
	var id int64
	var ordered bool
	var scope *int64
	if len(variant) > 0 {
		scope = variant[0]
	}
	if scope != nil {
		var valid bool
		if err = tx.QueryRowContext(ctx, `SELECT EXISTS
    (SELECT 1
     FROM product_variants
     WHERE product_id = $1
         AND id = $2)`, productID, *scope).Scan(&valid); err != nil {
			return err
		}
		if !valid {
			return ErrImageConflict
		}
		err = tx.QueryRowContext(ctx, `INSERT INTO product_images(product_id, image_path, variant_id)
VALUES($1,$2,$3) RETURNING
    id,
    to_jsonb(product_images)?'sort_order'`, productID, path, scope).Scan(&id, &ordered)
	} else {
		err = tx.QueryRowContext(ctx, `INSERT INTO product_images(product_id, image_path)
VALUES($1,$2) RETURNING
    id,
    to_jsonb(product_images)?'sort_order'`, productID, path).Scan(&id, &ordered)
	}
	if err != nil {
		return err
	}
	if ordered {
		_, err = tx.ExecContext(ctx, `UPDATE product_images
SET
    sort_order =
    (SELECT COALESCE(max(sort_order), -1) + 1
     FROM product_images
     WHERE product_id = $1
         AND variant_id IS NOT DISTINCT
         FROM $2
         AND id <> $3),
    is_primary = NOT EXISTS
    (SELECT 1
     FROM product_images
     WHERE product_id = $1
         AND variant_id IS NOT DISTINCT
         FROM $2
         AND id <> $3)
WHERE id = $3`, productID, scope, id)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}
