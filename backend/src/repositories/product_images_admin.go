package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"errors"
)

var ErrImageConflict = errors.New("A galeria mudou ou contém imagens de outro produto ou variação. Recarregue antes de continuar.")

func (repo ProductImageRepository) List(ctx context.Context, productID int64) ([]models.ProductImage, error) {
	var exists bool
	if err := repo.DB.QueryRowContext(ctx, `SELECT EXISTS
    (SELECT 1
     FROM products
     WHERE id = $1)`, productID).Scan(&exists); err != nil {
		return nil, err
	}
	if !exists {
		return nil, sql.ErrNoRows
	}
	rows, err := repo.DB.QueryContext(ctx, `SELECT
    i.id,
    i.image_path,
    i.variant_id,
    COALESCE(i.is_primary, false),
    COALESCE((to_jsonb(i) ->> 'sort_order')::int, 0)
FROM product_images i
WHERE product_id = $1
ORDER BY
    variant_id NULLS FIRST,
    is_primary DESC NULLS LAST,
    COALESCE((to_jsonb(i) ->> 'sort_order')::int, 0),
    id`, productID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []models.ProductImage{}
	for rows.Next() {
		var image models.ProductImage
		if err = rows.Scan(&image.ID, &image.Path, &image.VariantID, &image.Primary, &image.Position); err != nil {
			return nil, err
		}
		result = append(result, image)
	}
	return result, rows.Err()
}
func (repo ProductImageRepository) Reorder(ctx context.Context, productID int64, order models.ProductImageOrder) error {
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err = imageScope(ctx, tx, productID); err != nil {
		return err
	}
	rows, err := tx.QueryContext(ctx, `SELECT id
FROM product_images
WHERE product_id = $1
    AND variant_id IS NOT DISTINCT
    FROM $2
ORDER BY
    is_primary DESC NULLS LAST,
    sort_order,
    id
FOR
UPDATE`, productID, order.VariantID)
	if err != nil {
		return err
	}
	current := []int64{}
	for rows.Next() {
		var id int64
		if err = rows.Scan(&id); err != nil {
			rows.Close()
			return err
		}
		current = append(current, id)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return err
	}
	if len(current) != len(order.ExpectedIDs) || len(current) != len(order.IDs) || len(current) == 0 {
		return ErrImageConflict
	}
	valid := map[int64]bool{}
	for i, id := range current {
		if order.ExpectedIDs[i] != id {
			return ErrImageConflict
		}
		valid[id] = true
	}
	primary := false
	for position, id := range order.IDs {
		if !valid[id] {
			return ErrImageConflict
		}
		delete(valid, id)
		primary = primary || id == order.PrimaryID
		if _, err = tx.ExecContext(ctx, `UPDATE product_images
SET
    sort_order = $1,
    is_primary = ($2 = $3)
WHERE product_id = $4
    AND id = $2`, position, id, order.PrimaryID, productID); err != nil {
			return err
		}
	}
	if !primary {
		return ErrImageConflict
	}
	return tx.Commit()
}
func (repo ProductImageRepository) Remove(ctx context.Context, productID, imageID int64) error {
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err = imageScope(ctx, tx, productID); err != nil {
		return err
	}
	var variantID *int64
	if err = tx.QueryRowContext(ctx, `DELETE
FROM product_images
WHERE id = $1
    AND product_id = $2 RETURNING variant_id`, imageID, productID).Scan(&variantID); err != nil {
		return err
	}
	if _, err = tx.ExecContext(ctx, `UPDATE product_images
SET is_primary = (id =
                      (SELECT id
                       FROM product_images
                       WHERE product_id = $1
                           AND variant_id IS NOT DISTINCT
                           FROM $2
                       ORDER BY
                           is_primary DESC NULLS LAST,
                           sort_order,
                           id
                       LIMIT 1))
WHERE product_id = $1
    AND variant_id IS NOT DISTINCT
    FROM $2`, productID, variantID); err != nil {
		return err
	}
	return tx.Commit()
}
