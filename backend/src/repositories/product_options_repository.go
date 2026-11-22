package repositories

import (
	"backend/src/models"
	"context"
)

func (repo ProductRepository) ListTypes(ctx context.Context) ([]models.ProductType, error) {
	return repo.listProductOptions(ctx, `SELECT
    id,
    name
FROM product_types
ORDER BY
    name,
    id`)
}

func (repo ProductRepository) ListBrands(ctx context.Context) ([]models.ProductType, error) {
	return repo.listProductOptions(ctx, `SELECT
    id,
    name
FROM brands
ORDER BY
    name,
    id`)
}

func (repo ProductRepository) listProductOptions(ctx context.Context, query string) ([]models.ProductType, error) {
	rows, err := repo.DB.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	types := []models.ProductType{}
	for rows.Next() {
		var productType models.ProductType
		if err := rows.Scan(&productType.ID, &productType.Name); err != nil {
			return nil, err
		}
		types = append(types, productType)
	}
	return types, rows.Err()
}
