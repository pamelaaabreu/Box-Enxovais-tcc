BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE product_images IN SHARE ROW EXCLUSIVE MODE;

DELETE FROM product_images i USING catalog_sheet_gallery_added_000027 s
WHERE i.id=s.image_id AND i.image_path=s.image_path;

UPDATE product_images i SET image_path=s.previous_path,alt_text=s.previous_alt
FROM catalog_sheet_gallery_000027 s
WHERE i.id=s.image_id AND i.image_path=s.seeded_path AND i.alt_text=s.seeded_alt;

DROP TABLE catalog_sheet_gallery_added_000027;
DROP TABLE catalog_sheet_gallery_000027;
COMMIT;
