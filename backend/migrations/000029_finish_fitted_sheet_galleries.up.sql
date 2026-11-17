BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE product_images IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE catalog_sheet_gallery_000029 (
    image_id INTEGER PRIMARY KEY REFERENCES product_images(id) ON DELETE CASCADE,
    previous_path TEXT NOT NULL, previous_alt TEXT,
    seeded_path TEXT NOT NULL, seeded_alt TEXT NOT NULL
);
CREATE TABLE catalog_sheet_gallery_added_000029 (
    image_id INTEGER PRIMARY KEY REFERENCES product_images(id) ON DELETE CASCADE,
    image_path TEXT NOT NULL
);

CREATE TEMP TABLE sheet_views_000029(position INTEGER,suffix TEXT,alt TEXT) ON COMMIT DROP;
INSERT INTO sheet_views_000029 VALUES
(1,'01-capa','Vista frontal com lençol liso e duas fronhas'),
(2,'02-lateral','Vista em ângulo do jogo de lençol'),
(3,'03-fronha','Estampa e acabamento da fronha'),
(4,'04-lencol','Textura do lençol liso'),
(5,'05-elastico','Acabamento do elástico');

CREATE TEMP TABLE sheet_targets_000029 ON COMMIT DROP AS
WITH expected(name,slug,old_paths) AS (VALUES
('Jogo de Cama Essência Floral — Verde Oliva','oliva',ARRAY['uploads/cama-detalhe-023-1-1.jpg','uploads/cama-detalhe-023-1-2.jpg','uploads/cama-detalhe-023-1-3.jpg']),
('Jogo de Cama Serenidade — Azul','serenidade-azul',ARRAY['uploads/jogo-cama-serenidade-azul.webp','uploads/cama-detalhe-023-6-1.jpg','uploads/cama-detalhe-023-6-2.jpg','uploads/cama-detalhe-023-6-3.jpg']),
('Jogo de Cama Serenidade — Azul Claro','serenidade-azul-claro',ARRAY['uploads/catalog-cama-serenidade-azul-claro-minimalista.png','uploads/box-detail-017-7-1.webp','uploads/box-detail-017-7-2.webp','uploads/box-detail-017-7-3.webp'])
)
SELECT p.id,e.slug,e.old_paths FROM expected e JOIN products p ON p.name=e.name
JOIN product_types t ON t.id=p.product_type_id
WHERE p.status='active' AND t.name='Cama / Jogos de cama'
  AND (SELECT array_agg(i.image_path::text ORDER BY i.is_primary DESC NULLS LAST,i.id)
       FROM product_images i WHERE i.product_id=p.id AND i.variant_id IS NULL)=e.old_paths
  AND NOT EXISTS (SELECT 1 FROM product_images i WHERE i.product_id=p.id AND i.variant_id IS NOT NULL)
  AND (
      (e.slug='oliva' AND p.measurements->>'Conteúdo'='1 lençol de elástico; 2 fronhas'
          AND NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id=p.id))
      OR (e.slug<>'oliva'
          AND (SELECT array_agg(v.size::text ORDER BY v.size COLLATE "C") FROM product_variants v WHERE v.product_id=p.id)=ARRAY['Casal','Queen']
          AND NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id=p.id
             AND v.included_items IS DISTINCT FROM '["1 lençol de elástico","2 fronhas"]'::jsonb))
  );

INSERT INTO catalog_sheet_gallery_000029
SELECT i.id,i.image_path,i.alt_text,'uploads/jogo-cama-'||t.slug||'-completo-'||v.suffix||'.png',v.alt
FROM sheet_targets_000029 t CROSS JOIN sheet_views_000029 v
JOIN product_images i ON i.variant_id IS NULL
WHERE i.product_id=t.id AND i.image_path=t.old_paths[v.position];

UPDATE product_images i SET image_path=s.seeded_path,alt_text=s.seeded_alt
FROM catalog_sheet_gallery_000029 s WHERE i.id=s.image_id;

WITH added AS (
    INSERT INTO product_images(product_id,image_path,alt_text,is_primary)
    SELECT t.id,'uploads/jogo-cama-'||t.slug||'-completo-'||v.suffix||'.png',v.alt,false
    FROM sheet_targets_000029 t CROSS JOIN sheet_views_000029 v
    WHERE v.position>cardinality(t.old_paths)
    ORDER BY t.id,v.position
    RETURNING id,image_path
)
INSERT INTO catalog_sheet_gallery_added_000029 SELECT id,image_path FROM added;

COMMIT;
