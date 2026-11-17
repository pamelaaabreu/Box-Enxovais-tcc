BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE product_images IN SHARE ROW EXCLUSIVE MODE;

DELETE FROM product_images i USING catalog_aurora_gallery_added_000025 s
WHERE i.id = s.image_id AND i.image_path = s.image_path;

UPDATE product_images i
SET image_path = s.previous_path, alt_text = s.previous_alt
FROM catalog_aurora_gallery_000025 s
WHERE i.id = s.image_id AND i.image_path = s.seeded_path AND i.alt_text = s.seeded_alt;

DROP TABLE catalog_aurora_gallery_added_000025;
DROP TABLE catalog_aurora_gallery_000025;

COMMIT;
