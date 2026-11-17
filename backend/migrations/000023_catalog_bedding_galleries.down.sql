BEGIN;
LOCK TABLE product_images IN SHARE ROW EXCLUSIVE MODE;
DELETE FROM product_images i USING catalog_bedding_gallery_seed_000023 s
WHERE i.id=s.image_id AND NOT i.is_primary AND i.variant_id IS NULL
    AND i.image_path LIKE 'uploads/cama-detalhe-023-%';
UPDATE product_images i SET image_path=s.previous_path,alt_text=s.previous_alt
FROM catalog_essencia_cover_seed_000023 s
WHERE i.id=s.image_id AND i.image_path='uploads/cama-detalhe-023-2-capa-1448.jpg';
DROP TABLE catalog_bedding_gallery_seed_000023,catalog_essencia_cover_seed_000023;
COMMIT;
