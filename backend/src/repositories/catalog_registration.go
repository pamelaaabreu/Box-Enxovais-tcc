package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"errors"
	"fmt"
)

var ErrDuplicateCatalogName = errors.New("duplicate catalog name")

type CatalogRegistration struct {
	models.ProductType
	ProductCount int64 `json:"productCount"`
}

type CatalogKind bool

const (
	Categories CatalogKind = false
	Brands     CatalogKind = true
)

func (kind CatalogKind) columns() (string, string) {
	if kind == Brands {
		return "brands", "brand_id"
	}
	return "product_types", "product_type_id"
}

func (repo ProductRepository) ListRegistrations(ctx context.Context, kind CatalogKind) ([]CatalogRegistration, error) {
	table, column := kind.columns()
	rows, err := repo.DB.QueryContext(ctx, fmt.Sprintf("SELECT c.id,c.name,count(p.id) FROM %s c LEFT JOIN products p ON p.%s=c.id GROUP BY c.id,c.name ORDER BY lower(c.name),c.id", table, column))
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := []CatalogRegistration{}
	for rows.Next() {
		var entry CatalogRegistration
		if err := rows.Scan(&entry.ID, &entry.Name, &entry.ProductCount); err != nil {
			return nil, err
		}
		result = append(result, entry)
	}
	return result, rows.Err()
}

func (repo ProductRepository) SaveRegistration(ctx context.Context, kind CatalogKind, id int, name string) (models.ProductType, error) {
	table, _ := kind.columns()
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return models.ProductType{}, err
	}
	defer tx.Rollback()
	// Serialize name validation with writes, including concurrent requests that differ only by case.
	if _, err = tx.ExecContext(ctx, "LOCK TABLE "+table+" IN SHARE ROW EXCLUSIVE MODE"); err != nil {
		return models.ProductType{}, err
	}
	if id > 0 {
		var found int
		if err = tx.QueryRowContext(ctx, "SELECT id FROM "+table+" WHERE id=$1", id).Scan(&found); err != nil {
			return models.ProductType{}, err
		}
	}
	var duplicate bool
	err = tx.QueryRowContext(ctx, "SELECT EXISTS (SELECT 1 FROM "+table+" WHERE lower(regexp_replace(btrim(name),'[[:space:]]+',' ','g'))=lower($1) AND id<>$2)", name, id).Scan(&duplicate)
	if err != nil {
		return models.ProductType{}, err
	}
	if duplicate {
		return models.ProductType{}, ErrDuplicateCatalogName
	}
	entry := models.ProductType{ID: id, Name: name}
	if id == 0 {
		err = tx.QueryRowContext(ctx, "INSERT INTO "+table+" (name) VALUES ($1) RETURNING id", name).Scan(&entry.ID)
	} else {
		_, err = tx.ExecContext(ctx, "UPDATE "+table+" SET name=$1 WHERE id=$2", name, id)
	}
	if err != nil {
		return models.ProductType{}, err
	}
	return entry, tx.Commit()
}

func (repo ProductRepository) DeleteRegistration(ctx context.Context, kind CatalogKind, id int) error {
	table, _ := kind.columns()
	result, err := repo.DB.ExecContext(ctx, "DELETE FROM "+table+" WHERE id=$1", id)
	if err != nil {
		return err
	}
	count, err := result.RowsAffected()
	if err == nil && count == 0 {
		return sql.ErrNoRows
	}
	return err
}
