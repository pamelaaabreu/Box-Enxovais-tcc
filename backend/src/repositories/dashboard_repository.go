package repositories

import (
	"backend/src/models"
	"context"
	"encoding/json"
)

func (repo ProductRepository) Dashboard(ctx context.Context, periods ...models.DashboardPeriod) (models.Dashboard, error) {
	var result models.Dashboard
	var from, until any
	group := "month"
	if len(periods) > 0 {
		result.Period = periods[0]
		from = result.Period.From
		until = result.Period.Until
		group = result.Period.Group
	}
	const query = `WITH
    orders AS
    (SELECT *
     FROM checkout_orders
     WHERE ($1::timestamptz IS NULL
            OR created_at >= $1)
         AND ($2::timestamptz IS NULL
              OR created_at < $2)),
    customers AS
    (SELECT *
     FROM users
     WHERE role = 'customer'),
    new_customers AS
    (SELECT *
     FROM customers
     WHERE ($1::timestamptz IS NULL
            OR created_at >= $1)
         AND ($2::timestamptz IS NULL
              OR created_at < $2)),
` + reportInventoryCTE + `,
    stock_entries AS
    (SELECT
         i.id AS product_id,
         0::bigint AS variant_id,
         i.name,
         ''::text AS size,
         i.quantity,
         i.quantity AS total_quantity
     FROM inventory i
     WHERE i.status = 'active'
         AND i.variants = 0
         AND i.quantity <= 5
     UNION ALL SELECT
         i.id,
         v.id,
         i.name,
         v.size,
         v.quantity,
         i.quantity
     FROM inventory i
     JOIN product_variants v
         ON v.product_id = i.id
     WHERE i.status = 'active'
         AND v.quantity <= 5),
    sold AS
    (SELECT
         i.*,
         o.created_at
     FROM checkout_order_items i
     JOIN orders o
         ON o.id = i.order_id
     WHERE o.status = 'simulated_approved'),
    months AS
    (SELECT
         to_char(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM') AS month,
         COUNT(*) AS total,
         COUNT(*) FILTER (
                          WHERE status = 'cancelled') AS cancelled
     FROM orders
     GROUP BY 1),
    categories AS
    (SELECT
         COALESCE(t.name, 'Sem categoria') AS name,
         SUM(i.quantity) AS units
     FROM sold i
     LEFT JOIN products p
         ON p.id = i.product_id
     LEFT JOIN product_types t
         ON t.id = p.product_type_id
     GROUP BY 1),
    top_products AS
    (SELECT
         i.product_id AS "productId",
         (array_agg(i.name
                    ORDER BY i.created_at DESC, i.id DESC))[1] AS name,
         SUM(i.quantity) AS units,
         SUM(i.quantity * i.unit_price_cents)::bigint AS "revenueCents",
         bool_or(p.id IS NULL
                 OR p.status <> 'active') AS archived
     FROM sold i
     LEFT JOIN products p
         ON p.id = i.product_id
     GROUP BY i.product_id
     ORDER BY
         units DESC,
         i.product_id
     LIMIT 5),
    boundaries AS
    (SELECT
         COALESCE(($1::timestamptz AT TIME ZONE 'America/Sao_Paulo')::date,
                      (SELECT min(created_at AT TIME ZONE 'America/Sao_Paulo')::date
                       FROM orders), CURRENT_DATE) AS lo,
         COALESCE(($2::timestamptz AT TIME ZONE 'America/Sao_Paulo')::date,
                      (SELECT max(created_at AT TIME ZONE 'America/Sao_Paulo')::date + 1
                       FROM orders), CURRENT_DATE + 1) AS hi),
    calendar AS
    (SELECT DISTINCT date_trunc($3, d)::date AS bucket
     FROM
         boundaries,
         generate_series(lo::timestamp, (hi - 1)::timestamp, interval '1 day') d),
    order_series AS
    (SELECT
         date_trunc($3, created_at AT TIME ZONE 'America/Sao_Paulo')::date AS bucket,
         COUNT(*) AS orders,
         COUNT(*) FILTER (
                          WHERE status = 'simulated_approved') AS approved,
         COUNT(*) FILTER (
                          WHERE status = 'cancelled') AS cancelled,
         COALESCE(SUM(total_cents) FILTER (
                                           WHERE status = 'simulated_approved'), 0)::bigint AS revenue
     FROM orders
     GROUP BY 1),
    customer_series AS
    (SELECT
         date_trunc($3, created_at AT TIME ZONE 'America/Sao_Paulo')::date AS bucket,
         COUNT(*) AS customers
     FROM new_customers
     GROUP BY 1),
    series AS
    (SELECT
         c.bucket::text AS bucket,
         COALESCE(o.orders, 0) AS orders,
         COALESCE(o.approved, 0) AS approved,
         COALESCE(o.cancelled, 0) AS cancelled,
         COALESCE(o.revenue, 0) AS "revenueCents",
         COALESCE(u.customers, 0) AS customers
     FROM calendar c
     LEFT JOIN order_series o USING (bucket)
     LEFT JOIN customer_series u USING (bucket)),
    stock AS
    (SELECT
         product_id AS "productId",
         variant_id AS "variantId",
         name,
         size,
         quantity,
         total_quantity AS "totalQuantity"
     FROM stock_entries
     ORDER BY
         quantity,
         name,
         product_id,
         variant_id
     LIMIT 8),
    recent AS
    (SELECT
         o.id,
         u.full_name AS customer,
         o.created_at AS "createdAt",
         o.total_cents AS "totalCents",
         o.status
     FROM orders o
     JOIN users u
         ON u.id = o.user_id
     ORDER BY
         o.created_at DESC,
         o.id DESC
     LIMIT 5)
SELECT json_build_object('orders',
                             (SELECT COUNT(*)
                              FROM orders), 'approvedOrders',
                             (SELECT COUNT(*)
                              FROM orders
                              WHERE status = 'simulated_approved'), 'cancelledOrders',
                             (SELECT COUNT(*)
                              FROM orders
                              WHERE status = 'cancelled'), 'revenueCents',
                             (SELECT COALESCE(SUM(total_cents), 0)
                              FROM orders
                              WHERE status = 'simulated_approved'), 'shippingCents',
                             (SELECT COALESCE(SUM(shipping_cents), 0)
                              FROM orders
                              WHERE status = 'simulated_approved'), 'averageTicketCents',
                             (SELECT COALESCE(round(avg(total_cents)), 0)
                              FROM orders
                              WHERE status = 'simulated_approved'), 'products',
                             (SELECT COUNT(*)
                              FROM products), 'activeProducts',
                             (SELECT COUNT(*)
                              FROM inventory
                              WHERE status = 'active'), 'lowStock',
                             (SELECT COUNT(*)
                              FROM inventory
                              WHERE status = 'active'
                                  AND quantity BETWEEN 1 AND 5), 'outOfStock',
                             (SELECT COUNT(*)
                              FROM inventory
                              WHERE status = 'active'
                                  AND quantity = 0), 'customers',
                             (SELECT COUNT(*)
                              FROM customers), 'newCustomers',
                             (SELECT COUNT(*)
                              FROM new_customers), 'customersWithOrders',
                             (SELECT COUNT(*)
                              FROM customers c
                              WHERE EXISTS
                                      (SELECT 1
                                       FROM checkout_orders o
                                       WHERE o.user_id = c.id)), 'months', COALESCE(
                                                                                        (SELECT json_agg(months
                                                                                                         ORDER BY month)
                                                                                         FROM months), '[]'), 'categories', COALESCE(
                                                                                                                                         (SELECT json_agg(categories
                                                                                                                                                          ORDER BY units DESC, name)
                                                                                                                                          FROM categories), '[]'), 'series', COALESCE(
                                                                                                                                                                                          (SELECT json_agg(series
                                                                                                                                                                                                           ORDER BY bucket)
                                                                                                                                                                                           FROM series), '[]'), 'topProducts', COALESCE(
                                                                                                                                                                                                                                            (SELECT json_agg(top_products
                                                                                                                                                                                                                                                             ORDER BY units DESC, "productId")
                                                                                                                                                                                                                                             FROM top_products), '[]'), 'stock', COALESCE(
                                                                                                                                                                                                                                                                                              (SELECT json_agg(stock
                                                                                                                                                                                                                                                                                                               ORDER BY quantity, name, "productId", "variantId")
                                                                                                                                                                                                                                                                                               FROM stock), '[]'), 'recentOrders', COALESCE(
                                                                                                                                                                                                                                                                                                                                                (SELECT json_agg(recent
                                                                                                                                                                                                                                                                                                                                                                 ORDER BY "createdAt" DESC, id DESC)
                                                                                                                                                                                                                                                                                                                                                 FROM recent), '[]'))`
	var raw []byte
	if err := repo.DB.QueryRowContext(ctx, query, from, until, group).Scan(&raw); err != nil {
		return result, err
	}
	err := json.Unmarshal(raw, &result)
	return result, err
}
