package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"errors"
)

var ErrOrderNotCancellable = errors.New("Este pedido não está disponível para cancelamento")
var ErrOrderRestock = errors.New("Não foi possível repor o estoque deste pedido. Entre em contato com o suporte.")

func (repo CheckoutRepository) CancelOrder(ctx context.Context, userID int, id int64, reason models.CancellationReason) (models.OrderDetails, bool, error) {
	return repo.cancelOrder(ctx, userID, userID, id, reason)
}
func (repo CheckoutRepository) CancelAdminOrder(ctx context.Context, actorID int, id int64, reason models.CancellationReason) (models.OrderDetails, bool, error) {
	return repo.cancelOrder(ctx, 0, actorID, id, reason)
}
func (repo CheckoutRepository) cancelOrder(ctx context.Context, ownerID, actorID int, id int64, reason models.CancellationReason) (models.OrderDetails, bool, error) {
	var order models.OrderDetails
	var userID int
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return order, false, err
	}
	defer tx.Rollback()
	var status string
	var debited bool
	err = tx.QueryRowContext(ctx, `SELECT
    status,
    stock_debited,
    user_id
FROM checkout_orders
WHERE id = $1
    AND ($2 = 0
         OR user_id = $2)
    FOR
    UPDATE`, id, ownerID).Scan(&status, &debited, &userID)
	if err != nil {
		return order, false, err
	}
	changed := status != "cancelled"
	if changed {
		if status != "simulated_approved" || !debited {
			return order, false, ErrOrderNotCancellable
		}
		if _, err := tx.ExecContext(ctx, `INSERT INTO order_cancellations (order_id, reason_code, reason_details, cancelled_by)
VALUES ($1, $2, NULLIF($3, ''), $4)`, id, reason.ReasonCode, reason.ReasonDetails, actorID); err != nil {
			return order, false, err
		}
		if err := restoreOrderStock(ctx, tx, id); err != nil {
			return order, false, err
		}
		if _, err := tx.ExecContext(ctx, `UPDATE checkout_orders
SET status = 'cancelled'
WHERE id = $1
    AND user_id = $2`, id, userID); err != nil {
			return order, false, err
		}
	}
	order, err = readOrderDetails(ctx, tx, userID, id)
	if err != nil {
		return order, false, err
	}
	if err = tx.Commit(); err != nil {
		return order, false, err
	}
	order.OwnerID = userID
	return order, changed, nil
}

func restoreOrderStock(ctx context.Context, tx *sql.Tx, id int64) error {
	rows, err := tx.QueryContext(ctx, `SELECT
    product_id,
    COALESCE(variant_id, 0),
    SUM(quantity)
FROM checkout_order_items
WHERE order_id = $1
GROUP BY
    product_id,
    variant_id
ORDER BY
    product_id,
    variant_id`, id)
	if err != nil {
		return err
	}
	defer rows.Close()
	type stockEntry struct{ productID, variantID, quantity int64 }
	var entries []stockEntry
	for rows.Next() {
		var entry stockEntry
		if err := rows.Scan(&entry.productID, &entry.variantID, &entry.quantity); err != nil {
			return err
		}
		entries = append(entries, entry)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if len(entries) == 0 {
		return ErrOrderRestock
	}
	for _, entry := range entries {
		var result sql.Result
		if entry.variantID > 0 {
			result, err = tx.ExecContext(ctx, `UPDATE product_variants
SET quantity = quantity + $1
WHERE id = $2
    AND product_id = $3
    AND quantity::bigint + $1 <= 2147483647`, entry.quantity, entry.variantID, entry.productID)
		} else {
			result, err = tx.ExecContext(ctx, `UPDATE products
SET
    quantity = quantity + $1,
    updated_at = NOW()
WHERE id = $2
    AND quantity::bigint + $1 <= 2147483647`, entry.quantity, entry.productID)
		}
		if err != nil {
			return err
		}
		affected, err := result.RowsAffected()
		if err != nil {
			return err
		}
		if affected != 1 {
			return ErrOrderRestock
		}
	}
	return nil
}
