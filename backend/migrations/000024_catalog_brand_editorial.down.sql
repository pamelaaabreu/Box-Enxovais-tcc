BEGIN;

UPDATE products p SET brand_id = NULL
FROM catalog_editorial_024 e WHERE p.id = e.product_id AND p.brand_id = e.brand_id;

DELETE FROM brands b USING catalog_brand_024 e
WHERE b.id = e.brand_id AND b.name = 'Box Enxovais'
AND NOT EXISTS (SELECT 1 FROM products p WHERE p.brand_id = b.id);

DROP TABLE catalog_editorial_024;
DROP TABLE catalog_brand_024;
ALTER TABLE products DROP COLUMN purchase_summary;

COMMIT;
