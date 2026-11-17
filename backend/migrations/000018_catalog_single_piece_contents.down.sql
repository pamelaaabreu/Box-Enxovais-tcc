BEGIN;
UPDATE products p
SET measurements = CASE WHEN s.measurements_were_null AND p.measurements - 'Conteúdo' = '{}'::jsonb
    THEN NULL ELSE p.measurements - 'Conteúdo' END
FROM catalog_contents_seed_000018 s
WHERE p.id = s.product_id AND p.measurements->>'Conteúdo' = s.contents;
DROP TABLE catalog_contents_seed_000018;
COMMIT;
