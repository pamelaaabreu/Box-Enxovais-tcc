package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"github.com/lib/pq"
)

var ErrReviewDuplicate = errors.New("review duplicate")

func (repo HomeRepository) Reviews(ctx context.Context, admin bool) ([]models.ExperienceReview, error) {
	visibilityClause := `
WHERE r.status = 'approved'
    AND r.publication_consent
    AND o.status = 'simulated_approved'
    AND o.stock_debited
`
	if admin {
		visibilityClause = ""
	}
	query := `
SELECT
    r.id,
    r.order_id,
    r.overall,
    r.navigation,
    r.service,
    r.experience,
    r.comment,
    r.publication_consent,
    r.status,
    r.created_at,
 coalesce(to_jsonb(r)->'topics','[]'::jsonb)
FROM purchase_experience_reviews r
JOIN checkout_orders o ON o.id = r.order_id
` + visibilityClause + `
ORDER BY
    r.created_at DESC,
    r.id DESC
`
	rows, err := repo.DB.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	reviews := []models.ExperienceReview{}
	for rows.Next() {
		var review models.ExperienceReview
		var topics []byte
		if err = rows.Scan(&review.ID, &review.OrderID, &review.Overall, &review.Navigation, &review.Service, &review.Experience, &review.Comment, &review.Consent, &review.Status, &review.CreatedAt, &topics); err != nil {
			return nil, err
		}
		if err = json.Unmarshal(topics, &review.Topics); err != nil {
			return nil, err
		}
		if !admin {
			review.OrderID = 0
			review.Status = ""
		}
		reviews = append(reviews, review)
	}
	return reviews, rows.Err()
}

func (repo HomeRepository) OrderReview(ctx context.Context, userID int, orderID int64) (*models.ExperienceReview, error) {
	var eligible bool
	err := repo.DB.QueryRowContext(ctx, `
SELECT
    status = 'simulated_approved'
    AND stock_debited
FROM checkout_orders
WHERE id = $1
    AND user_id = $2
`, orderID, userID).Scan(&eligible)
	if err != nil {
		return nil, err
	}

	var review models.ExperienceReview
	var topics []byte
	err = repo.DB.QueryRowContext(ctx, `
SELECT
    id,
    overall,
    navigation,
    service,
    experience,
    comment,
    publication_consent,
    status,
    created_at, coalesce(to_jsonb(purchase_experience_reviews)->'topics','[]'::jsonb)
FROM purchase_experience_reviews
WHERE order_id = $1
    AND user_id = $2
`, orderID, userID).Scan(
		&review.ID, &review.Overall, &review.Navigation, &review.Service,
		&review.Experience, &review.Comment, &review.Consent,
		&review.Status, &review.CreatedAt, &topics,
	)
	if errors.Is(err, sql.ErrNoRows) {
		if !eligible {
			return nil, sql.ErrNoRows
		}
		return nil, nil
	}
	if err == nil {
		err = json.Unmarshal(topics, &review.Topics)
		review.OrderID = orderID
		review.CanEdit = eligible
	}
	return &review, err
}

func (repo HomeRepository) CreateReview(ctx context.Context, userID int, orderID int64, review models.ExperienceReview) error {
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var eligible bool
	err = tx.QueryRowContext(ctx, `
SELECT
    status = 'simulated_approved'
    AND stock_debited
FROM checkout_orders
WHERE id = $1
    AND user_id = $2 FOR UPDATE
`, orderID, userID).Scan(&eligible)
	if err != nil {
		return err
	}
	if !eligible {
		return sql.ErrNoRows
	}
	result, err := tx.ExecContext(ctx, `
INSERT INTO purchase_experience_reviews(order_id, user_id, overall, navigation, service, experience, comment, publication_consent)
VALUES ($1,
$2,
$3,
$4,
$5,
$6,
$7,
$8) ON CONFLICT(order_id) DO NOTHING
`, orderID, userID, review.Overall, review.Navigation, review.Service, review.Experience, review.Comment, review.Consent)
	if err != nil {
		return err
	}
	if err = requireOneRow(result); errors.Is(err, sql.ErrNoRows) {
		return ErrReviewDuplicate
	} else if err != nil {
		return err
	}
	if review.Topics != nil {
		_, err = tx.ExecContext(ctx, `UPDATE purchase_experience_reviews SET topics=$1 WHERE order_id=$2 AND user_id=$3`, pq.Array(review.Topics), orderID, userID)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (repo HomeRepository) Moderate(ctx context.Context, reviewID int64, moderatorID int, status string) error {
	result, err := repo.DB.ExecContext(ctx, `
UPDATE purchase_experience_reviews
SET status = $1,
moderated_at = now(),
moderated_by = $2
WHERE id = $3 AND ($1 <> 'approved' OR (publication_consent AND EXISTS(SELECT 1 FROM checkout_orders o WHERE o.id=purchase_experience_reviews.order_id AND o.user_id=purchase_experience_reviews.user_id AND o.status='simulated_approved' AND o.stock_debited)))
`, status, moderatorID, reviewID)
	if err != nil {
		return err
	}
	return requireOneRow(result)
}

// Update preserves one review per order and restarts moderation after any edit.
func (repo HomeRepository) UpdateReview(ctx context.Context, userID int, orderID int64, review models.ExperienceReview) error {
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	var eligible bool
	err = tx.QueryRowContext(ctx, `SELECT status='simulated_approved' AND stock_debited FROM checkout_orders WHERE id=$1 AND user_id=$2 FOR UPDATE`, orderID, userID).Scan(&eligible)
	if err != nil {
		return err
	}
	if !eligible {
		return sql.ErrNoRows
	}
	result, err := tx.ExecContext(ctx, `UPDATE purchase_experience_reviews SET overall=$1,navigation=$2,service=$3,experience=$4,comment=$5,publication_consent=$6,status='pending',moderated_at=NULL,moderated_by=NULL WHERE order_id=$7 AND user_id=$8`, review.Overall, review.Navigation, review.Service, review.Experience, review.Comment, review.Consent, orderID, userID)
	if err != nil {
		return err
	}
	if err = requireOneRow(result); err != nil {
		return err
	}
	if review.Topics != nil {
		_, err = tx.ExecContext(ctx, `UPDATE purchase_experience_reviews SET topics=$1 WHERE order_id=$2 AND user_id=$3`, pq.Array(review.Topics), orderID, userID)
		if err != nil {
			return err
		}
	}
	return tx.Commit()
}
func (repo HomeRepository) MyReviews(ctx context.Context, userID int) ([]models.ExperienceReview, error) {
	rows, err := repo.DB.QueryContext(ctx, `SELECT r.id,r.order_id,r.overall,r.navigation,r.service,r.experience,r.comment,r.publication_consent,r.status,r.created_at,coalesce(to_jsonb(r)->'topics','[]'::jsonb) FROM purchase_experience_reviews r JOIN checkout_orders o ON o.id=r.order_id WHERE r.user_id=$1 AND o.user_id=$1 ORDER BY r.created_at DESC,r.id DESC`, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []models.ExperienceReview{}
	for rows.Next() {
		var r models.ExperienceReview
		var topics []byte
		if err = rows.Scan(&r.ID, &r.OrderID, &r.Overall, &r.Navigation, &r.Service, &r.Experience, &r.Comment, &r.Consent, &r.Status, &r.CreatedAt, &topics); err != nil {
			return nil, err
		}
		if err = json.Unmarshal(topics, &r.Topics); err != nil {
			return nil, err
		}
		items = append(items, r)
	}
	return items, rows.Err()
}
