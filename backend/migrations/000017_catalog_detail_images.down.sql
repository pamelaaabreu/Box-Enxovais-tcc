BEGIN;
DELETE FROM product_images i
USING catalog_image_seed_000017 s
WHERE i.id = s.image_id AND NOT i.is_primary AND i.variant_id IS NULL
  AND i.image_path LIKE 'uploads/box-detail-017-%';
DROP TABLE catalog_image_seed_000017;
COMMIT;
