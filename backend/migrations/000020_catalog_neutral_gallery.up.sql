BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE product_images IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE catalog_neutral_gallery_seed_000020 (
    image_id INTEGER PRIMARY KEY,
    previous_image JSONB NOT NULL,
    was_removed BOOLEAN NOT NULL,
    seeded_in_000017 BOOLEAN NOT NULL
);

WITH target AS (
    SELECT p.id
    FROM products p
    JOIN product_images cover ON cover.product_id = p.id
    WHERE p.name = 'Cobre-Leito Natural — Botânico Neutro'
      AND cover.image_path = 'uploads/cama-natural-botanico-neutro-ambiente-neutro.png'
      AND cover.variant_id IS NULL AND cover.is_primary
)
INSERT INTO catalog_neutral_gallery_seed_000020
SELECT i.id, to_jsonb(i), i.image_path <> 'uploads/catalog-cama-natural-botanico-neutro--764b56d409bc8b285da4c8bf4d2472d1474b0491c5e1d3a4f9dc96914d0b5068.jpg',
       EXISTS (SELECT 1 FROM catalog_image_seed_000017 s WHERE s.image_id = i.id)
FROM product_images i
JOIN target t ON t.id = i.product_id
WHERE i.variant_id IS NULL AND NOT i.is_primary
  AND i.image_path IN ('uploads/catalog-cama-natural-botanico-neutro--764b56d409bc8b285da4c8bf4d2472d1474b0491c5e1d3a4f9dc96914d0b5068.jpg', 'uploads/box-detail-017-18-1.webp');

UPDATE product_images i
SET image_path = 'uploads/cama-natural-botanico-neutro-dobrado.png', alt_text = 'Imagem ilustrativa do cobre-leito dobrado'
FROM catalog_neutral_gallery_seed_000020 s
WHERE i.id = s.image_id AND NOT s.was_removed;

DELETE FROM product_images i USING catalog_neutral_gallery_seed_000020 s
WHERE i.id = s.image_id AND s.was_removed;
COMMIT;
