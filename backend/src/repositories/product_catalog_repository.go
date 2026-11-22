package repositories

import (
	"backend/src/models"
	"backend/src/pagination"
	"context"
)

const CatalogCoordinatedOrder = "coordinated"

const collectionCoordinatedOrder = `
    CASE
        WHEN NULLIF(page.measurements->>'coordinated_family', '') IS NOT NULL
             AND bool_or(page.measurements->>'coordinated_pair_type' = 'jogo-cama') OVER (
                 PARTITION BY
                     page.measurements->>'collection_slug',
                     page.measurements->>'coordinated_family'
             )
             AND bool_or(page.measurements->>'coordinated_pair_type' = 'edredom') OVER (
                 PARTITION BY
                     page.measurements->>'collection_slug',
                     page.measurements->>'coordinated_family'
             )
        THEN 0
        ELSE 1
    END,
    CASE
        WHEN NULLIF(page.measurements->>'coordinated_family', '') IS NOT NULL
        THEN min(page.id) OVER (
            PARTITION BY
                page.measurements->>'collection_slug',
                page.measurements->>'coordinated_family'
        )
        ELSE page.id
    END,
    CASE page.measurements->>'coordinated_pair_type'
        WHEN 'jogo-cama' THEN 0
        WHEN 'edredom' THEN 1
        ELSE 2
    END,
    page.id`

func (repo ProductRepository) List(ctx context.Context, page pagination.PageQuery) (pagination.Page[models.Product], error) {
	order := page.Order
	if order == CatalogCoordinatedOrder {
		order = collectionCoordinatedOrder
	}
	if order == "" {
		order = "page.id"
	}

	query := `SELECT
` + storeProductColumns + "," + storePromotionalPrice + storeProductSource + `
WHERE p.status = 'active'`

	return pagination.ReadPage(ctx, repo.DB, query, nil, page, order, scanStoreProduct)
}

func (repo ProductRepository) ListAdmin(ctx context.Context, page pagination.PageQuery) (pagination.Page[models.Product], error) {
	query := `SELECT
` + storeProductColumns + "," + storePromotionalPrice + storeProductSource
	return pagination.ReadPage(ctx, repo.DB, query, nil, page, "page.id", scanStoreProduct)
}

func (repo ProductRepository) ListPromotional(ctx context.Context, name string, page pagination.PageQuery) (pagination.Page[models.Product], error) {
	// Evita produtos duplicados quando pertencem a várias promoções com o mesmo nome.
	query := `SELECT
` + storeProductColumns + ",promotional.promotional_price" + storeProductSource + `
JOIN
    (SELECT
         pp.product_id,
         MIN(pp.promotional_price) AS promotional_price
     FROM promotion_products pp
     JOIN promotions promo
         ON promo.id = pp.promotion_id
     WHERE promo.name = $1
         AND promo.status = 'active'
         AND promo.start_date <= NOW()
         AND promo.end_date >= NOW()
         AND pp.promotional_price >= 0
     GROUP BY pp.product_id) promotional ON promotional.product_id = p.id
WHERE p.status = 'active'
    AND promotional.promotional_price <= p.price`

	return pagination.ReadPage(ctx, repo.DB, query, []any{name}, page, "page.id", scanStoreProduct)
}
