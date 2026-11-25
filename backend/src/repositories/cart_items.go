package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"errors"
	"math"
)

type cartItemChange struct {
	ProductID  int64
	CartItemID int64
	VariantID  *int64
	Quantity   int64
}

func writeCartItem(ctx context.Context, tx *sql.Tx, cartID int64, operation CartOperation, change cartItemChange) error {
	if change.Quantity < 1 || change.Quantity > MaxCartQuantity {
		return ErrCartQuantity
	}
	if operation == CartUpdate {
		err := tx.QueryRowContext(ctx, `
SELECT
    product_id,
    variant_id
FROM cart_items
WHERE id = $1
    AND cart_id = $2
`, change.CartItemID, cartID).Scan(&change.ProductID, &change.VariantID)
		if errors.Is(err, sql.ErrNoRows) {
			return ErrCartItemNotFound
		}
		if err != nil {
			return err
		}
	}
	stock, err := lockCartStock(ctx, tx, change.ProductID, change.VariantID)
	if err != nil {
		return err
	}
	if operation == CartAdd {
		var existing int64
		err = tx.QueryRowContext(ctx, `
SELECT
    quantity
FROM cart_items
WHERE cart_id = $1
    AND product_id = $2
    AND variant_id IS NOT DISTINCT
FROM $3
`, cartID, change.ProductID, change.VariantID).Scan(&existing)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			return err
		}
		if existing < 0 || change.Quantity > math.MaxInt64-existing {
			return ErrCartQuantity
		}
		change.Quantity += existing
	}
	if change.Quantity > stock {
		return CartStockError{Stock: stock}
	}
	if change.Quantity > MaxCartQuantity {
		return ErrCartQuantity
	}
	if operation == CartUpdate {
		result, err := tx.ExecContext(ctx, `
UPDATE cart_items
SET quantity = $1,
updated_at = NOW()
WHERE id = $2
    AND cart_id = $3
`, change.Quantity, change.CartItemID, cartID)
		if err != nil {
			return err
		}
		if err = requireOneRow(result); errors.Is(err, sql.ErrNoRows) {
			return ErrCartItemNotFound
		}
		return err
	}
	_, err = tx.ExecContext(ctx, `
INSERT INTO cart_items(cart_id, product_id, variant_id, quantity)
VALUES ($1,
$2,
$3,
$4) ON CONFLICT(cart_id, product_id, COALESCE(variant_id, 0)) DO UPDATE
SET quantity = EXCLUDED.quantity,
updated_at = NOW()
`, cartID, change.ProductID, change.VariantID, change.Quantity)
	return err
}
func lockCartStock(ctx context.Context, tx *sql.Tx, productID int64, variantID *int64) (int64, error) {
	if productID <= 0 || (variantID != nil && *variantID <= 0) {
		return 0, ErrCartProduct
	}
	var stock int64
	var status string
	var hasVariants bool
	err := tx.QueryRowContext(ctx, `
SELECT
    quantity,
    status,
    EXISTS (
    SELECT
        1
    FROM product_variants
    WHERE product_id = $1
)
FROM products
WHERE id = $1 FOR SHARE
`, productID).Scan(&stock, &status, &hasVariants)
	if errors.Is(err, sql.ErrNoRows) {
		return 0, ErrCartProduct
	}
	if err != nil {
		return 0, err
	}
	if status != "active" || (variantID == nil && hasVariants) {
		return 0, ErrCartProduct
	}
	if variantID != nil {
		err = tx.QueryRowContext(ctx, `
SELECT
    quantity
FROM product_variants
WHERE id = $1
    AND product_id = $2 FOR SHARE
`, *variantID, productID).Scan(&stock)
		if errors.Is(err, sql.ErrNoRows) {
			return 0, ErrCartProduct
		}
		if err != nil {
			return 0, err
		}
	}
	return stock, nil
}

// Aritmética em centavos e unidades, validada antes de multiplicar ou dividir.
func calculateCartTotals(items []models.CartItem) (models.Cart, error) {
	cart := models.Cart{Items: make([]models.CartItem, 0, len(items))}
	for _, item := range items {
		subtotal, err := calculateItemSubtotal(item.UnitPrice, item.Quantity)
		if err != nil {
			return models.Cart{}, err
		}
		item.Subtotal = subtotal

		if cart.Total > models.Money(math.MaxInt64)-item.Subtotal || cart.TotalItems > math.MaxInt64-item.Quantity {
			return models.Cart{}, errors.New("cart total overflow")
		}
		cart.Total += item.Subtotal
		cart.TotalItems += item.Quantity
		cart.Items = append(cart.Items, item)
	}
	return cart, nil
}

func calculateItemSubtotal(unitPrice models.Money, quantity int64) (models.Money, error) {
	if quantity <= 0 || unitPrice < 0 || int64(unitPrice) > math.MaxInt64/quantity {
		return 0, errors.New("invalid item amount")
	}
	return unitPrice * models.Money(quantity), nil
}
