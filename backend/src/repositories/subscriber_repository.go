package repositories

import (
	"context"
	"database/sql"
)

type SubscriberRepository struct{ DB *sql.DB }

// caso o e-mail já esteja cadastrado, ignora a inserção
func (repo SubscriberRepository) Save(ctx context.Context, email string) error {
	_, err := repo.SaveIfNew(ctx, email)
	return err
}
func (repo SubscriberRepository) SaveIfNew(ctx context.Context, email string) (bool, error) {
	result, err := repo.DB.ExecContext(ctx, `INSERT INTO subscribers(email) VALUES($1) ON CONFLICT DO NOTHING`, normalizeEmail(email))
	if err != nil {
		return false, err
	}
	count, err := result.RowsAffected()
	if err != nil {
		return false, err
	}
	if count > 1 {
		return false, ErrUnexpectedRows
	}
	return count == 1, nil
}
