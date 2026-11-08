package repositories

import (
	"backend/src/models"
	"backend/src/pagination"
	"context"
	"database/sql"
	"errors"
)

var ErrFavoriteProductNotFound = errors.New("Produto não encontrado")
var ErrFavoriteProductUnavailable = errors.New("Este produto não está disponível para favoritar")

type FavoritesRepository struct{ DB *sql.DB }

func (repo FavoritesRepository) List(ctx context.Context, userID int, query pagination.PageQuery) (pagination.Page[models.Product], error) {
	source := "SELECT " + storeProductColumns + ",0 AS promotional_price" + storeProductSource +
		" JOIN favorites f ON f.product_id=p.id WHERE f.user_id=$1"
	return pagination.ReadPage(ctx, repo.DB, source, []any{userID}, query, "page.id", scanStoreProduct)
}

func (repo FavoritesRepository) Add(ctx context.Context, userID int, productID int64) error {
	// The row lock keeps eligibility consistent with concurrent status changes/deletion.
	// The unique key makes concurrent additions idempotent.
	var status string
	var existing bool
	var inserted int64
	err := repo.DB.QueryRowContext(ctx, `WITH product AS MATERIALIZED (
  SELECT id,status FROM products WHERE id=$2 FOR SHARE
 ), added AS (
  INSERT INTO favorites(user_id,product_id)
  SELECT $1,id FROM product WHERE status='active'
  ON CONFLICT(user_id,product_id) DO NOTHING RETURNING product_id
 )
 SELECT status,EXISTS(SELECT 1 FROM favorites WHERE user_id=$1 AND product_id=product.id),
 (SELECT COUNT(*) FROM added) FROM product`, userID, productID).Scan(&status, &existing, &inserted)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrFavoriteProductNotFound
	}
	if err != nil {
		return err
	}
	if status != "active" && !existing {
		return ErrFavoriteProductUnavailable
	}
	return nil
}

func (repo FavoritesRepository) Remove(ctx context.Context, userID int, productID int64) error {
	_, err := repo.DB.ExecContext(ctx, "DELETE FROM favorites WHERE user_id=$1 AND product_id=$2", userID, productID)
	return err
}
