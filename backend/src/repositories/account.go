package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
)

type AccountRepository struct{ DB *sql.DB }

func (repo AccountRepository) Profile(ctx context.Context, userID int) (models.AccountProfile, error) {
	var p models.AccountProfile
	err := repo.DB.QueryRowContext(ctx, "SELECT full_name,email,COALESCE(phone,'') FROM users WHERE id=$1", userID).Scan(&p.Name, &p.Email, &p.Phone)
	return p, err
}

func (repo AccountRepository) UpdateProfile(ctx context.Context, userID int, p models.AccountProfile) (models.AccountProfile, error) {
	err := repo.DB.QueryRowContext(ctx, "UPDATE users SET full_name=$2,phone=NULLIF($3,'') WHERE id=$1 RETURNING email", userID, p.Name, p.Phone).Scan(&p.Email)
	return p, err
}

const addressColumns = "id,label,is_default,recipient,zip_code,street,number,complement,neighborhood,city,state"

func scanAddress(row interface{ Scan(...any) error }) (models.UserAddress, error) {
	var a models.UserAddress
	err := row.Scan(&a.ID, &a.Label, &a.IsDefault, &a.Recipient, &a.ZipCode, &a.Street, &a.Number, &a.Complement, &a.Neighborhood, &a.City, &a.State)
	return a, err
}

func (repo AccountRepository) Addresses(ctx context.Context, userID int) ([]models.UserAddress, error) {
	rows, err := repo.DB.QueryContext(ctx, "SELECT "+addressColumns+" FROM user_addresses WHERE user_id=$1 ORDER BY is_default DESC,id", userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	addresses := []models.UserAddress{}
	for rows.Next() {
		a, err := scanAddress(rows)
		if err != nil {
			return nil, err
		}
		addresses = append(addresses, a)
	}
	return addresses, rows.Err()
}

func lockAccount(ctx context.Context, tx *sql.Tx, userID int) error {
	return tx.QueryRowContext(ctx, "SELECT id FROM users WHERE id=$1 FOR UPDATE", userID).Scan(&userID)
}

func insertAddress(ctx context.Context, tx *sql.Tx, userID int, a models.UserAddress) (models.UserAddress, error) {
	return scanAddress(tx.QueryRowContext(ctx, "INSERT INTO user_addresses(user_id,label,recipient,zip_code,street,number,complement,neighborhood,city,state,is_default) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOT EXISTS(SELECT 1 FROM user_addresses WHERE user_id=$1)) RETURNING "+addressColumns, userID, a.Label, a.Recipient, a.ZipCode, a.Street, a.Number, a.Complement, a.Neighborhood, a.City, a.State))
}

func (repo AccountRepository) SaveAddress(ctx context.Context, userID int, id int64, a models.UserAddress) (models.UserAddress, error) {
	if id != 0 {
		return scanAddress(repo.DB.QueryRowContext(ctx, "UPDATE user_addresses SET label=$3,recipient=$4,zip_code=$5,street=$6,number=$7,complement=$8,neighborhood=$9,city=$10,state=$11,updated_at=now() WHERE user_id=$1 AND id=$2 RETURNING "+addressColumns, userID, id, a.Label, a.Recipient, a.ZipCode, a.Street, a.Number, a.Complement, a.Neighborhood, a.City, a.State))
	}
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return a, err
	}
	defer tx.Rollback()
	if err = lockAccount(ctx, tx, userID); err != nil {
		return a, err
	}
	a, err = insertAddress(ctx, tx, userID, a)
	if err != nil {
		return a, err
	}
	return a, tx.Commit()
}

func (repo AccountRepository) DeleteAddress(ctx context.Context, userID int, id int64) error {
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err = lockAccount(ctx, tx, userID); err != nil {
		return err
	}
	var wasDefault bool
	if err = tx.QueryRowContext(ctx, "DELETE FROM user_addresses WHERE user_id=$1 AND id=$2 RETURNING is_default", userID, id).Scan(&wasDefault); err != nil {
		return err
	}
	if wasDefault {
		if _, err = tx.ExecContext(ctx, "UPDATE user_addresses SET is_default=true,updated_at=now() WHERE id=(SELECT min(id) FROM user_addresses WHERE user_id=$1)", userID); err != nil {
			return err
		}
	}
	return tx.Commit()
}

func (repo AccountRepository) SetDefaultAddress(ctx context.Context, userID int, id int64) error {
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}
	defer tx.Rollback()
	if err = lockAccount(ctx, tx, userID); err != nil {
		return err
	}
	if _, err = tx.ExecContext(ctx, "UPDATE user_addresses SET is_default=false,updated_at=now() WHERE user_id=$1 AND is_default AND id<>$2", userID, id); err != nil {
		return err
	}
	if err = tx.QueryRowContext(ctx, "UPDATE user_addresses SET is_default=true,updated_at=now() WHERE user_id=$1 AND id=$2 RETURNING id", userID, id).Scan(&id); err != nil {
		return err
	}
	return tx.Commit()
}
