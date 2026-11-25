package repositories

import (
	"backend/src/models"
	"backend/src/pagination"
	"context"
)

func (repo ProductRepository) ListRelated(ctx context.Context, id int64) ([]models.Product, error) {
	source := `SELECT
` + storeProductColumns + "," + storePromotionalPrice + storeProductSource + `
JOIN products origin ON origin.id = $1
    AND origin.status = 'active'
WHERE p.status = 'active'
    AND p.id <> origin.id
`

	order := `
    (
    SELECT CASE
        WHEN EXISTS (
        SELECT 1
        FROM product_types t
        WHERE t . id = origin . product_type_id
        AND t . name = 'Decoração'
    ) THEN CASE
    WHEN origin . measurements ->> 'Tipo' = 'Tapetes para banheiro / saída de box'
        AND EXISTS (
        SELECT 1
        FROM product_types t
        WHERE t . id = page . product_type_id
        AND t . name = 'Toalhas'
    ) THEN 0
    WHEN origin . measurements ->> 'Tipo' = 'Cortinas'
    AND page . measurements ->> 'Tipo' = 'Tapetes para quarto e sala'
        AND lower ( origin . measurements ->> 'Cor'
        ) = lower ( page . measurements ->> 'Cor'
    ) THEN 0
    WHEN origin . measurements ->> 'Tipo' = 'Tapetes para quarto e sala'
    AND page . measurements ->> 'Tipo' = 'Cortinas'
        AND lower ( origin . measurements ->> 'Cor'
        ) = lower ( page . measurements ->> 'Cor'
    ) THEN 0
    WHEN origin . measurements ->> 'Tipo' = 'Cortinas'
    AND page . measurements ->> 'Tipo' = 'Tapetes para quarto e sala' THEN 1
    WHEN origin . measurements ->> 'Tipo' = 'Tapetes para quarto e sala'
    AND page . measurements ->> 'Tipo' = 'Cortinas' THEN 1
    WHEN relation . same_collection THEN 2
    WHEN origin . product_type_id = page . product_type_id
    AND origin . measurements ->> 'Tipo' <> page . measurements ->> 'Tipo' THEN 3
    ELSE 4
    END
        WHEN EXISTS (
        SELECT 1
        FROM product_types o
        WHERE o . id = origin . product_type_id
        AND o . name = 'Almofadas'
    ) THEN CASE
        WHEN EXISTS (
        SELECT 1
        FROM product_types t
        WHERE t . id = page . product_type_id
        AND t . name = 'Cama / Mantas e peseiras'
    )
        AND lower ( page . measurements ->> 'Cor'
                ) = ANY ( string_to_array ( COALESCE ( origin . measurements ->> 'coordination_colors' ,
                ''
            ) ,
            ';'
        )
    ) THEN 0
        WHEN EXISTS (
        SELECT 1
        FROM product_types t
        WHERE t . id = page . product_type_id
            AND t . name IN ( 'Cama / Jogos de cama' ,
            'Cama / Edredons' ,
            'Cama / Colchas e cobre-leitos'
        )
    )
        AND lower ( page . measurements ->> 'Cor'
                ) = ANY ( string_to_array ( COALESCE ( origin . measurements ->> 'coordination_colors' ,
                ''
            ) ,
            ';'
        )
    ) THEN 1
    WHEN relation . same_collection THEN 2
        WHEN EXISTS (
        SELECT 1
        FROM product_types t
        WHERE t . id = page . product_type_id
        AND t . name = 'Cama / Mantas e peseiras'
    ) THEN 3
    WHEN origin . product_type_id = page . product_type_id THEN 4
    ELSE 5
    END
    WHEN origin . product_type_id = page . product_type_id
        AND EXISTS (
        SELECT 1
        FROM product_types origin_type
        WHERE origin_type . id = origin . product_type_id
            AND origin_type . name IN ( 'Toalhas' ,
            'Mesa'
        )
    ) THEN CASE
        WHEN ( relation . same_collection
            OR NULLIF ( origin . measurements ->> 'Cor' ,
            ''
        ) = page . measurements ->> 'Cor'
    )
    AND origin . measurements ->> 'Tipo' <> page . measurements ->> 'Tipo' THEN 0
    WHEN relation . same_collection
        OR NULLIF ( origin . measurements ->> 'Cor' ,
        ''
    ) = page . measurements ->> 'Cor' THEN 1
    ELSE 2
    END
    WHEN relation . same_family
        AND ( origin . measurements ->> 'coordinated_pair_type' ,
        page . measurements ->> 'coordinated_pair_type'
            ) IN ( ( 'jogo-cama' ,
            'edredom'
        ) ,
            ( 'edredom' ,
            'jogo-cama'
        )
    ) THEN 0
    WHEN relation . same_family THEN 1
    WHEN relation . same_collection THEN 2
    ELSE 3
    END * 10 + CASE
        WHEN NULLIF ( origin . measurements ->> 'Cor' ,
        ''
    ) = page . measurements ->> 'Cor' THEN 0
        WHEN NULLIF ( origin . measurements ->> 'Estampa' ,
        ''
    ) = page . measurements ->> 'Estampa' THEN 1
    WHEN origin . product_type_id = page . product_type_id THEN 2
    ELSE 3
    END
    FROM products origin
        CROSS JOIN LATERAL (
                SELECT COALESCE ( NULLIF ( origin . measurements ->> 'collection_slug' ,
                ''
            ) ,
                NULLIF ( origin . measurements ->> 'Coleção' ,
                ''
            )
                ) = COALESCE ( NULLIF ( page . measurements ->> 'collection_slug' ,
                ''
            ) ,
                NULLIF ( page . measurements ->> 'Coleção' ,
                ''
            )
        ) AS same_collection ,
            NULLIF ( origin . measurements ->> 'coordinated_family' ,
            ''
        ) = page . measurements ->> 'coordinated_family'
            AND NULLIF ( origin . measurements ->> 'collection_slug' ,
            ''
        ) = page . measurements ->> 'collection_slug' AS same_family
    ) relation
    WHERE origin . id = $1
) ,
page . id
`

	page, err := pagination.ReadPage(
		ctx,
		repo.DB,
		source,
		[]any{id},
		pagination.PageQuery{
			Limit: 4,
			Where: `
WHERE page.quantity > 0`,
		},
		order,
		scanStoreProduct,
	)
	return page.Items, err
}
