BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE products IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE catalog_colcha_percal_000036 (
 product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
 previous_data JSONB NOT NULL,
 revised_data JSONB NOT NULL
);
WITH approved(name,new_name,slug) AS (
 VALUES ('Colcha Provence — Lilás','Colcha Provence Lilás PERCAL 200 FIOS','colcha-provence-lilas-19'),
        ('Colcha Provence — Rosa','Colcha Provence Rosa PERCAL 200 FIOS','colcha-provence-rosa-20')
)
INSERT INTO catalog_colcha_percal_000036
SELECT p.id,jsonb_build_object('name',p.name,'measurements',p.measurements,'purchase_summary',p.purchase_summary),
 jsonb_build_object('name',a.new_name,
 'purchase_summary',replace(p.purchase_summary,'microfibra de poliéster','percal de poliéster 200 fios'),
 'measurements',p.measurements || jsonb_build_object(
 'Material','Percal de poliéster','Tecido externo','Percal de poliéster — 200 fios',
 'Contagem de fios','200 fios','catalog_slug',COALESCE(NULLIF(p.measurements->>'catalog_slug',''),a.slug),
 'Origem dos dados de tecelagem','Especificação demonstrativa aprovada para o TCC'))
FROM approved a JOIN products p ON p.name=a.name
JOIN product_types t ON t.id=p.product_type_id AND t.name='Cama / Colchas e cobre-leitos'
WHERE p.measurements->>'Tipo'='Colcha' AND p.measurements->>'Material'='Microfibra de poliéster';

WITH approved(name,slug) AS (
 VALUES ('Cobre-Leito Natural — Verde Botânico','cobre-leito-natural-verde-botanico-16'),
        ('Cobre-Leito Natural — Folhagens Suaves','cobre-leito-natural-folhagens-suaves-17'),
        ('Cobre-Leito Natural — Botânico Neutro','cobre-leito-natural-botanico-neutro-18')
)
INSERT INTO catalog_colcha_percal_000036
SELECT p.id,jsonb_build_object('name',p.name,'measurements',p.measurements,'purchase_summary',p.purchase_summary),
 jsonb_build_object('name',replace(p.name,' — ',' ') || ' | Tecido Externo 100% Algodão',
 'purchase_summary',replace(replace(replace(p.purchase_summary,'tecido misto de algodão e poliéster','tecido de algodão'),'de algodão e poliéster','de algodão'),'tecido misto','tecido de algodão'),
 'measurements',p.measurements || jsonb_build_object(
 'Material','Tecido de algodão','Tecido externo','Tecido de algodão — 100% algodão',
 'Composição do tecido externo','100% algodão',
 'catalog_slug',COALESCE(NULLIF(p.measurements->>'catalog_slug',''),a.slug),
 'Origem dos dados de composição','Especificação demonstrativa aprovada para o TCC'))
FROM approved a JOIN products p ON p.name=a.name
JOIN product_types t ON t.id=p.product_type_id AND t.name='Cama / Colchas e cobre-leitos'
WHERE p.measurements->>'Tipo'='Cobre-leito' AND p.measurements->>'Material'='Tecido misto de algodão e poliéster';

UPDATE products p SET name=j.revised_data->>'name',measurements=j.revised_data->'measurements',
 purchase_summary=j.revised_data->>'purchase_summary'
FROM catalog_colcha_percal_000036 j WHERE p.id=j.product_id;
COMMIT;
