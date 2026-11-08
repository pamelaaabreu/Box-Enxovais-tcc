package repositories

import (
	"context"
	"database/sql"
)

type SubscriberRepository struct{ DB *sql.DB }

func (repo SubscriberRepository) Save(ctx context.Context, email string) error {
	_, err := repo.DB.ExecContext(ctx, `INSERT INTO subscribers (email) VALUES ($1) ON CONFLICT (email) DO NOTHING`, email)
	return err
}
