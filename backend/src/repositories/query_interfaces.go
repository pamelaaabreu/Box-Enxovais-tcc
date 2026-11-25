package repositories

import (
	"context"
	"database/sql"
	"errors"
)

// Interfaces mínimas compartilhadas por sql.DB, sql.Tx e pelos scanners SQL.
type rowScanner interface{ Scan(...any) error }
type rowQuerier interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

type queryReader interface {
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
}

var ErrUnexpectedRows = errors.New("Quantidade inesperada de registros afetados")

func requireOneRow(result sql.Result) error {
	count, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if count == 0 {
		return sql.ErrNoRows
	}
	if count != 1 {
		return ErrUnexpectedRows
	}
	return nil
}
