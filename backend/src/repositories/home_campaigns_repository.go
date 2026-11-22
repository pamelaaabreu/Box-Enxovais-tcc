package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"errors"
)

// Campaign retorna a campanha ativa escolhida para destaque na Home.
func (repo HomeRepository) Campaign(ctx context.Context) (*models.HomeCampaign, error) {
	var id int

	query := `
SELECT pr.id
FROM promotions pr
WHERE pr.home_featured
    AND pr.status = 'active'
    AND pr.start_date <= NOW()
    AND pr.end_date >= NOW()
    AND EXISTS
        (SELECT 1
         FROM promotion_products pp
         JOIN products p
             ON p.id = pp.product_id
         WHERE pp.promotion_id = pr.id
             AND p.status = 'active'
             AND COALESCE(
                              (SELECT SUM(quantity)
                               FROM product_variants
                               WHERE product_id = p.id), p.quantity) > 0)
ORDER BY
    pr.start_date DESC,
    pr.id DESC
LIMIT 1
`

	err := repo.DB.QueryRowContext(ctx, query).Scan(&id)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	return repo.CampaignByID(ctx, id)
}

// CampaignByID retorna a campanha vigente e seus produtos elegiveis.
func (repo HomeRepository) CampaignByID(ctx context.Context, id int) (*models.HomeCampaign, error) {
	var c models.HomeCampaign

	campaignQuery := `
SELECT
    id,
    name,
    description,
    image_path,
    start_date,
    end_date
FROM promotions
WHERE id = $1
    AND status = 'active'
    AND start_date <= NOW()
    AND end_date >= NOW()
`

	err := repo.DB.QueryRowContext(ctx, campaignQuery, id).Scan(
		&c.ID,
		&c.Name,
		&c.Description,
		&c.ImagePath,
		&c.StartDate,
		&c.EndDate,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}

	productsQuery := `SELECT
` + storeProductColumns + "," + storePromotionalPrice + storeProductSource + `
WHERE p.status = 'active'
    AND EXISTS
        (SELECT 1
         FROM promotion_products pp
         WHERE pp.promotion_id = $1
             AND pp.product_id = p.id)
    AND COALESCE(
                     (SELECT SUM(quantity)
                      FROM product_variants
                      WHERE product_id = p.id), p.quantity) > 0
ORDER BY p.id
`

	rows, err := repo.DB.QueryContext(ctx, productsQuery, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	c.Products = []models.CampaignProduct{}
	for rows.Next() {
		p, err := scanStoreProduct(rows)
		if err != nil {
			return nil, err
		}

		value := p.PromotionalPrice
		if !p.PromotionActive {
			value = p.Price
		}

		c.Products = append(c.Products, models.CampaignProduct{
			Product:          p,
			PromotionalPrice: value,
		})
	}

	if err = rows.Err(); err != nil {
		return nil, err
	}
	if len(c.Products) == 0 {
		return nil, nil
	}

	return &c, nil
}
