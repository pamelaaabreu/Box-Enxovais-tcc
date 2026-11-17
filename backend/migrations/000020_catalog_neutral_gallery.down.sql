BEGIN;
LOCK TABLE product_images IN SHARE ROW EXCLUSIVE MODE;
UPDATE product_images i
SET image_path = original.image_path, alt_text = original.alt_text
FROM catalog_neutral_gallery_seed_000020 s
CROSS JOIN LATERAL jsonb_populate_record(NULL::product_images, s.previous_image) original
WHERE i.id = s.image_id AND NOT s.was_removed
  AND i.image_path = 'uploads/cama-natural-botanico-neutro-dobrado.png' AND NOT i.is_primary;

INSERT INTO product_images
SELECT original.*
FROM catalog_neutral_gallery_seed_000020 s
CROSS JOIN LATERAL jsonb_populate_record(NULL::product_images, s.previous_image) original
JOIN products p ON p.id = original.product_id
WHERE s.was_removed
  AND NOT EXISTS (SELECT 1 FROM product_images i WHERE i.id = s.image_id OR i.image_path = original.image_path);

INSERT INTO catalog_image_seed_000017 (image_id)
SELECT i.id FROM catalog_neutral_gallery_seed_000020 s
JOIN product_images i ON i.id = s.image_id AND to_jsonb(i) = s.previous_image
WHERE s.was_removed AND s.seeded_in_000017
ON CONFLICT DO NOTHING;
DROP TABLE catalog_neutral_gallery_seed_000020;
COMMIT;
