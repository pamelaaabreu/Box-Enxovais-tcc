package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
)

type orderReader interface {
	queryReader
	rowQuerier
}
type preparedOrderFilters struct {
	Where     string
	Args      []any
	Direction string
}

// Somente cláusulas/colunas fixas entram no SQL; os valores são sempre parâmetros.
func prepareOrderFilters(userID int, orderID int64, filters models.OrderFilters) preparedOrderFilters {
	prepared := preparedOrderFilters{Args: []any{userID}, Direction: "DESC"}
	conditions := []string{"orders.user_id=$1"}
	add := func(expression string, value any) {
		prepared.Args = append(prepared.Args, value)
		conditions = append(conditions, fmt.Sprintf(expression, len(prepared.Args)))
	}
	if orderID > 0 {
		add("orders.id=$%d", orderID)
	}
	if filters.From != nil {
		add("orders.created_at >= $%d", *filters.From)
	}
	if filters.Until != nil {
		add("orders.created_at < $%d", *filters.Until)
	}
	if filters.CancelledOnly {
		add("orders.status=$%d", models.OrderStatusCancelled)
	}
	if filters.Search != "" {
		term := strings.TrimPrefix(filters.Search, "#")
		digits := term != "" && strings.Trim(term, "0123456789") == ""
		if digits {
			searchID, err := strconv.ParseInt(term, 10, 64)
			if err != nil {
				conditions = append(conditions, "FALSE")
			} else {
				add("orders.id=$%d", searchID)
			}
		} else {
			pattern := "%" + strings.NewReplacer(`\`, `\\`, "%", `\%`, "_", `\_`).Replace(filters.Search) + "%"
			add(`
EXISTS (
    SELECT
        1
    FROM checkout_order_items historical
    WHERE historical.order_id = orders.id
        AND historical.name ILIKE $%d ESCAPE '\'
)
`, pattern)
		}
	}
	if filters.Oldest {
		prepared.Direction = "ASC"
	}
	prepared.Where = strings.Join(conditions, " AND ")
	return prepared
}
func (repo CheckoutRepository) ListOrders(ctx context.Context, userID int, limit int, offset int, filters models.OrderFilters) ([]models.OrderHistoryEntry, error) {
	return readOrders(ctx, repo.DB, userID, limit, offset, 0, filters)
}

// A página e sua contagem usam o mesmo snapshot, inclusive durante cancelamentos.
func (repo CheckoutRepository) ListOrdersPage(ctx context.Context, userID int, limit int, offset int, filters models.OrderFilters) ([]models.OrderHistoryEntry, int, error) {
	tx, err := repo.DB.BeginTx(ctx, &sql.TxOptions{ReadOnly: true, Isolation: sql.LevelRepeatableRead})
	if err != nil {
		return nil, 0, err
	}
	defer tx.Rollback()
	orders, err := readOrders(ctx, tx, userID, limit, offset, 0, filters)
	if err != nil {
		return nil, 0, err
	}
	total, err := countOrders(ctx, tx, userID, filters)
	if err != nil {
		return nil, 0, err
	}
	if err = tx.Commit(); err != nil {
		return nil, 0, err
	}
	return orders, total, nil
}
func (repo CheckoutRepository) CountOrders(ctx context.Context, userID int, filters models.OrderFilters) (int, error) {
	return countOrders(ctx, repo.DB, userID, filters)
}
func countOrders(ctx context.Context, query rowQuerier, userID int, filters models.OrderFilters) (int, error) {
	prepared := prepareOrderFilters(userID, 0, filters)
	var total int
	err := query.QueryRowContext(ctx, `SELECT COUNT(*) FROM checkout_orders orders WHERE `+prepared.Where, prepared.Args...).Scan(&total)
	return total, err
}
func (repo CheckoutRepository) GetOrderDetails(ctx context.Context, userID int, orderID int64) (models.OrderDetails, error) {
	tx, err := repo.DB.BeginTx(ctx, &sql.TxOptions{ReadOnly: true, Isolation: sql.LevelRepeatableRead})
	if err != nil {
		return models.OrderDetails{}, err
	}
	defer tx.Rollback()
	details, err := readOrderDetails(ctx, tx, userID, orderID)
	if err != nil {
		return details, err
	}
	return details, tx.Commit()
}
func readOrderDetails(ctx context.Context, query orderReader, userID int, orderID int64) (models.OrderDetails, error) {
	details := models.OrderDetails{OwnerID: userID}
	var address []byte
	err := query.QueryRowContext(ctx, `
SELECT
    address,
    payment_method,
    (stock_debited
    AND status = 'simulated_approved') AS can_cancel
FROM checkout_orders
WHERE user_id = $1
    AND id = $2
`, userID, orderID).Scan(&address, &details.PaymentMethod, &details.CanCancel)
	if err != nil {
		return details, err
	}
	if err = json.Unmarshal(address, &details.Address); err != nil {
		return details, err
	}
	orders, err := readOrders(ctx, query, userID, 1, 0, orderID, models.OrderFilters{})
	if err != nil {
		return details, err
	}
	if len(orders) == 0 {
		return details, sql.ErrNoRows
	}
	details.OrderHistoryEntry = orders[0]
	if details.Status == models.OrderStatusCancelled {
		var reason models.CancellationReason
		err = query.QueryRowContext(ctx, `
SELECT
    reason_code,
    COALESCE(reason_details, '')
FROM order_cancellations
WHERE order_id = $1
`, orderID).Scan(&reason.ReasonCode, &reason.ReasonDetails)
		if err == nil {
			details.Cancellation = &reason
		} else if !errors.Is(err, sql.ErrNoRows) {
			return details, err
		}
	}
	return details, nil
}

// A paginação ocorre sobre pedidos, antes do JOIN que expande seus itens.
func orderHistoryQuery(prepared preparedOrderFilters, limit int, offset int) (string, []any) {
	args := append([]any{}, prepared.Args...)
	args = append(args, limit, offset)
	query := fmt.Sprintf(`
 WITH selected_orders AS (
    SELECT `+checkoutOrderColumns+`,created_at
    FROM checkout_orders orders
    WHERE %s
    ORDER BY created_at %s,id %s
    LIMIT $%d OFFSET $%d
 )
 SELECT
    orders.id,orders.created_at,orders.status,orders.total_cents,
    orders.shipping_cents,orders.shipping_min_days,orders.shipping_max_days,orders.shipping_method,
    orders.products_subtotal_cents,orders.discount_cents,orders.installments,
    COALESCE(item.id,0),COALESCE(item.name,''),COALESCE(item.quantity,0),
    COALESCE(image.image_path,''),COALESCE(item.unit_price_cents,0),COALESCE(product.id,0)
 FROM selected_orders orders
 LEFT JOIN checkout_order_items item ON item.order_id=orders.id
 LEFT JOIN products product ON product.id=item.product_id AND product.status='active'
 LEFT JOIN LATERAL (`+itemImageSQL+`) image ON true
 ORDER BY orders.created_at %s,orders.id %s,item.id`, prepared.Where, prepared.Direction, prepared.Direction, len(args)-1, len(args), prepared.Direction, prepared.Direction)
	return query, args
}
func scanOrderHistoryRow(row rowScanner) (models.OrderHistoryEntry, models.OrderHistoryItem, error) {
	var order models.OrderHistoryEntry
	var item models.OrderHistoryItem
	err := row.Scan(&order.ID, &order.CreatedAt, &order.Status, &order.Total, &order.Shipping, &order.ShippingMinDays, &order.ShippingMaxDays, &order.ShippingMethod, &order.ProductsSubtotal, &order.Discount, &order.Installments, &item.ID, &item.Name, &item.Quantity, &item.Image, &item.UnitPrice, &item.ProductID)
	if err == nil && item.ID != 0 {
		item.Subtotal, err = calculateItemSubtotal(item.UnitPrice, item.Quantity)
	}
	return order, item, err
}
func readOrders(ctx context.Context, reader queryReader, userID int, limit int, offset int, orderID int64, filters models.OrderFilters) ([]models.OrderHistoryEntry, error) {
	query, args := orderHistoryQuery(prepareOrderFilters(userID, orderID, filters), limit, offset)
	rows, err := reader.QueryContext(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	orders := []models.OrderHistoryEntry{}
	for rows.Next() {
		order, item, err := scanOrderHistoryRow(rows)
		if err != nil {
			return nil, err
		}
		if len(orders) == 0 || orders[len(orders)-1].ID != order.ID {
			if err = order.PopulateInstallments(order.Total); err != nil {
				return nil, err
			}
			order.Items = []models.OrderHistoryItem{}
			orders = append(orders, order)
		}
		if item.ID != 0 {
			current := &orders[len(orders)-1]
			current.Items = append(current.Items, item)
		}
	}
	if err = rows.Err(); err != nil {
		return nil, err
	}
	if err = rows.Close(); err != nil {
		return nil, err
	}
	return orders, nil
}
