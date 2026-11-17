BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE product_images IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE catalog_aurora_gallery_000025 (
    image_id INTEGER PRIMARY KEY REFERENCES product_images(id) ON DELETE CASCADE,
    previous_path TEXT NOT NULL,
    previous_alt TEXT,
    seeded_path TEXT NOT NULL,
    seeded_alt TEXT NOT NULL
);

CREATE TABLE catalog_aurora_gallery_added_000025 (
    image_id INTEGER PRIMARY KEY REFERENCES product_images(id) ON DELETE CASCADE,
    image_path TEXT NOT NULL
);

WITH old_gallery AS (
    SELECT p.id
    FROM products p JOIN product_images i ON i.product_id = p.id
    WHERE p.name = 'Jogo de Cama Aurora Floral — Vermelho'
      AND i.variant_id IS NULL
    GROUP BY p.id
    HAVING array_agg(i.image_path::text ORDER BY i.is_primary DESC NULLS LAST, i.id) = ARRAY[
      'uploads/catalog-cama-aurora-vermelho-minimalista.png',
      'uploads/box-detail-017-4-1.webp',
      'uploads/box-detail-017-4-2.webp',
      'uploads/box-detail-017-4-3.webp'
    ]
    AND count(*) FILTER (WHERE i.is_primary) = 1
    AND EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id)
    AND NOT EXISTS (
      SELECT 1 FROM product_variants v WHERE v.product_id = p.id
      AND v.included_items IS DISTINCT FROM '["1 lençol de elástico","2 fronhas"]'::jsonb
    )
    AND NOT EXISTS (SELECT 1 FROM product_images v WHERE v.product_id = p.id AND v.variant_id IS NOT NULL)
), replacements(old_path, new_path, alt) AS (
    VALUES
      ('uploads/catalog-cama-aurora-vermelho-minimalista.png', 'uploads/aurora-vermelho-liso-01-capa.png', 'Lençol areia e duas fronhas florais em vista frontal'),
      ('uploads/box-detail-017-4-1.webp', 'uploads/aurora-vermelho-liso-02-lateral.png', 'Vista em ângulo do lençol de elástico ajustado ao colchão'),
      ('uploads/box-detail-017-4-2.webp', 'uploads/aurora-vermelho-liso-03-fronhas.png', 'Detalhe das fronhas estampadas em vermelho e terracota'),
      ('uploads/box-detail-017-4-3.webp', 'uploads/aurora-vermelho-liso-04-lencol.png', 'Detalhe do tecido liso em tom areia')
)
INSERT INTO catalog_aurora_gallery_000025
SELECT i.id, i.image_path, i.alt_text, r.new_path, r.alt
FROM old_gallery g JOIN product_images i ON i.product_id = g.id AND i.variant_id IS NULL
JOIN replacements r ON r.old_path = i.image_path;

UPDATE product_images i
SET image_path = s.seeded_path, alt_text = s.seeded_alt
FROM catalog_aurora_gallery_000025 s WHERE i.id = s.image_id;

WITH inserted AS (
    INSERT INTO product_images(product_id, image_path, alt_text, is_primary)
    SELECT i.product_id, 'uploads/aurora-vermelho-liso-05-elastico.png', 'Detalhe do elástico e da costura no canto do lençol', false
    FROM catalog_aurora_gallery_000025 s JOIN product_images i ON i.id = s.image_id
    WHERE i.is_primary
    RETURNING id, image_path
)
INSERT INTO catalog_aurora_gallery_added_000025 SELECT id, image_path FROM inserted;

COMMIT;
