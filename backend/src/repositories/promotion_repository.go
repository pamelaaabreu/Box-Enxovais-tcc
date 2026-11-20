package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"errors"
	"math"
	"time"
)

type PromotionRepository struct{ DB *sql.DB }

func (repo PromotionRepository) Create(ctx context.Context, request models.CreatePromotionRequest) (int, error) {
	var id int
	err := repo.DB.QueryRowContext(ctx, `INSERT INTO promotions (name, status, start_date, end_date,description,image_path,home_featured)
 VALUES ($1, $2, $3, $4,$5,$6,$7) RETURNING id`, request.Name, request.Status, request.StartDate, request.EndDate, request.Description, request.ImagePath, request.HomeFeatured).Scan(&id)
	return id, err
}

func (repo PromotionRepository) FindActiveID(ctx context.Context, name string) (int, error) {
	var id int
	err := repo.DB.QueryRowContext(ctx, "SELECT id FROM promotions WHERE name = $1 AND status = 'active'", name).Scan(&id)
	return id, err
}

func (repo PromotionRepository) AddProduct(ctx context.Context, promotionID int, request models.AddToPromotionRequest) error {
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if _, err = tx.ExecContext(ctx, "SELECT pg_advisory_xact_lock($1,$2)", promotionID, request.ProductID); err != nil {
		return err
	}
	if _, err = tx.ExecContext(ctx, "DELETE FROM promotion_products WHERE promotion_id=$1 AND product_id=$2", promotionID, request.ProductID); err != nil {
		return err
	}
	if _, err = tx.ExecContext(ctx, "INSERT INTO promotion_products(promotion_id,product_id,promotional_price) VALUES($1,$2,$3)", promotionID, request.ProductID, request.PromotionalPrice); err != nil {
		return err
	}
	return tx.Commit()
}

var ErrCampaignInvalid = errors.New("invalid campaign participants")

func (repo PromotionRepository) Save(ctx context.Context, id int, request models.CreatePromotionRequest) (int, error) {
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}
	defer tx.Rollback()
	if _, err = tx.ExecContext(ctx, "SELECT pg_advisory_xact_lock(hashtext(lower($1)))", request.Name); err != nil {
		return 0, err
	}
	var duplicate bool
	if err = tx.QueryRowContext(ctx, "SELECT EXISTS(SELECT 1 FROM promotions WHERE lower(name)=lower($1) AND id<>$2)", request.Name, id).Scan(&duplicate); err != nil {
		return 0, err
	}
	if duplicate {
		return 0, ErrCampaignInvalid
	}
	if id == 0 {
		err = tx.QueryRowContext(ctx, `INSERT INTO promotions(name,status,start_date,end_date,description,image_path,home_featured) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`, request.Name, request.Status, request.StartDate, request.EndDate, request.Description, request.ImagePath, request.HomeFeatured).Scan(&id)
	} else {
		result, e := tx.ExecContext(ctx, `UPDATE promotions SET name=$1,status=$2,start_date=$3,end_date=$4,description=$5,image_path=$6,home_featured=$7 WHERE id=$8`, request.Name, request.Status, request.StartDate, request.EndDate, request.Description, request.ImagePath, request.HomeFeatured, id)
		if e != nil {
			return 0, e
		}
		n, e := result.RowsAffected()
		if e != nil {
			return 0, e
		}
		if n == 0 {
			return 0, sql.ErrNoRows
		}
	}
	if err != nil {
		return 0, err
	}
	if request.Products != nil {
		if len(*request.Products) > 100 {
			return 0, ErrCampaignInvalid
		}
		if _, err = tx.ExecContext(ctx, "DELETE FROM promotion_products WHERE promotion_id=$1", id); err != nil {
			return 0, err
		}
		seen := map[int]bool{}
		for _, item := range *request.Products {
			if item.ProductID <= 0 || seen[item.ProductID] {
				return 0, ErrCampaignInvalid
			}
			seen[item.ProductID] = true
			var base float64
			var variants bool
			err = tx.QueryRowContext(ctx, `SELECT p.price,EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=p.id) FROM products p WHERE id=$1 AND status='active' FOR SHARE`, item.ProductID).Scan(&base, &variants)
			if errors.Is(err, sql.ErrNoRows) {
				return 0, ErrCampaignInvalid
			}
			if err != nil {
				return 0, err
			}
			value := base
			if item.PromotionalPrice != nil {
				value = *item.PromotionalPrice
				if math.IsNaN(value) || math.IsInf(value, 0) || value < 0 || value > base || math.Abs(value*100-math.Round(value*100)) > 0.00001 || (variants && value < base) {
					return 0, ErrCampaignInvalid
				}
			}
			if _, err = tx.ExecContext(ctx, "INSERT INTO promotion_products(promotion_id,product_id,promotional_price) VALUES($1,$2,$3)", id, item.ProductID, value); err != nil {
				return 0, err
			}
		}
	}
	if err = tx.Commit(); err != nil {
		return 0, err
	}
	return id, nil
}
func (repo PromotionRepository) ListCampaigns(ctx context.Context) ([]models.PromotionRecord, error) {
	rows, err := repo.DB.QueryContext(ctx, `SELECT id,name,status,start_date,end_date,description,image_path,home_featured,created_at,updated_at FROM promotions ORDER BY start_date DESC,id DESC`)
	if err != nil {
		return nil, err
	}
	result := []models.PromotionRecord{}
	for rows.Next() {
		var p models.PromotionRecord
		var start, end sql.NullTime
		if err = rows.Scan(&p.ID, &p.Name, &p.Status, &start, &end, &p.Description, &p.ImagePath, &p.HomeFeatured, &p.CreatedAt, &p.UpdatedAt); err != nil {
			rows.Close()
			return nil, err
		}
		if start.Valid {
			p.StartDate = start.Time.Format(time.RFC3339)
		}
		if end.Valid {
			p.EndDate = end.Time.Format(time.RFC3339)
		}
		result = append(result, p)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return nil, err
	}
	for i := range result {
		rows, err = repo.DB.QueryContext(ctx, "SELECT product_id,MIN(promotional_price) FROM promotion_products WHERE promotion_id=$1 GROUP BY product_id ORDER BY product_id", result[i].ID)
		if err != nil {
			return nil, err
		}
		items := []models.PromotionParticipant{}
		for rows.Next() {
			var p models.PromotionParticipant
			if err = rows.Scan(&p.ProductID, &p.PromotionalPrice); err != nil {
				rows.Close()
				return nil, err
			}
			items = append(items, p)
		}
		err = rows.Err()
		rows.Close()
		if err != nil {
			return nil, err
		}
		result[i].Products = &items
	}
	return result, nil
}
