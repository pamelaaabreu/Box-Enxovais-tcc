BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE products,product_types,product_images,product_variants IN SHARE ROW EXCLUSIVE MODE;
CREATE TABLE catalog_cushion_category_000039(category_id INTEGER PRIMARY KEY REFERENCES product_types(id) ON DELETE CASCADE);
CREATE TABLE catalog_cushion_seed_000039(
 product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
 import_key TEXT NOT NULL UNIQUE,
 product_snapshot JSONB,
 images_snapshot JSONB
);
DO $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM brands WHERE name='Box Enxovais') THEN
  RAISE EXCEPTION 'Marca Box Enxovais ausente; cadastro interrompido.';
 END IF;
END $$;
WITH created AS (
 INSERT INTO product_types(name) SELECT 'Almofadas' WHERE NOT EXISTS(SELECT 1 FROM product_types WHERE name='Almofadas')
 RETURNING id
) INSERT INTO catalog_cushion_category_000039 SELECT id FROM created;
WITH approved(slug,name,description,summary,care,attributes,price,quantity) AS (
 VALUES ('capa-tricot-losangos-areia','Capa de Almofada Tricô Losangos Areia','A capa Losangos Areia combina trama de tricô e desenho geométrico em relevo. O formato quadrado de 50 × 50 cm valoriza o trabalho da malha e permite combinar cores sem sobrecarregar a decoração. Fechamento com zíper discreto na costura inferior. Acompanha somente 1 capa de almofada; enchimento não incluso.','Tricô em areia com losangos em relevo para compor camas e sofás com textura.','Lavar à mão em água fria, sem torcer
Não usar alvejante
Secar na horizontal, à sombra
Não usar secadora
Não passar a ferro
Não lavar a seco','{"Tipo": "Tricô", "Cor": "Areia", "Tamanho": "50 × 50 cm", "Dimensões": "50 × 50 cm", "Material": "Tricô", "Composição têxtil": "100% acrílico", "Acabamento": "tricô com relevo em losangos", "Fechamento": "Zíper discreto na costura inferior", "Conteúdo": "1 capa de almofada; enchimento não incluso", "Coleção": "Tricô Losangos", "collection_slug": "almofadas-tricot-losangos", "catalog_import_key": "almofadas-2026-capa-tricot-losangos-areia", "coordination_colors": "areia;bege;off-white;creme", "Origem dos dados": "Catálogo demonstrativo do TCC; composição e cuidados definidos por modelo"}',6990::numeric/100,8),
('capa-tricot-losangos-oliva','Capa de Almofada Tricô Losangos Oliva','A capa Losangos Oliva combina trama de tricô e desenho geométrico em relevo. O formato quadrado de 50 × 50 cm valoriza o trabalho da malha e permite combinar cores sem sobrecarregar a decoração. Fechamento com zíper discreto na costura inferior. Acompanha somente 1 capa de almofada; enchimento não incluso.','Tricô em oliva com losangos em relevo para compor camas e sofás com textura.','Lavar à mão em água fria, sem torcer
Não usar alvejante
Secar na horizontal, à sombra
Não usar secadora
Não passar a ferro
Não lavar a seco','{"Tipo": "Tricô", "Cor": "Oliva", "Tamanho": "50 × 50 cm", "Dimensões": "50 × 50 cm", "Material": "Tricô", "Composição têxtil": "100% acrílico", "Acabamento": "tricô com relevo em losangos", "Fechamento": "Zíper discreto na costura inferior", "Conteúdo": "1 capa de almofada; enchimento não incluso", "Coleção": "Tricô Losangos", "collection_slug": "almofadas-tricot-losangos", "catalog_import_key": "almofadas-2026-capa-tricot-losangos-oliva", "coordination_colors": "verde oliva;verde botânico;verde musgo", "Origem dos dados": "Catálogo demonstrativo do TCC; composição e cuidados definidos por modelo"}',6990::numeric/100,8),
('capa-tricot-losangos-terracota','Capa de Almofada Tricô Losangos Terracota','A capa Losangos Terracota combina trama de tricô e desenho geométrico em relevo. O formato quadrado de 50 × 50 cm valoriza o trabalho da malha e permite combinar cores sem sobrecarregar a decoração. Fechamento com zíper discreto na costura inferior. Acompanha somente 1 capa de almofada; enchimento não incluso.','Tricô em terracota com losangos em relevo para compor camas e sofás com textura.','Lavar à mão em água fria, sem torcer
Não usar alvejante
Secar na horizontal, à sombra
Não usar secadora
Não passar a ferro
Não lavar a seco','{"Tipo": "Tricô", "Cor": "Terracota", "Tamanho": "50 × 50 cm", "Dimensões": "50 × 50 cm", "Material": "Tricô", "Composição têxtil": "100% acrílico", "Acabamento": "tricô com relevo em losangos", "Fechamento": "Zíper discreto na costura inferior", "Conteúdo": "1 capa de almofada; enchimento não incluso", "Coleção": "Tricô Losangos", "collection_slug": "almofadas-tricot-losangos", "catalog_import_key": "almofadas-2026-capa-tricot-losangos-terracota", "coordination_colors": "terracota;vermelho", "Origem dos dados": "Catálogo demonstrativo do TCC; composição e cuidados definidos por modelo"}',6990::numeric/100,8),
('capa-trelica-nude','Capa de Almofada Treliça Nude','A Treliça Nude traz faixas diagonais em relevo sobre uma superfície aveludada. A proporção de 30 × 50 cm cria um ponto de apoio decorativo à frente de almofadas maiores, com acabamento delicado e cor coordenável. Fechamento com zíper discreto na costura inferior. Acompanha somente 1 capa de almofada; enchimento não incluso.','Capa retangular nude com toque aveludado e treliça em relevo.','Lavar à mão em água fria, sem esfregar o relevo
Não usar alvejante
Secar à sombra
Não usar secadora
Não passar a ferro sobre o relevo
Não lavar a seco','{"Tipo": "Retangulares", "Cor": "Nude", "Tamanho": "30 × 50 cm", "Dimensões": "30 × 50 cm", "Material": "Tecido aveludado", "Composição têxtil": "100% poliéster", "Acabamento": "tecido aveludado com faixas geométricas em relevo", "Fechamento": "Zíper discreto na costura inferior", "Conteúdo": "1 capa de almofada; enchimento não incluso", "Coleção": "Treliça Elegance", "collection_slug": "almofadas-trelica-elegance", "catalog_import_key": "almofadas-2026-capa-trelica-nude", "coordination_colors": "rosa nude;blush;rosé", "Origem dos dados": "Catálogo demonstrativo do TCC; composição e cuidados definidos por modelo"}',5990::numeric/100,8),
('capa-trelica-salvia','Capa de Almofada Treliça Sálvia','A Treliça Verde Sálvia traz faixas diagonais em relevo sobre uma superfície aveludada. A proporção de 30 × 50 cm cria um ponto de apoio decorativo à frente de almofadas maiores, com acabamento delicado e cor coordenável. Fechamento com zíper discreto na costura inferior. Acompanha somente 1 capa de almofada; enchimento não incluso.','Capa retangular verde sálvia com toque aveludado e treliça em relevo.','Lavar à mão em água fria, sem esfregar o relevo
Não usar alvejante
Secar à sombra
Não usar secadora
Não passar a ferro sobre o relevo
Não lavar a seco','{"Tipo": "Retangulares", "Cor": "Verde Sálvia", "Tamanho": "30 × 50 cm", "Dimensões": "30 × 50 cm", "Material": "Tecido aveludado", "Composição têxtil": "100% poliéster", "Acabamento": "tecido aveludado com faixas geométricas em relevo", "Fechamento": "Zíper discreto na costura inferior", "Conteúdo": "1 capa de almofada; enchimento não incluso", "Coleção": "Treliça Elegance", "collection_slug": "almofadas-trelica-elegance", "catalog_import_key": "almofadas-2026-capa-trelica-salvia", "coordination_colors": "verde sálvia;verde suave", "Origem dos dados": "Catálogo demonstrativo do TCC; composição e cuidados definidos por modelo"}',5990::numeric/100,8),
('capa-trelica-creme','Capa de Almofada Treliça Creme','A Treliça Creme traz faixas diagonais em relevo sobre uma superfície aveludada. A proporção de 30 × 50 cm cria um ponto de apoio decorativo à frente de almofadas maiores, com acabamento delicado e cor coordenável. Fechamento com zíper discreto na costura inferior. Acompanha somente 1 capa de almofada; enchimento não incluso.','Capa retangular creme com toque aveludado e treliça em relevo.','Lavar à mão em água fria, sem esfregar o relevo
Não usar alvejante
Secar à sombra
Não usar secadora
Não passar a ferro sobre o relevo
Não lavar a seco','{"Tipo": "Retangulares", "Cor": "Creme", "Tamanho": "30 × 50 cm", "Dimensões": "30 × 50 cm", "Material": "Tecido aveludado", "Composição têxtil": "100% poliéster", "Acabamento": "tecido aveludado com faixas geométricas em relevo", "Fechamento": "Zíper discreto na costura inferior", "Conteúdo": "1 capa de almofada; enchimento não incluso", "Coleção": "Treliça Elegance", "collection_slug": "almofadas-trelica-elegance", "catalog_import_key": "almofadas-2026-capa-trelica-creme", "coordination_colors": "creme;off-white;areia", "Origem dos dados": "Catálogo demonstrativo do TCC; composição e cuidados definidos por modelo"}',5990::numeric/100,8),
('capa-tricot-canelado-azul','Capa de Almofada Tricô Canelado Azul Serenidade','A Canelado Azul Serenidade destaca o ritmo das faixas horizontais em uma capa quadrada de 45 × 45 cm. A trama aparente acrescenta textura a ambientes claros e combina com tecidos lisos na cama ou no sofá. Fechamento com zíper discreto na costura inferior. Acompanha somente 1 capa de almofada; enchimento não incluso.','Tricô canelado em azul serenidade, com faixas horizontais e textura acolhedora.','Lavar à mão em água fria, sem torcer
Não usar alvejante
Secar na horizontal, à sombra
Não usar secadora
Não passar a ferro
Não lavar a seco','{"Tipo": "Tricô", "Cor": "Azul Serenidade", "Tamanho": "45 × 45 cm", "Dimensões": "45 × 45 cm", "Material": "Tricô", "Composição têxtil": "100% acrílico", "Acabamento": "tricô com faixas caneladas horizontais", "Fechamento": "Zíper discreto na costura inferior", "Conteúdo": "1 capa de almofada; enchimento não incluso", "Coleção": "Tricô Canelado", "collection_slug": "almofadas-tricot-canelado", "catalog_import_key": "almofadas-2026-capa-tricot-canelado-azul", "coordination_colors": "azul;azul claro;azul acinzentado", "Origem dos dados": "Catálogo demonstrativo do TCC; composição e cuidados definidos por modelo"}',6490::numeric/100,8),
('capa-tricot-canelado-mostarda','Capa de Almofada Tricô Canelado Mostarda','A Canelado Mostarda destaca o ritmo das faixas horizontais em uma capa quadrada de 45 × 45 cm. A trama aparente acrescenta textura a ambientes claros e combina com tecidos lisos na cama ou no sofá. Fechamento com zíper discreto na costura inferior. Acompanha somente 1 capa de almofada; enchimento não incluso.','Tricô canelado em mostarda, com faixas horizontais e textura acolhedora.','Lavar à mão em água fria, sem torcer
Não usar alvejante
Secar na horizontal, à sombra
Não usar secadora
Não passar a ferro
Não lavar a seco','{"Tipo": "Tricô", "Cor": "Mostarda", "Tamanho": "45 × 45 cm", "Dimensões": "45 × 45 cm", "Material": "Tricô", "Composição têxtil": "100% acrílico", "Acabamento": "tricô com faixas caneladas horizontais", "Fechamento": "Zíper discreto na costura inferior", "Conteúdo": "1 capa de almofada; enchimento não incluso", "Coleção": "Tricô Canelado", "collection_slug": "almofadas-tricot-canelado", "catalog_import_key": "almofadas-2026-capa-tricot-canelado-mostarda", "coordination_colors": "mostarda;amarelo suave", "Origem dos dados": "Catálogo demonstrativo do TCC; composição e cuidados definidos por modelo"}',6490::numeric/100,8)
), inserted AS (
 INSERT INTO products(name,description,purchase_summary,care_instructions,measurements,price,quantity,brand_id,product_type_id,status)
 SELECT a.name,a.description,a.summary,a.care,a.attributes::jsonb,a.price,a.quantity,b.id,t.id,'active'
 FROM approved a CROSS JOIN brands b CROSS JOIN product_types t
 WHERE b.name='Box Enxovais' AND t.name='Almofadas'
 AND NOT EXISTS(SELECT 1 FROM products p WHERE p.name=a.name OR p.measurements->>'catalog_import_key'=a.attributes::jsonb->>'catalog_import_key' OR p.measurements->>'catalog_slug'=a.slug)
 ORDER BY a.slug
 RETURNING id,measurements->>'catalog_import_key' AS import_key
) INSERT INTO catalog_cushion_seed_000039(product_id,import_key) SELECT id,import_key FROM inserted;
INSERT INTO product_images(product_id,image_path,is_primary,alt_text)
SELECT j.product_id,'uploads/'||j.import_key||'-'||v.suffix||CASE WHEN v.position=1 THEN '.png' ELSE '.webp' END,
 v.position=1,v.alt
FROM catalog_cushion_seed_000039 j
CROSS JOIN (VALUES
 (1,'01-capa','Capa de almofada apresentada com apoio; enchimento não incluso'),
 (2,'02-lateral','Vista lateral da capa de almofada'),
 (3,'03-trama','Detalhe da trama e acabamento da capa'),
 (4,'04-fechamento','Verso e zíper da capa de almofada'),
 (5,'05-sem-enchimento','Capa de almofada vazia, sem enchimento')
) v(position,suffix,alt)
ORDER BY j.product_id,v.position;
UPDATE catalog_cushion_seed_000039 j SET product_snapshot=to_jsonb(p),
 images_snapshot=(SELECT jsonb_agg(to_jsonb(i) ORDER BY id) FROM product_images i WHERE i.product_id=p.id)
FROM products p WHERE p.id=j.product_id;
COMMIT;
