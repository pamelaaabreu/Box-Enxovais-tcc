package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
)

type UserRepository struct{ DB *sql.DB }

func (repo UserRepository) GetUserEmail(ctx context.Context, email string) (string, error) {
	var userEmail string
	err := repo.DB.QueryRowContext(ctx, "SELECT email FROM users WHERE LOWER(email) = LOWER(TRIM($1))", email).Scan(&userEmail)
	return userEmail, err
}

func (repo UserRepository) UpdatePasswordByEmail(ctx context.Context, password, email string) error {
	result, err := repo.DB.ExecContext(ctx,
		"UPDATE users SET password = $1 WHERE LOWER(email) = LOWER(TRIM($2))",
		password,
		email,
	)
	if err != nil {
		return err
	}
	rows, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rows != 1 {
		return sql.ErrNoRows
	}
	return nil
}

func (repo UserRepository) FindByEmail(ctx context.Context, email string) (models.User, error) {
	var user models.User
	err := repo.DB.QueryRowContext(ctx, `SELECT id, full_name, password, email, role
 FROM users WHERE LOWER(email) = $1`, email).Scan(&user.ID, &user.Name, &user.Password, &user.Email, &user.Role)
	return user, err
}

func (repo UserRepository) Create(ctx context.Context, user models.CreateUserRequest, passwordHash string) error {
	_, err := repo.DB.ExecContext(ctx, `INSERT INTO users (full_name, email, password) VALUES ($1, $2, $3)`, user.Name, user.Email, passwordHash)
	return err
}
