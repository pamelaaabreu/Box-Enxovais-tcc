BEGIN;
WITH seed(name, category, slug, family, pair_type) AS (
    VALUES ('Jogo de Cama Essência Floral — Verde Oliva', 'Cama / Jogos de cama', 'essencia', 'essencia-floral-verde-oliva', 'jogo-cama'),
           ('Edredom Essência Floral — Verde Suave', 'Cama / Edredons', 'essencia', 'essencia-floral-verde-suave', 'edredom'),
           ('Jogo de Cama Essência Floral — Botânico', 'Cama / Jogos de cama', 'essencia', 'essencia-floral-botanico', 'jogo-cama'),
           ('Jogo de Cama Aurora Floral — Vermelho', 'Cama / Jogos de cama', 'aurora', 'aurora-floral-vermelho', 'jogo-cama'),
           ('Jogo de Cama Aurora Floral — Vinho', 'Cama / Jogos de cama', 'aurora', 'aurora-floral-vinho', 'jogo-cama'),
           ('Jogo de Cama Serenidade — Azul', 'Cama / Jogos de cama', 'serenidade', 'serenidade-azul', 'jogo-cama'),
           ('Jogo de Cama Serenidade — Azul Claro', 'Cama / Jogos de cama', 'serenidade', 'serenidade-azul-claro', 'jogo-cama')
)
UPDATE products p
SET measurements = p.measurements - 'collection_slug' - 'coordinated_family' - 'coordinated_pair_type'
FROM seed s JOIN product_types t ON t.name = s.category
WHERE p.name = s.name AND p.product_type_id = t.id
  AND p.measurements @> jsonb_build_object('collection_slug', s.slug, 'coordinated_family', s.family,
                                         'coordinated_pair_type', s.pair_type);
COMMIT;