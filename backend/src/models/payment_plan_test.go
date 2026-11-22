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
