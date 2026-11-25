package repositories

import (
	"backend/src/models"
	"errors"
	"math"
	"testing"
)

func TestCheckoutPriceIntegrity(t *testing.T) {
	cases := []struct {
		name    string
		items   []checkoutItem
		invalid bool
	}{
		{"zero quantity", []checkoutItem{{CartItem: models.CartItem{Quantity: 0, UnitPrice: 1}, OriginalPrice: 1}}, true},
		{"negative price", []checkoutItem{{CartItem: models.CartItem{Quantity: 1, UnitPrice: -1}, OriginalPrice: 1}}, true},
		{"price exceeds original", []checkoutItem{{CartItem: models.CartItem{Quantity: 1, UnitPrice: 2}, OriginalPrice: 1}}, true},
		{"subtotal overflow", []checkoutItem{{CartItem: models.CartItem{Quantity: 2, UnitPrice: math.MaxInt64}, OriginalPrice: math.MaxInt64}}, true},
		{"gross overflow", []checkoutItem{{CartItem: models.CartItem{Quantity: 2, UnitPrice: 1}, OriginalPrice: math.MaxInt64}}, true},
		{"sum overflow", []checkoutItem{{CartItem: models.CartItem{Quantity: 1, UnitPrice: math.MaxInt64}, OriginalPrice: math.MaxInt64}, {CartItem: models.CartItem{Quantity: 1, UnitPrice: 1}, OriginalPrice: 1}}, true},
		{"limit", []checkoutItem{{CartItem: models.CartItem{Quantity: 1, UnitPrice: math.MaxInt64}, OriginalPrice: math.MaxInt64}}, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			_, _, err := calculateCheckoutPrices(tc.items)
			if errors.Is(err, ErrCheckoutConflict) != tc.invalid {
				t.Fatal("wrong financial validation", err)
			}
		})
	}
	cart, gross, err := calculateCheckoutPrices([]checkoutItem{{CartItem: models.CartItem{Name: "Produto", Quantity: 3, UnitPrice: 801}, OriginalPrice: 1000}})
	if err != nil || gross != 3000 || cart.Total != 2403 || cart.Items[0].Subtotal != 2403 || !cart.Items[0].Available {
		t.Fatal("receipt financial fields", err)
	}
	for _, invalid := range []checkoutItem{{CartItem: models.CartItem{Quantity: 1, Stock: 1}, ProductStatus: "inactive", VariantValid: true}, {CartItem: models.CartItem{Quantity: 1, Stock: 1}, ProductStatus: "active", VariantValid: false}, {CartItem: models.CartItem{Quantity: 1, Stock: 1}, ProductStatus: "active", VariantValid: true, HasVariants: true}} {
		if !errors.Is(validateCheckoutStock([]checkoutItem{invalid}), ErrCheckoutConflict) {
			t.Fatal("invalid inventory accepted")
		}
	}
}
