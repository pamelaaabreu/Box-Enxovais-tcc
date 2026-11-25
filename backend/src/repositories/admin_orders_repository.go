package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"encoding/json"
)

func (repo CheckoutRepository) ListAdminOrders(ctx context.Context, limit int, offset int, filters models.OrderFilters, status string) (models.AdminOrderPage, error) {
	result := models.AdminOrderPage{Orders: []models.AdminOrder{}}
	tx, err := repo.DB.BeginTx(ctx, &sql.TxOptions{ReadOnly: true, Isolation: sql.LevelRepeatableRead})
	if err != nil {
		return result, err
	}
	defer tx.Rollback()
	const where = `
FROM checkout_orders o
JOIN users u ON u.id = o.user_id
WHERE ($1 = ''
    OR o.id::text = trim(leading '#' from $1)
    OR u.full_name ILIKE '%' || $1 || '%')
    AND ($2 = ''
    OR o.status = $2)
    AND ($3::timestamptz IS NULL
    OR o.created_at >= $3)
    AND ($4::timestamptz IS NULL
    OR o.created_at < $4)
    AND ($5 = 0
    OR (o.user_id = $5
    AND u.role = 'customer'))
`
	args := []any{filters.Search, status, filters.From, filters.Until, filters.CustomerID}
	err = tx.QueryRowContext(ctx, `
SELECT
    count(*),
    count(*) FILTER (
WHERE o.status = 'simulated_approved'),
count(*) FILTER (
WHERE o.status = 'cancelled')
`+where, args...).Scan(&result.Total, &result.Approved, &result.Cancelled)
	if err != nil {
		return result, err
	}
	args = append(args, limit, offset)
	rows, err := tx.QueryContext(ctx, `
SELECT
    o.id,
    o.user_id,
    u.full_name,
    o.created_at,
    o.total_cents,
    o.status,
    o.payment_method
`+where+`
ORDER BY o . created_at DESC ,
    o . id DESC
LIMIT $6
OFFSET $7
`, args...)
	if err != nil {
		return result, err
	}
	defer rows.Close()
	for rows.Next() {
		var o models.AdminOrder
		if err = rows.Scan(&o.ID, &o.CustomerID, &o.Customer, &o.CreatedAt, &o.Total, &o.Status, &o.PaymentMethod); err != nil {
			return result, err
		}
		result.Orders = append(result.Orders, o)
	}
	if err = rows.Err(); err != nil {
		return result, err
	}
	if err = rows.Close(); err != nil {
		return result, err
	}
	return result, tx.Commit()
}
func (repo CheckoutRepository) GetAdminOrder(ctx context.Context, id int64) (models.AdminOrderDetails, error) {
	result := models.AdminOrderDetails{Items: []models.AdminOrderItem{}, Events: []models.AdminOrderEvent{}}
	tx, err := repo.DB.BeginTx(ctx, &sql.TxOptions{ReadOnly: true, Isolation: sql.LevelRepeatableRead})
	if err != nil {
		return result, err
	}
	defer tx.Rollback()
	var address []byte
	err = tx.QueryRowContext(ctx, `
SELECT
    o.id,
    o.user_id,
    u.full_name,
    o.created_at,
    o.total_cents,
    o.status,
    o.payment_method,
    o.address,
    o.shipping_cents,
    o.shipping_min_days,
    o.shipping_max_days,
    o.shipping_method,
    o.products_subtotal_cents,
    o.discount_cents,
    o.installments,
    (o.stock_debited
    AND o.status = 'simulated_approved')
FROM checkout_orders o
JOIN users u ON u.id = o.user_id
WHERE o.id = $1
`, id).Scan(&result.ID, &result.CustomerID, &result.Customer, &result.CreatedAt, &result.Total, &result.Status, &result.PaymentMethod, &address, &result.Shipping, &result.ShippingMinDays, &result.ShippingMaxDays, &result.ShippingMethod, &result.ProductsSubtotal, &result.Discount, &result.Installments, &result.CanCancel)
	if err != nil {
		return result, err
	}
	if err = result.PopulateInstallments(result.Total); err != nil {
		return result, err
	}
	if err = json.Unmarshal(address, &result.Address); err != nil {
		return result, err
	}
	rows, err := tx.QueryContext(ctx, `
SELECT
    i.id,
    i.product_id,
    i.name,
    i.quantity,
    i.unit_price_cents,
    COALESCE(i.variant_id, 0),
    COALESCE(p.sku, ''),
    COALESCE(img.image_path, '')
FROM checkout_order_items i
LEFT JOIN products p ON p.id = i.product_id
LEFT JOIN LATERAL(SELECT image_path FROM product_images WHERE product_id = i.product_id AND (variant_id IS NULL
    OR variant_id = i.variant_id) ORDER BY(variant_id IS NOT NULL) DESC, is_primary DESC NULLS LAST, sort_order, id LIMIT 1) img ON true
WHERE i.order_id = $1
ORDER BY i.id
`, id)
	if err != nil {
		return result, err
	}
	for rows.Next() {
		var item models.AdminOrderItem
		if err = rows.Scan(&item.ID, &item.ProductID, &item.Name, &item.Quantity, &item.UnitPrice, &item.VariantID, &item.SKU, &item.Image); err != nil {
			rows.Close()
			return result, err
		}
		item.Subtotal = item.UnitPrice * models.Money(item.Quantity)
		result.Subtotal += item.Subtotal
		result.Items = append(result.Items, item)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return result, err
	}
	if result.ProductsSubtotal != nil {
		result.Subtotal = *result.ProductsSubtotal
	}
	result.Events = append(result.Events, models.AdminOrderEvent{Kind: "created", At: result.CreatedAt})
	var event models.AdminOrderEvent
	err = tx.QueryRowContext(ctx, `
SELECT
    cancelled_at,
    reason_code || COALESCE(': ' || reason_details, '')
FROM order_cancellations
WHERE order_id = $1
`, id).Scan(&event.At, &event.Reason)
	if err != nil && err != sql.ErrNoRows {
		return result, err
	}
	if err == nil {
		event.Kind = "cancelled"
		result.Events = append(result.Events, event)
	}
	return result, tx.Commit()
}
