BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE products IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE catalog_coverlet_titles_000037 (
 product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
 previous_name TEXT NOT NULL,
 revised_name TEXT NOT NULL
);
INSERT INTO catalog_coverlet_titles_000037
SELECT p.id,p.name,replace(p.name,' | Tecido Externo 100% Algodão',' 100% Algodão')
FROM products p JOIN product_types t ON t.id=p.product_type_id
WHERE t.name='Cama / Colchas e cobre-leitos'
 AND p.measurements->>'Tipo'='Cobre-leito'
 AND p.name IN (
 'Cobre-Leito Natural Verde Botânico | Tecido Externo 100% Algodão',
 'Cobre-Leito Natural Folhagens Suaves | Tecido Externo 100% Algodão',
 'Cobre-Leito Natural Botânico Neutro | Tecido Externo 100% Algodão');
UPDATE products p SET name=j.revised_name
FROM catalog_coverlet_titles_000037 j WHERE p.id=j.product_id;
COMMIT;