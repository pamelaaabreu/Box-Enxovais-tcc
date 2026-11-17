BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE products, product_variants IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE catalog_essencia_product_seed_000022 (
    product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    previous_name TEXT NOT NULL,
    previous_type_id INTEGER NOT NULL,
    previous_measurements JSONB NOT NULL,
    new_type_id INTEGER NOT NULL
);
CREATE TABLE catalog_essencia_variant_seed_000022 (
    variant_id INTEGER PRIMARY KEY REFERENCES product_variants(id) ON DELETE CASCADE,
    previous_contents JSONB NOT NULL
);
INSERT INTO catalog_essencia_product_seed_000022
SELECT p.id,p.name,p.product_type_id,p.measurements,new_type.id
FROM products p
JOIN product_types old_type ON old_type.id=p.product_type_id
JOIN product_types new_type ON new_type.name='Cama / Edredons'
WHERE p.name='Jogo de Cama Essência Floral — Verde Suave'
  AND old_type.name='Cama / Jogos de cama'
  AND EXISTS (
      SELECT 1 FROM product_images i
      WHERE i.product_id=p.id AND i.is_primary
        AND i.image_path='uploads/jogo-cama-essencia-floral-verde-suave.webp'
  );
INSERT INTO catalog_essencia_variant_seed_000022
SELECT v.id,v.included_items
FROM product_variants v JOIN catalog_essencia_product_seed_000022 s ON s.product_id=v.product_id
WHERE v.simulated AND v.included_items IN
    ('["1 lençol de elástico","1 fronha"]'::jsonb, '["1 lençol de elástico","2 fronhas"]'::jsonb);
UPDATE product_variants v SET included_items='["1 edredom"]'::jsonb
FROM catalog_essencia_variant_seed_000022 s WHERE v.id=s.variant_id;
UPDATE products p SET name='Edredom Essência Floral — Verde Suave',product_type_id=s.new_type_id,
    measurements=p.measurements || '{"Tipo":"Edredom","Conteúdo":"1 edredom"}'::jsonb
FROM catalog_essencia_product_seed_000022 s WHERE p.id=s.product_id;
COMMIT;
