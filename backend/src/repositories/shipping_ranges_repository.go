package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
)

func ListShippingRanges(ctx context.Context, database *sql.DB) ([]models.ShippingRange, error) {

	// Como os CEPs são armazenados como números inteiros,
	// o lpad completa os valores com zeros à esquerda,
	// garantindo que sejam exibidos com oito dígitos.
	rows, err := database.QueryContext(ctx, `
SELECT
    id,
    name,
    lpad(start_cep::text, 8, '0'),
    lpad(end_cep::text, 8, '0'),
    price_cents,
    min_days,
    max_days,
    active
FROM shipping_ranges
ORDER BY start_cep,
    id
`)
	if err != nil {
		return nil, err
	}

	defer rows.Close()

	items := []models.ShippingRange{}

	for rows.Next() {
		var item models.ShippingRange

		err = rows.Scan(
			&item.ID,
			&item.Name,
			&item.StartCEP,
			&item.EndCEP,
			&item.PriceCents,
			&item.MinDays,
			&item.MaxDays,
			&item.Active,
		)

		if err != nil {
			return nil, err
		}

		items = append(items, item)
	}

	return items, rows.Err()
}

// Cadastra uma nova faixa de entrega.
// Recebe o CEP inicial, o CEP final, o preço e os prazos de entrega.
func CreateShippingRange(
	ctx context.Context,
	database *sql.DB,
	item *models.ShippingRange,
	startCEP int,
	endCEP int,
) error {

	return database.QueryRowContext(ctx, `
INSERT INTO shipping_ranges(name, start_cep, end_cep, price_cents, min_days, max_days, active)
VALUES ($1,
$2,
$3,
$4,
$5,
$6,
$7)
RETURNING id
`,
		item.Name,
		startCEP,
		endCEP,
		*item.PriceCents,
		*item.MinDays,
		*item.MaxDays,
		*item.Active,
	).Scan(&item.ID)
}

func UpdateShippingRange(
	ctx context.Context,
	database *sql.DB,
	id int64,
	item *models.ShippingRange,
	startCEP int,
	endCEP int,
) error {

	return database.QueryRowContext(ctx, `
UPDATE shipping_ranges
SET name = $1,
start_cep = $2,
end_cep = $3,
price_cents = $4,
min_days = $5,
max_days = $6,
active = $7
WHERE id = $8
RETURNING id
`,
		item.Name,
		startCEP,
		endCEP,
		*item.PriceCents,
		*item.MinDays,
		*item.MaxDays,
		*item.Active,
		id,
	).Scan(&item.ID)
}

// Exclui uma faixa de entrega pelo seu ID.
func DeleteShippingRange(
	ctx context.Context,
	database *sql.DB,
	id int64,
) (bool, error) {

	result, err := database.ExecContext(ctx, `
DELETE
FROM shipping_ranges
WHERE id = $1
`, id)

	if err != nil {
		return false, err
	}

	count, err := result.RowsAffected()

	if err != nil {
		return false, err
	}

	return count > 0, nil
}
