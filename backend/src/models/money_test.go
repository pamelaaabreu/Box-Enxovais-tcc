package models

import (
	"encoding/json"
	"math"
	"math/big"
	"testing"
)

func TestMoneyJSONExact(t *testing.T) {
	cases := []struct {
		cents int64
		want  string
	}{{0, "0.00"}, {1, "0.01"}, {9, "0.09"}, {99, "0.99"}, {100, "1.00"}, {101, "1.01"}, {-1, "-0.01"}, {-9, "-0.09"}, {-99, "-0.99"}, {-100, "-1.00"}, {-101, "-1.01"}, {math.MaxInt64, "92233720368547758.07"}, {math.MinInt64, "-92233720368547758.08"}}
	for _, tc := range cases {
		t.Run(tc.want, func(t *testing.T) {
			got, err := json.Marshal(Money(tc.cents))
			if err != nil || !json.Valid(got) || string(got) != tc.want {
				t.Fatalf("got %s (%v), want %s", got, err, tc.want)
			}
			actual, ok := new(big.Rat).SetString(string(got))
			expected := new(big.Rat).SetFrac(big.NewInt(tc.cents), big.NewInt(100))
			if !ok || actual.Cmp(expected) != 0 {
				t.Fatal("centavos alterados")
			}
		})
	}
}
