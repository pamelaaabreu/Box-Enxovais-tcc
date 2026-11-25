package repositories

import (
	"context"
	"database/sql"
	"errors"
	"github.com/lib/pq"
	"math"
)

// As colunas quantity são integer no PostgreSQL, mesmo usando int64 nos cálculos.
const maxPostgresStockQuantity int64 = math.MaxInt32

type restockItem struct {
	ProductID int64
	VariantID int64
	Quantity  int64
}

func readRestockItems(ctx context.Context, query queryReader, orderID int64) ([]restockItem, error) {
	rows, err := query.QueryContext(ctx, `
SELECT
    product_id,
    COALESCE(variant_id, 0),
    SUM(quantity)
FROM checkout_order_items
WHERE order_id = $1
GROUP BY product_id,
    variant_id
ORDER BY product_id,
    variant_id
`, orderID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []restockItem{}
	for rows.Next() {
		var item restockItem
		if err = rows.Scan(&item.ProductID, &item.VariantID, &item.Quantity); err != nil {
			return nil, err
		}
		if item.Quantity <= 0 || item.Quantity > maxPostgresStockQuantity {
			return nil, ErrOrderRestock
		}
		items = append(items, item)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	if err = rows.Close(); err != nil {
		return nil, err
	}
	if len(items) == 0 {
		return nil, ErrOrderRestock
	}
	return items, nil
}
func lockRestockProducts(ctx context.Context, tx *sql.Tx, items []restockItem) error {
	productIDs := make([]int64, 0, len(items))
	seen := map[int64]bool{}
	for _, item := range items {
		if !seen[item.ProductID] {
			productIDs = append(productIDs, item.ProductID)
			seen[item.ProductID] = true
		}
	}
	rows, err := tx.QueryContext(ctx, `SELECT id FROM products WHERE id=ANY($1) ORDER BY id FOR UPDATE`, pq.Array(productIDs))
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var productID int64
		if err = rows.Scan(&productID); err != nil {
			return err
		}
	}
	if err = rows.Err(); err != nil {
		return err
	}
	return rows.Close()
}
func restoreStockItem(ctx context.Context, tx *sql.Tx, item restockItem) error {
	var result sql.Result
	var err error
	if item.VariantID > 0 {
		result, err = tx.ExecContext(ctx, `
UPDATE product_variants
SET quantity = quantity + $1
WHERE id = $2
    AND product_id = $3
    AND quantity::bigint <= $4::bigint - $1
`, item.Quantity, item.VariantID, item.ProductID, maxPostgresStockQuantity)
	} else {
		result, err = tx.ExecContext(ctx, `
UPDATE products
SET quantity = quantity + $1,
updated_at = NOW()
WHERE id = $2
    AND quantity::bigint <= $3::bigint - $1
`, item.Quantity, item.ProductID, maxPostgresStockQuantity)
	}
	if err != nil {
		return err
	}
	if err = requireOneRow(result); errors.Is(err, sql.ErrNoRows) || errors.Is(err, ErrUnexpectedRows) {
		return ErrOrderRestock
	}
	return err
}
func restoreOrderStock(ctx context.Context, tx *sql.Tx, orderID int64) error {
	items, err := readRestockItems(ctx, tx, orderID)
	if err != nil {
		return err
	}
	// Mesmo protocolo do checkout: todos os produtos por ID antes das variantes.
	if err = lockRestockProducts(ctx, tx, items); err != nil {
		return err
	}
	for _, item := range items {
		if err = restoreStockItem(ctx, tx, item); err != nil {
			return err
		}
	}
	return nil
}
