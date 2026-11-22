package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"time"
)

func (repo PromotionRepository) ListCampaigns(ctx context.Context) ([]models.PromotionRecord, error) {
	rows, err := repo.DB.QueryContext(ctx, `
SELECT
    id,
    name,
    status,
    start_date,
    end_date,
    description,
    image_path,
    home_featured,
    created_at,
    updated_at
FROM promotions
ORDER BY
    start_date DESC,
    id DESC
`)
	if err != nil {
		return nil, err
	}
	result := []models.PromotionRecord{}
	for rows.Next() {
		var p models.PromotionRecord
		var start, end sql.NullTime
		if err = rows.Scan(&p.ID, &p.Name, &p.Status, &start, &end, &p.Description, &p.ImagePath, &p.HomeFeatured, &p.CreatedAt, &p.UpdatedAt); err != nil {
			rows.Close()
			return nil, err
		}
		if start.Valid {
			p.StartDate = start.Time.Format(time.RFC3339)
		}
		if end.Valid {
			p.EndDate = end.Time.Format(time.RFC3339)
		}
		result = append(result, p)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, err
	}
	for i := range result {
		rows, err = repo.DB.QueryContext(ctx, `
SELECT
    product_id,
    MIN(promotional_price)
FROM promotion_products
WHERE promotion_id = $1
GROUP BY product_id
ORDER BY product_id
`, result[i].ID)
		if err != nil {
			return nil, err
		}
		items := []models.PromotionParticipant{}
		for rows.Next() {
			var p models.PromotionParticipant
			if err = rows.Scan(&p.ProductID, &p.PromotionalPrice); err != nil {
				rows.Close()
				return nil, err
			}
			items = append(items, p)
		}
		err = rows.Err()
		rows.Close()
		if err != nil {
			return nil, err
		}
		result[i].Products = &items
	}
	return result, nil
}
