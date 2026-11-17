BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE products, product_variants IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE catalog_contents_seed_000018 (
    product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    contents TEXT NOT NULL,
    measurements_were_null BOOLEAN NOT NULL
);

WITH catalog(product_name, category, contents) AS (
    VALUES
        ('Edredom Geométrico — Azul Petróleo', 'Cama / Edredons', '1 edredom'),
        ('Edredom Jardim — Verde Musgo', 'Cama / Edredons', '1 edredom'),
        ('Manta Tricot Conforto — Areia', 'Cama / Mantas e peseiras', '1 manta'),
        ('Manta Tricot Conforto — Verde Oliva', 'Cama / Mantas e peseiras', '1 manta'),
        ('Manta Tricot Conforto — Terracota', 'Cama / Mantas e peseiras', '1 manta'),
        ('Peseira Textura — Off-White', 'Cama / Mantas e peseiras', '1 peseira'),
        ('Peseira Textura — Azul Acinzentado', 'Cama / Mantas e peseiras', '1 peseira'),
        ('Peseira Textura — Marrom Taupe', 'Cama / Mantas e peseiras', '1 peseira')
)
INSERT INTO catalog_contents_seed_000018
SELECT p.id, c.contents, p.measurements IS NULL
FROM products p
JOIN product_types t ON t.id = p.product_type_id
JOIN catalog c ON c.product_name = p.name AND c.category = t.name
WHERE NOT COALESCE(p.measurements ? 'Conteúdo', false)
  AND NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id);

UPDATE products p
SET measurements = COALESCE(p.measurements, '{}'::jsonb) || jsonb_build_object('Conteúdo', s.contents)
FROM catalog_contents_seed_000018 s
WHERE p.id = s.product_id;
COMMIT;
