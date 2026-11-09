package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

var ErrCartOrderNotFound = errors.New("Pedido não encontrado")

func reorderItems(ctx context.Context, tx *sql.Tx, userID int, cartID, orderID int64) error {
	rows, err := tx.QueryContext(ctx, `SELECT i.product_id, SUM(i.quantity), MIN(i.name)
 FROM checkout_order_items i JOIN checkout_orders o ON o.id=i.order_id
 WHERE o.id=$1 AND o.user_id=$2 GROUP BY i.product_id ORDER BY i.product_id`, orderID, userID)
	if err != nil {
		return err
	}
	type item struct {
		id, quantity int64
		name         string
	}
	var items []item
	defer rows.Close()
	for rows.Next() {
		var line item
		if err := rows.Scan(&line.id, &line.quantity, &line.name); err != nil {
			return err
		}
		items = append(items, line)
	}
	if err := rows.Err(); err != nil {
		return err
	}
	if len(items) == 0 {
		return ErrCartOrderNotFound
	}
	for _, line := range items {
		if err := writeCartItem(ctx, tx, cartID, "add", line.id, line.quantity); err != nil {
			if errors.Is(err, ErrCartProduct) || errors.Is(err, ErrCartQuantity) {
				return fmt.Errorf("%s: %w. Nenhum produto foi adicionado.", line.name, err)
			}
			return err
		}
	}
	return nil
}
