package repositories

const reportInventoryCTE = `
variant_totals AS
    (SELECT
         product_id,
         count(*) AS variants,
         sum(quantity)::bigint AS total
     FROM product_variants
     GROUP BY product_id),
    inventory AS
    (SELECT
         p.id,
         p.name,
         p.status,
         COALESCE(v.total, p.quantity)::bigint AS quantity,
         COALESCE(v.variants, 0) AS variants
     FROM products p
     LEFT JOIN variant_totals v
         ON v.product_id = p.id)`
