BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE products IN SHARE ROW EXCLUSIVE MODE;

UPDATE products p
SET name=CASE WHEN p.name=j.revised_data->>'name' THEN j.previous_data->>'name' ELSE p.name END,
    measurements=CASE WHEN j.previous_data->'measurements'='null'::jsonb
                           AND restored.measurements='{}'::jsonb THEN NULL
                      ELSE restored.measurements END
FROM catalog_comforter_titles_000035 j
CROSS JOIN LATERAL (
    SELECT COALESCE(jsonb_object_agg(field.key,
        CASE WHEN field.key IN ('catalog_slug','Tecido externo','Contagem de fios','Origem dos dados de tecelagem')
                   AND field.value=j.revised_data->'measurements'->field.key
             THEN j.previous_data->'measurements'->field.key ELSE field.value END)
        FILTER (WHERE NOT (
            field.key IN ('catalog_slug','Tecido externo','Contagem de fios','Origem dos dados de tecelagem')
            AND field.value=j.revised_data->'measurements'->field.key
            AND NOT (COALESCE(NULLIF(j.previous_data->'measurements','null'::jsonb),'{}'::jsonb) ? field.key)
        )), '{}'::jsonb) AS measurements
    FROM products current_product
    CROSS JOIN LATERAL jsonb_each(COALESCE(current_product.measurements,'{}'::jsonb)) field
    WHERE current_product.id=j.product_id
) restored
WHERE p.id=j.product_id;

DROP TABLE catalog_comforter_titles_000035;
COMMIT;
