package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
)

type PromotionRepository struct{ DB *sql.DB }

func (repo PromotionRepository) Create(ctx context.Context, request models.CreatePromotionRequest) (int, error) {
	var id int
	err := repo.DB.QueryRowContext(ctx, `INSERT INTO promotions (name, status, start_date, end_date)
 VALUES ($1, $2, $3, $4) RETURNING id`, request.Name, request.Status, request.StartDate, request.EndDate).Scan(&id)
	return id, err
}

func (repo PromotionRepository) FindActiveID(ctx context.Context, name string) (int, error) {
	var id int
	err := repo.DB.QueryRowContext(ctx, "SELECT id FROM promotions WHERE name = $1 AND status = 'active'", name).Scan(&id)
	return id, err
}

func (repo PromotionRepository) AddProduct(ctx context.Context, promotionID int, request models.AddToPromotionRequest) error {
	_, err := repo.DB.ExecContext(ctx, `INSERT INTO promotion_products (promotion_id, product_id, promotional_price)
 VALUES ($1, $2, $3)`, promotionID, request.ProductID, request.PromotionalPrice)
	return err
}
