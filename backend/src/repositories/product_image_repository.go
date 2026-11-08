package repositories

import (
	"context"
	"database/sql"
)

type ProductImageRepository struct{ DB *sql.DB }

func (repo ProductImageRepository) Create(ctx context.Context, productID int, path string) error {
	_, err := repo.DB.ExecContext(ctx, `INSERT INTO product_images (product_id, image_path) VALUES ($1, $2)`, productID, path)
	return err
}
