package repositories

import (
	"backend/src/models"
	"backend/src/pagination"
	"context"
	"database/sql"
	"errors"
)

type HomeRepository struct{ DB *sql.DB }

var ErrReviewDuplicate = errors.New("review duplicate")

func (repo HomeRepository) Highlights(ctx context.Context) ([]models.Product, bool, error) {
	source := "SELECT " + storeProductColumns + `,0 AS promotional_price` + storeProductSource + ` JOIN (SELECT i.product_id,SUM(i.quantity)::bigint sold FROM checkout_order_items i JOIN checkout_orders o ON o.id=i.order_id WHERE o.status='simulated_approved' AND o.stock_debited GROUP BY i.product_id) sales ON sales.product_id=p.id WHERE p.status='active'`
	rows, e := repo.DB.QueryContext(ctx, source+" ORDER BY sales.sold DESC,p.id LIMIT 6")
	if e != nil {
		return nil, false, e
	}
	items := []models.Product{}
	for rows.Next() {
		p, e := scanStoreProduct(rows)
		if e != nil {
			rows.Close()
			return nil, false, e
		}
		items = append(items, p)
	}
	e = rows.Err()
	rows.Close()
	if e != nil {
		return nil, false, e
	}
	if len(items) > 0 {
		return items, true, nil
	}
	fallback, e := (ProductRepository{DB: repo.DB}).List(ctx, pagination.PageQuery{Limit: 6, Order: "page.id DESC"})
	return fallback.Items, false, e
}
func (repo HomeRepository) Reviews(ctx context.Context, admin bool) ([]models.ExperienceReview, error) {
	where := ` WHERE r.status='approved' AND r.publication_consent AND o.status='simulated_approved' AND o.stock_debited`
	if admin {
		where = ""
	}
	rows, e := repo.DB.QueryContext(ctx, `SELECT r.id,r.order_id,r.overall,r.navigation,r.service,r.experience,r.comment,r.publication_consent,r.status,r.created_at FROM purchase_experience_reviews r JOIN checkout_orders o ON o.id=r.order_id`+where+` ORDER BY r.created_at DESC,r.id DESC`)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	result := []models.ExperienceReview{}
	for rows.Next() {
		var v models.ExperienceReview
		if e = rows.Scan(&v.ID, &v.OrderID, &v.Overall, &v.Navigation, &v.Service, &v.Experience, &v.Comment, &v.Consent, &v.Status, &v.CreatedAt); e != nil {
			return nil, e
		}
		if !admin {
			v.OrderID = 0
			v.Status = ""
		}
		result = append(result, v)
	}
	return result, rows.Err()
}
func (repo HomeRepository) OrderReview(ctx context.Context, user int, order int64) (*models.ExperienceReview, error) {
	var eligible bool
	e := repo.DB.QueryRowContext(ctx, `SELECT status='simulated_approved' AND stock_debited FROM checkout_orders WHERE id=$1 AND user_id=$2`, order, user).Scan(&eligible)
	if e != nil {
		return nil, e
	}
	if !eligible {
		return nil, sql.ErrNoRows
	}
	var v models.ExperienceReview
	e = repo.DB.QueryRowContext(ctx, `SELECT id,overall,navigation,service,experience,comment,publication_consent,status,created_at FROM purchase_experience_reviews WHERE order_id=$1 AND user_id=$2`, order, user).Scan(&v.ID, &v.Overall, &v.Navigation, &v.Service, &v.Experience, &v.Comment, &v.Consent, &v.Status, &v.CreatedAt)
	if errors.Is(e, sql.ErrNoRows) {
		return nil, nil
	}
	return &v, e
}
func (repo HomeRepository) CreateReview(ctx context.Context, user int, order int64, v models.ExperienceReview) error {
	tx, e := repo.DB.BeginTx(ctx, nil)
	if e != nil {
		return e
	}
	defer tx.Rollback()
	var eligible bool
	e = tx.QueryRowContext(ctx, `SELECT status='simulated_approved' AND stock_debited FROM checkout_orders WHERE id=$1 AND user_id=$2 FOR UPDATE`, order, user).Scan(&eligible)
	if e != nil {
		return e
	}
	if !eligible {
		return sql.ErrNoRows
	}
	result, e := tx.ExecContext(ctx, `INSERT INTO purchase_experience_reviews(order_id,user_id,overall,navigation,service,experience,comment,publication_consent) VALUES($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT(order_id) DO NOTHING`, order, user, v.Overall, v.Navigation, v.Service, v.Experience, v.Comment, v.Consent)
	if e != nil {
		return e
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return ErrReviewDuplicate
	}
	return tx.Commit()
}
func (repo HomeRepository) Moderate(ctx context.Context, id int64, user int, status string) error {
	result, e := repo.DB.ExecContext(ctx, `UPDATE purchase_experience_reviews SET status=$1,moderated_at=now(),moderated_by=$2 WHERE id=$3`, status, user, id)
	if e != nil {
		return e
	}
	n, _ := result.RowsAffected()
	if n == 0 {
		return sql.ErrNoRows
	}
	return nil
}
func (repo HomeRepository) Campaign(ctx context.Context) (*models.HomeCampaign, error) {
	var c models.HomeCampaign
	e := repo.DB.QueryRowContext(ctx, `SELECT id,name,description,image_path,start_date,end_date FROM promotions WHERE home_featured AND status='active' AND start_date<=now() AND end_date>=now() ORDER BY start_date DESC,id DESC LIMIT 1`).Scan(&c.ID, &c.Name, &c.Description, &c.ImagePath, &c.StartDate, &c.EndDate)
	if errors.Is(e, sql.ErrNoRows) {
		return nil, nil
	}
	if e != nil {
		return nil, e
	}
	source := "SELECT " + storeProductColumns + `,discount.promotional_price` + storeProductSource + ` JOIN (SELECT product_id,MIN(promotional_price) promotional_price FROM promotion_products WHERE promotion_id=$1 GROUP BY product_id) discount ON discount.product_id=p.id WHERE p.status='active' AND discount.promotional_price>=0 AND discount.promotional_price<p.price AND NOT EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=p.id)`
	page, e := pagination.ReadPage(ctx, repo.DB, source, []any{c.ID}, pagination.PageQuery{Limit: 8}, "page.id", scanStoreProduct)
	if e != nil {
		return nil, e
	}
	if len(page.Items) == 0 {
		return nil, nil
	}
	c.Products = []models.CampaignProduct{}
	for _, p := range page.Items {
		c.Products = append(c.Products, models.CampaignProduct{Product: p, PromotionalPrice: p.PromotionalPrice})
	}
	return &c, nil
}

func (repo HomeRepository) Categories(ctx context.Context) ([]map[string]string, error) {
	rows, e := repo.DB.QueryContext(ctx, `WITH groups(name,slug,ord) AS (VALUES('Cama','cama',1),('Travesseiros','travesseiros',2),('Toalhas','toalhas',3),('Almofadas','almofadas',4),('Mesa','mesa',5),('Decoração','decoracao',6)) SELECT g.name,g.slug,COALESCE(i.image_path,'') FROM groups g LEFT JOIN LATERAL(SELECT img.image_path FROM products p JOIN product_types t ON t.id=p.product_type_id JOIN product_images img ON img.product_id=p.id AND img.variant_id IS NULL WHERE p.status='active' AND (t.name=g.name OR (g.slug='cama' AND t.name IN('Cama / Jogos de cama','Cama / Edredons','Cama / Colchas e cobre-leitos','Cama / Mantas e peseiras','Cama / Protetores de colchão'))) ORDER BY CASE WHEN g.slug='decoracao' AND p.measurements->>'Tipo'='Tapetes para quarto e sala' THEN 0 ELSE 1 END,img.is_primary DESC NULLS LAST,p.id,img.id LIMIT 1) i ON true ORDER BY g.ord`)
	if e != nil {
		return nil, e
	}
	defer rows.Close()
	out := []map[string]string{}
	for rows.Next() {
		var n, s, p string
		if e = rows.Scan(&n, &s, &p); e != nil {
			return nil, e
		}
		out = append(out, map[string]string{"name": n, "slug": s, "imagePath": p})
	}
	return out, rows.Err()
}
