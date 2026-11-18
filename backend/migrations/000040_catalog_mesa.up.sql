BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE products,product_types,product_images,product_variants IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE catalog_mesa_category_000040(category_id INTEGER PRIMARY KEY REFERENCES product_types(id) ON DELETE CASCADE);
CREATE TABLE catalog_mesa_seed_000040(
 product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
 import_key TEXT NOT NULL UNIQUE, product_snapshot JSONB, images_snapshot JSONB
);
DO $$ BEGIN
 IF NOT EXISTS(SELECT 1 FROM brands WHERE name='Box Enxovais') THEN
  RAISE EXCEPTION 'Marca Box Enxovais ausente; cadastro interrompido.';
 END IF;
END $$;
WITH created AS (
 INSERT INTO product_types(name) SELECT 'Mesa' WHERE NOT EXISTS(SELECT 1 FROM product_types WHERE name='Mesa') RETURNING id
) INSERT INTO catalog_mesa_category_000040 SELECT id FROM created;
WITH approved(name,description,summary,care,attributes,price,quantity) AS (VALUES
('Toalha de Mesa Natural Areia','Toalha de Mesa Natural Areia traz a textura natural do tecido misto de algodão e linho para os encontros à mesa. A cor areia permite coordenar a peça com outros itens da coleção Natural Areia. Dimensões: 140 × 220 cm. Acompanha 1 toalha de mesa. Pratos, guardanapos, vasos e demais objetos de ambientação não acompanham o produto.','Trama de algodão e linho em areia, com bainha costurada. 1 toalha de mesa.','Lavar em ciclo delicado a até 30 °C, com cores semelhantes
Não usar alvejante
Não deixar de molho
Secar à sombra, sem torcer
Não usar secadora
Passar pelo avesso em temperatura média, até 150 °C
Não lavar a seco','{"Tipo": "Toalhas de mesa", "Cor": "Areia", "Coleção": "Natural Areia", "collection_slug": "mesa-natural-areia", "Dimensões": "140 × 220 cm", "Material": "Tecido misto de algodão e linho", "Composição têxtil": "55% algodão e 45% linho", "Acabamento": "Bainha costurada", "Conteúdo": "1 toalha de mesa", "catalog_import_key": "mesa-2026-toalha-de-mesa-natural-areia", "catalog_slug": "toalha-de-mesa-natural-areia"}',14990::numeric/100,10),
('Toalha de Mesa Essência Oliva','Toalha de Mesa Essência Oliva traz a textura natural do tecido misto de algodão e linho para os encontros à mesa. A cor verde oliva permite coordenar a peça com outros itens da coleção Essência Oliva. Dimensões: 140 × 220 cm. Acompanha 1 toalha de mesa. Pratos, guardanapos, vasos e demais objetos de ambientação não acompanham o produto.','Trama de algodão e linho em verde oliva, com bainha costurada. 1 toalha de mesa.','Lavar em ciclo delicado a até 30 °C, com cores semelhantes
Não usar alvejante
Não deixar de molho
Secar à sombra, sem torcer
Não usar secadora
Passar pelo avesso em temperatura média, até 150 °C
Não lavar a seco','{"Tipo": "Toalhas de mesa", "Cor": "Verde oliva", "Coleção": "Essência Oliva", "collection_slug": "mesa-essencia-oliva", "Dimensões": "140 × 220 cm", "Material": "Tecido misto de algodão e linho", "Composição têxtil": "55% algodão e 45% linho", "Acabamento": "Bainha costurada", "Conteúdo": "1 toalha de mesa", "catalog_import_key": "mesa-2026-toalha-de-mesa-essencia-oliva", "catalog_slug": "toalha-de-mesa-essencia-oliva"}',15990::numeric/100,8),
('Toalha de Mesa Terracota','Toalha de Mesa Terracota traz a textura natural do tecido misto de algodão e linho para os encontros à mesa. A cor terracota permite coordenar a peça com outros itens da coleção Terracota. Dimensões: 140 × 220 cm. Acompanha 1 toalha de mesa. Pratos, guardanapos, vasos e demais objetos de ambientação não acompanham o produto.','Trama de algodão e linho em terracota, com bainha costurada. 1 toalha de mesa.','Lavar em ciclo delicado a até 30 °C, com cores semelhantes
Não usar alvejante
Não deixar de molho
Secar à sombra, sem torcer
Não usar secadora
Passar pelo avesso em temperatura média, até 150 °C
Não lavar a seco','{"Tipo": "Toalhas de mesa", "Cor": "Terracota", "Coleção": "Terracota", "collection_slug": "mesa-terracota", "Dimensões": "140 × 220 cm", "Material": "Tecido misto de algodão e linho", "Composição têxtil": "55% algodão e 45% linho", "Acabamento": "Bainha costurada", "Conteúdo": "1 toalha de mesa", "catalog_import_key": "mesa-2026-toalha-de-mesa-terracota", "catalog_slug": "toalha-de-mesa-terracota"}',15990::numeric/100,8),
('Caminho de Mesa Essência Oliva','Caminho de Mesa Essência Oliva traz a textura natural do tecido misto de algodão e linho para os encontros à mesa. A cor verde oliva permite coordenar a peça com outros itens da coleção Essência Oliva. Dimensões: 40 × 180 cm. Acompanha 1 caminho de mesa. Pratos, guardanapos, vasos e demais objetos de ambientação não acompanham o produto.','Trama de algodão e linho em verde oliva, com bainha costurada. 1 caminho de mesa.','Lavar em ciclo delicado a até 30 °C, com cores semelhantes
Não usar alvejante
Não deixar de molho
Secar à sombra, sem torcer
Não usar secadora
Passar pelo avesso em temperatura média, até 150 °C
Não lavar a seco','{"Tipo": "Caminhos de mesa", "Cor": "Verde oliva", "Coleção": "Essência Oliva", "collection_slug": "mesa-essencia-oliva", "Dimensões": "40 × 180 cm", "Material": "Tecido misto de algodão e linho", "Composição têxtil": "55% algodão e 45% linho", "Acabamento": "Bainha costurada", "Conteúdo": "1 caminho de mesa", "catalog_import_key": "mesa-2026-caminho-de-mesa-essencia-oliva", "catalog_slug": "caminho-de-mesa-essencia-oliva"}',7990::numeric/100,12),
('Caminho de Mesa Natural Areia','Caminho de Mesa Natural Areia traz a textura natural do tecido misto de algodão e linho para os encontros à mesa. A cor areia permite coordenar a peça com outros itens da coleção Natural Areia. Dimensões: 40 × 180 cm. Acompanha 1 caminho de mesa. Pratos, guardanapos, vasos e demais objetos de ambientação não acompanham o produto.','Trama de algodão e linho em areia, com bainha costurada. 1 caminho de mesa.','Lavar em ciclo delicado a até 30 °C, com cores semelhantes
Não usar alvejante
Não deixar de molho
Secar à sombra, sem torcer
Não usar secadora
Passar pelo avesso em temperatura média, até 150 °C
Não lavar a seco','{"Tipo": "Caminhos de mesa", "Cor": "Areia", "Coleção": "Natural Areia", "collection_slug": "mesa-natural-areia", "Dimensões": "40 × 180 cm", "Material": "Tecido misto de algodão e linho", "Composição têxtil": "55% algodão e 45% linho", "Acabamento": "Bainha costurada", "Conteúdo": "1 caminho de mesa", "catalog_import_key": "mesa-2026-caminho-de-mesa-natural-areia", "catalog_slug": "caminho-de-mesa-natural-areia"}',7990::numeric/100,12),
('Caminho de Mesa Terracota','Caminho de Mesa Terracota traz a textura natural do tecido misto de algodão e linho para os encontros à mesa. A cor terracota permite coordenar a peça com outros itens da coleção Terracota. Dimensões: 40 × 180 cm. Acompanha 1 caminho de mesa. Pratos, guardanapos, vasos e demais objetos de ambientação não acompanham o produto.','Trama de algodão e linho em terracota, com bainha costurada. 1 caminho de mesa.','Lavar em ciclo delicado a até 30 °C, com cores semelhantes
Não usar alvejante
Não deixar de molho
Secar à sombra, sem torcer
Não usar secadora
Passar pelo avesso em temperatura média, até 150 °C
Não lavar a seco','{"Tipo": "Caminhos de mesa", "Cor": "Terracota", "Coleção": "Terracota", "collection_slug": "mesa-terracota", "Dimensões": "40 × 180 cm", "Material": "Tecido misto de algodão e linho", "Composição têxtil": "55% algodão e 45% linho", "Acabamento": "Bainha costurada", "Conteúdo": "1 caminho de mesa", "catalog_import_key": "mesa-2026-caminho-de-mesa-terracota", "catalog_slug": "caminho-de-mesa-terracota"}',8490::numeric/100,10),
('Jogo Americano Terracota 4 Peças','Jogo Americano Terracota 4 Peças traz a textura natural do tecido misto de algodão e linho para os encontros à mesa. A cor terracota permite coordenar a peça com outros itens da coleção Terracota. Dimensões: 35 × 45 cm por peça. Acompanha 4 jogos americanos. Pratos, guardanapos, vasos e demais objetos de ambientação não acompanham o produto.','Trama de algodão e linho em terracota, com bainha costurada. 4 jogos americanos.','Lavar em ciclo delicado a até 30 °C, com cores semelhantes
Não usar alvejante
Não deixar de molho
Secar à sombra, sem torcer
Não usar secadora
Passar pelo avesso em temperatura média, até 150 °C
Não lavar a seco','{"Tipo": "Jogos americanos", "Cor": "Terracota", "Coleção": "Terracota", "collection_slug": "mesa-terracota", "Dimensões": "35 × 45 cm por peça", "Material": "Tecido misto de algodão e linho", "Composição têxtil": "55% algodão e 45% linho", "Acabamento": "Bainha costurada", "Conteúdo": "4 jogos americanos", "catalog_import_key": "mesa-2026-jogo-americano-terracota-4-pecas", "catalog_slug": "jogo-americano-terracota-4-pecas"}',9990::numeric/100,12),
('Jogo Americano Essência Oliva 4 Peças','Jogo Americano Essência Oliva 4 Peças traz a textura natural do tecido misto de algodão e linho para os encontros à mesa. A cor verde oliva permite coordenar a peça com outros itens da coleção Essência Oliva. Dimensões: 35 × 45 cm por peça. Acompanha 4 jogos americanos. Pratos, guardanapos, vasos e demais objetos de ambientação não acompanham o produto.','Trama de algodão e linho em verde oliva, com bainha costurada. 4 jogos americanos.','Lavar em ciclo delicado a até 30 °C, com cores semelhantes
Não usar alvejante
Não deixar de molho
Secar à sombra, sem torcer
Não usar secadora
Passar pelo avesso em temperatura média, até 150 °C
Não lavar a seco','{"Tipo": "Jogos americanos", "Cor": "Verde oliva", "Coleção": "Essência Oliva", "collection_slug": "mesa-essencia-oliva", "Dimensões": "35 × 45 cm por peça", "Material": "Tecido misto de algodão e linho", "Composição têxtil": "55% algodão e 45% linho", "Acabamento": "Bainha costurada", "Conteúdo": "4 jogos americanos", "catalog_import_key": "mesa-2026-jogo-americano-essencia-oliva-4-pecas", "catalog_slug": "jogo-americano-essencia-oliva-4-pecas"}',9990::numeric/100,12),
('Jogo Americano Natural Areia 6 Peças','Jogo Americano Natural Areia 6 Peças traz a textura natural do tecido misto de algodão e linho para os encontros à mesa. A cor areia permite coordenar a peça com outros itens da coleção Natural Areia. Dimensões: 35 × 45 cm por peça. Acompanha 6 jogos americanos. Pratos, guardanapos, vasos e demais objetos de ambientação não acompanham o produto.','Trama de algodão e linho em areia, com bainha costurada. 6 jogos americanos.','Lavar em ciclo delicado a até 30 °C, com cores semelhantes
Não usar alvejante
Não deixar de molho
Secar à sombra, sem torcer
Não usar secadora
Passar pelo avesso em temperatura média, até 150 °C
Não lavar a seco','{"Tipo": "Jogos americanos", "Cor": "Areia", "Coleção": "Natural Areia", "collection_slug": "mesa-natural-areia", "Dimensões": "35 × 45 cm por peça", "Material": "Tecido misto de algodão e linho", "Composição têxtil": "55% algodão e 45% linho", "Acabamento": "Bainha costurada", "Conteúdo": "6 jogos americanos", "catalog_import_key": "mesa-2026-jogo-americano-natural-areia-6-pecas", "catalog_slug": "jogo-americano-natural-areia-6-pecas"}',13990::numeric/100,10),
('Jogo Americano Terracota 6 Peças','Jogo Americano Terracota 6 Peças traz a textura natural do tecido misto de algodão e linho para os encontros à mesa. A cor terracota permite coordenar a peça com outros itens da coleção Terracota. Dimensões: 35 × 45 cm por peça. Acompanha 6 jogos americanos. Pratos, guardanapos, vasos e demais objetos de ambientação não acompanham o produto.','Trama de algodão e linho em terracota, com bainha costurada. 6 jogos americanos.','Lavar em ciclo delicado a até 30 °C, com cores semelhantes
Não usar alvejante
Não deixar de molho
Secar à sombra, sem torcer
Não usar secadora
Passar pelo avesso em temperatura média, até 150 °C
Não lavar a seco','{"Tipo": "Jogos americanos", "Cor": "Terracota", "Coleção": "Terracota", "collection_slug": "mesa-terracota", "Dimensões": "35 × 45 cm por peça", "Material": "Tecido misto de algodão e linho", "Composição têxtil": "55% algodão e 45% linho", "Acabamento": "Bainha costurada", "Conteúdo": "6 jogos americanos", "catalog_import_key": "mesa-2026-jogo-americano-terracota-6-pecas", "catalog_slug": "jogo-americano-terracota-6-pecas"}',13990::numeric/100,10)
), inserted AS (
 INSERT INTO products(name,description,purchase_summary,care_instructions,measurements,price,quantity,brand_id,product_type_id,status)
 SELECT a.name,a.description,a.summary,a.care,a.attributes::jsonb,a.price,a.quantity,b.id,t.id,'active'
 FROM approved a CROSS JOIN brands b CROSS JOIN product_types t
 WHERE b.name='Box Enxovais' AND t.name='Mesa'
 AND NOT EXISTS(SELECT 1 FROM products p WHERE lower(btrim(p.name))=lower(a.name)
 OR p.measurements->>'catalog_import_key'=a.attributes::jsonb->>'catalog_import_key'
 OR p.measurements->>'catalog_slug'=a.attributes::jsonb->>'catalog_slug')
 ORDER BY a.name RETURNING id,measurements->>'catalog_import_key' AS import_key
) INSERT INTO catalog_mesa_seed_000040(product_id,import_key) SELECT id,import_key FROM inserted;
INSERT INTO product_images(product_id,image_path,is_primary,alt_text)
SELECT j.product_id,v.path,v.position=1,v.alt FROM catalog_mesa_seed_000040 j
JOIN (VALUES
('mesa-2026-toalha-de-mesa-natural-areia','uploads/mesa-2026-toalha-de-mesa-natural-areia-01.png',1,'Toalha de Mesa Natural Areia — vista principal'),
('mesa-2026-toalha-de-mesa-natural-areia','uploads/mesa-2026-toalha-de-mesa-natural-areia-02.png',2,'Toalha de Mesa Natural Areia — segunda vista'),
('mesa-2026-toalha-de-mesa-essencia-oliva','uploads/mesa-2026-toalha-de-mesa-essencia-oliva-01.png',1,'Toalha de Mesa Essência Oliva — vista principal'),
('mesa-2026-toalha-de-mesa-terracota','uploads/mesa-2026-toalha-de-mesa-terracota-01.png',1,'Toalha de Mesa Terracota — vista principal'),
('mesa-2026-caminho-de-mesa-essencia-oliva','uploads/mesa-2026-caminho-de-mesa-essencia-oliva-01.png',1,'Caminho de Mesa Essência Oliva — vista principal'),
('mesa-2026-caminho-de-mesa-essencia-oliva','uploads/mesa-2026-caminho-de-mesa-essencia-oliva-02.png',2,'Caminho de Mesa Essência Oliva — segunda vista'),
('mesa-2026-caminho-de-mesa-natural-areia','uploads/mesa-2026-caminho-de-mesa-natural-areia-01.png',1,'Caminho de Mesa Natural Areia — vista principal'),
('mesa-2026-caminho-de-mesa-terracota','uploads/mesa-2026-caminho-de-mesa-terracota-01.png',1,'Caminho de Mesa Terracota — vista principal'),
('mesa-2026-jogo-americano-terracota-4-pecas','uploads/mesa-2026-jogo-americano-terracota-4-pecas-01.png',1,'Jogo Americano Terracota 4 Peças — vista principal'),
('mesa-2026-jogo-americano-terracota-4-pecas','uploads/mesa-2026-jogo-americano-terracota-4-pecas-02.png',2,'Jogo Americano Terracota 4 Peças — segunda vista'),
('mesa-2026-jogo-americano-essencia-oliva-4-pecas','uploads/mesa-2026-jogo-americano-essencia-oliva-4-pecas-01.png',1,'Jogo Americano Essência Oliva 4 Peças — vista principal'),
('mesa-2026-jogo-americano-natural-areia-6-pecas','uploads/mesa-2026-jogo-americano-natural-areia-6-pecas-01.png',1,'Jogo Americano Natural Areia 6 Peças — vista principal'),
('mesa-2026-jogo-americano-terracota-6-pecas','uploads/mesa-2026-jogo-americano-terracota-6-pecas-01.png',1,'Jogo Americano Terracota 6 Peças — vista principal')
) v(key,path,position,alt) ON v.key=j.import_key ORDER BY j.product_id,v.position;
UPDATE catalog_mesa_seed_000040 j SET product_snapshot=to_jsonb(p),
 images_snapshot=(SELECT jsonb_agg(to_jsonb(i) ORDER BY id) FROM product_images i WHERE i.product_id=p.id)
FROM products p WHERE p.id=j.product_id;
COMMIT;
