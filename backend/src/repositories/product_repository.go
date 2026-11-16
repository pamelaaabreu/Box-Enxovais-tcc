package repositories

import (
	"backend/src/models"
	"backend/src/pagination"
	"context"
	"database/sql"
	"encoding/json"
	"strings"
)

type ProductRepository struct{ DB *sql.DB }

const storeProductColumns = `p.id,p.name,p.description,p.care_instructions,
 COALESCE(p.measurements,'{}') AS measurements,
 COALESCE((SELECT MIN(v.price) FROM product_variants v WHERE v.product_id=p.id),p.price) AS price,
 COALESCE((SELECT SUM(v.quantity) FROM product_variants v WHERE v.product_id=p.id),p.quantity) AS quantity,p.status,
 p.product_type_id,COALESCE(t.name,'') AS category_name,
 COALESCE((SELECT json_agg(image_path ORDER BY is_primary DESC NULLS LAST,id)
 FROM product_images WHERE product_id=p.id AND variant_id IS NULL),'[]') AS image_paths,
 COALESCE((SELECT json_agg(json_build_object('id',v.id,'size',v.size,'price',v.price,'stock',v.quantity,
 'dimensions',COALESCE(v.dimensions,''),'included_items',v.included_items,'simulated',v.simulated,
 'image_paths',COALESCE((SELECT json_agg(i.image_path ORDER BY i.is_primary DESC NULLS LAST,i.id)
 FROM product_images i WHERE i.variant_id=v.id),'[]')) ORDER BY v.id)
 FROM product_variants v WHERE v.product_id=p.id),'[]') AS variants,
 p.brand_id,p.created_at,p.updated_at`
const storeProductSource = ` FROM products p LEFT JOIN product_types t ON t.id=p.product_type_id`

func (repo ProductRepository) ListTypes(ctx context.Context) ([]models.ProductType, error) {
	return repo.listProductOptions(ctx, "SELECT id, name FROM product_types ORDER BY name, id")
}

func (repo ProductRepository) ListBrands(ctx context.Context) ([]models.ProductType, error) {
	return repo.listProductOptions(ctx, "SELECT id, name FROM brands ORDER BY name, id")
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

func (repo ProductRepository) Create(ctx context.Context, p models.Product) (int, error) {
	measurementsJSON, err := json.Marshal(p.Measurements)
	if err != nil {
		return 0, err
	}

	query := `
        INSERT INTO products 
        (name, description, care_instructions, measurements, price, quantity, brand_id, product_type_id, status) 
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) 
        RETURNING id`

	var productID int
	err = repo.DB.QueryRowContext(ctx,
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
	).Scan(&productID)

	return productID, err
}

func scanStoreProduct(rows *sql.Rows) (models.Product, error) {
	var p models.Product
	var measurements, images, variants []byte
	var createdAt, updatedAt sql.NullTime
	err := rows.Scan(&p.ID, &p.Name, &p.Description, &p.CareInstructions, &measurements,
		&p.Price, &p.Quantity, &p.Status, &p.ProductTypeID, &p.CategoryName, &images, &variants,
		&p.BrandID, &createdAt, &updatedAt, &p.PromotionalPrice)
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
	p.CreatedAt, p.UpdatedAt = createdAt.Time, updatedAt.Time
	p.Stock = p.Quantity
	return p, nil
}

func (repo ProductRepository) Get(ctx context.Context, id int64) ([]models.Product, error) {
	rows, err := repo.DB.QueryContext(ctx, "SELECT "+storeProductColumns+",0 AS promotional_price"+storeProductSource+" WHERE p.id=$1", id)
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

func (repo ProductRepository) List(ctx context.Context, page pagination.PageQuery) (pagination.Page[models.Product], error) {
	order := page.Order
	if order == "" {
		order = "page.id"
	}
	return pagination.ReadPage(ctx, repo.DB, "SELECT "+storeProductColumns+",0 AS promotional_price"+storeProductSource+" WHERE p.status='active'", nil, page, order, scanStoreProduct)
}

func (repo ProductRepository) ListAdmin(ctx context.Context, page pagination.PageQuery) (pagination.Page[models.Product], error) {
	return pagination.ReadPage(ctx, repo.DB, "SELECT "+storeProductColumns+",0 AS promotional_price"+storeProductSource, nil, page, "page.id", scanStoreProduct)
}

func (repo ProductRepository) ListPromotional(ctx context.Context, name string, page pagination.PageQuery) (pagination.Page[models.Product], error) {
	// One row per product even when the same product belongs to multiple matching promotions.
	query := "SELECT " + storeProductColumns + `,promotional.promotional_price` + storeProductSource + `
 JOIN (
  SELECT pp.product_id,MIN(pp.promotional_price) AS promotional_price
  FROM promotion_products pp JOIN promotions promo ON promo.id=pp.promotion_id
  WHERE promo.name=$1 AND promo.status='active'
   AND promo.start_date<=NOW() AND promo.end_date>=NOW()
   AND pp.promotional_price>=0
  GROUP BY pp.product_id
 ) promotional ON promotional.product_id=p.id
 WHERE p.status='active' AND promotional.promotional_price<=p.price`
	return pagination.ReadPage(ctx, repo.DB, query, []any{name}, page, "page.id", scanStoreProduct)
}
