BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE products,product_images IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM catalog_mesa_gallery_000041 j
 WHERE j.after_images IS DISTINCT FROM (
 SELECT jsonb_agg(to_jsonb(i) ORDER BY id) FROM product_images i WHERE i.product_id=j.product_id
 )) THEN RAISE EXCEPTION 'Galeria editada após a migration; rollback interrompido.'; END IF;
END $$;
DELETE FROM product_images i USING catalog_mesa_gallery_000041 j
WHERE i.product_id=j.product_id
AND NOT EXISTS(SELECT 1 FROM jsonb_array_elements(j.before_images) old WHERE (old->>'id')::integer=i.id);
UPDATE product_images i SET image_path=old->>'image_path',alt_text=old->>'alt_text',is_primary=(old->>'is_primary')::boolean
FROM catalog_mesa_gallery_000041 j CROSS JOIN LATERAL jsonb_array_elements(j.before_images) old
WHERE i.product_id=j.product_id AND i.id=(old->>'id')::integer;
DROP TABLE catalog_mesa_gallery_000041;
COMMIT;
