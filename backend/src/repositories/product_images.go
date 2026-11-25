package repositories

// Consulta compartilhada para selecionar a imagem de um produto.
//
// Prioriza a imagem da variante selecionada.
// Caso não exista, utiliza uma imagem geral do produto.
//
// Dentro de cada galeria, prioriza a imagem principal
// e utiliza o ID como critério de desempate.
const itemImageSQL = `
SELECT
    image_path
FROM product_images
WHERE product_id = item.product_id
    AND (variant_id = item.variant_id
    OR variant_id IS NULL)
ORDER BY variant_id IS NULL,
    is_primary DESC NULLS LAST,
    COALESCE((to_jsonb(product_images) ->> 'sort_order')::int, 0),
    id
LIMIT 1
`
