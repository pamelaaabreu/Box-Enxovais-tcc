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
	source := `SELECT
` + storeProductColumns + "," + storePromotionalPrice + storeProductSource +
		`
JOIN favorites f ON f.product_id = p.id
WHERE f.user_id = $1
`

	// executa a consulta utilizando o helper genérico de paginação.
	return pagination.ReadPage(
		ctx,
		repo.DB,
		source,
		[]any{userID},
		query,
		"page.id",
		scanStoreProduct,
	)
}

// utiliza FOR SHARE para impedir alterações no status do produto durante a inclusão nos favoritos,
func (repo FavoritesRepository) Add(ctx context.Context, userID int, productID int64) error {
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	// O bloqueio dura até o commit, impedindo desativação durante a inclusão.
	var status string
	err = tx.QueryRowContext(ctx, `SELECT status FROM products WHERE id=$1 FOR SHARE`, productID).Scan(&status)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrFavoriteProductNotFound
	}
	if err != nil {
		return err
	}
	if status != "active" {
		var existing bool
		if err = tx.QueryRowContext(ctx, `
SELECT
    EXISTS (
    SELECT
        1
    FROM favorites
    WHERE user_id = $1
        AND product_id = $2
)
`, userID, productID).Scan(&existing); err != nil {
			return err
		}
		// Repetir um favorito existente continua idempotente, mesmo após desativação.
		if !existing {
			return ErrFavoriteProductUnavailable
		}
	} else {
		if _, err = tx.ExecContext(ctx, `
INSERT INTO favorites(user_id, product_id)
VALUES ($1,
$2) ON CONFLICT(user_id, product_id) DO NOTHING
`, userID, productID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (repo FavoritesRepository) Remove(ctx context.Context, userID int, productID int64) error {
	_, err := repo.DB.ExecContext(ctx, `DELETE
FROM favorites
WHERE user_id = $1
    AND product_id = $2`, userID, productID)
	return err
}
