package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"errors"
)

// Consulta preço base e presença de variantes para validação inicial do serviço.
func (repo PromotionRepository) ProductPromotionInfo(ctx context.Context, productID int) (float64, bool, error) {
	var price float64
	var variants bool

	err := repo.DB.QueryRowContext(ctx, `
SELECT
    p.price,
    EXISTS (
    SELECT
        1
    FROM product_variants v
    WHERE v.product_id = p.id
)
FROM products p
WHERE p.id = $1
    AND p.status = 'active'
`, productID).Scan(&price, &variants)

	return price, variants, err
}

func (repo PromotionRepository) AddProduct(ctx context.Context, promotionID int, request models.AddToPromotionRequest) error {
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	// Serializa a inclusão com Save, que atualiza a mesma campanha antes dos participantes.
	var campaignID int
	if err = tx.QueryRowContext(ctx, `
SELECT
    id
FROM promotions
WHERE id = $1
    AND status = 'active' FOR UPDATE
`, promotionID).Scan(&campaignID); err != nil {
		return err
	}
	var base float64
	var variants bool
	err = tx.QueryRowContext(ctx, `
SELECT
    p.price,
    EXISTS (
    SELECT
        1
    FROM product_variants v
    WHERE v.product_id = p.id
)
FROM products p
WHERE p.id = $1
    AND p.status = 'active' FOR SHARE
`, request.ProductID).Scan(&base, &variants)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrCampaignInvalid
	}
	if err != nil {
		return err
	}
	if variants || !validCampaignPrice(request.PromotionalPrice, base, false) || request.PromotionalPrice >= base {
		return ErrCampaignInvalid
	}
	if _, err = tx.ExecContext(ctx, `
SELECT pg_advisory_xact_lock($1, $2)
`, promotionID, request.ProductID); err != nil {
		return err
	}
	if _, err = tx.ExecContext(ctx, `
DELETE
FROM promotion_products
WHERE promotion_id = $1
    AND product_id = $2
`, promotionID, request.ProductID); err != nil {
		return err
	}
	if _, err = tx.ExecContext(ctx, `
INSERT INTO promotion_products(promotion_id, product_id, promotional_price)
VALUES ($1,
$2,
$3)
`, promotionID, request.ProductID, request.PromotionalPrice); err != nil {
		return err
	}
	return tx.Commit()
}
