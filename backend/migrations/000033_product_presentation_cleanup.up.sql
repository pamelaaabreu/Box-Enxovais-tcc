BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE products, product_images IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE pillow_editorial_000033 (
    product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    previous_copy JSONB NOT NULL,
    revised_copy JSONB NOT NULL
);
CREATE TABLE product_cover_000033 (
    image_id INTEGER PRIMARY KEY REFERENCES product_images(id) ON DELETE CASCADE,
    previous_path TEXT NOT NULL,
    revised_path TEXT NOT NULL UNIQUE
);

INSERT INTO pillow_editorial_000033
SELECT p.id, jsonb_build_array(p.description, p.purchase_summary, p.care_instructions),
       jsonb_build_array(
           CASE p.name
               WHEN 'Travesseiro Curva Serena' THEN 'Travesseiro de espuma viscoelástica com perfil curvo e tecido externo de malha de poliéster.'
               WHEN 'Travesseiro Contorno Suave' THEN 'Travesseiro de espuma viscoelástica com contorno anatômico e tecido externo de malha de poliéster.'
               WHEN 'Travesseiro Apoio Versátil' THEN 'Travesseiro em formato de rolo com enchimento de fibra siliconada de poliéster.'
               ELSE p.description
           END,
           CASE p.name
               WHEN 'Travesseiro Apoio Versátil' THEN 'Travesseiro em formato de rolo de 18 × 50 cm, com enchimento de fibra siliconada de poliéster.'
               WHEN 'Travesseiro Memória Fresca' THEN 'Travesseiro de espuma viscoelástica de 50 × 70 cm, com tecido externo de malha de poliéster.'
               ELSE p.purchase_summary
           END,
           CASE WHEN p.care_instructions ILIKE '%capa removível%'
                THEN concat_ws(chr(10), 'Não lavar nem torcer a espuma.', 'Secar à sombra.')
                ELSE p.care_instructions END
       )
FROM products p
JOIN product_types t ON t.id = p.product_type_id AND t.name = 'Travesseiros'
WHERE p.name IN ('Travesseiro Curva Serena', 'Travesseiro Contorno Suave', 'Travesseiro Apoio Versátil',
                 'Travesseiro Memória Fresca', 'Travesseiro Memória Clássica', 'Travesseiro Memória Compacta')
  AND concat_ws(' ', p.description, p.purchase_summary, p.care_instructions) ~* 'capa (removível|têxtil)';

UPDATE products p SET description = j.revised_copy->>0, purchase_summary = j.revised_copy->>1,
                      care_instructions = j.revised_copy->>2
FROM pillow_editorial_000033 j WHERE p.id = j.product_id;

WITH covers(name, previous_path, revised_path) AS (
    VALUES ('Edredom Jardim — Azul Lavanda', 'uploads/catalog-cama-jardim-azul-lavanda--455239a27c31e32ba7c478531f94b44562c271258f89b0292744d552604a61e7.jpg', 'uploads/catalogo-ambiente-14.webp'),
        ('Edredom Jardim — Verde Musgo', 'uploads/catalog-cama-jardim-verde-musgo--b7bc322dd0bcea41ef904a14f4377c3fe7e49f74973c57213ff7ed4ec2a768ee.jpg', 'uploads/catalogo-ambiente-15.webp'),
        ('Protetor SoftCare', 'uploads/catalog-cama-softcare--31bb938b596130fdcba1439f8d8584d9a7bccf4631069915bc877e6908fab8aa.jpg', 'uploads/catalogo-ambiente-27.webp'),
        ('Protetor Protege', 'uploads/catalog-cama-protege--c8ef925dfd10287057b884b6889956c5d7f40c3c1d2d169f9a76f2769a22310b.jpg', 'uploads/catalogo-ambiente-28.webp')
)
INSERT INTO product_cover_000033
SELECT i.id, c.previous_path, c.revised_path
FROM covers c JOIN products p ON p.name = c.name
JOIN product_images i ON i.product_id = p.id AND i.image_path = c.previous_path
WHERE i.is_primary IS TRUE AND i.variant_id IS NULL
  AND NOT EXISTS (SELECT 1 FROM product_images other WHERE other.image_path = c.revised_path);

UPDATE product_images i SET image_path = j.revised_path
FROM product_cover_000033 j WHERE i.id = j.image_id;

COMMIT;
