package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"strings"
)

type UserRepository struct {
	// referência ao pool de conexões com o banco de dados.
	DB *sql.DB
}

func (repo UserRepository) GetUserEmail(ctx context.Context, email string) (string, error) {
	rows, err := repo.DB.QueryContext(ctx, `SELECT email FROM users WHERE LOWER(TRIM(email))=$1 LIMIT 2`, normalizeEmail(email))
	if err != nil {
		return "", err
	}
	defer rows.Close()
	if !rows.Next() {
		if err = rows.Err(); err != nil {
			return "", err
		}
		return "", sql.ErrNoRows
	}
	var userEmail string
	if err = rows.Scan(&userEmail); err != nil {
		return "", err
	}
	if rows.Next() {
		return "", ErrUnexpectedRows
	}
	if err = rows.Err(); err != nil {
		return "", err
	}
	return userEmail, nil
}

func (repo UserRepository) UpdatePasswordByEmail(ctx context.Context, passwordHash string, email string) error {
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	result, err := tx.ExecContext(ctx, `UPDATE users SET password=$1 WHERE LOWER(TRIM(email))=$2`, passwordHash, normalizeEmail(email))
	if err != nil {
		return err
	}
	if err = requireOneRow(result); err != nil {
		return err
	}
	return tx.Commit()
}

func (repo UserRepository) FindByEmail(ctx context.Context, email string) (models.User, error) {
	var user models.User
	rows, err := repo.DB.QueryContext(ctx, `
SELECT
    id,
    full_name,
    password,
    email,
    role
FROM users
WHERE LOWER(TRIM(email)) = $1
LIMIT 2
`, normalizeEmail(email))
	if err != nil {
		return user, err
	}
	defer rows.Close()
	if !rows.Next() {
		if err = rows.Err(); err != nil {
			return user, err
		}
		return user, sql.ErrNoRows
	}
	if err = rows.Scan(&user.ID, &user.Name, &user.Password, &user.Email, &user.Role); err != nil {
		return user, err
	}
	if rows.Next() {
		return models.User{}, ErrUnexpectedRows
	}
	if err = rows.Err(); err != nil {
		return models.User{}, err
	}
	return user, nil
}

func (repo UserRepository) Create(ctx context.Context, user models.CreateUserRequest, passwordHash string) error {
	_, err := repo.DB.ExecContext(ctx, `
INSERT INTO users(full_name, email, password)
VALUES ($1,
$2,
$3)
`, user.Name, normalizeEmail(user.Email), passwordHash)
	return err
}

// busca o nome e o e-mail do destinatário pelo ID do usuário.
func (repo UserRepository) GetEmailRecipient(ctx context.Context, userID int) (models.EmailRecipient, error) {
	var recipient models.EmailRecipient
	err := repo.DB.QueryRowContext(ctx, `SELECT
    full_name,
    email
FROM users
WHERE id = $1`, userID).Scan(&recipient.Name, &recipient.Email)
	return recipient, err
}

func normalizeEmail(email string) string { return strings.ToLower(strings.TrimSpace(email)) }
