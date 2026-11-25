package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"errors"
	"math"
	"strings"
)

func resolveShippingAddress(ctx context.Context, query rowQuerier, userID int, input models.CheckoutRequest) (models.ShippingAddress, error) {
	if input.AddressID == 0 {
		return input.Address, nil
	}
	saved, err := scanAddress(query.QueryRowContext(ctx, `SELECT `+addressColumns+`
 FROM user_addresses WHERE user_id=$1 AND id=$2`, userID, input.AddressID))
	if errors.Is(err, sql.ErrNoRows) {
		return models.ShippingAddress{}, ErrCheckoutAddress
	}
	return saved.ShippingAddress, err
}
func calculateCheckoutShipping(ctx context.Context, query rowQuerier, address models.ShippingAddress, productsTotal models.Money, gross models.Money) (models.OrderCharges, models.Money, error) {
	var charges models.OrderCharges
	cep, valid := ParseShippingCEP(address.ZipCode)
	if !valid {
		return charges, 0, ErrCheckoutPostalCode
	}
	quote, err := QuoteShipping(ctx, query, cep)
	if errors.Is(err, sql.ErrNoRows) {
		return charges, 0, ErrCheckoutDeliveryUnavailable
	}
	if err != nil {
		return charges, 0, err
	}
	shipping := models.Money(quote.PriceCents)
	if shipping < 0 || productsTotal < 0 || gross < productsTotal || productsTotal > models.Money(math.MaxInt64)-shipping {
		return charges, 0, ErrCheckoutConflict
	}
	discount := gross - productsTotal
	method := models.ShippingMethodDelivery
	charges = models.OrderCharges{Shipping: &shipping, ShippingMinDays: &quote.MinDays, ShippingMaxDays: &quote.MaxDays, ShippingMethod: &method, ProductsSubtotal: &gross, Discount: &discount}
	return charges, productsTotal + shipping, nil
}
func saveCheckoutAddress(ctx context.Context, tx *sql.Tx, userID int, address models.ShippingAddress) error {
	if err := lockAccount(ctx, tx, userID); err != nil {
		return err
	}
	addresses, err := readAddresses(ctx, tx, userID)
	if err != nil {
		return err
	}
	normalized := addressForComparison(address)
	for _, saved := range addresses {
		if addressForComparison(saved.ShippingAddress) == normalized {
			return nil
		}
	}
	_, err = insertAddress(ctx, tx, userID, models.UserAddress{ShippingAddress: address, Label: "Outro"})
	return err
}

// A comparação mantém os campos existentes e ignora somente espaços externos/hífen do CEP.
func addressForComparison(address models.ShippingAddress) models.ShippingAddress {
	address.ZipCode = strings.ReplaceAll(strings.TrimSpace(address.ZipCode), "-", "")
	return address
}
