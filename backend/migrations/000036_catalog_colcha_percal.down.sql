BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE products IN SHARE ROW EXCLUSIVE MODE;
UPDATE products p SET
 name=CASE WHEN p.name=j.revised_data->>'name' THEN j.previous_data->>'name' ELSE p.name END,
 purchase_summary=CASE WHEN p.purchase_summary IS NOT DISTINCT FROM j.revised_data->>'purchase_summary' THEN j.previous_data->>'purchase_summary' ELSE p.purchase_summary END,
 measurements=(SELECT COALESCE(jsonb_object_agg(f.key,
 CASE WHEN f.key IN ('Material','Tecido externo','Contagem de fios','catalog_slug','Origem dos dados de tecelagem','Composição do tecido externo','Origem dos dados de composição')
 AND f.value=j.revised_data->'measurements'->f.key THEN j.previous_data->'measurements'->f.key ELSE f.value END)
 FILTER (WHERE NOT (f.key IN ('Material','Tecido externo','Contagem de fios','catalog_slug','Origem dos dados de tecelagem','Composição do tecido externo','Origem dos dados de composição')
 AND f.value=j.revised_data->'measurements'->f.key AND NOT(j.previous_data->'measurements' ? f.key))), '{}'::jsonb)
 FROM jsonb_each(p.measurements) f)
FROM catalog_colcha_percal_000036 j WHERE p.id=j.product_id;
DROP TABLE catalog_colcha_percal_000036;
COMMIT;
