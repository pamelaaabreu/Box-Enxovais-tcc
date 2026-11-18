BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE products,product_images IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE catalog_mesa_gallery_000041 (
 product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
 import_key TEXT NOT NULL,
 new_path TEXT NOT NULL,
 mode TEXT NOT NULL CHECK(mode IN ('ambientacao','objetiva')),
 product_name TEXT NOT NULL,
 before_images JSONB NOT NULL,
 after_images JSONB
);
WITH planned(import_key,new_path,mode,product_name) AS (
 VALUES ('mesa-2026-caminho-de-mesa-essencia-oliva','uploads/mesa-galerias-041-caminho-de-mesa-essencia-oliva-objetiva.webp','objetiva','Caminho de Mesa Essência Oliva'),
('mesa-2026-caminho-de-mesa-natural-areia','uploads/mesa-galerias-041-caminho-de-mesa-natural-areia-ambientacao.webp','ambientacao','Caminho de Mesa Natural Areia'),
('mesa-2026-caminho-de-mesa-terracota','uploads/mesa-galerias-041-caminho-de-mesa-terracota-ambientacao.webp','ambientacao','Caminho de Mesa Terracota'),
('mesa-2026-jogo-americano-essencia-oliva-4-pecas','uploads/mesa-galerias-041-jogo-americano-essencia-oliva-4-pecas-ambientacao.webp','ambientacao','Jogo Americano Essência Oliva 4 Peças'),
('mesa-2026-jogo-americano-natural-areia-6-pecas','uploads/mesa-galerias-041-jogo-americano-natural-areia-6-pecas-ambientacao.webp','ambientacao','Jogo Americano Natural Areia 6 Peças'),
('mesa-2026-jogo-americano-terracota-4-pecas','uploads/mesa-galerias-041-jogo-americano-terracota-4-pecas-objetiva.webp','objetiva','Jogo Americano Terracota 4 Peças'),
('mesa-2026-jogo-americano-terracota-6-pecas','uploads/mesa-galerias-041-jogo-americano-terracota-6-pecas-ambientacao.webp','ambientacao','Jogo Americano Terracota 6 Peças'),
('mesa-2026-toalha-de-mesa-essencia-oliva','uploads/mesa-galerias-041-toalha-de-mesa-essencia-oliva-ambientacao.webp','ambientacao','Toalha de Mesa Essência Oliva'),
('mesa-2026-toalha-de-mesa-natural-areia','uploads/mesa-galerias-041-toalha-de-mesa-natural-areia-objetiva.webp','objetiva','Toalha de Mesa Natural Areia'),
('mesa-2026-toalha-de-mesa-terracota','uploads/mesa-galerias-041-toalha-de-mesa-terracota-ambientacao.webp','ambientacao','Toalha de Mesa Terracota')
)
INSERT INTO catalog_mesa_gallery_000041(product_id,import_key,new_path,mode,product_name,before_images)
SELECT p.id,a.import_key,a.new_path,a.mode,p.name,
 (SELECT jsonb_agg(to_jsonb(i) ORDER BY id) FROM product_images i WHERE i.product_id=p.id)
FROM planned a JOIN products p ON p.measurements->>'catalog_import_key'=a.import_key AND p.name=a.product_name
JOIN product_types t ON t.id=p.product_type_id AND t.name='Mesa'
WHERE EXISTS(SELECT 1 FROM product_images i WHERE i.product_id=p.id AND i.variant_id IS NULL AND i.image_path='uploads/'||a.import_key||'-01.png')
AND EXISTS(SELECT 1 FROM product_images i WHERE i.product_id=p.id AND i.variant_id IS NULL AND i.image_path='uploads/'||a.import_key||'-03-trama.png')
AND (a.mode='ambientacao' OR EXISTS(SELECT 1 FROM product_images i WHERE i.product_id=p.id AND i.variant_id IS NULL AND i.image_path='uploads/'||a.import_key||'-02.png'))
AND NOT EXISTS(SELECT 1 FROM product_images i WHERE i.product_id=p.id AND i.image_path=a.new_path);
DO $$
BEGIN
 IF (SELECT count(*) FROM catalog_mesa_gallery_000041) NOT IN (0,10) THEN
  RAISE EXCEPTION 'Galerias de Mesa divergem da auditoria; nenhuma alteração aplicada.';
 END IF;
END $$;
UPDATE product_images i SET is_primary=false,alt_text=j.product_name||' - apresentação objetiva do produto'
FROM catalog_mesa_gallery_000041 j
WHERE j.mode='ambientacao' AND i.product_id=j.product_id AND i.variant_id IS NULL
AND i.image_path='uploads/'||j.import_key||'-01.png';
UPDATE product_images i SET image_path=j.new_path,alt_text=j.product_name||' - apresentação objetiva do produto'
FROM catalog_mesa_gallery_000041 j
WHERE j.mode='objetiva' AND i.product_id=j.product_id AND i.variant_id IS NULL
AND i.image_path='uploads/'||j.import_key||'-02.png';
INSERT INTO product_images(product_id,image_path,is_primary,alt_text)
SELECT product_id,new_path,true,product_name||' - ambientação com o produto em uso'
FROM catalog_mesa_gallery_000041 WHERE mode='ambientacao' ORDER BY import_key;
UPDATE catalog_mesa_gallery_000041 j SET after_images=(
 SELECT jsonb_agg(to_jsonb(i) ORDER BY id) FROM product_images i WHERE i.product_id=j.product_id
);
DO $$
BEGIN
 IF EXISTS(SELECT 1 FROM catalog_mesa_gallery_000041 j
 WHERE (SELECT count(*) FROM product_images i WHERE i.product_id=j.product_id)<>3
 OR (SELECT count(*) FROM product_images i WHERE i.product_id=j.product_id AND i.is_primary)<>1) THEN
  RAISE EXCEPTION 'Quantidade de imagens ou capa inválida; operação revertida.';
 END IF;
END $$;
COMMIT;
