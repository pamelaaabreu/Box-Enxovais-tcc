BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE product_images IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE catalog_sheet_gallery_000027 (
    image_id INTEGER PRIMARY KEY REFERENCES product_images(id) ON DELETE CASCADE,
    previous_path TEXT NOT NULL,
    previous_alt TEXT,
    seeded_path TEXT NOT NULL,
    seeded_alt TEXT NOT NULL
);
CREATE TABLE catalog_sheet_gallery_added_000027 (
    image_id INTEGER PRIMARY KEY REFERENCES product_images(id) ON DELETE CASCADE,
    image_path TEXT NOT NULL
);

CREATE TEMP TABLE sheet_targets_000027 ON COMMIT DROP AS
WITH expected(name, slug, old_paths, sizes) AS (
    VALUES
    ('Jogo de Cama Aurora Floral — Vinho','vinho',ARRAY['uploads/jogo-cama-aurora-floral-vinho.webp','uploads/cama-detalhe-023-5-1.jpg','uploads/cama-detalhe-023-5-2.jpg','uploads/cama-detalhe-023-5-3.jpg'],ARRAY['Casal','King','Queen']),
    ('Jogo de Cama Essência Floral — Botânico','botanico',ARRAY['uploads/jogo-cama-essencia-floral-botanico.webp','uploads/cama-detalhe-023-3-1.jpg','uploads/cama-detalhe-023-3-2.jpg','uploads/cama-detalhe-023-3-3.jpg'],ARRAY['Casal','Queen','Solteiro'])
)
SELECT p.id, e.slug, e.old_paths
FROM expected e JOIN products p ON p.name=e.name
WHERE p.status='active' AND p.measurements->>'Tipo'='Jogo de cama'
  AND (SELECT array_agg(i.image_path::text ORDER BY i.is_primary DESC NULLS LAST,i.id)
       FROM product_images i WHERE i.product_id=p.id AND i.variant_id IS NULL)=e.old_paths
  AND (SELECT array_agg(v.size::text ORDER BY v.size COLLATE "C") FROM product_variants v WHERE v.product_id=p.id)=e.sizes
  AND NOT EXISTS (SELECT 1 FROM product_images i WHERE i.product_id=p.id AND i.variant_id IS NOT NULL)
  AND NOT EXISTS (
      SELECT 1 FROM product_variants v WHERE v.product_id=p.id
      AND v.included_items IS DISTINCT FROM CASE WHEN v.size='Solteiro'
          THEN '["1 lençol de elástico","1 fronha"]'::jsonb
          ELSE '["1 lençol de elástico","2 fronhas"]'::jsonb END
  );

WITH views(position,suffix,alt) AS (
    VALUES (1,'01-capa','Vista frontal do jogo de lençol'),
           (2,'02-lateral','Vista em ângulo do lençol'),
           (3,'03-fronha','Detalhe da fronha estampada'),
           (4,'04-lencol','Detalhe do tecido liso'),
           (5,'05-elastico','Acabamento do elástico')
)
INSERT INTO catalog_sheet_gallery_000027
SELECT i.id,i.image_path,i.alt_text,'uploads/jogo-cama-'||t.slug||'-ambiente-'||v.suffix||'.png',v.alt
FROM sheet_targets_000027 t CROSS JOIN views v
JOIN product_images i ON i.variant_id IS NULL
WHERE i.product_id=t.id AND i.image_path=t.old_paths[v.position];

UPDATE product_images i SET image_path=s.seeded_path,alt_text=s.seeded_alt
FROM catalog_sheet_gallery_000027 s WHERE i.id=s.image_id;

WITH extra AS (
    SELECT t.id AS product_id,NULL::BIGINT AS variant_id,
           'uploads/jogo-cama-'||t.slug||'-ambiente-05-elastico.png' AS path,
           'Acabamento do elástico' AS alt,false AS is_primary,5 AS position
    FROM sheet_targets_000027 t
    UNION ALL
    SELECT t.id,v.id,'uploads/jogo-cama-botanico-'||CASE WHEN x.position<=2 THEN 'solteiro-' ELSE '' END
           ||'ambiente-'||x.suffix||'.png',x.alt,x.position=1,x.position
    FROM sheet_targets_000027 t JOIN product_variants v ON v.product_id=t.id
    CROSS JOIN (VALUES (1,'01-capa','Vista frontal do jogo de lençol'),(2,'02-lateral','Vista em ângulo do lençol'),(3,'03-fronha','Detalhe da fronha estampada'),(4,'04-lencol','Detalhe do tecido liso'),(5,'05-elastico','Acabamento do elástico')) x(position,suffix,alt)
    WHERE t.slug='botanico' AND v.size='Solteiro'
), added AS (
    INSERT INTO product_images(product_id,variant_id,image_path,alt_text,is_primary)
    SELECT product_id,variant_id,path,alt,is_primary FROM extra
    ORDER BY product_id,variant_id NULLS FIRST,position
    RETURNING id,image_path
)
INSERT INTO catalog_sheet_gallery_added_000027 SELECT id,image_path FROM added;

COMMIT;
