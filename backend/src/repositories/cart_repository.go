package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"errors"
	"fmt"
)

var ErrCartItemNotFound = errors.New("Item não encontrado no seu carrinho")
var ErrCartProduct = errors.New("Produto indisponível para compra")
var ErrCartQuantity = errors.New("Quantidade inválida ou estoque insuficiente")

// struct para erro
type CartStockError struct{ Stock int64 }

func (err CartStockError) Error() string {
	if err.Stock <= 0 {
		return "Este produto ficou sem estoque"
	}
	if err.Stock == 1 {
		return "Só temos 1 unidade disponível"
	}
	return fmt.Sprintf("Só temos %d unidades disponíveis", err.Stock)
}

// associa o erro específico de estoque ao erro genérico ErrCartQuantity
func (err CartStockError) Unwrap() error {
	return ErrCartQuantity
}

type CartRepository struct{ DB *sql.DB }

type CartOperation string

const (
	CartAdd         CartOperation = "add"
	CartUpdate      CartOperation = "update"
	CartRemove      CartOperation = "remove"
	CartClear       CartOperation = "clear"
	CartReorder     CartOperation = "reorder"
	CartGet         CartOperation = "get"
	MaxCartQuantity int64         = 1000000
)

// Apply mantém a entrada existente; os IDs são separados ao coordenar cada operação.
func (repo CartRepository) Apply(ctx context.Context, userID int, operation CartOperation, targetID int64, quantity int64, variants ...int64) (models.Cart, error) {
	empty := models.Cart{Items: []models.CartItem{}}
	if len(variants) > 1 {
		return empty, ErrCartProduct
	}
	var variantID *int64
	if len(variants) == 1 && variants[0] != 0 {
		if variants[0] < 0 {
			return empty, ErrCartProduct
		}
		variantID = &variants[0]
	}
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return empty, err
	}
	defer tx.Rollback()
	cartID, err := ensureAndLockCart(ctx, tx, userID)
	if err != nil {
		return empty, err
	}
	switch operation {
	case CartAdd:
		err = writeCartItem(ctx, tx, cartID, CartAdd, cartItemChange{ProductID: targetID, VariantID: variantID, Quantity: quantity})
	case CartUpdate:
		err = writeCartItem(ctx, tx, cartID, CartUpdate, cartItemChange{CartItemID: targetID, Quantity: quantity})
	case CartReorder:
		err = reorderItems(ctx, tx, userID, cartID, targetID)
	case CartRemove:
		err = removeCartItem(ctx, tx, cartID, targetID)
	case CartClear:
		err = clearCart(ctx, tx, cartID)
	case CartGet:
	default:
		return empty, errors.New("invalid cart operation")
	}
	if err != nil {
		return empty, err
	}
	if operation != CartGet {
		if err = touchCart(ctx, tx, cartID); err != nil {
			return empty, err
		}
	}
	cart, err := readCart(ctx, tx, cartID)
	if err != nil {
		return empty, err
	}
	if err = tx.Commit(); err != nil {
		return empty, err
	}
	return cart, nil
}
func ensureAndLockCart(ctx context.Context, tx *sql.Tx, userID int) (int64, error) {
	if _, err := tx.ExecContext(ctx, `
INSERT INTO carts(user_id)
VALUES ($1) ON CONFLICT(user_id) DO NOTHING
`, userID); err != nil {
		return 0, err
	}
	return lockCart(ctx, tx, userID)
}
func lockCart(ctx context.Context, tx *sql.Tx, userID int) (int64, error) {
	var cartID int64
	// Inclusive GET participa do bloqueio para não intercalar com checkout/esvaziamento.
	err := tx.QueryRowContext(ctx, `SELECT id FROM carts WHERE user_id=$1 FOR UPDATE`, userID).Scan(&cartID)
	return cartID, err
}
func clearCart(ctx context.Context, tx *sql.Tx, cartID int64) error {
	_, err := tx.ExecContext(ctx, `DELETE FROM cart_items WHERE cart_id=$1`, cartID)
	return err
}
func touchCart(ctx context.Context, tx *sql.Tx, cartID int64) error {
	result, err := tx.ExecContext(ctx, `UPDATE carts SET updated_at=NOW() WHERE id=$1`, cartID)
	if err != nil {
		return err
	}
	return requireOneRow(result)
}

func removeCartItem(ctx context.Context, tx *sql.Tx, cartID int64, cartItemID int64) error {
	result, err := tx.ExecContext(ctx, `DELETE FROM cart_items WHERE id=$1 AND cart_id=$2`, cartItemID, cartID)
	if err != nil {
		return err
	}
	err = requireOneRow(result)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrCartItemNotFound
	}
	return err
}
