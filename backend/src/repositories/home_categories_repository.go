package repositories

import (
	"backend/src/models"
	"context"
)

func (repo HomeRepository) Categories(ctx context.Context) ([]models.HomeCategory, error) {
	query := `
WITH groups(name, slug, ord) AS (
                                 VALUES (
                                             'Cama',
                                             'cama',
                                             1), (
                                                      'Travesseiros',
                                                      'travesseiros',
                                                      2), (
                                                               'Toalhas',
                                                               'toalhas',
                                                               3), (
                                                                        'Almofadas',
                                                                        'almofadas',
                                                                        4), (
                                                                                 'Mesa',
                                                                                 'mesa',
                                                                                 5), (
                                                                                          'Decoração',
                                                                                          'decoracao',
                                                                                          6))
SELECT
    g.name,
    g.slug,
    COALESCE(i.image_path, '')
FROM groups g
LEFT JOIN LATERAL
    (SELECT img.image_path
     FROM products p
     JOIN product_types t
         ON t.id = p.product_type_id
     JOIN product_images img
         ON img.product_id = p.id
     AND img.variant_id IS NULL
     WHERE p.status = 'active'
         AND (t.name = g.name
              OR (g.slug = 'cama'
                  AND t.name IN (
                                     'Cama / Jogos de cama',
                                     'Cama / Edredons',
                                     'Cama / Colchas e cobre-leitos',
                                     'Cama / Mantas e peseiras',
                                     'Cama / Protetores de colchão')))
     ORDER BY
         CASE
             WHEN g.slug = 'decoracao'
                  AND p.measurements ->> 'Tipo' = 'Tapetes para quarto e sala' THEN 0
             ELSE 1
         END,
         img.is_primary DESC NULLS LAST,
         p.id,
         img.id
     LIMIT 1) i ON true
ORDER BY g.ord
`

	rows, err := repo.DB.QueryContext(ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []models.HomeCategory{}
	for rows.Next() {
		var name, slug, imagePath string
		if err = rows.Scan(&name, &slug, &imagePath); err != nil {
			return nil, err
		}

		out = append(out, models.HomeCategory{
			Name:      name,
			Slug:      slug,
			ImagePath: imagePath,
		})
	}

	return out, rows.Err()
}
