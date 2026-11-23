package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"math"
	"strings"
)

var ErrCheckoutConflict = errors.New("O carrinho ou os preços mudaram. Confira o carrinho e revise a compra novamente.")

type CheckoutRepository struct{ DB *sql.DB }

func (repo CheckoutRepository) Get(ctx context.Context, userID int, id int64) (models.CheckoutOrder, error) {
	var order models.CheckoutOrder
	err := repo.DB.QueryRowContext(ctx, `SELECT
    id,
    total_cents,
    status,
    shipping_cents,
    shipping_min_days,
    shipping_max_days,
    shipping_method,
    products_subtotal_cents,
    discount_cents,
    installments
FROM checkout_orders
WHERE id = $1
    AND user_id = $2`, id, userID).Scan(&order.ID, &order.Total, &order.Status, &order.Shipping, &order.ShippingMinDays, &order.ShippingMaxDays, &order.ShippingMethod, &order.ProductsSubtotal, &order.Discount, &order.Installments)
	if err == nil {
		err = order.PopulateInstallments(order.Total)
	}
	return order, err
}

func (repo CheckoutRepository) Create(ctx context.Context, userID int, input models.CheckoutRequest) (models.CheckoutOrder, error) {
	var order models.CheckoutOrder
	count, err := models.NormalizeInstallments(input.PaymentMethod, input.Installments)
	if err != nil {
		return order, err
	}
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return order, err
	}
	defer tx.Rollback()
	// Same lock as cart mutations; duplicate requests wait and reuse the order.
	var cartID int64
	err = tx.QueryRowContext(ctx, `SELECT id
FROM carts
WHERE user_id = $1
FOR UPDATE`, userID).Scan(&cartID)
	if errors.Is(err, sql.ErrNoRows) {
		return order, ErrCheckoutConflict
	}
	if err != nil {
		return order, err
	}
	err = tx.QueryRowContext(ctx, `SELECT
    id,
    total_cents,
    status,
    shipping_cents,
    shipping_min_days,
    shipping_max_days,
    shipping_method,
    products_subtotal_cents,
    discount_cents,
    installments
FROM checkout_orders
WHERE user_id = $1
    AND request_key = $2`, userID, input.RequestKey).Scan(&order.ID, &order.Total, &order.Status, &order.Shipping, &order.ShippingMinDays, &order.ShippingMaxDays, &order.ShippingMethod, &order.ProductsSubtotal, &order.Discount, &order.Installments)
	if err == nil {
		if err = order.PopulateInstallments(order.Total); err != nil {
			return order, err
		}
		return order, tx.Commit()
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return order, err
	}
	rows, err := tx.QueryContext(ctx, `SELECT
    p.id,
    COALESCE(i.variant_id, 0),
    p.name || COALESCE(' — ' || v.size, ''),
    i.quantity,
    COALESCE(v.quantity, p.quantity),
    p.status
FROM cart_items i
JOIN products p
    ON p.id = i.product_id
LEFT JOIN product_variants v
    ON v.id = i.variant_id
WHERE i.cart_id = $1
ORDER BY
    p.id,
    i.variant_id
FOR
UPDATE OF p`, cartID)
	if err != nil {
		return order, err
	}
	var items []models.CartItem
	for rows.Next() {
		var item models.CartItem
		var status string
		if err = rows.Scan(&item.ProductID, &item.VariantID, &item.Name, &item.Quantity, &item.Stock, &status); err != nil {
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
	var gross models.Money
	for i := range items {
		item := &items[i]
		var original models.Money
		if item.VariantID > 0 {
			err = tx.QueryRowContext(ctx, `SELECT
    (price * 100)::bigint,
    quantity
FROM product_variants
WHERE id = $1
    AND product_id = $2
FOR UPDATE`, item.VariantID, item.ProductID).Scan(&item.UnitPrice, &item.Stock)
			if errors.Is(err, sql.ErrNoRows) || (err == nil && item.Stock < item.Quantity) {
				return order, ErrCheckoutConflict
			}
		} else {
			err = tx.QueryRowContext(ctx, `SELECT (LEAST(p.price, COALESCE(
                                    (SELECT MIN(pp.promotional_price)
                                     FROM promotion_products pp
                                     JOIN promotions pr
                                         ON pr.id = pp.promotion_id
                                     WHERE pp.product_id = p.id
                                         AND pr.status = 'active'
                                         AND pr.start_date <= NOW()
                                         AND pr.end_date >= NOW()
                                         AND pp.promotional_price >= 0),p.price)) * 100)::bigint
FROM products p
WHERE p.id = $1`, item.ProductID).Scan(&item.UnitPrice)
		}
		if err != nil {
			return order, err
		}
		original = item.UnitPrice
		if item.VariantID == 0 {
			if err = tx.QueryRowContext(ctx, `SELECT (price * 100)::bigint
FROM products
WHERE id = $1`, item.ProductID).Scan(&original); err != nil {
				return order, err
			}
		}
		if original < item.UnitPrice || int64(original) > math.MaxInt64/item.Quantity || gross > models.Money(math.MaxInt64)-original*models.Money(item.Quantity) {
			return order, ErrCheckoutConflict
		}
		gross += original * models.Money(item.Quantity)
		if item.UnitPrice < 0 || int64(item.UnitPrice) > math.MaxInt64/item.Quantity {
			return order, ErrCheckoutConflict
		}
		subtotal := item.UnitPrice * models.Money(item.Quantity)
		if order.Total > models.Money(math.MaxInt64)-subtotal {
			return order, ErrCheckoutConflict
		}
		order.Total += subtotal
	}
	if input.AddressID > 0 {
		saved, err := scanAddress(tx.QueryRowContext(ctx, `SELECT
`+addressColumns+`
FROM user_addresses
WHERE user_id = $1
    AND id = $2`, userID, input.AddressID))
		if errors.Is(err, sql.ErrNoRows) {
			return order, ErrCheckoutAddress
		}
		if err != nil {
			return order, err
		}
		input.Address = saved.ShippingAddress
	}
	cep, valid := ParseShippingCEP(input.Address.ZipCode)
	if !valid {
		return order, ErrCheckoutPostalCode
	}
	quote, err := QuoteShipping(ctx, tx, cep)
	if errors.Is(err, sql.ErrNoRows) {
		return order, ErrCheckoutDeliveryUnavailable
	} else if err != nil {
		return order, err
	}
	shipping := models.Money(quote.PriceCents)
	if order.Total > models.Money(math.MaxInt64)-shipping {
		return order, ErrCheckoutConflict
	}
	discount := gross - order.Total
	method := "delivery"
	order.OrderCharges = models.OrderCharges{Shipping: &shipping, ShippingMinDays: &quote.MinDays, ShippingMaxDays: &quote.MaxDays, ShippingMethod: &method, ProductsSubtotal: &gross, Discount: &discount}
	order.Total += shipping
	if int64(order.Total) != input.ExpectedTotalCents {
		return order, ErrCheckoutConflict
	}
	if input.SaveAddress {
		if err := lockAccount(ctx, tx, userID); err != nil {
			return order, err
		}
		addresses, err := readAddresses(ctx, tx, userID)
		if err != nil {
			return order, err
		}
		exists := false
		for _, address := range addresses {
			a, b := address.ShippingAddress, input.Address
			a.ZipCode = strings.ReplaceAll(a.ZipCode, "-", "")
			b.ZipCode = strings.ReplaceAll(b.ZipCode, "-", "")
			if a == b {
				exists = true
				break
			}
		}
		if !exists {
			if _, err := insertAddress(ctx, tx, userID, models.UserAddress{ShippingAddress: input.Address, Label: "Outro"}); err != nil {
				return order, err
			}
		}
	}
	address, err := json.Marshal(input.Address)
	if err != nil {
		return order, err
	}
	order.Installments = &count
	if err = order.PopulateInstallments(order.Total); err != nil {
		return order, err
	}
	order.Status = "simulated_approved"
	err = tx.QueryRowContext(ctx, `INSERT INTO checkout_orders (
    user_id,
    request_key,
    address,
    payment_method,
    total_cents,
    stock_debited,
    contact_phone,
    shipping_cents,
    shipping_min_days,
    shipping_max_days,
    shipping_method,
    products_subtotal_cents,
    discount_cents,
    installments
)
VALUES($1,$2,$3,$4,$5,true,NULLIF($6,''),$7,$8,$9,$10,$11,$12,$13)
RETURNING id`, userID, input.RequestKey, string(address), input.PaymentMethod, order.Total, input.ContactPhone, shipping, quote.MinDays, quote.MaxDays, method, gross, discount, count).Scan(&order.ID)
	if err != nil {
		return order, err
	}
	for _, item := range items {
		_, err = tx.ExecContext(ctx, `INSERT INTO checkout_order_items (
    order_id,
    product_id,
    name,
    quantity,
    unit_price_cents,
    variant_id
)
VALUES($1,$2,$3,$4,$5,NULLIF($6,0))`, order.ID, item.ProductID, item.Name, item.Quantity, item.UnitPrice, item.VariantID)
		if err != nil {
			return order, err
		}
		if item.VariantID > 0 {
			_, err = tx.ExecContext(ctx, `UPDATE product_variants
SET quantity = quantity - $1
WHERE id = $2
    AND product_id = $3`, item.Quantity, item.VariantID, item.ProductID)
		} else {
			_, err = tx.ExecContext(ctx, `UPDATE products
SET
    quantity = quantity - $1,
    updated_at = NOW()
WHERE id = $2`, item.Quantity, item.ProductID)
		}
		if err != nil {
			return order, err
		}
	}
	if _, err = tx.ExecContext(ctx, `DELETE
FROM cart_items
WHERE cart_id = $1`, cartID); err != nil {
		return order, err
	}
	if _, err = tx.ExecContext(ctx, `UPDATE carts
SET updated_at = NOW()
WHERE id = $1`, cartID); err != nil {
		return order, err
	}
	if err := tx.Commit(); err != nil {
		return order, err
	}
	order.ReceiptItems = items
	return order, nil
}

var ErrCheckoutAddress = errors.New("saved address not found")

var ErrCheckoutDeliveryUnavailable = errors.New("delivery unavailable")
var ErrCheckoutPostalCode = errors.New("invalid delivery postal code")
