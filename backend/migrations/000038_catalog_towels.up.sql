BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE products,product_types,product_variants,product_images IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE catalog_towel_category_000038 (
 category_id INTEGER PRIMARY KEY REFERENCES product_types(id) ON DELETE CASCADE
);
CREATE TABLE catalog_towel_seed_000038 (
 product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
 import_key TEXT NOT NULL UNIQUE,
 product_snapshot JSONB,
 images_snapshot JSONB
);
CREATE TABLE catalog_towel_legacy_000038 (
 product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
 previous_type INTEGER NOT NULL,
 revised_type INTEGER NOT NULL
);

WITH created AS (
 INSERT INTO product_types(name)
 SELECT 'Toalhas' WHERE NOT EXISTS(SELECT 1 FROM product_types WHERE name='Toalhas')
 RETURNING id
)
INSERT INTO catalog_towel_category_000038 SELECT id FROM created;

INSERT INTO catalog_towel_legacy_000038
SELECT p.id,p.product_type_id,t.id
FROM products p
JOIN product_types old ON old.id=p.product_type_id AND old.name='Cama / Colchas e cobre-leitos'
CROSS JOIN product_types t
WHERE p.name='Toalha de Banho Premium 100% Algodão' AND p.status='inactive' AND t.name='Toalhas';
UPDATE products p SET product_type_id=j.revised_type
FROM catalog_towel_legacy_000038 j WHERE p.id=j.product_id;

WITH approved(sku,name,description,summary,care,attributes,price,quantity) AS (
 VALUES ('01', 'Toalha de Banho Essência Areia 100% Algodão', 'A Essência Areia traz felpa confortável e tonalidade discreta para compor banheiros claros e elegantes.', 'Toalha de banho 100% algodão com toque macio e tonalidade areia neutra.', 'Lavar à máquina a até 40 °C, em ciclo adequado
Não usar alvejante
Secar à sombra ou conforme etiqueta
Passar em temperatura baixa quando necessário', '{"Tipo":"Toalha de banho","Cor":"Areia","Material":"100% algodão","Composição têxtil":"100% algodão","Gramatura":"450 g/m²","Dimensões":"70 × 140 cm","Conteúdo":"1 toalha de banho","Coleção":"Essência","collection_slug":"toalhas-essencia","catalog_import_key":"toalhas-2026-01","Origem dos dados":"Catálogo demonstrativo do TCC","Tamanho":"70 × 140 cm","Medida da toalha de banho":"70 × 140 cm"}', 7990::numeric/100, 12),
        ('02', 'Jogo de Toalhas Spa Terracota 5 Peças', 'O Spa Terracota reúne toalhas coordenadas para banho, rosto e piso, com acabamento discreto e visual acolhedor.', 'Jogo de toalhas terracota com tonalidade quente e toque confortável.', 'Lavar à máquina a até 40 °C, em ciclo adequado
Não usar alvejante
Secar à sombra ou conforme etiqueta
Passar em temperatura baixa quando necessário', '{"Tipo":"Jogo de toalhas","Cor":"Terracota","Material":"100% algodão","Composição têxtil":"100% algodão","Gramatura":"450 g/m²","Dimensões":"2 banho: 70 × 140 cm; 2 rosto: 50 × 80 cm; 1 piso: 45 × 70 cm","Conteúdo":"2 toalhas de banho; 2 toalhas de rosto; 1 toalha de piso","Coleção":"Spa","collection_slug":"toalhas-spa","catalog_import_key":"toalhas-2026-02","Origem dos dados":"Catálogo demonstrativo do TCC","Medida da toalha de banho":"70 × 140 cm","Medida da toalha de rosto":"50 × 80 cm","Medida da toalha de piso":"45 × 70 cm"}', 18990::numeric/100, 8),
        ('03', 'Jogo de Toalhas Lavanda 4 Peças', 'O Jogo Lavanda equilibra conforto e cor delicada, criando uma composição leve para banheiros contemporâneos.', 'Conjunto em tom lavanda com toque suave e estilo delicado.', 'Lavar à máquina a até 40 °C, em ciclo adequado
Não usar alvejante
Secar à sombra ou conforme etiqueta
Passar em temperatura baixa quando necessário', '{"Tipo":"Jogo de toalhas","Cor":"Lavanda","Material":"100% algodão","Composição têxtil":"100% algodão","Gramatura":"430 g/m²","Dimensões":"2 banho: 70 × 140 cm; 2 rosto: 50 × 80 cm","Conteúdo":"2 toalhas de banho; 2 toalhas de rosto","Coleção":"Lavanda","collection_slug":"toalhas-lavanda","catalog_import_key":"toalhas-2026-03","Origem dos dados":"Catálogo demonstrativo do TCC","Medida da toalha de banho":"70 × 140 cm","Medida da toalha de rosto":"50 × 80 cm"}', 15990::numeric/100, 8),
        ('04', 'Jogo de Toalhas Sálvia e Creme 5 Peças', 'O contraste suave entre sálvia e creme acrescenta delicadeza ao banheiro, com peças para banho, rosto e piso.', 'Toalhas coordenadas em verde-sálvia e creme para uma composição natural.', 'Lavar à máquina a até 40 °C, em ciclo adequado
Não usar alvejante
Secar à sombra ou conforme etiqueta
Passar em temperatura baixa quando necessário', '{"Tipo":"Jogo de toalhas","Cor":"Sálvia e creme","Material":"100% algodão","Composição têxtil":"100% algodão","Gramatura":"450 g/m²","Dimensões":"2 banho: 70 × 140 cm; 2 rosto: 50 × 80 cm; 1 piso: 45 × 70 cm","Conteúdo":"2 toalhas de banho; 2 toalhas de rosto; 1 toalha de piso","Coleção":"Sálvia","collection_slug":"toalhas-salvia","catalog_import_key":"toalhas-2026-04","Origem dos dados":"Catálogo demonstrativo do TCC","Medida da toalha de banho":"70 × 140 cm","Medida da toalha de rosto":"50 × 80 cm","Medida da toalha de piso":"45 × 70 cm"}', 19990::numeric/100, 8),
        ('05', 'Toalha de Banho Verde Sálvia 100% Algodão', 'O tom verde-sálvia traz serenidade à rotina e harmoniza com acessórios em madeira e cerâmica clara.', 'Toalha de banho em verde-sálvia com acabamento discreto e toque macio.', 'Lavar à máquina a até 40 °C, em ciclo adequado
Não usar alvejante
Secar à sombra ou conforme etiqueta
Passar em temperatura baixa quando necessário', '{"Tipo":"Toalha de banho","Cor":"Verde sálvia","Material":"100% algodão","Composição têxtil":"100% algodão","Gramatura":"450 g/m²","Dimensões":"70 × 140 cm","Conteúdo":"1 toalha de banho","Coleção":"Sálvia","collection_slug":"toalhas-salvia","catalog_import_key":"toalhas-2026-05","Origem dos dados":"Catálogo demonstrativo do TCC","Tamanho":"70 × 140 cm","Medida da toalha de banho":"70 × 140 cm"}', 7990::numeric/100, 12),
        ('06', 'Jogo de Toalhas Azul Pó 5 Peças', 'O Azul Pó combina peças práticas em um conjunto de banho com paleta suave e acabamento alinhado.', 'Jogo azul-pó com visual sereno e textura agradável.', 'Lavar à máquina a até 40 °C, em ciclo adequado
Não usar alvejante
Secar à sombra ou conforme etiqueta
Passar em temperatura baixa quando necessário', '{"Tipo":"Jogo de toalhas","Cor":"Azul pó","Material":"100% algodão","Composição têxtil":"100% algodão","Gramatura":"450 g/m²","Dimensões":"2 banho: 70 × 140 cm; 2 rosto: 50 × 80 cm; 1 piso: 45 × 70 cm","Conteúdo":"2 toalhas de banho; 2 toalhas de rosto; 1 toalha de piso","Coleção":"Azul Pó","collection_slug":"toalhas-azul-po","catalog_import_key":"toalhas-2026-06","Origem dos dados":"Catálogo demonstrativo do TCC","Medida da toalha de banho":"70 × 140 cm","Medida da toalha de rosto":"50 × 80 cm","Medida da toalha de piso":"45 × 70 cm"}', 18990::numeric/100, 8),
        ('07', 'Jogo de Toalhas Blush 5 Peças', 'A coleção Blush entrega uma composição confortável de banho, rosto e piso, com presença de cor sem excessos.', 'Jogo blush com toque suave e tonalidade rosada delicada.', 'Lavar à máquina a até 40 °C, em ciclo adequado
Não usar alvejante
Secar à sombra ou conforme etiqueta
Passar em temperatura baixa quando necessário', '{"Tipo":"Jogo de toalhas","Cor":"Blush","Material":"100% algodão","Composição têxtil":"100% algodão","Gramatura":"430 g/m²","Dimensões":"2 banho: 70 × 140 cm; 2 rosto: 50 × 80 cm; 1 piso: 45 × 70 cm","Conteúdo":"2 toalhas de banho; 2 toalhas de rosto; 1 toalha de piso","Coleção":"Blush","collection_slug":"toalhas-blush","catalog_import_key":"toalhas-2026-07","Origem dos dados":"Catálogo demonstrativo do TCC","Medida da toalha de banho":"70 × 140 cm","Medida da toalha de rosto":"50 × 80 cm","Medida da toalha de piso":"45 × 70 cm"}', 18990::numeric/100, 8),
        ('08', 'Jogo de Toalhas Aconchego Neutro 5 Peças', 'O Aconchego Neutro oferece uma combinação de tons versáteis para banheiros de estética natural.', 'Jogo em bege e creme com felpa encorpada e aparência sofisticada.', 'Lavar à máquina a até 40 °C, em ciclo adequado
Não usar alvejante
Secar à sombra ou conforme etiqueta
Passar em temperatura baixa quando necessário', '{"Tipo":"Jogo de toalhas","Cor":"Bege e creme","Material":"100% algodão","Composição têxtil":"100% algodão","Gramatura":"500 g/m²","Dimensões":"2 banho: 70 × 140 cm; 2 rosto: 50 × 80 cm; 1 piso: 45 × 70 cm","Conteúdo":"2 toalhas de banho; 2 toalhas de rosto; 1 toalha de piso","Coleção":"Aconchego Neutro","collection_slug":"toalhas-aconchego-neutro","catalog_import_key":"toalhas-2026-08","Origem dos dados":"Catálogo demonstrativo do TCC","Medida da toalha de banho":"70 × 140 cm","Medida da toalha de rosto":"50 × 80 cm","Medida da toalha de piso":"45 × 70 cm"}', 19990::numeric/100, 8),
        ('09', 'Toalha de Banho Branca Premium 100% Algodão', 'A Branca Premium combina textura macia, acabamento limpo e tonalidade clássica para um banheiro elegante.', 'Toalha branca com felpa encorpada e visual atemporal.', 'Lavar à máquina a até 40 °C, em ciclo adequado
Não usar alvejante
Secar à sombra ou conforme etiqueta
Passar em temperatura baixa quando necessário', '{"Tipo":"Toalha de banho","Cor":"Branco","Material":"100% algodão","Composição têxtil":"100% algodão","Gramatura":"500 g/m²","Dimensões":"70 × 140 cm","Conteúdo":"1 toalha de banho","Coleção":"Premium","collection_slug":"toalhas-premium","catalog_import_key":"toalhas-2026-09","Origem dos dados":"Catálogo demonstrativo do TCC","Tamanho":"70 × 140 cm","Medida da toalha de banho":"70 × 140 cm"}', 8990::numeric/100, 12),
        ('10', 'Trio de Toalhas Spa Neutras 3 Peças', 'O Spa Neutras traz três peças de funções diferentes, em tons delicados para compor o lavabo e banheiro.', 'Trio coordenado de toalhas em cores neutras.', 'Lavar à máquina a até 40 °C, em ciclo adequado
Não usar alvejante
Secar à sombra ou conforme etiqueta
Passar em temperatura baixa quando necessário', '{"Tipo":"Kit de toalhas","Cor":"Neutros","Material":"100% algodão","Composição têxtil":"100% algodão","Gramatura":"430 g/m²","Dimensões":"1 banho: 70 × 140 cm; 1 rosto: 50 × 80 cm; 1 piso: 45 × 70 cm","Conteúdo":"1 toalha de banho; 1 toalha de rosto; 1 toalha de piso","Coleção":"Spa","collection_slug":"toalhas-spa","catalog_import_key":"toalhas-2026-10","Origem dos dados":"Catálogo demonstrativo do TCC","Medida da toalha de banho":"70 × 140 cm","Medida da toalha de rosto":"50 × 80 cm","Medida da toalha de piso":"45 × 70 cm"}', 11990::numeric/100, 8)
), inserted AS (
 INSERT INTO products(name,description,purchase_summary,care_instructions,measurements,price,quantity,brand_id,product_type_id,status)
 SELECT a.name,a.description,a.summary,a.care,a.attributes::jsonb,a.price,a.quantity,b.id,t.id,'active'
 FROM approved a JOIN brands b ON b.name='Box Enxovais' CROSS JOIN product_types t
 WHERE t.name='Toalhas'
 AND NOT EXISTS(SELECT 1 FROM products p WHERE p.name=a.name OR p.measurements->>'catalog_import_key'=a.attributes::jsonb->>'catalog_import_key')
 ORDER BY a.sku
 RETURNING id,measurements->>'catalog_import_key' AS import_key
)
INSERT INTO catalog_towel_seed_000038(product_id,import_key) SELECT id,import_key FROM inserted;

INSERT INTO product_images(product_id,image_path,is_primary,alt_text)
SELECT j.product_id,'uploads/'||j.import_key||'-'||s.suffix||'.webp',s.position=1,s.alt
FROM catalog_towel_seed_000038 j
CROSS JOIN (VALUES
 (1,'01-capa','Vista principal da toalha ou conjunto'),
 (2,'02-pendurada','Toalha de banho aberta no suporte'),
 (3,'03-dobrada','Detalhe da toalha dobrada'),
 (4,'04-felpa','Felpa, barra e acabamento'),
 (5,'05-composicao','Composição integral ou vista da peça inteira')
) s(position,suffix,alt)
ORDER BY j.product_id,s.position;

UPDATE catalog_towel_seed_000038 j SET product_snapshot=to_jsonb(p),
 images_snapshot=(SELECT jsonb_agg(to_jsonb(i) ORDER BY id) FROM product_images i WHERE i.product_id=p.id)
FROM products p WHERE p.id=j.product_id;

COMMIT;
