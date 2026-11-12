package repositories

import (
	"context"
	"encoding/json"
)

type Dashboard struct {
	Orders       int64           `json:"orders"`
	RevenueCents int64           `json:"revenueCents"`
	Products     int64           `json:"products"`
	LowStock     int64           `json:"lowStock"`
	Months       json.RawMessage `json:"months"`
	Categories   json.RawMessage `json:"categories"`
}

func (repo ProductRepository) Dashboard(ctx context.Context) (Dashboard, error) {
	const query = `
 WITH months AS (
   SELECT to_char(created_at AT TIME ZONE 'America/Sao_Paulo', 'YYYY-MM') AS month,
          count(*) AS total, count(*) FILTER (WHERE status = 'cancelled') AS cancelled
   FROM checkout_orders GROUP BY 1
 ), categories AS (
   SELECT COALESCE(t.name, 'Sem categoria') AS name, sum(i.quantity) AS units
   FROM checkout_order_items i JOIN checkout_orders o ON o.id = i.order_id
   LEFT JOIN products p ON p.id = i.product_id
   LEFT JOIN product_types t ON t.id = p.product_type_id
   WHERE o.status = 'simulated_approved'
   GROUP BY 1
 )
 SELECT count(*), COALESCE(sum(total_cents) FILTER (WHERE status = 'simulated_approved'), 0),
        (SELECT count(*) FROM products),
        (SELECT count(*) FROM products WHERE status = 'active' AND quantity <= 5),
        COALESCE((SELECT json_agg(months ORDER BY month) FROM months), '[]'),
        COALESCE((SELECT json_agg(categories ORDER BY units DESC, name) FROM categories), '[]')
 FROM checkout_orders`
	var dashboard Dashboard
	err := repo.DB.QueryRowContext(ctx, query).Scan(&dashboard.Orders, &dashboard.RevenueCents, &dashboard.Products, &dashboard.LowStock, &dashboard.Months, &dashboard.Categories)
	return dashboard, err
}
