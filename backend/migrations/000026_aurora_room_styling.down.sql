BEGIN;
SET LOCAL lock_timeout = '5s';
WITH paths(old_path, new_path) AS (
    VALUES
      ('uploads/aurora-vermelho-liso-01-capa.png', 'uploads/aurora-vermelho-ambiente-01-capa.png'),
      ('uploads/aurora-vermelho-liso-02-lateral.png', 'uploads/aurora-vermelho-ambiente-02-lateral.png')
)
UPDATE product_images i
SET image_path = paths.old_path
FROM paths, products p
WHERE p.name = 'Jogo de Cama Aurora Floral — Vermelho'
  AND i.product_id = p.id AND i.variant_id IS NULL
  AND i.image_path = paths.new_path
  AND NOT EXISTS (
      SELECT 1 FROM product_images existing
      WHERE existing.product_id = i.product_id AND existing.variant_id IS NULL
        AND existing.image_path = paths.old_path
  );
COMMIT;
