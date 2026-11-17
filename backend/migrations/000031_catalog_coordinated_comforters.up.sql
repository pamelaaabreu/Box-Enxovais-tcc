BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE products, product_variants, product_images IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE catalog_coordinated_comforters_000031 (
    product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    family TEXT NOT NULL UNIQUE,
    product_snapshot JSONB,
    variants_snapshot JSONB,
    images_snapshot JSONB
);

CREATE TEMP TABLE coordinated_comforter_candidates ON COMMIT DROP AS
WITH seed(family, name, price, description, material) AS (
    VALUES
      ('essencia-floral-verde-oliva', 'Edredom Essência Floral — Verde Oliva', 289.90,
       'Folhagens verde-oliva sobre fundo claro em um edredom acolchoado para compor a cama com a estampa do jogo Essência Floral Verde Oliva.', 'Percal de algodão'),
      ('essencia-floral-botanico', 'Edredom Essência Floral — Botânico', 289.90,
       'Ramos delicados sobre fundo marfim, com costura acolchoada que valoriza a estampa do jogo Essência Floral Botânico.', 'Percal de algodão'),
      ('aurora-floral-vermelho', 'Edredom Aurora Floral — Vermelho', 329.90,
       'Flores em vermelho quente sobre fundo claro, com enchimento volumoso e acabamento costurado. A estampa coordena com o jogo Aurora Floral Vermelho.', 'Tecido misto de algodão e poliéster'),
      ('aurora-floral-vinho', 'Edredom Aurora Floral — Vinho', 329.90,
       'Flores em tom vinho sobre fundo claro e enchimento volumoso. O desenho acompanha as fronhas do jogo Aurora Floral Vinho.', 'Tecido misto de algodão e poliéster'),
      ('serenidade-azul', 'Edredom Serenidade — Azul', 369.90,
       'Ramos em azul sobre fundo claro, com enchimento macio e costura que define o volume do edredom. Combina com a estampa do jogo Serenidade Azul.', 'Cetim de algodão'),
      ('serenidade-azul-claro', 'Edredom Serenidade — Azul Claro', 369.90,
       'Botânica discreta em azul claro sobre fundo marfim. O acolchoado e a borda costurada completam a composição do jogo Serenidade Azul Claro.', 'Cetim de algodão')
)
SELECT seed.*, sheet.id AS sheet_id, brand.id AS brand_id, comforter_type.id AS product_type_id,
       jsonb_strip_nulls(jsonb_build_object(
           'Coleção', sheet.measurements->>'Coleção', 'Cor', sheet.measurements->>'Cor',
           'Estampa', sheet.measurements->>'Estampa', 'Tipo', 'Edredom', 'Conteúdo', '1 edredom',
           'Material', seed.material, 'Enchimento', 'Fibra de poliéster',
           'Acabamento', 'Costura acolchoada e debrum',
           'Origem dos materiais', 'Dados simulados para demonstração',
           'collection_slug', sheet.measurements->>'collection_slug',
           'coordinated_family', seed.family, 'coordinated_pair_type', 'edredom'
       )) AS measurements
FROM seed
JOIN products sheet ON sheet.measurements->>'coordinated_family' = seed.family
                   AND sheet.measurements->>'coordinated_pair_type' = 'jogo-cama'
                   AND sheet.status = 'active'
JOIN product_types sheet_type ON sheet_type.id = sheet.product_type_id AND sheet_type.name = 'Cama / Jogos de cama'
JOIN product_types comforter_type ON comforter_type.name = 'Cama / Edredons'
JOIN brands brand ON brand.name = 'Box Enxovais'
WHERE NOT EXISTS (
    SELECT 1 FROM products p
    WHERE p.name = seed.name
       OR (p.product_type_id = comforter_type.id AND (
          p.measurements->>'coordinated_family' = seed.family
          OR (p.measurements->>'Coleção' = sheet.measurements->>'Coleção'
              AND (p.measurements->>'Cor') IS NOT DISTINCT FROM (sheet.measurements->>'Cor')
              AND (p.measurements->>'Estampa') IS NOT DISTINCT FROM (sheet.measurements->>'Estampa'))
       ))
);

CREATE TEMP TABLE coordinated_comforter_sizes ON COMMIT DROP AS
WITH dimensions(position, size, dimensions) AS (
    VALUES (1, 'Solteiro', '160 × 220 cm'), (2, 'Casal', '220 × 240 cm'),
           (3, 'Queen', '240 × 260 cm'), (4, 'King', '260 × 280 cm')
)
SELECT c.family, d.size, d.dimensions,
       row_number() OVER (PARTITION BY c.family ORDER BY d.position)::int AS size_rank,
       count(*) OVER (PARTITION BY c.family)::int AS size_count
FROM coordinated_comforter_candidates c
CROSS JOIN dimensions d
WHERE EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = c.sheet_id AND v.size = d.size)
   OR (c.family = 'essencia-floral-verde-oliva' AND d.position <= 3
       AND NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = c.sheet_id));

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM coordinated_comforter_candidates c
        WHERE NOT EXISTS (SELECT 1 FROM coordinated_comforter_sizes s WHERE s.family = c.family)
    ) THEN
        RAISE EXCEPTION 'Há edredom coordenado sem tamanho compatível.';
    END IF;
END $$;

WITH inserted AS (
    INSERT INTO products(name, description, purchase_summary, care_instructions, measurements,
                         price, quantity, brand_id, product_type_id, status)
    SELECT name, description,
           'Edredom estampado com enchimento de fibra e acabamento costurado.',
           concat_ws(chr(10), 'Lavar em ciclo delicado até 30 °C, se houver espaço no tambor.',
                     'Não usar alvejante.', 'Secar aberto à sombra.', 'Não passar.'),
           measurements, price, 0, brand_id, product_type_id, 'active'
    FROM coordinated_comforter_candidates ORDER BY sheet_id
    RETURNING id, measurements->>'coordinated_family' AS family
)
INSERT INTO catalog_coordinated_comforters_000031(product_id, family)
SELECT id, family FROM inserted;

INSERT INTO product_variants(product_id, size, price, quantity, dimensions, included_items, simulated)
SELECT j.product_id, s.size, c.price + (s.size_rank - 1) * 20,
       8 / s.size_count + CASE WHEN s.size_rank <= mod(8, s.size_count) THEN 1 ELSE 0 END,
       s.dimensions, '["1 edredom"]'::jsonb, TRUE
FROM coordinated_comforter_sizes s
JOIN coordinated_comforter_candidates c USING (family)
JOIN catalog_coordinated_comforters_000031 j USING (family)
ORDER BY j.product_id, s.size_rank;

INSERT INTO product_images(product_id, image_path, is_primary, alt_text)
SELECT j.product_id, 'uploads/edredom-coordenado-' || j.family || '-' || shot.suffix || '.webp',
       shot.position = 1, shot.alt
FROM catalog_coordinated_comforters_000031 j
CROSS JOIN (VALUES
    (1, '01-frontal', 'Edredom acolchoado visto de frente'),
    (2, '02-lateral', 'Vista lateral do edredom acolchoado'),
    (3, '03-dobrado', 'Edredom dobrado com enchimento à vista'),
    (4, '04-estampa', 'Detalhe da estampa e da costura acolchoada'),
    (5, '05-acabamento', 'Detalhe da borda costurada do edredom')
) shot(position, suffix, alt)
ORDER BY j.product_id, shot.position;

UPDATE catalog_coordinated_comforters_000031 j
SET product_snapshot = to_jsonb(p),
    variants_snapshot = (SELECT jsonb_agg(to_jsonb(v) ORDER BY v.id) FROM product_variants v WHERE v.product_id = j.product_id),
    images_snapshot = (SELECT jsonb_agg(to_jsonb(i) ORDER BY i.id) FROM product_images i WHERE i.product_id = j.product_id)
FROM products p WHERE p.id = j.product_id;

COMMIT;
