BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE product_images IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE catalog_comforter_images_000032 (
    image_id INTEGER PRIMARY KEY REFERENCES product_images(id) ON DELETE CASCADE,
    previous_path TEXT NOT NULL,
    replacement_path TEXT NOT NULL UNIQUE
);

WITH replacement(product_name, previous_path, replacement_path) AS (
    VALUES ('Edredom Aconchego — Creme', 'uploads/catalog-cama-aconchego-creme--6aac05e3161e3f58c67eb8f2111cdba655bb96a6ef8caea6716827a389ddcecd.jpg', 'uploads/edredom-caimento-8-01.webp'),
           ('Edredom Aconchego — Creme', 'uploads/box-detail-017-8-2.webp', 'uploads/edredom-caimento-8-03.webp'),
           ('Edredom Aconchego — Creme', 'uploads/box-detail-017-8-3.webp', 'uploads/edredom-caimento-8-04.webp'),
           ('Edredom Aconchego — Marrom Cacau', 'uploads/catalog-cama-aconchego-marrom-cacau--38f4d9675e28478615a4e4db18376f24b6be18468470db50d9952391d8851952.jpg', 'uploads/edredom-caimento-9-01.webp'),
           ('Edredom Aconchego — Marrom Cacau', 'uploads/box-detail-017-9-2.webp', 'uploads/edredom-caimento-9-03.webp'),
           ('Edredom Aconchego — Marrom Cacau', 'uploads/box-detail-017-9-3.webp', 'uploads/edredom-caimento-9-04.webp'),
           ('Edredom Aconchego — Verde Oliva', 'uploads/catalog-cama-aconchego-verde-oliva--30dda27e6686f5790306be9decbecd6ab71e0f26747a1e2d364306cf82da47eb.jpg', 'uploads/edredom-caimento-10-01.webp'),
           ('Edredom Aconchego — Verde Oliva', 'uploads/box-detail-017-10-2.webp', 'uploads/edredom-caimento-10-03.webp'),
           ('Edredom Aconchego — Verde Oliva', 'uploads/box-detail-017-10-3.webp', 'uploads/edredom-caimento-10-04.webp'),
           ('Edredom Geométrico — Azul Petróleo', 'uploads/catalog-cama-geometrico-azul-petroleo--66867e5c1df2a35e0442155d561318e3e1a27fec12dc78ec651c7b87b938237f.jpg', 'uploads/edredom-caimento-11-01.webp'),
           ('Edredom Geométrico — Azul Petróleo', 'uploads/box-detail-017-11-2.webp', 'uploads/edredom-caimento-11-03.webp'),
           ('Edredom Geométrico — Azul Petróleo', 'uploads/box-detail-017-11-3.webp', 'uploads/edredom-caimento-11-04.webp'),
           ('Edredom Geométrico — Rosa Nude', 'uploads/cama-detalhe-023-12-3.jpg', 'uploads/edredom-caimento-12-04.webp'),
           ('Edredom Geométrico — Verde Sálvia', 'uploads/catalog-cama-geometrico-verde-salvia--fafc66b32f4e850c88b783b76d994e11bc7c13237b07dabc88a8913ab7ca26fd.jpg', 'uploads/edredom-caimento-13-01.webp'),
           ('Edredom Geométrico — Verde Sálvia', 'uploads/box-detail-017-13-2.webp', 'uploads/edredom-caimento-13-03.webp'),
           ('Edredom Geométrico — Verde Sálvia', 'uploads/box-detail-017-13-3.webp', 'uploads/edredom-caimento-13-04.webp')
)
INSERT INTO catalog_comforter_images_000032
SELECT i.id, r.previous_path, r.replacement_path
FROM replacement r
JOIN products p ON p.name = r.product_name
JOIN product_types t ON t.id = p.product_type_id AND t.name = 'Cama / Edredons'
JOIN product_images i ON i.product_id = p.id AND i.variant_id IS NULL AND i.image_path = r.previous_path
WHERE NOT EXISTS (SELECT 1 FROM product_images other WHERE other.image_path = r.replacement_path);

UPDATE product_images i
SET image_path = s.replacement_path
FROM catalog_comforter_images_000032 s
WHERE i.id = s.image_id AND i.image_path = s.previous_path;

COMMIT;
