package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"errors"
	"github.com/lib/pq"
	"strings"
	"time"
)

type ProductReviewRepository struct{ DB *sql.DB }

var ErrReviewConflict = errors.New("review changed")

// Uma única regra de visibilidade alimenta médias, detalhes e depoimentos.
const productReviewPublic = `r.status='approved' AND r.publication_consent AND o.status='simulated_approved' AND o.stock_debited AND o.user_id=r.user_id AND EXISTS(SELECT 1 FROM checkout_order_items oi WHERE oi.order_id=o.id AND oi.product_id=r.product_id)`
const productReviewColumns = `
    r.id,
    r.product_id,
    p.name,
    coalesce((SELECT image_path FROM product_images i WHERE i.product_id=p.id ORDER BY i.is_primary DESC,i.id LIMIT 1),''),
    r.order_id,
    r.rating,
    r.comment,
    r.publication_consent,
    r.status,
    r.created_at,
    r.updated_at,
    u.full_name,
    (o.user_id=r.user_id AND o.status='simulated_approved' AND o.stock_debited AND EXISTS(SELECT 1 FROM checkout_order_items oi WHERE oi.order_id=o.id AND oi.product_id=r.product_id))
`
const productReviewSource = `
FROM product_reviews r
JOIN products p ON p.id = r.product_id
JOIN checkout_orders o ON o.id = r.order_id
JOIN users u ON u.id = r.user_id
`

func privateReviewName(full string) string {
	names := strings.Fields(full)
	if len(names) == 0 {
		return "Cliente verificado"
	}
	if len(names) == 1 {
		return names[0]
	}
	return names[0] + " " + string([]rune(names[len(names)-1])[0]) + "."
}
func (repo ProductReviewRepository) list(ctx context.Context, condition string, public bool, args ...any) ([]models.ProductReview, error) {
	rows, err := repo.DB.QueryContext(ctx, "SELECT "+productReviewColumns+productReviewSource+condition, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []models.ProductReview{}
	for rows.Next() {
		var item models.ProductReview
		var name string
		if err = rows.Scan(&item.ID, &item.ProductID, &item.ProductName, &item.ImagePath, &item.OrderID, &item.Rating, &item.Comment, &item.Consent, &item.Status, &item.CreatedAt, &item.UpdatedAt, &name, &item.CanEdit); err != nil {
			return nil, err
		}
		if public {
			item.CustomerName = privateReviewName(name)
			item.OrderID = 0
			item.Status = ""
			item.CanEdit = false
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
func (repo ProductReviewRepository) Mine(ctx context.Context, userID int) ([]models.ProductReview, error) {
	return repo.list(ctx, `WHERE r.user_id=$1 ORDER BY r.created_at DESC,r.id DESC`, false, userID)
}
func (repo ProductReviewRepository) Admin(ctx context.Context) ([]models.ProductReview, error) {
	return repo.list(ctx, `ORDER BY r.created_at DESC,r.id DESC`, false)
}
func (repo ProductReviewRepository) Public(ctx context.Context, productID int64, home bool) ([]models.ProductReview, error) {
	if home {
		return repo.list(ctx, `WHERE `+productReviewPublic+`
    AND r.rating >= 4
    AND btrim(r.comment) <> ''
    AND p.status = 'active'
ORDER BY r.created_at DESC,
    r.id DESC
LIMIT 6
`, true)
	}
	return repo.list(ctx, `WHERE `+productReviewPublic+`
    AND r.product_id = $1
ORDER BY r.created_at DESC,
    r.id DESC
LIMIT 100
`, true, productID)
}
func (repo ProductReviewRepository) Summaries(ctx context.Context, ids []int64) (map[int64]models.ProductReviewSummary, error) {
	result := map[int64]models.ProductReviewSummary{}
	for _, id := range ids {
		result[id] = models.ProductReviewSummary{}
	}
	rows, err := repo.DB.QueryContext(ctx, `
SELECT
    r.product_id,
    avg(r.rating)::float8,
    count(*)
FROM product_reviews r
JOIN checkout_orders o ON o.id = r.order_id
WHERE
`+productReviewPublic+` AND r.product_id=ANY($1) GROUP BY r.product_id`, pq.Array(ids))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	for rows.Next() {
		var id int64
		var summary models.ProductReviewSummary
		if err = rows.Scan(&id, &summary.Average, &summary.Count); err != nil {
			return nil, err
		}
		result[id] = summary
	}
	return result, rows.Err()
}
func (repo ProductReviewRepository) Reviewable(ctx context.Context, userID int) ([]models.ReviewableProduct, error) {
	rows, err := repo.DB.QueryContext(ctx, `
SELECT
    DISTINCT p.id,
    p.name,
    coalesce((
    SELECT
        image_path
    FROM product_images i
    WHERE i.product_id = p.id
    ORDER BY i.is_primary DESC,
        i.id
    LIMIT 1
), '')
FROM checkout_orders o
JOIN checkout_order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
WHERE o.user_id = $1
    AND o.status = 'simulated_approved'
    AND o.stock_debited
    AND NOT EXISTS (
    SELECT
        1
    FROM product_reviews r
    WHERE r.user_id = $1
        AND r.product_id = p.id
)
ORDER BY p.name,
    p.id
`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []models.ReviewableProduct{}
	for rows.Next() {
		var item models.ReviewableProduct
		if err = rows.Scan(&item.ProductID, &item.ProductName, &item.ImagePath); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}
func (repo ProductReviewRepository) Save(ctx context.Context, userID int, productID int64, reviewID int64, input models.ProductReviewInput) error {
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var orderID int64
	if reviewID == 0 {
		err = tx.QueryRowContext(ctx, `
SELECT
    o.id
FROM checkout_orders o
WHERE o.user_id = $1
    AND o.status = 'simulated_approved'
    AND o.stock_debited
    AND EXISTS (
    SELECT
        1
    FROM checkout_order_items oi
    WHERE oi.order_id = o.id
        AND oi.product_id = $2
)
ORDER BY o.created_at DESC,
    o.id DESC
LIMIT 1 FOR UPDATE
`, userID, productID).Scan(&orderID)
	} else {
		err = tx.QueryRowContext(ctx, `
SELECT
    o.id
FROM checkout_orders o
JOIN product_reviews r ON r.order_id = o.id
WHERE r.id = $1
    AND r.user_id = $2
    AND o.user_id = $2
    AND o.status = 'simulated_approved'
    AND o.stock_debited
    AND EXISTS (
    SELECT
        1
    FROM checkout_order_items oi
    WHERE oi.order_id = o.id
        AND oi.product_id = r.product_id
) FOR UPDATE OF o
`, reviewID, userID).Scan(&orderID)
	}
	if err != nil {
		return err
	}
	if reviewID == 0 {
		_, err = tx.ExecContext(ctx, `
INSERT INTO product_reviews(product_id, user_id, order_id, rating, comment, publication_consent)
VALUES ($1,
$2,
$3,
$4,
$5,
$6)
`, productID, userID, orderID, input.Rating, input.Comment, input.Consent)
	} else {
		var result sql.Result
		result, err = tx.ExecContext(ctx, `
UPDATE product_reviews
SET rating = $1,
comment = $2,
publication_consent = $3,
status = 'pending',
updated_at = clock_timestamp(),
moderated_at = NULL,
moderated_by = NULL
WHERE id = $4
    AND user_id = $5
`, input.Rating, input.Comment, input.Consent, reviewID, userID)
		if err == nil {
			n, e := result.RowsAffected()
			if e != nil {
				return e
			}
			if n != 1 {
				return sql.ErrNoRows
			}
		}
	}
	if err != nil {
		var pg *pq.Error
		if errors.As(err, &pg) && pg.Code == "23505" {
			return ErrReviewDuplicate
		}
		return err
	}
	return tx.Commit()
}
func (repo ProductReviewRepository) Moderate(ctx context.Context, id int64, moderatorID int, status string, expected time.Time) error {
	result, err := repo.DB.ExecContext(ctx, `
UPDATE product_reviews
SET status = $1,
moderated_at = now(),
moderated_by = $2,
updated_at = clock_timestamp()
WHERE id = $3
    AND updated_at = $4
    AND ($1 <> 'approved'
    OR publication_consent)
`, status, moderatorID, id, expected)
	if err != nil {
		return err
	}
	n, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrReviewConflict
	}
	return nil
}
