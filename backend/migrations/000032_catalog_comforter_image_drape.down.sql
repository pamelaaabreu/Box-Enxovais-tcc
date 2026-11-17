BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE product_images IN SHARE ROW EXCLUSIVE MODE;

UPDATE product_images i
SET image_path = s.previous_path
FROM catalog_comforter_images_000032 s
WHERE i.id = s.image_id AND i.image_path = s.replacement_path;

DROP TABLE catalog_comforter_images_000032;

COMMIT;
