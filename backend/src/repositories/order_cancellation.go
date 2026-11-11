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
	var order models.OrderDetails
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return order, false, err
	}
	defer tx.Rollback()
	var status string
	var debited bool
	err = tx.QueryRowContext(ctx, `SELECT status,stock_debited FROM checkout_orders WHERE id=$1 AND user_id=$2 FOR UPDATE`, id, userID).Scan(&status, &debited)
	if err != nil {
		return order, false, err
	}
	changed := status != "cancelled"
	if changed {
		if status != "simulated_approved" || !debited {
			return order, false, ErrOrderNotCancellable
		}
		if _, err := tx.ExecContext(ctx, "INSERT INTO order_cancellations (order_id, reason_code, reason_details, cancelled_by) VALUES ($1, $2, NULLIF($3, ''), $4)", id, reason.ReasonCode, reason.ReasonDetails, userID); err != nil {
			return order, false, err
		}
		if err := restoreOrderStock(ctx, tx, id); err != nil {
			return order, false, err
		}
		if _, err := tx.ExecContext(ctx, `UPDATE checkout_orders SET status='cancelled' WHERE id=$1 AND user_id=$2`, id, userID); err != nil {
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
	return order, changed, nil
}

func restoreOrderStock(ctx context.Context, tx *sql.Tx, id int64) error {
	rows, err := tx.QueryContext(ctx, `SELECT product_id,SUM(quantity) FROM checkout_order_items WHERE order_id=$1 GROUP BY product_id ORDER BY product_id`, id)
	if err != nil {
		return err
	}
	defer rows.Close()
	type stockEntry struct{ productID, quantity int64 }
	var entries []stockEntry
	for rows.Next() {
		var entry stockEntry
		if err := rows.Scan(&entry.productID, &entry.quantity); err != nil {
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
		result, err := tx.ExecContext(ctx, `UPDATE products SET quantity=quantity+$1,updated_at=NOW() WHERE id=$2 AND quantity::bigint+$1 <= 2147483647`, entry.quantity, entry.productID)
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
