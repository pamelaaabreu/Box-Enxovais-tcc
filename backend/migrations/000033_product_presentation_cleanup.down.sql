BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE products, product_images IN SHARE ROW EXCLUSIVE MODE;

UPDATE products p SET description = j.previous_copy->>0, purchase_summary = j.previous_copy->>1,
                      care_instructions = j.previous_copy->>2
FROM pillow_editorial_000033 j
WHERE p.id = j.product_id
  AND jsonb_build_array(p.description, p.purchase_summary, p.care_instructions) = j.revised_copy;

UPDATE product_images i SET image_path = j.previous_path
FROM product_cover_000033 j WHERE i.id = j.image_id AND i.image_path = j.revised_path;

DROP TABLE pillow_editorial_000033, product_cover_000033;
COMMIT;
