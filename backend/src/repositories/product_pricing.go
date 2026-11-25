package repositories

import "fmt"

// A promoção deve:
// - Estar ativa.
// - Estar dentro do período de vigência.
// - Possuir preço maior ou igual a zero.
// - Possuir preço inferior ao preço original do produto.

// O alias só pode ser escolhido por estas chamadas internas, nunca por entrada HTTP.
func promotionSourceFor(alias string) string {
	if alias != "p" && alias != "product" {
		panic("alias interno de produto inválido")
	}
	return fmt.Sprintf(`
FROM promotion_products pp
JOIN promotions pr ON pr.id = pp.promotion_id
WHERE pp.product_id = %[1]s.id
    AND pr.status = 'active'
    AND pr.start_date <= NOW()
    AND pr.end_date >= NOW()
    AND pp.promotional_price >= 0
    AND pp.promotional_price < %[1]s.price
`, alias)
}

var promotionSource = promotionSourceFor("p")
var cartPromotionSource = promotionSourceFor("product")
var currentProductPrice = `COALESCE((SELECT MIN(pp.promotional_price) ` + promotionSource + `),p.price)`
