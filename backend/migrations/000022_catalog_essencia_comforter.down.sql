BEGIN;
UPDATE product_variants v SET included_items=s.previous_contents
FROM catalog_essencia_variant_seed_000022 s
WHERE v.id=s.variant_id AND v.included_items='["1 edredom"]'::jsonb;
UPDATE products p
SET name=s.previous_name, product_type_id=s.previous_type_id,
    measurements=(p.measurements - 'Conteúdo' - 'Tipo') || COALESCE((
        SELECT jsonb_object_agg(key,value) FROM jsonb_each(s.previous_measurements)
        WHERE key IN ('Conteúdo','Tipo')
    ), '{}'::jsonb)
FROM catalog_essencia_product_seed_000022 s
WHERE p.id=s.product_id AND p.name='Edredom Essência Floral — Verde Suave'
  AND p.product_type_id=s.new_type_id
  AND p.measurements @> '{"Tipo":"Edredom","Conteúdo":"1 edredom"}'::jsonb;
DROP TABLE catalog_essencia_variant_seed_000022,catalog_essencia_product_seed_000022;
COMMIT;
