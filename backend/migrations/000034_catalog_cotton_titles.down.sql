BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE products IN SHARE ROW EXCLUSIVE MODE;

UPDATE products p SET
    name=CASE WHEN p.name=j.revised_data->>'name' THEN j.previous_data->>'name' ELSE p.name END,
    description=CASE WHEN p.description IS NOT DISTINCT FROM j.revised_data->>'description' THEN j.previous_data->>'description' ELSE p.description END,
    purchase_summary=CASE WHEN p.purchase_summary IS NOT DISTINCT FROM j.revised_data->>'purchase_summary' THEN j.previous_data->>'purchase_summary' ELSE p.purchase_summary END,
    measurements=(SELECT COALESCE(jsonb_object_agg(field.key,
        CASE WHEN field.key IN ('catalog_slug','Material','Tecido externo','Composição têxtil','Composição do tecido externo','Origem dos dados de composição')
                  AND field.value=j.revised_data->'measurements'->field.key
             THEN j.previous_data->'measurements'->field.key ELSE field.value END)
        FILTER (WHERE NOT (
             field.key IN ('catalog_slug','Material','Tecido externo','Composição têxtil','Composição do tecido externo','Origem dos dados de composição')
             AND field.value=j.revised_data->'measurements'->field.key
             AND NOT (j.previous_data->'measurements' ? field.key)
        )), '{}'::jsonb)
        FROM jsonb_each(p.measurements) field)
FROM catalog_cotton_titles_000034 j WHERE p.id=j.product_id;

DROP TABLE catalog_cotton_titles_000034;
COMMIT;
