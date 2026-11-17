BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE product_images IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE catalog_essencia_cover_seed_000023 (
    image_id INTEGER PRIMARY KEY REFERENCES product_images(id) ON DELETE CASCADE,
    previous_path TEXT NOT NULL,
    previous_alt TEXT
);
CREATE TABLE catalog_bedding_gallery_seed_000023 (
    image_id INTEGER PRIMARY KEY REFERENCES product_images(id) ON DELETE CASCADE
);
INSERT INTO catalog_essencia_cover_seed_000023
SELECT i.id,i.image_path,i.alt_text
FROM product_images i JOIN products p ON p.id=i.product_id
WHERE p.name='Edredom Essência Floral — Verde Suave'
  AND i.image_path='uploads/jogo-cama-essencia-floral-verde-suave.webp'
  AND i.variant_id IS NULL AND i.is_primary;
UPDATE product_images i SET image_path='uploads/cama-detalhe-023-2-capa-1448.jpg',
    alt_text='Capa ilustrativa frontal do Edredom Essência Floral Verde Suave'
FROM catalog_essencia_cover_seed_000023 s WHERE i.id=s.image_id;
WITH catalog(name,cover,image_path,alt,position) AS (
    VALUES
    ('Edredom Essência Floral — Verde Suave', 'uploads/cama-detalhe-023-2-capa-1448.jpg', 'uploads/cama-detalhe-023-2-1.jpg', 'Ilustração da vista lateral', 1),
    ('Edredom Essência Floral — Verde Suave', 'uploads/cama-detalhe-023-2-capa-1448.jpg', 'uploads/cama-detalhe-023-2-2.jpg', 'Ilustração do edredom volumoso dobrado', 2),
    ('Edredom Essência Floral — Verde Suave', 'uploads/cama-detalhe-023-2-capa-1448.jpg', 'uploads/cama-detalhe-023-2-3.jpg', 'Ilustração da estampa e do caimento', 3),
    ('Edredom Essência Floral — Verde Suave', 'uploads/cama-detalhe-023-2-capa-1448.jpg', 'uploads/cama-detalhe-023-2-4.jpg', 'Ilustração da costura e acabamento', 4),
    ('Jogo de Cama Essência Floral — Verde Oliva', 'uploads/jogo-cama-essencia-floral-verde-oliva.webp', 'uploads/cama-detalhe-023-1-1.jpg', 'Ilustração da vista lateral', 1),
    ('Jogo de Cama Essência Floral — Verde Oliva', 'uploads/jogo-cama-essencia-floral-verde-oliva.webp', 'uploads/cama-detalhe-023-1-2.jpg', 'Ilustração do produto dobrado', 2),
    ('Jogo de Cama Essência Floral — Verde Oliva', 'uploads/jogo-cama-essencia-floral-verde-oliva.webp', 'uploads/cama-detalhe-023-1-3.jpg', 'Ilustração do tecido e da barra', 3),
    ('Jogo de Cama Essência Floral — Botânico', 'uploads/jogo-cama-essencia-floral-botanico.webp', 'uploads/cama-detalhe-023-3-1.jpg', 'Ilustração da vista lateral', 1),
    ('Jogo de Cama Essência Floral — Botânico', 'uploads/jogo-cama-essencia-floral-botanico.webp', 'uploads/cama-detalhe-023-3-2.jpg', 'Ilustração do produto dobrado', 2),
    ('Jogo de Cama Essência Floral — Botânico', 'uploads/jogo-cama-essencia-floral-botanico.webp', 'uploads/cama-detalhe-023-3-3.jpg', 'Ilustração do tecido e da barra', 3),
    ('Jogo de Cama Aurora Floral — Vinho', 'uploads/jogo-cama-aurora-floral-vinho.webp', 'uploads/cama-detalhe-023-5-1.jpg', 'Ilustração da vista lateral', 1),
    ('Jogo de Cama Aurora Floral — Vinho', 'uploads/jogo-cama-aurora-floral-vinho.webp', 'uploads/cama-detalhe-023-5-2.jpg', 'Ilustração do produto dobrado', 2),
    ('Jogo de Cama Aurora Floral — Vinho', 'uploads/jogo-cama-aurora-floral-vinho.webp', 'uploads/cama-detalhe-023-5-3.jpg', 'Ilustração do tecido e da barra', 3),
    ('Jogo de Cama Serenidade — Azul', 'uploads/jogo-cama-serenidade-azul.webp', 'uploads/cama-detalhe-023-6-1.jpg', 'Ilustração da vista lateral', 1),
    ('Jogo de Cama Serenidade — Azul', 'uploads/jogo-cama-serenidade-azul.webp', 'uploads/cama-detalhe-023-6-2.jpg', 'Ilustração do produto dobrado', 2),
    ('Jogo de Cama Serenidade — Azul', 'uploads/jogo-cama-serenidade-azul.webp', 'uploads/cama-detalhe-023-6-3.jpg', 'Ilustração do tecido e da barra', 3),
    ('Edredom Geométrico — Rosa Nude', 'uploads/edredom-geometrico-rosa-nude.webp', 'uploads/cama-detalhe-023-12-1.jpg', 'Ilustração da vista lateral', 1),
    ('Edredom Geométrico — Rosa Nude', 'uploads/edredom-geometrico-rosa-nude.webp', 'uploads/cama-detalhe-023-12-2.jpg', 'Ilustração do produto dobrado', 2),
    ('Edredom Geométrico — Rosa Nude', 'uploads/edredom-geometrico-rosa-nude.webp', 'uploads/cama-detalhe-023-12-3.jpg', 'Ilustração do tecido e da barra', 3)
), added AS (
    INSERT INTO product_images(product_id,image_path,alt_text,is_primary)
    SELECT p.id,c.image_path,c.alt,false
    FROM catalog c JOIN products p ON p.name=c.name
    WHERE EXISTS (SELECT 1 FROM product_images i WHERE i.product_id=p.id AND i.image_path=c.cover AND i.is_primary AND i.variant_id IS NULL)
      AND NOT EXISTS (SELECT 1 FROM product_images i WHERE i.image_path=c.image_path)
    ORDER BY p.id,c.position
    RETURNING id
)
INSERT INTO catalog_bedding_gallery_seed_000023 SELECT id FROM added;
COMMIT;
