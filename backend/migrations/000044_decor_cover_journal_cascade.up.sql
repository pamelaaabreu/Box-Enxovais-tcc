BEGIN;
ALTER TABLE catalog_decor_cover_000043
 DROP CONSTRAINT catalog_decor_cover_000043_image_id_fkey,
 DROP CONSTRAINT catalog_decor_cover_000043_product_id_fkey,
 ADD CONSTRAINT catalog_decor_cover_000043_image_id_fkey FOREIGN KEY(image_id) REFERENCES product_images(id) ON DELETE CASCADE,
 ADD CONSTRAINT catalog_decor_cover_000043_product_id_fkey FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE;
COMMIT;
