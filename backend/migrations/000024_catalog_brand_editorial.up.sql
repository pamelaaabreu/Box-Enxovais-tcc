BEGIN;

ALTER TABLE products ADD COLUMN purchase_summary VARCHAR(160);

CREATE TABLE catalog_editorial_024 (
    product_id BIGINT NOT NULL,
    brand_id INTEGER NOT NULL,
    PRIMARY KEY (product_id)
);

CREATE TABLE catalog_brand_024 (
    brand_id INTEGER PRIMARY KEY
);

WITH editorial(name, summary) AS (
VALUES
    ('Jogo de Cama Essência Floral — Verde Oliva', 'Percal de algodão com folhagens verde-oliva em fundo claro, para dar contraste à roupa de cama.'),
    ('Edredom Essência Floral — Verde Suave', 'Edredom em percal de algodão com folhagens verde-suave, para compor o quarto em tons leves.'),
    ('Jogo de Cama Essência Floral — Botânico', 'Jogo de cama em percal de algodão com desenho botânico, para destacar a estampa na decoração.'),
    ('Jogo de Cama Aurora Floral — Vermelho', 'Estampa floral vermelha sobre tecido misto de algodão e poliéster, para levar cor à cama.'),
    ('Jogo de Cama Aurora Floral — Vinho', 'Flores em tom vinho sobre tecido misto de algodão e poliéster, para compor uma cama de tons intensos.'),
    ('Jogo de Cama Serenidade — Azul', 'Cetim de algodão em azul, para composições de cama com uma paleta fria e discreta.'),
    ('Jogo de Cama Serenidade — Azul Claro', 'Jogo de cama em cetim de algodão e azul claro, para combinar com tecidos lisos e tons neutros.'),
    ('Edredom Aconchego — Creme', 'Edredom creme em microfibra de poliéster, para montar a cama em uma paleta clara e neutra.'),
    ('Edredom Aconchego — Marrom Cacau', 'Edredom marrom cacau em microfibra de poliéster, para uma composição de cama em tons terrosos.'),
    ('Edredom Aconchego — Verde Oliva', 'Microfibra de poliéster em verde-oliva, para combinar o edredom com tons naturais de madeira e areia.'),
    ('Edredom Geométrico — Azul Petróleo', 'Desenho geométrico azul-petróleo em tecido misto, para dar contraste a lençóis claros.'),
    ('Edredom Geométrico — Rosa Nude', 'Edredom geométrico rosa nude em tecido misto de algodão e poliéster, para um quarto de tons suaves.'),
    ('Edredom Geométrico — Verde Sálvia', 'Edredom geométrico verde-sálvia em tecido misto, para compor a cama com uma cor delicada.'),
    ('Edredom Jardim — Azul Lavanda', 'Edredom floral azul lavanda com tecido externo de algodão, para uma composição de cores suaves.'),
    ('Edredom Jardim — Verde Musgo', 'Estampa floral verde-musgo sobre tecido externo de algodão, para destacar o edredom na cama.'),
    ('Cobre-Leito Natural — Verde Botânico', 'Cobre-leito em tecido misto com folhagens verdes, para dar um toque botânico à composição.'),
    ('Cobre-Leito Natural — Folhagens Suaves', 'Cobre-leito de algodão e poliéster com folhagens suaves, para combinar com roupas de cama claras.'),
    ('Cobre-Leito Natural — Botânico Neutro', 'Cobre-leito de desenho botânico em tons neutros, confeccionado em tecido misto de algodão e poliéster.'),
    ('Colcha Provence — Lilás', 'Colcha lilás em microfibra de poliéster, para compor o quarto com um ponto de cor suave.'),
    ('Colcha Provence — Rosa', 'Colcha rosa em microfibra de poliéster, para coordenar com lençóis e fronhas de tons claros.'),
    ('Manta Tricot Conforto — Areia', 'Manta de tricô de acrílico em tom areia, para usar como camada decorativa no quarto ou no sofá.'),
    ('Manta Tricot Conforto — Verde Oliva', 'Tricô de acrílico em verde-oliva, para acrescentar cor e textura à composição da cama.'),
    ('Manta Tricot Conforto — Terracota', 'Manta terracota em tricô de acrílico, para adicionar um tom terroso à cama ou ao sofá.'),
    ('Peseira Textura — Off-White', 'Peseira off-white em tecido misto de algodão e poliéster, para finalizar a cama em tons claros.'),
    ('Peseira Textura — Azul Acinzentado', 'Peseira azul acinzentado em algodão e poliéster, para criar um contraste discreto aos pés da cama.'),
    ('Peseira Textura — Marrom Taupe', 'Tecido misto de algodão e poliéster em marrom taupe, para finalizar a cama com uma cor neutra.'),
    ('Protetor SoftCare', 'Protetor em malha de poliéster para usar como camada entre o colchão e a roupa de cama.'),
    ('Protetor Protege', 'Protetor de colchão em tecido misto de algodão e poliéster, para usar sob o lençol.'),
    ('Toalha de Banho Premium 100% Algodão', 'Toalha de banho em tecido felpudo de algodão para compor o enxoval do banheiro.'),
    ('Travesseiro Aconchego Firme', 'Travesseiro com enchimento de fibra siliconada de poliéster, para compor o enxoval da cama.'),
    ('Travesseiro Conforto Duplo', 'Travesseiro de fibra siliconada para combinar com a roupa de cama e as fronhas do enxoval.'),
    ('Travesseiro Memória Fresca', 'Espuma viscoelástica com revestimento de malha de poliéster, em um travesseiro de 50 × 70 cm.'),
    ('Travesseiro Curva Serena', 'Travesseiro de espuma viscoelástica com perfil curvo, para quem prefere um formato anatômico.'),
    ('Travesseiro Pluma Serena', 'Travesseiro de fibra siliconada de poliéster em tamanho 50 × 70 cm, para uso no quarto.'),
    ('Travesseiro Contorno Suave', 'Travesseiro de espuma viscoelástica com contorno anatômico e opções de altura.'),
    ('Travesseiro Nuvem Leve', 'Fibra siliconada de poliéster em um travesseiro de 50 × 70 cm para compor a cama.'),
    ('Travesseiro Memória Clássica', 'Travesseiro de espuma viscoelástica com alternativas de altura, para escolher a versão preferida.'),
    ('Travesseiro Apoio Versátil', 'Travesseiro em formato de rolo de 18 × 50 cm, com enchimento de fibra siliconada e capa têxtil.'),
    ('Travesseiro Apoio Lateral', 'Travesseiro com fibra siliconada de poliéster, para combinar com as peças do enxoval do quarto.'),
    ('Travesseiro Brisa Macia', 'Travesseiro de fibra siliconada de poliéster em tamanho 50 × 70 cm para uso na cama.'),
    ('Travesseiro Memória Compacta', 'Travesseiro compacto de espuma viscoelástica, com medida cadastrada de 40 × 60 cm.')
)
UPDATE products p SET purchase_summary = e.summary
FROM editorial e WHERE p.name = e.name;

WITH inserted AS (
    INSERT INTO brands(name) SELECT 'Box Enxovais'
    WHERE EXISTS (SELECT 1 FROM products WHERE purchase_summary IS NOT NULL AND brand_id IS NULL)
    ON CONFLICT (name) DO NOTHING
    RETURNING id
)
INSERT INTO catalog_brand_024 SELECT id FROM inserted;

INSERT INTO catalog_editorial_024(product_id, brand_id)
SELECT p.id, b.id FROM products p CROSS JOIN brands b
WHERE p.purchase_summary IS NOT NULL AND p.brand_id IS NULL AND b.name = 'Box Enxovais';

UPDATE products p SET brand_id = e.brand_id
FROM catalog_editorial_024 e WHERE p.id = e.product_id;

COMMIT;
