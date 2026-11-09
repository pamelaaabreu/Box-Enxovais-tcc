package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"math"
)

var ErrCheckoutConflict = errors.New("O carrinho ou os preços mudaram. Confira o carrinho e revise a compra novamente.")

type CheckoutRepository struct{ DB *sql.DB }

func (repo CheckoutRepository) Get(ctx context.Context, userID int, id int64) (models.CheckoutOrder, error) {
	var order models.CheckoutOrder
	err := repo.DB.QueryRowContext(ctx, `SELECT id,total_cents,status FROM checkout_orders WHERE id=$1 AND user_id=$2`, id, userID).Scan(&order.ID, &order.Total, &order.Status)
	return order, err
}

func (repo CheckoutRepository) Create(ctx context.Context, userID int, input models.CheckoutRequest) (models.CheckoutOrder, error) {
	var order models.CheckoutOrder
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return order, err
	}
	defer tx.Rollback()
	// Same lock as cart mutations; duplicate requests wait and reuse the order.
	var cartID int64
	err = tx.QueryRowContext(ctx, `SELECT id FROM carts WHERE user_id=$1 FOR UPDATE`, userID).Scan(&cartID)
	if errors.Is(err, sql.ErrNoRows) {
		return order, ErrCheckoutConflict
	}
	if err != nil {
		return order, err
	}
	err = tx.QueryRowContext(ctx, `SELECT id,total_cents,status FROM checkout_orders WHERE user_id=$1 AND request_key=$2`, userID, input.RequestKey).Scan(&order.ID, &order.Total, &order.Status)
	if err == nil {
		return order, tx.Commit()
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return order, err
	}
	rows, err := tx.QueryContext(ctx, `SELECT p.id,p.name,i.quantity,p.quantity,p.status FROM cart_items i JOIN products p ON p.id=i.product_id WHERE i.cart_id=$1 ORDER BY p.id FOR UPDATE OF p`, cartID)
	if err != nil {
		return order, err
	}
	var items []models.CartItem
	for rows.Next() {
		var item models.CartItem
		var status string
		if err = rows.Scan(&item.ProductID, &item.Name, &item.Quantity, &item.Stock, &status); err != nil {
			rows.Close()
			return order, err
		}
		if status != "active" || item.Quantity < 1 || item.Stock < item.Quantity {
			rows.Close()
			return order, ErrCheckoutConflict
		}
		items = append(items, item)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return order, err
	}
	if len(items) == 0 {
		return order, ErrCheckoutConflict
	}
	for i := range items {
		item := &items[i]
		err = tx.QueryRowContext(ctx, `SELECT (LEAST(p.price,COALESCE((SELECT MIN(pp.promotional_price) FROM promotion_products pp JOIN promotions pr ON pr.id=pp.promotion_id WHERE pp.product_id=p.id AND pr.status='active' AND pr.start_date<=NOW() AND pr.end_date>=NOW() AND pp.promotional_price>=0),p.price))*100)::bigint FROM products p WHERE p.id=$1`, item.ProductID).Scan(&item.UnitPrice)
		if err != nil {
			return order, err
		}
		if item.UnitPrice < 0 || int64(item.UnitPrice) > math.MaxInt64/item.Quantity {
			return order, ErrCheckoutConflict
		}
		subtotal := item.UnitPrice * models.Money(item.Quantity)
		if order.Total > models.Money(math.MaxInt64)-subtotal {
			return order, ErrCheckoutConflict
		}
		order.Total += subtotal
	}
	if int64(order.Total) != input.ExpectedTotalCents {
		return order, ErrCheckoutConflict
	}
	if input.AddressID > 0 {
		saved, err := scanAddress(tx.QueryRowContext(ctx, "SELECT "+addressColumns+" FROM user_addresses WHERE user_id=$1 AND id=$2", userID, input.AddressID))
		if errors.Is(err, sql.ErrNoRows) {
			return order, ErrCheckoutAddress
		}
		if err != nil {
			return order, err
		}
		input.Address = saved.ShippingAddress
	}
	if input.SaveAddress {
		if err := lockAccount(ctx, tx, userID); err != nil {
			return order, err
		}
		if _, err := insertAddress(ctx, tx, userID, models.UserAddress{ShippingAddress: input.Address, Label: "Outro"}); err != nil {
			return order, err
		}
	}
	address, err := json.Marshal(input.Address)
	if err != nil {
		return order, err
	}
	order.Status = "simulated_approved"
	err = tx.QueryRowContext(ctx, `INSERT INTO checkout_orders(user_id,request_key,address,payment_method,total_cents,stock_debited,contact_phone) VALUES($1,$2,$3,$4,$5,true,NULLIF($6,'')) RETURNING id`, userID, input.RequestKey, string(address), input.PaymentMethod, order.Total, input.ContactPhone).Scan(&order.ID)
	if err != nil {
		return order, err
	}
	for _, item := range items {
		_, err = tx.ExecContext(ctx, `INSERT INTO checkout_order_items(order_id,product_id,name,quantity,unit_price_cents) VALUES($1,$2,$3,$4,$5)`, order.ID, item.ProductID, item.Name, item.Quantity, item.UnitPrice)
		if err != nil {
			return order, err
		}
		_, err = tx.ExecContext(ctx, `UPDATE products SET quantity=quantity-$1,updated_at=NOW() WHERE id=$2`, item.Quantity, item.ProductID)
		if err != nil {
			return order, err
		}
	}
	if _, err = tx.ExecContext(ctx, `DELETE FROM cart_items WHERE cart_id=$1`, cartID); err != nil {
		return order, err
	}
	if _, err = tx.ExecContext(ctx, `UPDATE carts SET updated_at=NOW() WHERE id=$1`, cartID); err != nil {
		return order, err
	}
	if err := tx.Commit(); err != nil {
		return order, err
	}
	order.ReceiptItems = items
	return order, nil
}

var ErrCheckoutAddress = errors.New("saved address not found")
