BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE product_images IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM catalog_decor_geometry_000046 j LEFT JOIN product_images i ON i.id=j.image_id
 WHERE i.id IS NULL OR i.product_id<>j.product_id OR i.image_path<>j.new_path OR NOT i.is_primary OR i.variant_id IS NOT NULL)
 THEN RAISE EXCEPTION 'Capas editadas após a migration; rollback interrompido.'; END IF;
END $$;
UPDATE product_images i SET image_path=j.old_path FROM catalog_decor_geometry_000046 j WHERE i.id=j.image_id;
DROP TABLE catalog_decor_geometry_000046;
COMMIT;
