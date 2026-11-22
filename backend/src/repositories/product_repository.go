package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"encoding/json"
	"strings"
)

type ProductRepository struct{ DB *sql.DB }

func scanStoreProduct(rows *sql.Rows) (models.Product, error) {
	var p models.Product
	var measurements, images, variants []byte
	var createdAt, updatedAt sql.NullTime
	var promotional sql.NullFloat64
	err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.CareInstructions, &measurements,
		&p.Price, &p.Quantity, &p.Status, &p.ProductTypeID, &p.CategoryName, &images, &variants,
		&p.BrandID, &p.BrandName, &p.PurchaseSummary, &createdAt, &updatedAt, &p.SKU, &promotional)
	if err != nil {
		return p, err
	}
	if err = json.Unmarshal(measurements, &p.Measurements); err != nil {
		return p, err
	}
	if err = json.Unmarshal(images, &p.ImagePaths); err != nil {
		return p, err
	}
	if err = json.Unmarshal(variants, &p.Variants); err != nil {
		return p, err
	}
	for i, path := range p.ImagePaths {
		p.ImagePaths[i] = strings.ReplaceAll(path, "\\", "/")
	}
	p.PromotionalPrice = promotional.Float64
	p.PromotionActive = promotional.Valid && promotional.Float64 < p.Price
	p.CreatedAt, p.UpdatedAt = createdAt.Time, updatedAt.Time
	p.Stock = p.Quantity
	return p, nil
}

func (repo ProductRepository) Get(ctx context.Context, id int64) ([]models.Product, error) {
	rows, err := repo.DB.QueryContext(ctx, `SELECT
`+storeProductColumns+","+storePromotionalPrice+storeProductSource+`
WHERE p.id = $1`, id)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	products := []models.Product{}
	for rows.Next() {
		p, err := scanStoreProduct(rows)
		if err != nil {
			return nil, err
		}
		products = append(products, p)
	}
	return products, rows.Err()
}
