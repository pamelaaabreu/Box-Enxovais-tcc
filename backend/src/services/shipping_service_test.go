package services

import (
	"backend/src/models"
	"strings"
	"testing"
)

func TestValidateShippingRange(t *testing.T) {
	cases := []struct {
		name   string
		change func(*models.ShippingRange)
		valid  bool
	}{
		{"active range", func(r *models.ShippingRange) {}, true},
		{"inactive range", func(r *models.ShippingRange) { *r.Active = false }, true},
		{"zero price and same day", func(r *models.ShippingRange) { *r.PriceCents = 0; *r.MinDays = 0; *r.MaxDays = 0 }, true},
		{"missing price", func(r *models.ShippingRange) { r.PriceCents = nil }, false},
		{"negative price", func(r *models.ShippingRange) { *r.PriceCents = -1 }, false},
		{"missing minimum days", func(r *models.ShippingRange) { r.MinDays = nil }, false},
		{"missing maximum days", func(r *models.ShippingRange) { r.MaxDays = nil }, false},
		{"negative minimum days", func(r *models.ShippingRange) { *r.MinDays = -1 }, false},
		{"reversed days", func(r *models.ShippingRange) { *r.MinDays = 4 }, false},
		{"missing active state", func(r *models.ShippingRange) { r.Active = nil }, false},
		{"invalid CEP", func(r *models.ShippingRange) { r.StartCEP = "123" }, false},
		{"reversed CEP range", func(r *models.ShippingRange) { r.StartCEP = "99999999" }, false},
		{"blank name", func(r *models.ShippingRange) { r.Name = "  " }, false},
		{"unicode name limit", func(r *models.ShippingRange) { r.Name = strings.Repeat("á", 100) }, true},
		{"name too long", func(r *models.ShippingRange) { r.Name = strings.Repeat("á", 101) }, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			price, minimum, maximum, active := 1290, 1, 3, true
			item := models.ShippingRange{Name: "  Região  ", StartCEP: "87502-100", EndCEP: "87502199", PriceCents: &price, MinDays: &minimum, MaxDays: &maximum, Active: &active}
			tc.change(&item)
			start, end, valid := ValidateShippingRange(&item)
			if valid != tc.valid {
				t.Fatalf("valid = %t, want %t", valid, tc.valid)
			}
			if tc.name == "active range" && (start != 87502100 || end != 87502199 || item.Name != "Região") {
				t.Fatalf("normalization failed")
			}
		})
	}
}
