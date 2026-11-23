package repositories

import (
	"backend/src/models"
	"context"
	"encoding/json"
	"strings"
)

func (repo ProductRepository) Create(ctx context.Context, p models.Product) (int, error) {
	measurementsJSON, err := json.Marshal(p.Measurements)
	if err != nil {
		return 0, err
	}

	query := `
INSERT INTO products (
    name,
    description,
    care_instructions,
    measurements,
    price,
    quantity,
    brand_id,
    product_type_id,
    status,
    purchase_summary,
    sku
)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
RETURNING id`

	var productID int
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	err = tx.QueryRowContext(ctx,
		query,
		p.Name,
		p.Description,
		p.CareInstructions,
		measurementsJSON,
		p.Price,
		p.Quantity,
		p.BrandID,
		p.ProductTypeID,
		p.Status,
		p.PurchaseSummary,
		p.SKU,
	).Scan(&productID)

	if err != nil {
		return 0, err
	}
	for _, v := range p.Variants {
		if _, err = tx.ExecContext(ctx, `INSERT INTO product_variants(product_id, size, price, quantity, dimensions)
VALUES($1,$2,$3,$4,$5)`, productID, strings.TrimSpace(v.Size), v.Price, v.Stock, strings.TrimSpace(v.Dimensions)); err != nil {
			return 0, err
		}
	}
	err = tx.Commit()

	return productID, err
}
