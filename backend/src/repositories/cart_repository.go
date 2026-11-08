package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math"
)

var ErrCartItemNotFound = errors.New("Item não encontrado no seu carrinho")
var ErrCartProduct = errors.New("Produto indisponível para compra")
var ErrCartQuantity = errors.New("Quantidade inválida ou estoque insuficiente")

// Keep the existing conflict classification, with a useful current-stock message.
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
func (err CartStockError) Unwrap() error { return ErrCartQuantity }

type CartRepository struct{ DB *sql.DB }

// Every operation locks the user's cart, serializing adds/updates even across
// server instances. Products are never reserved by merely placing them in a cart.
func (repo CartRepository) Apply(ctx context.Context, userID int, operation string, id, quantity int64) (models.Cart, error) {
	empty := models.Cart{Items: []models.CartItem{}}
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return empty, err
	}
	defer tx.Rollback()
	_, err = tx.ExecContext(ctx, `INSERT INTO carts(user_id) VALUES($1) ON CONFLICT(user_id) DO NOTHING`, userID)
	if err != nil {
		return empty, err
	}
	var cartID int64
	err = tx.QueryRowContext(ctx, `SELECT id FROM carts WHERE user_id=$1 FOR UPDATE`, userID).Scan(&cartID)
	if err != nil {
		return empty, err
	}
	switch operation {
	case "add", "update":
		if quantity < 1 || quantity > 1000000 {
			return empty, ErrCartQuantity
		}
		productID := id
		if operation == "update" {
			err = tx.QueryRowContext(ctx, `SELECT product_id FROM cart_items WHERE id=$1 AND cart_id=$2`, id, cartID).Scan(&productID)
			if errors.Is(err, sql.ErrNoRows) {
				return empty, ErrCartItemNotFound
			}
			if err != nil {
				return empty, err
			}
		}
		var stock int64
		var status string
		var price int64
		err = tx.QueryRowContext(ctx, `SELECT quantity,status,(price*100)::bigint FROM products WHERE id=$1 FOR SHARE`, productID).Scan(&stock, &status, &price)
		if errors.Is(err, sql.ErrNoRows) {
			return empty, ErrCartProduct
		}
		if err != nil {
			return empty, err
		}
		if status != "active" || price < 0 {
			return empty, ErrCartProduct
		}
		if operation == "add" {
			var existing int64
			err = tx.QueryRowContext(ctx, `SELECT quantity FROM cart_items WHERE cart_id=$1 AND product_id=$2`, cartID, productID).Scan(&existing)
			if err != nil && !errors.Is(err, sql.ErrNoRows) {
				return empty, err
			}
			quantity += existing
		}
		if quantity > stock {
			return empty, CartStockError{Stock: stock}
		}
		if quantity > 1000000 {
			return empty, ErrCartQuantity
		}
		_, err = tx.ExecContext(ctx, `INSERT INTO cart_items(cart_id,product_id,quantity) VALUES($1,$2,$3)
   ON CONFLICT(cart_id,product_id) DO UPDATE SET quantity=EXCLUDED.quantity,updated_at=NOW()`, cartID, productID, quantity)
	case "remove":
		var result sql.Result
		result, err = tx.ExecContext(ctx, `DELETE FROM cart_items WHERE id=$1 AND cart_id=$2`, id, cartID)
		if err == nil {
			n, e := result.RowsAffected()
			if e != nil {
				return empty, e
			}
			if n == 0 {
				return empty, ErrCartItemNotFound
			}
		}
	case "clear":
		_, err = tx.ExecContext(ctx, `DELETE FROM cart_items WHERE cart_id=$1`, cartID)
	case "get":
	default:
		return empty, errors.New("invalid cart operation")
	}
	if err != nil {
		return empty, err
	}
	if operation != "get" {
		if _, err = tx.ExecContext(ctx, `UPDATE carts SET updated_at=NOW() WHERE id=$1`, cartID); err != nil {
			return empty, err
		}
	}
	rows, err := tx.QueryContext(ctx, `SELECT i.id,p.id,p.name,COALESCE((SELECT image_path FROM product_images WHERE product_id=p.id ORDER BY is_primary DESC NULLS LAST,id LIMIT 1),''),i.quantity,p.quantity,p.status,(LEAST(p.price,COALESCE((SELECT MIN(pp.promotional_price) FROM promotion_products pp JOIN promotions pr ON pr.id=pp.promotion_id WHERE pp.product_id=p.id AND pr.status='active' AND pr.start_date<=NOW() AND pr.end_date>=NOW() AND pp.promotional_price>=0),p.price))*100)::bigint
 FROM cart_items i JOIN products p ON p.id=i.product_id WHERE i.cart_id=$1 ORDER BY i.id`, cartID)
	if err != nil {
		return empty, err
	}
	cart := empty
	for rows.Next() {
		var item models.CartItem
		var status string
		if err = rows.Scan(&item.ID, &item.ProductID, &item.Name, &item.Image, &item.Quantity, &item.Stock, &status, &item.UnitPrice); err != nil {
			rows.Close()
			return empty, err
		}
		if item.UnitPrice < 0 || int64(item.UnitPrice) > math.MaxInt64/item.Quantity {
			rows.Close()
			return empty, errors.New("invalid price")
		}
		item.Available = status == "active" && item.Stock >= item.Quantity
		item.Subtotal = item.UnitPrice * models.Money(item.Quantity)
		if cart.Total > models.Money(math.MaxInt64)-item.Subtotal {
			rows.Close()
			return empty, errors.New("cart total overflow")
		}
		cart.Total += item.Subtotal
		cart.TotalItems += item.Quantity
		cart.Items = append(cart.Items, item)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return empty, err
	}
	if err = tx.Commit(); err != nil {
		return empty, err
	}
	return cart, nil
}
