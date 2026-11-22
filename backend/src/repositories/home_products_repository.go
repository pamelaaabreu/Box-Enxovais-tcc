package repositories

import (
	"backend/src/models"
	"backend/src/pagination"
	"context"

	"github.com/lib/pq"
)

// Produtos mais vendidos
func (repo HomeRepository) Highlights(ctx context.Context) ([]models.Product, bool, error) {
	source := `
SELECT
` + storeProductColumns + `,
		       ` + storePromotionalPrice + storeProductSource + `
JOIN
    (SELECT
         i.product_id,
         SUM(i.quantity)::bigint AS sold
     FROM checkout_order_items i
     JOIN checkout_orders o
         ON o.id = i.order_id
     WHERE o.status = 'simulated_approved'
         AND o.stock_debited
     GROUP BY i.product_id) AS sales ON sales.product_id = p.id
WHERE p.status = 'active'
ORDER BY
    sales.sold DESC,
    p.id
LIMIT 6
`

	rows, e := repo.DB.QueryContext(ctx, source)
	if e != nil {
		return nil, false, e
	}

	items := []models.Product{}
	for rows.Next() {
		p, e := scanStoreProduct(rows)
		if e != nil {
			rows.Close()
			return nil, false, e
		}
		items = append(items, p)
	}

	e = rows.Err()
	rows.Close()
	if e != nil {
		return nil, false, e
	}

	if len(items) > 0 {
		return items, true, nil
	}

	fallback, e := (ProductRepository{DB: repo.DB}).List(ctx, pagination.PageQuery{
		Limit: 6,
		Order: "page.id DESC",
	})
	return fallback.Items, false, e
}

// Produtos em destaque
func (repo HomeRepository) Featured(ctx context.Context) ([]models.Product, error) {
	categories, err := repo.Categories(ctx)
	if err != nil {
		return nil, err
	}

	covers := []string{}
	for _, category := range categories {
		if category.ImagePath != "" {
			covers = append(covers, category.ImagePath)
		}
	}

	source := `
WITH candidates AS (
SELECT
` + storeProductColumns + `,
			       ` + storePromotionalPrice + `,
    CASE
        WHEN t.name IN (
                            'Cama',
                            'Cama / Jogos de cama',
                            'Cama / Edredons',
                            'Cama / Colchas e cobre-leitos',
                            'Cama / Mantas e peseiras',
                            'Cama / Protetores de colchão') THEN 'Cama'
        ELSE COALESCE(t.name, 'Outros')
    END AS home_category,
    CASE
        WHEN
                 (SELECT image_path
                  FROM product_images
                  WHERE product_id = p.id
                      AND variant_id IS NULL
                  ORDER BY
                      is_primary DESC NULLS LAST,
                      id
                  LIMIT 1) = ANY($1) THEN 1
        ELSE 0
    END AS repeats_image
` + storeProductSource + `
WHERE p.status = 'active' ), ranked AS
        (SELECT
             candidates.*,
             ROW_NUMBER() OVER (PARTITION BY home_category
                                ORDER BY repeats_image, id) AS category_position
         FROM candidates
         WHERE quantity > 0)
    SELECT
        id,
        name,
        description,
        care_instructions,
        measurements,
        price,
        quantity,
        status,
        product_type_id,
        category_name,
        image_paths,
        variants,
        brand_id,
        brand_name,
        purchase_summary,
        created_at,
        updated_at,
        sku,
        promotional_price
    FROM ranked
ORDER BY
    category_position,
    CASE home_category
        WHEN 'Cama' THEN 1
        WHEN 'Travesseiros' THEN 2
        WHEN 'Toalhas' THEN 3
        WHEN 'Almofadas' THEN 4
        WHEN 'Mesa' THEN 5
        WHEN 'Decoração' THEN 6
        ELSE 7
    END,
    id
LIMIT 4
`

	rows, err := repo.DB.QueryContext(ctx, source, pq.Array(covers))
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	products := []models.Product{}
	for rows.Next() {
		product, err := scanStoreProduct(rows)
		if err != nil {
			return nil, err
		}
		products = append(products, product)
	}

	return products, rows.Err()
}
