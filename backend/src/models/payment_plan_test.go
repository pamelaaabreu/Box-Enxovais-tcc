package models

import "testing"

func TestInstallmentArithmetic(t *testing.T) {
	for _, total := range []Money{0, 1, 5, 100, 10001, 14281, 999999999} {
		for n := 1; n <= 6; n++ {
			a, e := SplitInstallments(total, n)
			if e != nil {
				t.Fatal(e)
			}
			var sum Money
			for _, v := range a {
				sum += v
			}
			if sum != total || len(a) != n || a[0]-a[n-1] > 1 {
				t.Fatal(total, n, a)
			}
		}
	}
	for _, method := range []string{"pix", "boleto", "card"} {
		for _, n := range []int{-1, 0, 1, 2, 6, 7} {
			_, e := NormalizeInstallments(method, &n)
			valid := n >= 1 && n <= 6 && (method == "card" || n == 1)
			if (e == nil) != valid {
				t.Fatal(method, n, e)
			}
		}
	}
}

func TestNegativeInstallmentAmount(t *testing.T) {
	if _, err := SplitInstallments(-1, 1); err != ErrNegativeAmount {
		t.Fatalf("erro: %v", err)
	}
	if _, err := SplitInstallments(-1, 0); err != ErrInstallments {
		t.Fatalf("quantidade inválida: %v", err)
	}
	for count := 1; count <= MaxInstallments; count++ {
		amounts, err := SplitInstallments(Money(9223372036854775807), count)
		if err != nil {
			t.Fatal(err)
		}
		var total Money
		for _, amount := range amounts {
			total += amount
		}
		if total != Money(9223372036854775807) {
			t.Fatal("perda de centavos")
		}
	}
}
