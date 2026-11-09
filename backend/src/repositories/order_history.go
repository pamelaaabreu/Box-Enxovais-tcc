package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"encoding/json"
	"strconv"
	"strings"
)

func (repo CheckoutRepository) ListOrders(ctx context.Context, userID, limit, offset int, filters models.OrderFilters) ([]models.OrderHistoryEntry, error) {
	return readOrders(ctx, repo.DB, userID, limit, offset, 0, filters)
}

type orderReader interface {
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

func (repo CheckoutRepository) GetOrderDetails(ctx context.Context, userID int, id int64) (models.OrderDetails, error) {
	return readOrderDetails(ctx, repo.DB, userID, id)
}

func readOrderDetails(ctx context.Context, db orderReader, userID int, id int64) (models.OrderDetails, error) {
	var result models.OrderDetails
	var address []byte
	err := db.QueryRowContext(ctx, `SELECT address,payment_method, CASE WHEN stock_debited AND status='simulated_approved' THEN GREATEST(0, CEIL(EXTRACT(EPOCH FROM (`+cancellationDeadlineSQL+` - clock_timestamp())) * 1000))::bigint ELSE 0 END FROM checkout_orders WHERE user_id=$1 AND id=$2`, userID, id).Scan(&address, &result.PaymentMethod, &result.CancellationRemainingMs)
	if err != nil {
		return result, err
	}
	if err := json.Unmarshal(address, &result.Address); err != nil {
		return result, err
	}
	orders, err := readOrders(ctx, db, userID, 1, 0, id, models.OrderFilters{})
	if err != nil {
		return result, err
	}
	if len(orders) == 0 {
		return result, sql.ErrNoRows
	}
	result.OrderHistoryEntry = orders[0]
	result.CanCancel = result.CancellationRemainingMs > 0
	return result, nil
}

func readOrders(ctx context.Context, db orderReader, userID, limit, offset int, id int64, filters models.OrderFilters) ([]models.OrderHistoryEntry, error) {
	term := strings.TrimPrefix(filters.Search, "#")
	var searchID int64
	digits := term != "" && strings.Trim(term, "0123456789") == ""
	if digits {
		id, err := strconv.ParseInt(term, 10, 64)
		if err == nil {
			searchID = id
		}
	}
	pattern := "%" + strings.NewReplacer(`\`, `\\`, "%", `\%`, "_", `\_`).Replace(filters.Search) + "%"
	direction := "DESC"
	if filters.Oldest {
		direction = "ASC"
	}
	rows, err := db.QueryContext(ctx, `
        SELECT o.id, o.created_at, o.status, o.total_cents,
               COALESCE(i.id, 0), COALESCE(i.name, ''), COALESCE(i.quantity, 0),
               COALESCE(img.image_path, ''), COALESCE(i.unit_price_cents, 0), COALESCE(p.id, 0)
        FROM (
          SELECT id, created_at, status, total_cents FROM checkout_orders orders
          WHERE user_id = $1 AND ($4 = 0 OR id = $4)
          AND ($5::timestamptz IS NULL OR created_at >= $5)
          AND ($6::timestamptz IS NULL OR created_at < $6)
          AND (NOT $7::boolean OR status = 'cancelled')
          AND ($8::text = '' OR ($9 AND orders.id = $10) OR (NOT $9 AND EXISTS (
            SELECT 1 FROM checkout_order_items historical
            WHERE historical.order_id = orders.id AND historical.name ILIKE $11 ESCAPE '\'
          )))
          ORDER BY created_at `+direction+`, id `+direction+` LIMIT $2 OFFSET $3
        ) o
        LEFT JOIN checkout_order_items i ON i.order_id = o.id
        LEFT JOIN products p ON p.id=i.product_id AND p.status='active'
        LEFT JOIN LATERAL (
            SELECT image_path FROM product_images WHERE product_id = i.product_id
            ORDER BY is_primary DESC NULLS LAST, id LIMIT 1
        ) img ON true
        ORDER BY o.created_at `+direction+`, o.id `+direction+`, i.id`, userID, limit, offset, id, filters.From, filters.Until, filters.CancelledOnly, filters.Search, digits, searchID, pattern)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	orders := make([]models.OrderHistoryEntry, 0)
	for rows.Next() {
		var order models.OrderHistoryEntry
		var item models.OrderHistoryItem
		if err := rows.Scan(&order.ID, &order.CreatedAt, &order.Status, &order.Total, &item.ID, &item.Name, &item.Quantity, &item.Image, &item.UnitPrice, &item.ProductID); err != nil {
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
