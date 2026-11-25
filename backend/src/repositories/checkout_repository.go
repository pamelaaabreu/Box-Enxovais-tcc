package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"errors"
)

var ErrCheckoutConflict = errors.New("O carrinho ou os preços mudaram. Confira o carrinho e revise a compra novamente.")
var ErrCheckoutAddress = errors.New("saved address not found")
var ErrCheckoutDeliveryUnavailable = errors.New("delivery unavailable")
var ErrCheckoutPostalCode = errors.New("invalid delivery postal code")

type CheckoutRepository struct{ DB *sql.DB }

const checkoutOrderColumns = `
    id,
    total_cents,
    status,
    shipping_cents,
    shipping_min_days,
    shipping_max_days,
    shipping_method,
    products_subtotal_cents,
    discount_cents,
    installments`

func scanCheckoutOrder(row rowScanner) (models.CheckoutOrder, error) {
	var order models.CheckoutOrder
	err := row.Scan(&order.ID, &order.Total, &order.Status, &order.Shipping, &order.ShippingMinDays, &order.ShippingMaxDays, &order.ShippingMethod, &order.ProductsSubtotal, &order.Discount, &order.Installments)
	if err == nil {
		err = order.PopulateInstallments(order.Total)
	}
	return order, err
}
func (repo CheckoutRepository) Get(ctx context.Context, userID int, orderID int64) (models.CheckoutOrder, error) {
	return scanCheckoutOrder(repo.DB.QueryRowContext(ctx, `SELECT `+checkoutOrderColumns+` FROM checkout_orders WHERE id=$1 AND user_id=$2`, orderID, userID))
}
func findExistingOrder(ctx context.Context, query rowQuerier, userID int, requestKey string) (models.CheckoutOrder, error) {
	return scanCheckoutOrder(query.QueryRowContext(ctx, `SELECT `+checkoutOrderColumns+` FROM checkout_orders WHERE user_id=$1 AND request_key=$2`, userID, requestKey))
}

// Create coordena uma única transação: bloqueios, cálculo, snapshots, estoque e carrinho.
func (repo CheckoutRepository) Create(ctx context.Context, userID int, input models.CheckoutRequest) (models.CheckoutOrder, error) {
	var order models.CheckoutOrder
	installments, err := models.NormalizeInstallments(input.PaymentMethod, input.Installments)
	if err != nil {
		return order, err
	}
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return order, err
	}
	defer tx.Rollback()
	// Mesmo bloqueio das mutações do carrinho: requisições repetidas esperam a primeira concluir.
	cartID, err := lockCart(ctx, tx, userID)
	if errors.Is(err, sql.ErrNoRows) {
		return order, ErrCheckoutConflict
	}
	if err != nil {
		return order, err
	}
	existing, err := findExistingOrder(ctx, tx, userID, input.RequestKey)
	if err == nil {
		// A primeira compra prevalece. Não revalida/limpa um carrinho novo nem reenvia recibos.
		return existing, tx.Commit()
	}
	if !errors.Is(err, sql.ErrNoRows) {
		return order, err
	}
	if err = lockCheckoutInventory(ctx, tx, cartID); err != nil {
		return order, err
	}
	items, err := readCheckoutItems(ctx, tx, cartID)
	if err != nil {
		return order, err
	}
	if err = validateCheckoutStock(items); err != nil {
		return order, err
	}
	pricedCart, gross, err := calculateCheckoutPrices(items)
	if err != nil {
		return order, err
	}
	address, err := resolveShippingAddress(ctx, tx, userID, input)
	if err != nil {
		return order, err
	}
	charges, total, err := calculateCheckoutShipping(ctx, tx, address, pricedCart.Total, gross)
	if err != nil {
		return order, err
	}
	if int64(total) != input.ExpectedTotalCents {
		return order, ErrCheckoutConflict
	}
	if input.SaveAddress {
		if err = saveCheckoutAddress(ctx, tx, userID, address); err != nil {
			return order, err
		}
	}
	order = models.CheckoutOrder{Total: total, Status: models.OrderStatusApproved, OrderCharges: charges, PaymentPlan: models.PaymentPlan{Installments: &installments}}
	if err = order.PopulateInstallments(total); err != nil {
		return order, err
	}
	if err = insertCheckoutOrder(ctx, tx, userID, input, address, &order); err != nil {
		return order, err
	}
	if err = insertCheckoutOrderItems(ctx, tx, order.ID, pricedCart.Items); err != nil {
		return order, err
	}
	if err = debitCheckoutStock(ctx, tx, pricedCart.Items); err != nil {
		return order, err
	}
	if err = clearCheckoutCart(ctx, tx, cartID); err != nil {
		return order, err
	}
	if err = tx.Commit(); err != nil {
		return order, err
	}
	// Apenas a chamada que efetivamente confirmou a compra pode disparar o comprovante.
	order.ReceiptItems = pricedCart.Items
	return order, nil
}
