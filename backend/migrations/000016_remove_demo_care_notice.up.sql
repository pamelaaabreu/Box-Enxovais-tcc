BEGIN;
UPDATE products
SET care_instructions = NULLIF(btrim(replace(care_instructions, 'Cuidados simulados para demonstração. Consulte a etiqueta para produtos reais.', ''), E' \t\r\n'), '')
WHERE strpos(care_instructions, 'Cuidados simulados para demonstração. Consulte a etiqueta para produtos reais.') > 0;
COMMIT;
