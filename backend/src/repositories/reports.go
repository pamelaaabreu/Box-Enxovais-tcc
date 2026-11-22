package repositories

import (
	"backend/src/models"
	"context"
	"encoding/json"
	"fmt"
	"strings"
)

// Aliases preservam a compatibilidade com usos existentes de repositories.Report*.
type ReportFilter = models.ReportFilter
type ReportRow = models.ReportRow
type Report = models.Report

func (repo ProductRepository) Report(ctx context.Context, filter models.ReportFilter) (models.Report, error) {
	result := models.Report{Page: filter.Page, PageSize: filter.PageSize, Period: filter.Period}
	queryPrefix := `WITH orders AS
    (SELECT *
     FROM checkout_orders
     WHERE created_at >= $1
         AND created_at < $2),
`
	var rowsQuery, statisticsQuery, ordering string
	switch filter.Kind {
	case "sales":
		queryPrefix += `
item_totals AS
    (SELECT
         i.order_id,
         sum(i.quantity)::bigint AS units
     FROM checkout_order_items i
     JOIN orders o
         ON o.id = i.order_id
     GROUP BY i.order_id),
    filtered AS
    (SELECT
         o.id,
         COALESCE(u.full_name, 'Cliente indisponível') AS name,
         o.created_at AS "createdAt",
         o.payment_method AS payment,
         o.status,
         COALESCE(i.units, 0)::bigint AS units,
         o.total_cents AS "revenueCents",
         o.shipping_cents AS "shippingCents",
         o.discount_cents AS "discountCents",
         o.products_subtotal_cents AS "productsSubtotalCents"
     FROM orders o
     LEFT JOIN users u
         ON u.id = o.user_id
     LEFT JOIN item_totals i
         ON i.order_id = o.id
     WHERE ($4 = ''
            OR o.status = $4)
         AND ($3 = ''
              OR o.id::text ILIKE $3
              OR u.full_name ILIKE $3
              OR u.email ILIKE $3))`
		rowsQuery = `SELECT *
FROM filtered`
		statisticsQuery = `jsonb_build_object('orders', count(*), 'approvedOrders', count(*) FILTER(WHERE status = 'simulated_approved'), 'cancelledOrders', count(*) FILTER(WHERE status = 'cancelled'), 'revenueCents', COALESCE(sum("revenueCents") FILTER(WHERE status = 'simulated_approved'), 0), 'averageTicketCents', COALESCE(round(avg("revenueCents") FILTER(WHERE status = 'simulated_approved')), 0))`
		ordering = `"createdAt" DESC,id DESC`
		if filter.Sort == "revenue" {
			ordering = `"revenueCents" DESC,id DESC`
		}
	case "products":
		queryPrefix += `
sold AS
    (SELECT
         i.*,
         o.created_at
     FROM checkout_order_items i
     JOIN orders o
         ON o.id = i.order_id
     WHERE o.status = 'simulated_approved'),
    performance AS
    (SELECT
         product_id,
         sum(quantity)::bigint AS units,
         sum(quantity::numeric * unit_price_cents)::bigint AS revenue,
         (array_agg(name
                    ORDER BY created_at DESC, id DESC))[1] AS historical_name
     FROM sold
     GROUP BY product_id),
    filtered AS
    (SELECT
         COALESCE(p.id, s.product_id) AS id,
         COALESCE(s.historical_name, p.name) AS name,
         COALESCE(p.sku, '') AS sku,
         COALESCE(t.name, 'Sem categoria') AS category,
         COALESCE(b.name, 'Sem marca') AS brand,
         COALESCE(s.units, 0)::bigint AS units,
         COALESCE(s.revenue, 0)::bigint AS "revenueCents",
         (p.id IS NULL
          OR p.status <> 'active') AS archived
     FROM products p
     FULL JOIN performance s
         ON s.product_id = p.id
     LEFT JOIN product_types t
         ON t.id = p.product_type_id
     LEFT JOIN brands b
         ON b.id = p.brand_id
     WHERE $4 = ''
         AND ($3 = ''
              OR COALESCE(s.historical_name, p.name) ILIKE $3
              OR p.sku ILIKE $3
              OR p.name ILIKE $3))`
		rowsQuery = `SELECT
    *,
    COALESCE(round(100.0 * "revenueCents" / NULLIF(sum("revenueCents") OVER(), 0), 2), 0) AS share
FROM filtered`
		statisticsQuery = `jsonb_build_object('soldProducts', count(*) FILTER(WHERE units > 0), 'units', COALESCE(sum(units), 0), 'revenueCents', COALESCE(sum("revenueCents"), 0), 'unsoldProducts', count(*) FILTER(WHERE units = 0))`
		ordering = `units DESC,id`
		if filter.Sort == "revenue" {
			ordering = `"revenueCents" DESC,id`
		}
		if filter.Sort == "name" {
			ordering = `name,id`
		}
	case "customers":
		queryPrefix += `
purchases AS
    (SELECT
         user_id,
         count(*)::bigint AS orders,
         sum(total_cents)::bigint AS revenue,
         max(created_at) AS last_purchase
     FROM orders
     WHERE status = 'simulated_approved'
     GROUP BY user_id),
    filtered AS
    (SELECT
         u.id,
         u.full_name AS name,
         u.email,
         u.created_at AS "createdAt",
         COALESCE(p.orders, 0)::bigint AS orders,
         COALESCE(p.revenue, 0)::bigint AS "revenueCents",
         p.last_purchase AS "lastPurchase"
     FROM users u
     LEFT JOIN purchases p
         ON p.user_id = u.id
     WHERE u.role = 'customer'
         AND $4 = ''
         AND ($3 = ''
              OR u.full_name ILIKE $3
              OR u.email ILIKE $3))`
		rowsQuery = `SELECT *
FROM filtered`
		statisticsQuery = `jsonb_build_object('buyers', count(*) FILTER(WHERE orders > 0), 'newCustomers', count(*) FILTER(
                                                                                                WHERE "createdAt" >= $1
                                                                                                    AND "createdAt" < $2), 'recurringCustomers', count(*) FILTER(WHERE orders >= 2), 'averageCustomerCents', COALESCE(round(avg("revenueCents") FILTER(WHERE orders > 0)), 0))`
		ordering = `"revenueCents" DESC,id`
		if filter.Sort == "units" {
			ordering = `orders DESC,id`
		}
		if filter.Sort == "name" {
			ordering = `name,id`
		}
	case "stock":
		queryPrefix += reportInventoryCTE + `,
    entries AS
    (SELECT
         i.id,
         0::bigint AS variant_id,
         ''::text AS variant,
         i.quantity AS units
     FROM inventory i
     WHERE i.status = 'active'
         AND i.variants = 0
     UNION ALL SELECT
         i.id,
         v.id,
         v.size,
         v.quantity
     FROM inventory i
     JOIN product_variants v
         ON v.product_id = i.id
     WHERE i.status = 'active'),
    filtered AS
    (SELECT
         e.id,
         e.variant_id,
         e.variant,
         p.name,
         COALESCE(p.sku, '') AS sku,
         COALESCE(t.name, 'Sem categoria') AS category,
         e.units,
         CASE
             WHEN e.units = 0 THEN 'out'
             WHEN e.units <= 5 THEN 'low'
             ELSE 'available'
         END AS status
     FROM entries e
     JOIN products p
         ON p.id = e.id
     LEFT JOIN product_types t
         ON t.id = p.product_type_id
     WHERE ($4 = ''
            OR CASE
                   WHEN e.units = 0 THEN 'out'
                   WHEN e.units <= 5 THEN 'low'
                   ELSE 'available'
               END = $4)
         AND ($3 = ''
              OR p.name ILIKE $3
              OR p.sku ILIKE $3
              OR e.variant ILIKE $3))`
		rowsQuery = `SELECT *
FROM filtered`
		statisticsQuery = `jsonb_build_object('activeProducts', count(DISTINCT id), 'outOfStock',
                       (SELECT count(*)
                        FROM inventory
                        WHERE id IN
                                (SELECT id
                                 FROM filtered)
                            AND quantity = 0),'lowStock',
                       (SELECT count(*)
                        FROM inventory
                        WHERE id IN
                                (SELECT id
                                 FROM filtered)
                            AND quantity BETWEEN 1 AND 5),'units', COALESCE(sum(units), 0))`
		ordering = `units,id,variant_id`
		if filter.Sort == "name" {
			ordering = `name,id,variant_id`
		}
	default:
		return result, fmt.Errorf("invalid report")
	}
	query := queryPrefix + `, page AS (` + rowsQuery + `
ORDER BY
` + ordering + `
LIMIT $5
OFFSET $6)
SELECT jsonb_build_object(
    'rows',
    COALESCE((
SELECT jsonb_agg(to_jsonb(page)
ORDER BY
` + ordering + `)
FROM page),'[]'::jsonb),'total',
    (SELECT count(*)
     FROM filtered),'stats',(
SELECT
` + statisticsQuery + ` FROM filtered))`
	search := ""
	if filter.Search != "" {
		search = "%" + strings.NewReplacer(`\`, `\\`, `%`, `\%`, `_`, `\_`).Replace(filter.Search) + "%"
	}
	var raw []byte
	err := repo.DB.QueryRowContext(ctx, query, filter.Period.From, filter.Period.Until, search, filter.Status, filter.PageSize, (filter.Page-1)*filter.PageSize).Scan(&raw)
	if err != nil {
		return result, err
	}
	err = json.Unmarshal(raw, &result)
	return result, err
}
