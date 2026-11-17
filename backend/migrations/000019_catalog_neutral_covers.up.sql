BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE product_images IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE catalog_cover_seed_000019 (
    source_id INTEGER PRIMARY KEY REFERENCES product_images(id) ON DELETE CASCADE,
    new_path TEXT NOT NULL UNIQUE
);

WITH catalog(product_name, category, source_path, new_path) AS (
    VALUES
        ('Cobre-Leito Natural — Verde Botânico', 'Cama / Colchas e cobre-leitos', 'uploads/catalog-cama-natural-verde-botanico--5b7de09f869a38c13c1973bfe8872773924b1a11ea54a894b64baacbf319f98e.jpg', 'uploads/cama-natural-verde-botanico-ambiente-neutro.png'),
        ('Cobre-Leito Natural — Folhagens Suaves', 'Cama / Colchas e cobre-leitos', 'uploads/catalog-cama-natural-folhagens-suaves--15d61b5157a1605794196683432f93a1c761139e0ef38fc965091bf76d61c5bf.jpg', 'uploads/cama-natural-folhagens-suaves-ambiente-neutro.png'),
        ('Cobre-Leito Natural — Botânico Neutro', 'Cama / Colchas e cobre-leitos', 'uploads/catalog-cama-natural-botanico-neutro--764b56d409bc8b285da4c8bf4d2472d1474b0491c5e1d3a4f9dc96914d0b5068.jpg', 'uploads/cama-natural-botanico-neutro-ambiente-neutro.png')
)
INSERT INTO catalog_cover_seed_000019
SELECT i.id, c.new_path
FROM catalog c
JOIN product_types t ON t.name = c.category
JOIN products p ON p.name = c.product_name AND p.product_type_id = t.id
JOIN product_images i ON i.product_id = p.id AND i.image_path = c.source_path
WHERE i.variant_id IS NULL AND i.is_primary
  AND NOT EXISTS (SELECT 1 FROM product_images existing WHERE existing.image_path = c.new_path);

UPDATE product_images i SET is_primary = false
FROM catalog_cover_seed_000019 s WHERE i.id = s.source_id;

INSERT INTO product_images(product_id, image_path, alt_text, is_primary)
SELECT i.product_id, s.new_path, 'Imagem ilustrativa do produto em ambiente neutro', true
FROM catalog_cover_seed_000019 s JOIN product_images i ON i.id = s.source_id;
COMMIT;
