package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
)

func insertCheckoutOrder(ctx context.Context, tx *sql.Tx, userID int, input models.CheckoutRequest, address models.ShippingAddress, order *models.CheckoutOrder) error {
	snapshot, err := json.Marshal(address)
	if err != nil {
		return err
	}
	return tx.QueryRowContext(ctx, `
INSERT INTO checkout_orders(user_id, request_key, address, payment_method, total_cents, status, stock_debited, contact_phone,
shipping_cents, shipping_min_days, shipping_max_days, shipping_method, products_subtotal_cents, discount_cents,
installments)
VALUES ($1,
$2,
$3,
$4,
$5,
$6,
true,
NULLIF($7, ''),
$8,
$9,
$10,
$11,
$12,
$13,
$14)
RETURNING id
`, userID, input.RequestKey, string(snapshot), input.PaymentMethod, order.Total, order.Status, input.ContactPhone,
		order.Shipping, order.ShippingMinDays, order.ShippingMaxDays, order.ShippingMethod, order.ProductsSubtotal, order.Discount, order.Installments).Scan(&order.ID)
}
func insertCheckoutOrderItems(ctx context.Context, tx *sql.Tx, orderID int64, items []models.CartItem) error {
	for _, item := range items {
		result, err := tx.ExecContext(ctx, `
INSERT INTO checkout_order_items(order_id, product_id, name, quantity, unit_price_cents, variant_id)
VALUES ($1,
$2,
$3,
$4,
$5,
NULLIF($6, 0))
`, orderID, item.ProductID, item.Name, item.Quantity, item.UnitPrice, item.VariantID)
		if err != nil {
			return err
		}
		if err = requireOneRow(result); err != nil {
			return err
		}
	}
	return nil
}
func debitCheckoutStock(ctx context.Context, tx *sql.Tx, items []models.CartItem) error {
	for _, item := range items {
		var result sql.Result
		var err error
		if item.VariantID > 0 {
			result, err = tx.ExecContext(ctx, `
UPDATE product_variants
SET quantity = quantity - $1
WHERE id = $2
    AND product_id = $3
    AND quantity >= $1
`, item.Quantity, item.VariantID, item.ProductID)
		} else {
			result, err = tx.ExecContext(ctx, `
UPDATE products
SET quantity = quantity - $1,
updated_at = NOW()
WHERE id = $2
    AND quantity >= $1
`, item.Quantity, item.ProductID)
		}
		if err != nil {
			return err
		}
		if err = requireOneRow(result); errors.Is(err, sql.ErrNoRows) {
			return ErrCheckoutConflict
		} else if err != nil {
			return err
		}
	}
	return nil
}
func clearCheckoutCart(ctx context.Context, tx *sql.Tx, cartID int64) error {
	if err := clearCart(ctx, tx, cartID); err != nil {
		return err
	}
	return touchCart(ctx, tx, cartID)
}
