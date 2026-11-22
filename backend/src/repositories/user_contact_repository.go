package repositories

import (
	"backend/src/models"
	"context"
)

func (repo UserRepository) GetEmailRecipient(ctx context.Context, userID int) (models.EmailRecipient, error) {
	var recipient models.EmailRecipient
	err := repo.DB.QueryRowContext(ctx, `SELECT
    full_name,
    email
FROM users
WHERE id = $1`, userID).Scan(&recipient.Name, &recipient.Email)
	return recipient, err
}
