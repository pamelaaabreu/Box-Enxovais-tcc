BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE products IN SHARE ROW EXCLUSIVE MODE;
UPDATE products p SET name=j.previous_name
FROM catalog_coverlet_titles_000037 j WHERE p.id=j.product_id AND p.name=j.revised_name;
DROP TABLE catalog_coverlet_titles_000037;
COMMIT;