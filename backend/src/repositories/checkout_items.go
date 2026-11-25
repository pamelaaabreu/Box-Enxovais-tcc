package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
)

type checkoutItem struct {
	models.CartItem
	OriginalPrice models.Money
	ProductStatus string
	VariantValid  bool
	HasVariants   bool
}

// Ordem global de bloqueios: carrinho, produtos por ID, variantes por produto/ID.
// A consulta financeira ocorre depois dos bloqueios, evitando ler estoque antigo de variante.
func lockCheckoutInventory(ctx context.Context, tx *sql.Tx, cartID int64) error {
	queries := []string{
		`
SELECT
    p.id
FROM products p
WHERE EXISTS (
    SELECT
        1
    FROM cart_items item
    WHERE item.cart_id = $1
        AND item.product_id = p.id
)
ORDER BY p.id FOR UPDATE OF p
`,
		`
SELECT
    variant.id
FROM product_variants variant
JOIN cart_items item ON item.variant_id = variant.id
    AND item.product_id = variant.product_id
WHERE item.cart_id = $1
ORDER BY variant.product_id,
    variant.id FOR UPDATE OF variant
`,
	}
	for _, query := range queries {
		rows, err := tx.QueryContext(ctx, query, cartID)
		if err != nil {
			return err
		}
		for rows.Next() {
			var lockedID int64
			if err = rows.Scan(&lockedID); err != nil {
				rows.Close()
				return err
			}
		}
		err = rows.Err()
		closeErr := rows.Close()
		if err != nil {
			return err
		}
		if closeErr != nil {
			return closeErr
		}
	}
	return nil
}

var checkoutItemsSQL = `
SELECT
    item.id,
    p.id AS product_id,
    COALESCE(item.variant_id, 0) AS variant_id,
    p.name || COALESCE(' — ' || variant.size, '') AS name,
    item.quantity AS requested_quantity,
    COALESCE(variant.quantity, p.quantity) AS available_stock,
    p.status AS product_status,
    (COALESCE(variant.price, p.price) * 100)::bigint AS original_price,
    (COALESCE(variant.price,
` + currentProductPrice + `)*100)::bigint AS unit_price,
    (item.variant_id IS NULL OR variant.id IS NOT NULL) AS variant_valid,
    EXISTS (SELECT 1 FROM product_variants owned WHERE owned.product_id=p.id) AS has_variants
FROM cart_items item
JOIN products p ON p.id=item.product_id
LEFT JOIN product_variants variant ON variant.id=item.variant_id AND variant.product_id=p.id
WHERE item.cart_id=$1
ORDER BY p.id,item.variant_id`

func readCheckoutItems(ctx context.Context, query queryReader, cartID int64) ([]checkoutItem, error) {
	rows, err := query.QueryContext(ctx, checkoutItemsSQL, cartID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []checkoutItem{}
	for rows.Next() {
		var item checkoutItem
		if err = rows.Scan(&item.ID, &item.ProductID, &item.VariantID, &item.Name, &item.Quantity, &item.Stock, &item.ProductStatus, &item.OriginalPrice, &item.UnitPrice, &item.VariantValid, &item.HasVariants); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	if err = rows.Close(); err != nil {
		return nil, err
	}
	return items, nil
}
func validateCheckoutStock(items []checkoutItem) error {
	if len(items) == 0 {
		return ErrCheckoutConflict
	}
	for _, item := range items {
		if item.ProductStatus != "active" || item.Quantity <= 0 || item.Stock < item.Quantity || !item.VariantValid || (item.VariantID == 0 && item.HasVariants) {
			return ErrCheckoutConflict
		}
	}
	return nil
}
func calculateCheckoutPrices(items []checkoutItem) (models.Cart, models.Money, error) {
	current := make([]models.CartItem, 0, len(items))
	original := make([]models.CartItem, 0, len(items))
	for _, item := range items {
		if item.OriginalPrice < item.UnitPrice {
			return models.Cart{}, 0, ErrCheckoutConflict
		}
		priced := item.CartItem
		priced.Available = true
		current = append(current, priced)
		priced.UnitPrice = item.OriginalPrice
		original = append(original, priced)
	}
	// Reutiliza a aritmética protegida do carrinho, inclusive subtotais, unidades e total.
	cart, err := calculateCartTotals(current)
	if err != nil {
		return models.Cart{}, 0, ErrCheckoutConflict
	}
	gross, err := calculateCartTotals(original)
	if err != nil {
		return models.Cart{}, 0, ErrCheckoutConflict
	}
	return cart, gross.Total, nil
}
