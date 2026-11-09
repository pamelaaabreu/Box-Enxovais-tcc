package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"encoding/json"
)

func (repo CheckoutRepository) ListOrders(ctx context.Context, userID, limit, offset int, filters models.OrderFilters) ([]models.OrderHistoryEntry, error) {
	return repo.readOrders(ctx, userID, limit, offset, 0, filters)
}

func (repo CheckoutRepository) GetOrderDetails(ctx context.Context, userID int, id int64) (models.OrderDetails, error) {
	var result models.OrderDetails
	var address []byte
	err := repo.DB.QueryRowContext(ctx, `SELECT address,payment_method FROM checkout_orders WHERE user_id=$1 AND id=$2`, userID, id).Scan(&address, &result.PaymentMethod)
	if err != nil {
		return result, err
	}
	if err := json.Unmarshal(address, &result.Address); err != nil {
		return result, err
	}
	orders, err := repo.readOrders(ctx, userID, 1, 0, id, models.OrderFilters{})
	if err != nil {
		return result, err
	}
	if len(orders) == 0 {
		return result, sql.ErrNoRows
	}
	result.OrderHistoryEntry = orders[0]
	return result, nil
}

func (repo CheckoutRepository) readOrders(ctx context.Context, userID, limit, offset int, id int64, filters models.OrderFilters) ([]models.OrderHistoryEntry, error) {
	direction := "DESC"
	if filters.Oldest {
		direction = "ASC"
	}
	rows, err := repo.DB.QueryContext(ctx, `
        SELECT o.id, o.created_at, o.status, o.total_cents,
               COALESCE(i.id, 0), COALESCE(i.name, ''), COALESCE(i.quantity, 0),
               COALESCE(img.image_path, ''), COALESCE(i.unit_price_cents, 0)
        FROM (
          SELECT id, created_at, status, total_cents FROM checkout_orders
          WHERE user_id = $1 AND ($4 = 0 OR id = $4)
          AND ($5::timestamptz IS NULL OR created_at >= $5)
          AND ($6::timestamptz IS NULL OR created_at < $6)
          ORDER BY created_at `+direction+`, id `+direction+` LIMIT $2 OFFSET $3
        ) o
        LEFT JOIN checkout_order_items i ON i.order_id = o.id
        LEFT JOIN LATERAL (
            SELECT image_path FROM product_images WHERE product_id = i.product_id
            ORDER BY is_primary DESC NULLS LAST, id LIMIT 1
        ) img ON true
        ORDER BY o.created_at `+direction+`, o.id `+direction+`, i.id`, userID, limit, offset, id, filters.From, filters.Until)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	orders := make([]models.OrderHistoryEntry, 0)
	for rows.Next() {
		var order models.OrderHistoryEntry
		var item models.OrderHistoryItem
		if err := rows.Scan(&order.ID, &order.CreatedAt, &order.Status, &order.Total, &item.ID, &item.Name, &item.Quantity, &item.Image, &item.UnitPrice); err != nil {
			return nil, err
		}
		if len(orders) == 0 || orders[len(orders)-1].ID != order.ID {
			order.Items = make([]models.OrderHistoryItem, 0)
			orders = append(orders, order)
		}
		if item.ID != 0 {
			item.Subtotal = item.UnitPrice * models.Money(item.Quantity)
			current := &orders[len(orders)-1]
			current.Items = append(current.Items, item)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return orders, nil
}
