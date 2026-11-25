package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"encoding/json"
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
    updated_at,
    COALESCE((
    SELECT
        json_agg(participant ORDER BY participant.product_id)
    FROM (
        SELECT
            product_id,
            MIN(promotional_price) AS promotional_price
        FROM promotion_products
        WHERE promotion_id = promotions.id
        GROUP BY product_id
    ) participant
), '[]') AS participants
FROM promotions
ORDER BY start_date DESC,
    id DESC
`)
	if err != nil {
		return nil, err
	}
	result := []models.PromotionRecord{}
	for rows.Next() {
		var p models.PromotionRecord
		var start, end sql.NullTime
		var participants []byte
		if err = rows.Scan(&p.ID, &p.Name, &p.Status, &start, &end, &p.Description, &p.ImagePath, &p.HomeFeatured, &p.CreatedAt, &p.UpdatedAt, &participants); err != nil {
			rows.Close()
			return nil, err
		}
		if start.Valid {
			p.StartDate = start.Time.Format(time.RFC3339)
		}
		if end.Valid {
			p.EndDate = end.Time.Format(time.RFC3339)
		}
		items := []models.PromotionParticipant{}
		if err = json.Unmarshal(participants, &items); err != nil {
			rows.Close()
			return nil, err
		}
		p.Products = &items
		result = append(result, p)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, err
	}
	return result, nil
}
