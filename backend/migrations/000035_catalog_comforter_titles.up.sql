BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE products IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE catalog_comforter_titles_000035 (
    product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    previous_data JSONB NOT NULL,
    revised_data JSONB NOT NULL
);

WITH approved(previous_name, new_name, legacy_slug, outer_fabric) AS (
    VALUES ('Edredom Essência Floral Verde Suave | Tecido Externo 100% Algodão', 'Edredom Essência Floral Verde Suave 200 Fios', 'edredom-essencia-floral-verde-suave-2', 'Percal de algodão — 100% algodão — 200 fios'),
        ('Edredom Aconchego — Creme', 'Edredom Aconchego Creme 200 Fios', 'edredom-aconchego-creme-8', 'Microfibra de poliéster — 200 fios'),
        ('Edredom Aconchego — Marrom Cacau', 'Edredom Aconchego Marrom Cacau 200 Fios', 'edredom-aconchego-marrom-cacau-9', 'Microfibra de poliéster — 200 fios'),
        ('Edredom Aconchego — Verde Oliva', 'Edredom Aconchego Verde Oliva 200 Fios', 'edredom-aconchego-verde-oliva-10', 'Microfibra de poliéster — 200 fios'),
        ('Edredom Geométrico — Azul Petróleo', 'Edredom Geométrico Azul Petróleo 200 Fios', 'edredom-geometrico-azul-petroleo-11', 'Tecido misto de algodão e poliéster — 200 fios'),
        ('Edredom Geométrico — Rosa Nude', 'Edredom Geométrico Rosa Nude 200 Fios', 'edredom-geometrico-rosa-nude-12', 'Tecido misto de algodão e poliéster — 200 fios'),
        ('Edredom Geométrico — Verde Sálvia', 'Edredom Geométrico Verde Sálvia 200 Fios', 'edredom-geometrico-verde-salvia-13', 'Tecido misto de algodão e poliéster — 200 fios'),
        ('Edredom Jardim Azul Lavanda | Tecido Externo 100% Algodão', 'Edredom Jardim Azul Lavanda 200 Fios', 'edredom-jardim-azul-lavanda-14', 'Tecido de algodão — 100% algodão — 200 fios'),
        ('Edredom Jardim Verde Musgo | Tecido Externo 100% Algodão', 'Edredom Jardim Verde Musgo 200 Fios', 'edredom-jardim-verde-musgo-15', 'Tecido de algodão — 100% algodão — 200 fios'),
        ('Edredom Essência Floral Verde Oliva | Tecido Externo 100% Algodão', 'Edredom Essência Floral Verde Oliva 200 Fios', 'edredom-essencia-floral-verde-oliva-78', 'Percal de algodão — 100% algodão — 200 fios'),
        ('Edredom Essência Floral Botânico | Tecido Externo 100% Algodão', 'Edredom Essência Floral Botânico 200 Fios', 'edredom-essencia-floral-botanico-79', 'Percal de algodão — 100% algodão — 200 fios'),
        ('Edredom Aurora Floral Vermelho | Tecido Externo 100% Algodão', 'Edredom Aurora Floral Vermelho 200 Fios', 'edredom-aurora-floral-vermelho-80', 'Tecido de algodão — 100% algodão — 200 fios'),
        ('Edredom Aurora Floral Vinho | Tecido Externo 100% Algodão', 'Edredom Aurora Floral Vinho 200 Fios', 'edredom-aurora-floral-vinho-81', 'Tecido de algodão — 100% algodão — 200 fios'),
        ('Edredom Serenidade Azul | Tecido Externo 100% Algodão', 'Edredom Serenidade Azul 200 Fios', 'edredom-serenidade-azul-82', 'Cetim de algodão — 100% algodão — 200 fios'),
        ('Edredom Serenidade Azul Claro | Tecido Externo 100% Algodão', 'Edredom Serenidade Azul Claro 200 Fios', 'edredom-serenidade-azul-claro-83', 'Cetim de algodão — 100% algodão — 200 fios')
), revisions AS (
    SELECT p.id, p.name, p.measurements,
           a.new_name,
           COALESCE(p.measurements,'{}'::jsonb) || jsonb_build_object(
               'catalog_slug', COALESCE(NULLIF(p.measurements->>'catalog_slug',''),a.legacy_slug),
               'Tecido externo', a.outer_fabric,
               'Contagem de fios', '200 fios',
               'Origem dos dados de tecelagem', 'Especificação demonstrativa aprovada para o TCC'
           ) AS new_measurements
    FROM approved a
    JOIN products p ON p.name=a.previous_name
    JOIN product_types t ON t.id=p.product_type_id AND t.name='Cama / Edredons'
)
INSERT INTO catalog_comforter_titles_000035
SELECT id, jsonb_build_object('name',name,'measurements',measurements),
           jsonb_build_object('name',new_name,'measurements',new_measurements)
FROM revisions
WHERE name IS DISTINCT FROM new_name OR measurements IS DISTINCT FROM new_measurements;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM catalog_comforter_titles_000035 j
        JOIN products other ON other.id<>j.product_id AND other.name=j.revised_data->>'name'
    ) THEN
        RAISE EXCEPTION 'Título de edredom já cadastrado; revise o catálogo antes de aplicar.';
    END IF;
END $$;

UPDATE products p
SET name=j.revised_data->>'name', measurements=j.revised_data->'measurements'
FROM catalog_comforter_titles_000035 j WHERE p.id=j.product_id;

COMMIT;
