package repositories

// Para produtos com variantes:
// - O preço apresentado corresponde ao menor preço entre as variantes.
// - O estoque corresponde à soma dos estoques das variantes.
// json_agg agrupa vários registros em um array JSON.
// json_build_object transforma os campos de um registro em um objeto JSON.
// COALESCE garante arrays vazios quando não existem imagens ou variantes.
const storeProductColumns = `
    p.id,
    p.name,
    p.description,
    p.care_instructions,
    COALESCE(p.measurements, '{}') AS measurements,
    COALESCE(
        (SELECT MIN(v.price)
         FROM product_variants v
         WHERE v.product_id = p.id),
        p.price
    ) AS price,
    COALESCE(
        (SELECT SUM(v.quantity)
         FROM product_variants v
         WHERE v.product_id = p.id),
        p.quantity
    ) AS quantity,
    p.status,
    p.product_type_id,
    COALESCE(t.name, '') AS category_name,
    COALESCE(
        (SELECT json_agg(
            image_path
            ORDER BY
                is_primary DESC NULLS LAST,
                COALESCE((to_jsonb(product_images) ->> 'sort_order')::int, 0),
                id
         )
         FROM product_images
         WHERE product_id = p.id
             AND variant_id IS NULL),
        '[]'
    ) AS image_paths,
    COALESCE(
        (SELECT json_agg(
            json_build_object(
                'id', v.id,
                'size', v.size,
                'price', v.price,
                'stock', v.quantity,
                'dimensions', COALESCE(v.dimensions, ''),
                'included_items', v.included_items,
                'simulated', v.simulated,
                'image_paths', COALESCE(
                    (SELECT json_agg(
                        i.image_path
                        ORDER BY
                            i.is_primary DESC NULLS LAST,
                            COALESCE((to_jsonb(i) ->> 'sort_order')::int, 0),
                            i.id
                     )
                     FROM product_images i
                     WHERE i.variant_id = v.id),
                    '[]'
                )
            )
            ORDER BY v.id
         )
         FROM product_variants v
         WHERE v.product_id = p.id),
        '[]'
    ) AS variants,
    p.brand_id,
    COALESCE(b.name, '') AS brand_name,
    p.purchase_summary,
    p.created_at,
    p.updated_at,
    p.sku`

// Recupera o menor preço promocional válido do produto.
// NOT EXISTS impede a aplicação dessa promoção em produtos com variantes.
var storePromotionalPrice = `
    (SELECT MIN(pp.promotional_price) ` + promotionSource + `
    AND NOT EXISTS (
    SELECT
        1
    FROM product_variants variant
    WHERE variant.product_id = p.id
)) AS promotional_price
`

// Relaciona o produto com sua categoria e marca.
// LEFT JOIN mantém o produto no resultado mesmo quando
// não existe uma categoria ou marca correspondente.
const storeProductSource = `
FROM products p
LEFT JOIN product_types t ON t.id = p.product_type_id
LEFT JOIN brands b ON b.id = p.brand_id
`
