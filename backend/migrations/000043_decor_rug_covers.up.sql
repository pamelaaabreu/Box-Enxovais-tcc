BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE products,product_images IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE IF NOT EXISTS catalog_decor_cover_000043 (
 image_id INTEGER PRIMARY KEY REFERENCES product_images(id),
 product_id INTEGER NOT NULL REFERENCES products(id),
 old_path TEXT NOT NULL,
 new_path TEXT NOT NULL
);
WITH planned(import_key,new_path) AS (VALUES
('decoracao-2026-tapete-box-ondas-areia','uploads/decoracao-tapete-043-ondas-areia-capa.webp'),
('decoracao-2026-tapete-box-canelado-creme','uploads/decoracao-tapete-043-canelado-creme-capa.webp'),
('decoracao-2026-tapete-box-moldura-oliva','uploads/decoracao-tapete-043-moldura-oliva-capa.webp'),
('decoracao-2026-tapete-box-trelica-azul','uploads/decoracao-tapete-043-trelica-azul-capa.webp'),
('decoracao-2026-tapete-box-ondas-terracota','uploads/decoracao-tapete-043-ondas-terracota-capa.webp'),
('decoracao-2026-tapete-box-grafite-preto','uploads/decoracao-tapete-043-grafite-preto-capa.webp'),
('decoracao-2026-tapete-box-losangos-preto','uploads/decoracao-tapete-043-losangos-preto-capa.webp')
)
INSERT INTO catalog_decor_cover_000043(image_id,product_id,old_path,new_path)
SELECT i.id,p.id,i.image_path,a.new_path FROM planned a
JOIN products p ON p.measurements->>'catalog_import_key'=a.import_key
JOIN product_types t ON t.id=p.product_type_id AND t.name='Decoração'
JOIN product_images i ON i.product_id=p.id AND i.variant_id IS NULL AND i.is_primary
WHERE i.image_path='uploads/'||a.import_key||'-01.webp'
ON CONFLICT(image_id) DO NOTHING;
DO $$ BEGIN
 IF (SELECT count(*) FROM catalog_decor_cover_000043)<>7
 OR EXISTS(SELECT 1 FROM catalog_decor_cover_000043 j JOIN product_images i ON i.id=j.image_id
 WHERE i.product_id<>j.product_id OR i.variant_id IS NOT NULL OR NOT i.is_primary OR i.image_path NOT IN(j.old_path,j.new_path))
 THEN RAISE EXCEPTION 'Capas dos tapetes divergem da auditoria; operação interrompida.'; END IF;
END $$;
UPDATE product_images i SET image_path=j.new_path
FROM catalog_decor_cover_000043 j WHERE i.id=j.image_id;
COMMIT;
