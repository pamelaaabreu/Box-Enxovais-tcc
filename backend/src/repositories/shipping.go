package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"regexp"
	"strconv"
	"strings"
)

type ShippingQuote = models.ShippingQuote

var deliveryCEP = regexp.MustCompile(`^[0-9]{5}-?[0-9]{3}$`)

func ParseShippingCEP(value string) (int, bool) {
	value = strings.TrimSpace(value)
	if !deliveryCEP.MatchString(value) {
		return 0, false
	}
	cep, err := strconv.Atoi(strings.ReplaceAll(value, "-", ""))
	return cep, err == nil
}

func QuoteShipping(ctx context.Context, query interface {
	QueryRowContext(context.Context, string, ...any) *sql.Row
}, cep int) (models.ShippingQuote, error) {
	var quote models.ShippingQuote
	err := query.QueryRowContext(ctx, `
SELECT
    price_cents,
    min_days,
    max_days
FROM shipping_ranges
WHERE active
    AND int4range(start_cep, end_cep, '[]') @> $1::integer
    FOR SHARE
`, cep).Scan(&quote.PriceCents, &quote.MinDays, &quote.MaxDays)
	return quote, err
}
