package repositories

import (
	"backend/src/models"
	"context"
	"regexp"
	"strconv"
	"strings"
)

type ShippingQuote = models.ShippingQuote

var deliveryCEP = regexp.MustCompile(`^[0-9]{5}-?[0-9]{3}$`)

// Valida o formato do CEP e converte seu valor para inteiro.
// Retorna o CEP convertido e um booleano indicando se o formato é válido.
func ParseShippingCEP(value string) (int, bool) {

	value = strings.TrimSpace(value)

	if !deliveryCEP.MatchString(value) {
		return 0, false
	}

	cep, err := strconv.Atoi(strings.ReplaceAll(value, "-", ""))

	return cep, err == nil
}

// Consulta o preço e o prazo de entrega para determinado CEP.
func QuoteShipping(ctx context.Context, query rowQuerier, cep int) (models.ShippingQuote, error) {

	var quote models.ShippingQuote

	// Busca uma faixa de entrega ativa que contenha o CEP informado.
	// int4range cria um intervalo entre o CEP inicial e o final.
	// '[]' indica que os dois extremos estão inclusos.
	// O operador @> verifica se o CEP pertence ao intervalo.
	// FOR SHARE impede alterações na faixa durante a transação.
	err := query.QueryRowContext(ctx, `
SELECT
    price_cents,
    min_days,
    max_days
FROM shipping_ranges
WHERE active
    AND int4range(start_cep, end_cep, '[]') @> $1::integer FOR SHARE
`, cep).Scan(
		&quote.PriceCents,
		&quote.MinDays,
		&quote.MaxDays,
	)

	return quote, err
}
