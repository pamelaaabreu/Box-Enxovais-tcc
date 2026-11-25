package repositories

import (
	"backend/src/models"
	"database/sql"
	"database/sql/driver"
	"errors"
	"math"
	"testing"
)

func TestCartTotalsValidation(t *testing.T) {
	cases := []struct {
		name    string
		items   []models.CartItem
		invalid bool
	}{
		{"empty", nil, false}, {"zero quantity", []models.CartItem{{Quantity: 0, UnitPrice: 1}}, true},
		{"negative quantity", []models.CartItem{{Quantity: -1, UnitPrice: 1}}, true},
		{"negative price", []models.CartItem{{Quantity: 1, UnitPrice: -1}}, true},
		{"subtotal overflow", []models.CartItem{{Quantity: 2, UnitPrice: math.MaxInt64}}, true},
		{"total overflow", []models.CartItem{{Quantity: 1, UnitPrice: math.MaxInt64}, {Quantity: 1, UnitPrice: 1}}, true},
		{"units overflow", []models.CartItem{{Quantity: math.MaxInt64}, {Quantity: 1}}, true},
		{"exact limit", []models.CartItem{{Quantity: 1, UnitPrice: math.MaxInt64}}, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			got, err := calculateCartTotals(tc.items)
			if (err != nil) != tc.invalid {
				t.Fatalf("unexpected error: %v", err)
			}
			if err == nil && got.Items == nil {
				t.Fatal("items must be []")
			}
		})
	}
	total, err := calculateCartTotals([]models.CartItem{{Quantity: 2, UnitPrice: 1234}, {Quantity: 3, UnitPrice: 1}})
	if err != nil || total.Total != 2471 || total.TotalItems != 5 {
		t.Fatal("wrong cents/units", err)
	}
	if !errors.Is(CartStockError{Stock: 1}, ErrCartQuantity) {
		t.Fatal("stock error lost classification")
	}
}
func TestRequireOneRow(t *testing.T) {
	if !errors.Is(requireOneRow(driver.RowsAffected(0)), sql.ErrNoRows) {
		t.Fatal("zero rows")
	}
	if err := requireOneRow(driver.RowsAffected(1)); err != nil {
		t.Fatal(err)
	}
	if !errors.Is(requireOneRow(driver.RowsAffected(2)), ErrUnexpectedRows) {
		t.Fatal("multiple rows")
	}
}
