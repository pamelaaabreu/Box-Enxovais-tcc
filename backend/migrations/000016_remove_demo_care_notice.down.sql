BEGIN;
UPDATE products p
SET care_instructions = s.added_care
FROM catalog_technical_seed_000015 s
WHERE p.id = s.product_id
  AND strpos(s.added_care, 'Cuidados simulados para demonstração. Consulte a etiqueta para produtos reais.') > 0
  AND p.care_instructions IS NOT DISTINCT FROM
      NULLIF(btrim(replace(s.added_care, 'Cuidados simulados para demonstração. Consulte a etiqueta para produtos reais.', ''), E' \t\r\n'), '');
COMMIT;
