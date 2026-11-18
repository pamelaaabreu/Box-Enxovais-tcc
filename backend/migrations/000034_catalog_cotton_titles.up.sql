BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE products IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE catalog_cotton_titles_000034 (
    product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    previous_data JSONB NOT NULL,
    revised_data JSONB NOT NULL
);

WITH approved(name, category_name, new_name, legacy_slug, material, description, summary, composition_key) AS (
    VALUES ('Jogo de Cama Essência Floral — Verde Oliva', 'Cama / Jogos de cama', 'Jogo de Cama Essência Floral Verde Oliva 100% Algodão', 'jogo-de-cama-essencia-floral-verde-oliva-1', 'Percal de algodão', 'As folhagens em verde-oliva do Essência Floral dão profundidade à composição da cama. Madeira clara e tons de areia equilibram a presença da estampa.', 'Percal de algodão com folhagens verde-oliva em fundo claro, para dar contraste à roupa de cama.', 'Composição têxtil'),
        ('Edredom Essência Floral — Verde Suave', 'Cama / Edredons', 'Edredom Essência Floral Verde Suave | Tecido Externo 100% Algodão', 'edredom-essencia-floral-verde-suave-2', 'Percal de algodão', 'No Essência Floral Verde Suave, o desenho de flores e folhas traz cor sem pesar no quarto. Combine com almofadas creme para manter a paleta delicada.', 'Edredom em percal de algodão com folhagens verde-suave, para compor o quarto em tons leves.', 'Composição do tecido externo'),
        ('Jogo de Cama Essência Floral — Botânico', 'Cama / Jogos de cama', 'Jogo de Cama Essência Floral Botânico 100% Algodão', 'jogo-de-cama-essencia-floral-botanico-3', 'Percal de algodão', 'O Essência Floral Botânico leva o desenho de folhagens ao centro da decoração. Uma cabeceira neutra deixa a estampa aparecer por inteiro.', 'Jogo de cama em percal de algodão com desenho botânico, para destacar a estampa na decoração.', 'Composição têxtil'),
        ('Jogo de Cama Aurora Floral — Vermelho', 'Cama / Jogos de cama', 'Jogo de Cama Aurora Floral Vermelho 100% Algodão', 'jogo-de-cama-aurora-floral-vermelho-4', 'Tecido de algodão', 'O Aurora Floral Vermelho coloca a estampa em evidência e aquece a paleta do quarto. Acessórios lisos deixam o vermelho conduzir a composição.', 'Estampa floral vermelha sobre tecido de algodão, para levar cor à cama.', 'Composição têxtil'),
        ('Jogo de Cama Aurora Floral — Vinho', 'Cama / Jogos de cama', 'Jogo de Cama Aurora Floral Vinho 100% Algodão', 'jogo-de-cama-aurora-floral-vinho-5', 'Tecido de algodão', 'Em tom vinho, o Aurora Floral dá um ar mais intimista à cama. Bege e madeira escura acompanham a cor sem competir com o desenho.', 'Flores em tom vinho sobre tecido de algodão, para compor uma cama de tons intensos.', 'Composição têxtil'),
        ('Jogo de Cama Serenidade — Azul', 'Cama / Jogos de cama', 'Jogo de Cama Serenidade Azul 100% Algodão', 'jogo-de-cama-serenidade-azul-6', 'Cetim de algodão', 'O Serenidade Azul reúne a inspiração botânica e o azul em uma composição equilibrada. Detalhes em madeira clara acrescentam calor à paleta.', 'Cetim de algodão em azul, para composições de cama com uma paleta fria e discreta.', 'Composição têxtil'),
        ('Jogo de Cama Serenidade — Azul Claro', 'Cama / Jogos de cama', 'Jogo de Cama Serenidade Azul Claro 100% Algodão', 'jogo-de-cama-serenidade-azul-claro-7', 'Cetim de algodão', 'O Azul Claro do Serenidade dá leveza ao desenho botânico. A cor funciona bem com branco e cinza suave em quartos de visual luminoso.', 'Jogo de cama em cetim de algodão e azul claro, para combinar com tecidos lisos e tons neutros.', 'Composição têxtil'),
        ('Edredom Jardim — Azul Lavanda', 'Cama / Edredons', 'Edredom Jardim Azul Lavanda | Tecido Externo 100% Algodão', 'edredom-jardim-azul-lavanda-14', 'Tecido de algodão', 'O Azul Lavanda do Edredom Jardim dá um tom delicado à composição floral. Acessórios claros destacam a cor e deixam a estampa em evidência.', 'Edredom floral azul lavanda com tecido externo de algodão, para uma composição de cores suaves.', 'Composição do tecido externo'),
        ('Edredom Jardim — Verde Musgo', 'Cama / Edredons', 'Edredom Jardim Verde Musgo | Tecido Externo 100% Algodão', 'edredom-jardim-verde-musgo-15', 'Tecido de algodão', 'O Jardim Verde Musgo leva uma cor mais profunda à estampa floral. Use com branco-creme para iluminar o conjunto.', 'Estampa floral verde-musgo sobre tecido externo de algodão, para destacar o edredom na cama.', 'Composição do tecido externo'),
        ('Edredom Essência Floral — Verde Oliva', 'Cama / Edredons', 'Edredom Essência Floral Verde Oliva | Tecido Externo 100% Algodão', 'edredom-essencia-floral-verde-oliva-78', 'Percal de algodão', 'Folhagens verde-oliva sobre fundo claro em um edredom acolchoado para compor a cama com a estampa do jogo Essência Floral Verde Oliva.', 'Edredom estampado com enchimento de fibra e acabamento costurado.', 'Composição do tecido externo'),
        ('Edredom Essência Floral — Botânico', 'Cama / Edredons', 'Edredom Essência Floral Botânico | Tecido Externo 100% Algodão', 'edredom-essencia-floral-botanico-79', 'Percal de algodão', 'Ramos delicados sobre fundo marfim, com costura acolchoada que valoriza a estampa do jogo Essência Floral Botânico.', 'Edredom estampado com enchimento de fibra e acabamento costurado.', 'Composição do tecido externo'),
        ('Edredom Aurora Floral — Vermelho', 'Cama / Edredons', 'Edredom Aurora Floral Vermelho | Tecido Externo 100% Algodão', 'edredom-aurora-floral-vermelho-80', 'Tecido de algodão', 'Flores em vermelho quente sobre fundo claro, com enchimento volumoso e acabamento costurado. A estampa coordena com o jogo Aurora Floral Vermelho.', 'Edredom estampado com enchimento de fibra e acabamento costurado.', 'Composição do tecido externo'),
        ('Edredom Aurora Floral — Vinho', 'Cama / Edredons', 'Edredom Aurora Floral Vinho | Tecido Externo 100% Algodão', 'edredom-aurora-floral-vinho-81', 'Tecido de algodão', 'Flores em tom vinho sobre fundo claro e enchimento volumoso. O desenho acompanha as fronhas do jogo Aurora Floral Vinho.', 'Edredom estampado com enchimento de fibra e acabamento costurado.', 'Composição do tecido externo'),
        ('Edredom Serenidade — Azul', 'Cama / Edredons', 'Edredom Serenidade Azul | Tecido Externo 100% Algodão', 'edredom-serenidade-azul-82', 'Cetim de algodão', 'Ramos em azul sobre fundo claro, com enchimento macio e costura que define o volume do edredom. Combina com a estampa do jogo Serenidade Azul.', 'Edredom estampado com enchimento de fibra e acabamento costurado.', 'Composição do tecido externo'),
        ('Edredom Serenidade — Azul Claro', 'Cama / Edredons', 'Edredom Serenidade Azul Claro | Tecido Externo 100% Algodão', 'edredom-serenidade-azul-claro-83', 'Cetim de algodão', 'Botânica discreta em azul claro sobre fundo marfim. O acolchoado e a borda costurada completam a composição do jogo Serenidade Azul Claro.', 'Edredom estampado com enchimento de fibra e acabamento costurado.', 'Composição do tecido externo')
), candidates AS (
    SELECT p.id, jsonb_build_object('name',p.name,'description',p.description,
               'purchase_summary',p.purchase_summary,'measurements',p.measurements) AS previous_data,
           jsonb_build_object('name',a.new_name,
               'description',a.description,'purchase_summary',a.summary,
               'measurements',p.measurements || jsonb_build_object(
                   'catalog_slug',COALESCE(NULLIF(p.measurements->>'catalog_slug',''),a.legacy_slug),
                   'Material',a.material,'Tecido externo',a.material || ' — 100% algodão',
                   a.composition_key,'100% algodão',
                   'Origem dos dados de composição','Especificação demonstrativa aprovada para o TCC'
               )) AS revised_data
    FROM approved a
    JOIN product_types t ON t.name=a.category_name
    JOIN products p ON p.name=a.name AND p.product_type_id=t.id
    WHERE p.name !~* '100[[:space:]]*%[[:space:]]*algodão'
      AND COALESCE(p.measurements->>'Tipo','') IN ('Jogo de cama','Edredom')
)
INSERT INTO catalog_cotton_titles_000034 SELECT id,previous_data,revised_data FROM candidates;

UPDATE products p
SET name=j.revised_data->>'name',description=j.revised_data->>'description',
    purchase_summary=j.revised_data->>'purchase_summary',measurements=j.revised_data->'measurements'
FROM catalog_cotton_titles_000034 j WHERE p.id=j.product_id;

COMMIT;
