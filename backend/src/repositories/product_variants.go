package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"errors"
	"github.com/lib/pq"
	"strings"
)

var ErrVariantConflict = errors.New("As variações mudaram ou possuem vínculos com carrinhos ou pedidos. Recarregue os dados antes de continuar")

func (repo ProductRepository) SaveVariants(ctx context.Context, productID int64, items, expected []models.ProductVariant, commerce ...*models.ProductCommerceChange) ([]models.ProductVariant, error) {
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()
	result, err := saveVariants(ctx, tx, productID, items, expected, commerce...)
	if err != nil {
		return nil, err
	}
	return result, tx.Commit()
}

func saveVariants(ctx context.Context, tx *sql.Tx, productID int64, items, expected []models.ProductVariant, commerce ...*models.ProductCommerceChange) ([]models.ProductVariant, error) {
	var err error
	var basePrice float64
	var baseStock int
	if err = tx.QueryRowContext(ctx, `SELECT
    price,
    quantity
FROM products
WHERE id = $1
FOR UPDATE`, productID).Scan(&basePrice, &baseStock); err != nil {
		return nil, err
	}
	rows, err := tx.QueryContext(ctx, `SELECT
    id,
    size,
    price,
    quantity,
    COALESCE(dimensions, '')
FROM product_variants
WHERE product_id = $1
ORDER BY id
FOR
UPDATE`, productID)
	if err != nil {
		return nil, err
	}
	current := map[int64]models.ProductVariant{}
	for rows.Next() {
		var v models.ProductVariant
		if err = rows.Scan(&v.ID, &v.Size, &v.Price, &v.Stock, &v.Dimensions); err != nil {
			rows.Close()
			return nil, err
		}
		current[v.ID] = v
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, err
	}
	if len(current) != len(expected) {
		return nil, ErrVariantConflict
	}
	seen := map[int64]bool{}
	for _, v := range expected {
		old, ok := current[v.ID]
		if !ok || seen[v.ID] || old.Size != v.Size || old.Price != v.Price || old.Stock != v.Stock || old.Dimensions != v.Dimensions {
			return nil, ErrVariantConflict
		}
		seen[v.ID] = true
	}
	if len(current) == 0 && len(items) > 0 {
		var linked bool
		if err = tx.QueryRowContext(ctx, `SELECT EXISTS
    (SELECT 1
     FROM cart_items
     WHERE product_id = $1
         AND variant_id IS NULL)
OR EXISTS
    (SELECT 1
     FROM checkout_order_items
     WHERE product_id = $1
         AND variant_id IS NULL)`, productID).Scan(&linked); err != nil {
			return nil, err
		}
		if linked {
			return nil, ErrVariantConflict
		}
	}
	keep := map[int64]bool{}
	for _, v := range items {
		if v.ID != 0 {
			if _, ok := current[v.ID]; !ok {
				return nil, ErrVariantConflict
			}
			keep[v.ID] = true
		}
	}
	for id := range current {
		if !keep[id] {
			if _, err = tx.ExecContext(ctx, `DELETE
FROM product_variants
WHERE product_id = $1
    AND id = $2`, productID, id); err != nil {
				var pg *pq.Error
				if errors.As(err, &pg) && pg.Code == "23503" {
					return nil, ErrVariantConflict
				}
				return nil, err
			}
		}
	}
	if _, err = tx.ExecContext(ctx, `UPDATE product_variants
SET size = '__edit_' || id::text || '_' || txid_current()::text
WHERE product_id = $1`, productID); err != nil {
		return nil, err
	}
	result := make([]models.ProductVariant, 0, len(items))
	stock := 0
	price := basePrice
	for i, v := range items {
		v.Size = strings.TrimSpace(v.Size)
		v.Dimensions = strings.TrimSpace(v.Dimensions)
		if v.ID == 0 {
			err = tx.QueryRowContext(ctx, `INSERT INTO product_variants(product_id, size, price, quantity, dimensions)
VALUES($1,$2,$3,$4,$5)
RETURNING id`, productID, v.Size, v.Price, v.Stock, v.Dimensions).Scan(&v.ID)
		} else {
			_, err = tx.ExecContext(ctx, `UPDATE product_variants
SET size =
    $1,
    price = $2,
    quantity = $3,
    dimensions = $4
WHERE product_id = $5
    AND id = $6`, v.Size, v.Price, v.Stock, v.Dimensions, productID, v.ID)
		}
		if err != nil {
			return nil, err
		}
		stock += v.Stock
		if i == 0 || v.Price < price {
			price = v.Price
		}
		result = append(result, v)
	}
	if len(items) == 0 && len(current) > 0 {
		stock = 0
		first := true
		for _, v := range current {
			stock += v.Stock
			if first || v.Price < price {
				price = v.Price
				first = false
			}
		}
	} else if len(items) == 0 {
		stock = baseStock
	}
	if len(commerce) > 0 && commerce[0] != nil && len(items) == 0 {
		c := commerce[0]
		if len(current) == 0 && (basePrice != c.ExpectedPrice || baseStock != c.ExpectedQuantity) {
			return nil, ErrVariantConflict
		}
		price = c.Price
		stock = c.Quantity
	}
	if _, err = tx.ExecContext(ctx, `UPDATE products
SET
    price = $1,
    quantity = $2,
    updated_at = NOW()
WHERE id = $3`, price, stock, productID); err != nil {
		return nil, err
	}
	return result, nil
}
