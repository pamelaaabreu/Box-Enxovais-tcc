package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"errors"
)

var ErrReviewDuplicate = errors.New("review duplicate")

func (repo HomeRepository) Reviews(ctx context.Context, admin bool) ([]models.ExperienceReview, error) {
	visibilityClause := `
WHERE r.status = 'approved'
    AND r.publication_consent
    AND o.status = 'simulated_approved'
    AND o.stock_debited`
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
    r.created_at
FROM purchase_experience_reviews r
JOIN checkout_orders o
    ON o.id = r.order_id
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
		if err = rows.Scan(&review.ID, &review.OrderID, &review.Overall, &review.Navigation, &review.Service, &review.Experience, &review.Comment, &review.Consent, &review.Status, &review.CreatedAt); err != nil {
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
SELECT status = 'simulated_approved'
AND stock_debited
FROM checkout_orders
WHERE id = $1
    AND user_id = $2
`, orderID, userID).Scan(&eligible)
	if err != nil {
		return nil, err
	}
	if !eligible {
		return nil, sql.ErrNoRows
	}
	var review models.ExperienceReview
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
    created_at
FROM purchase_experience_reviews
WHERE order_id = $1
    AND user_id = $2
`, orderID, userID).Scan(
		&review.ID, &review.Overall, &review.Navigation, &review.Service,
		&review.Experience, &review.Comment, &review.Consent,
		&review.Status, &review.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		return nil, nil
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
SELECT status = 'simulated_approved'
AND stock_debited
FROM checkout_orders
WHERE id = $1
    AND user_id = $2
    FOR
    UPDATE
`, orderID, userID).Scan(&eligible)
	if err != nil {
		return err
	}
	if !eligible {
		return sql.ErrNoRows
	}
	result, err := tx.ExecContext(ctx, `
INSERT INTO purchase_experience_reviews (order_id, user_id, overall, navigation, service, experience, comment, publication_consent)
VALUES ($1, $2, $3, $4, $5, $6, $7, $8) ON CONFLICT (order_id) DO NOTHING
`, orderID, userID, review.Overall, review.Navigation, review.Service, review.Experience, review.Comment, review.Consent)
	if err != nil {
		return err
	}
	affectedRows, _ := result.RowsAffected()
	if affectedRows == 0 {
		return ErrReviewDuplicate
	}
	return tx.Commit()
}

func (repo HomeRepository) Moderate(ctx context.Context, reviewID int64, moderatorID int, status string) error {
	result, err := repo.DB.ExecContext(ctx, `
UPDATE purchase_experience_reviews
SET
    status = $1,
    moderated_at = now(),
    moderated_by = $2
WHERE id = $3
`, status, moderatorID, reviewID)
	if err != nil {
		return err
	}
	affectedRows, _ := result.RowsAffected()
	if affectedRows == 0 {
		return sql.ErrNoRows
	}
	return nil
}
