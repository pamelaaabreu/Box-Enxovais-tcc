package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
)

// Uma única consulta recupera itens, imagem, preço e estoque; não há N+1 no Go.
var cartItemsSQL = `
SELECT
    item.id,
    product.id,
    COALESCE(item.variant_id, 0),
    product.name || COALESCE(' — ' || variant.size, ''),
    COALESCE(image.image_path, '') AS image_path,
    item.quantity,
    COALESCE(variant.quantity, product.quantity) AS available_stock,
    CASE WHEN(item.variant_id IS NOT NULL AND variant.id IS NULL)
    OR (item.variant_id IS NULL
    AND EXISTS (
    SELECT
        1
    FROM product_variants required
    WHERE required.product_id = product.id
)) THEN 'unavailable' ELSE product.status END AS product_status,
    (COALESCE(variant.price, promotion.price, product.price) * 100)::bigint AS unit_price
FROM cart_items item
JOIN products product ON product.id = item.product_id
LEFT JOIN product_variants variant ON variant.id = item.variant_id
    AND variant.product_id = item.product_id
LEFT JOIN LATERAL(
` + itemImageSQL + `
) image ON true
LEFT JOIN LATERAL (
    SELECT MIN(pp.promotional_price) AS price
` + cartPromotionSource + `
) promotion ON true
WHERE item.cart_id=$1
ORDER BY item.id`

func scanCartItem(row rowScanner) (models.CartItem, error) {
	var item models.CartItem
	var status string
	err := row.Scan(&item.ID, &item.ProductID, &item.VariantID, &item.Name, &item.Image, &item.Quantity, &item.Stock, &status, &item.UnitPrice)
	item.Available = status == "active" && item.Stock >= item.Quantity
	return item, err
}
func readCart(ctx context.Context, tx *sql.Tx, cartID int64) (models.Cart, error) {
	rows, err := tx.QueryContext(ctx, cartItemsSQL, cartID)
	if err != nil {
		return models.Cart{}, err
	}
	defer rows.Close()
	items := []models.CartItem{}
	for rows.Next() {
		item, err := scanCartItem(rows)
		if err != nil {
			return models.Cart{}, err
		}
		items = append(items, item)
	}
	if err = rows.Err(); err != nil {
		return models.Cart{}, err
	}
	if err = rows.Close(); err != nil {
		return models.Cart{}, err
	}
	return calculateCartTotals(items)
}
