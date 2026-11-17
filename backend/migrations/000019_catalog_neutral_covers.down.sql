BEGIN;
LOCK TABLE product_images IN SHARE ROW EXCLUSIVE MODE;
WITH removed AS (
    DELETE FROM product_images i USING catalog_cover_seed_000019 s, product_images original
    WHERE i.image_path = s.new_path AND original.id = s.source_id
      AND i.product_id = original.product_id AND i.variant_id IS NULL
    RETURNING i.image_path, i.is_primary
)
UPDATE product_images i SET is_primary = true
FROM removed r JOIN catalog_cover_seed_000019 s ON s.new_path = r.image_path
WHERE i.id = s.source_id AND r.is_primary;
DROP TABLE catalog_cover_seed_000019;
COMMIT;
