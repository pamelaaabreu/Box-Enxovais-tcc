BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE products IN SHARE ROW EXCLUSIVE MODE;

WITH restored AS (
    SELECT p.id, s.measurements_were_null,
           p.measurements - ARRAY(
               SELECT a.key FROM jsonb_each(s.added_measurements) a
               WHERE p.measurements->a.key = a.value
           ) AS measurements,
           CASE WHEN s.added_care IS NOT NULL AND p.care_instructions = s.added_care
               THEN s.previous_care ELSE p.care_instructions END AS care
    FROM products p
    JOIN catalog_technical_seed_000015 s ON s.product_id = p.id
)
UPDATE products p
SET measurements = CASE WHEN r.measurements_were_null AND r.measurements = '{}'::jsonb
                        THEN NULL ELSE r.measurements END,
    care_instructions = r.care
FROM restored r
WHERE p.id = r.id;

DROP TABLE catalog_technical_seed_000015;
COMMIT;

