BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE products IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE IF NOT EXISTS catalog_rug_titles_000047 (
 product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
 old_name TEXT NOT NULL,
 new_name TEXT NOT NULL
);
INSERT INTO catalog_rug_titles_000047(product_id,old_name,new_name)
SELECT p.id,p.name,p.name||' — 1 Peça' FROM products p
JOIN product_types t ON t.id=p.product_type_id
WHERE t.name='Decoração'
AND p.measurements->>'Tipo' IN('Tapetes para quarto e sala','Tapetes para banheiro / saída de box')
AND p.measurements->>'catalog_import_key' LIKE 'decoracao-2026-tapete-%'
AND p.name !~* '(^|[[:space:]])1 peça$'
ON CONFLICT(product_id) DO NOTHING;
DO $$ BEGIN
 IF (SELECT count(*) FROM catalog_rug_titles_000047)<>13
 OR EXISTS(SELECT 1 FROM catalog_rug_titles_000047 j JOIN products p ON p.id=j.product_id WHERE p.name NOT IN(j.old_name,j.new_name))
 THEN RAISE EXCEPTION 'Títulos dos tapetes divergem da auditoria; operação interrompida.'; END IF;
END $$;
UPDATE products p SET name=j.new_name FROM catalog_rug_titles_000047 j WHERE p.id=j.product_id;
COMMIT;
