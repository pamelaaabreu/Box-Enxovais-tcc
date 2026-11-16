BEGIN;

SET LOCAL lock_timeout = '5s';
LOCK TABLE carts, cart_items, products, checkout_orders, checkout_order_items, product_variants
    IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE catalog_variant_seed_000014 (
    product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    original_quantity INTEGER NOT NULL CHECK (original_quantity >= 0),
    variant_ids INTEGER[] NOT NULL DEFAULT '{}'
);

CREATE TEMP TABLE catalog_variant_plan_000014 (
    product_name TEXT NOT NULL,
    category_name TEXT NOT NULL,
    position INTEGER NOT NULL,
    size TEXT NOT NULL,
    surcharge_cents INTEGER NOT NULL,
    dimensions TEXT NOT NULL,
    included_items JSONB NOT NULL,
    PRIMARY KEY (product_name, category_name, position)
) ON COMMIT DROP;

INSERT INTO catalog_variant_plan_000014 VALUES
    ('Jogo de Cama Essência Floral — Verde Oliva', 'Cama / Jogos de cama', 1, 'Solteiro', 0, 'Colchão de referência: 88 × 188 cm', '["1 lençol de elástico","1 fronha"]'::jsonb),
    ('Jogo de Cama Essência Floral — Verde Oliva', 'Cama / Jogos de cama', 2, 'Casal', 2000, 'Colchão de referência: 138 × 188 cm', '["1 lençol de elástico","2 fronhas"]'::jsonb),
    ('Jogo de Cama Essência Floral — Verde Oliva', 'Cama / Jogos de cama', 3, 'Queen', 4000, 'Colchão de referência: 158 × 198 cm', '["1 lençol de elástico","2 fronhas"]'::jsonb),
    ('Jogo de Cama Essência Floral — Verde Suave', 'Cama / Jogos de cama', 1, 'Solteiro', 0, 'Colchão de referência: 88 × 188 cm', '["1 lençol de elástico","1 fronha"]'::jsonb),
    ('Jogo de Cama Essência Floral — Verde Suave', 'Cama / Jogos de cama', 2, 'Casal', 2000, 'Colchão de referência: 138 × 188 cm', '["1 lençol de elástico","2 fronhas"]'::jsonb),
    ('Jogo de Cama Essência Floral — Verde Suave', 'Cama / Jogos de cama', 3, 'Queen', 4000, 'Colchão de referência: 158 × 198 cm', '["1 lençol de elástico","2 fronhas"]'::jsonb),
    ('Jogo de Cama Essência Floral — Botânico', 'Cama / Jogos de cama', 1, 'Solteiro', 0, 'Colchão de referência: 88 × 188 cm', '["1 lençol de elástico","1 fronha"]'::jsonb),
    ('Jogo de Cama Essência Floral — Botânico', 'Cama / Jogos de cama', 2, 'Casal', 2000, 'Colchão de referência: 138 × 188 cm', '["1 lençol de elástico","2 fronhas"]'::jsonb),
    ('Jogo de Cama Essência Floral — Botânico', 'Cama / Jogos de cama', 3, 'Queen', 4000, 'Colchão de referência: 158 × 198 cm', '["1 lençol de elástico","2 fronhas"]'::jsonb),
    ('Jogo de Cama Aurora Floral — Vermelho', 'Cama / Jogos de cama', 1, 'Casal', 0, 'Colchão de referência: 138 × 188 cm', '["1 lençol de elástico","2 fronhas"]'::jsonb),
    ('Jogo de Cama Aurora Floral — Vermelho', 'Cama / Jogos de cama', 2, 'Queen', 2000, 'Colchão de referência: 158 × 198 cm', '["1 lençol de elástico","2 fronhas"]'::jsonb),
    ('Jogo de Cama Aurora Floral — Vermelho', 'Cama / Jogos de cama', 3, 'King', 4000, 'Colchão de referência: 193 × 203 cm', '["1 lençol de elástico","2 fronhas"]'::jsonb),
    ('Jogo de Cama Aurora Floral — Vinho', 'Cama / Jogos de cama', 1, 'Casal', 0, 'Colchão de referência: 138 × 188 cm', '["1 lençol de elástico","2 fronhas"]'::jsonb),
    ('Jogo de Cama Aurora Floral — Vinho', 'Cama / Jogos de cama', 2, 'Queen', 2000, 'Colchão de referência: 158 × 198 cm', '["1 lençol de elástico","2 fronhas"]'::jsonb),
    ('Jogo de Cama Aurora Floral — Vinho', 'Cama / Jogos de cama', 3, 'King', 4000, 'Colchão de referência: 193 × 203 cm', '["1 lençol de elástico","2 fronhas"]'::jsonb),
    ('Jogo de Cama Serenidade — Azul', 'Cama / Jogos de cama', 1, 'Casal', 0, 'Colchão de referência: 138 × 188 cm', '["1 lençol de elástico","2 fronhas"]'::jsonb),
    ('Jogo de Cama Serenidade — Azul', 'Cama / Jogos de cama', 2, 'Queen', 2000, 'Colchão de referência: 158 × 198 cm', '["1 lençol de elástico","2 fronhas"]'::jsonb),
    ('Jogo de Cama Serenidade — Azul Claro', 'Cama / Jogos de cama', 1, 'Casal', 0, 'Colchão de referência: 138 × 188 cm', '["1 lençol de elástico","2 fronhas"]'::jsonb),
    ('Jogo de Cama Serenidade — Azul Claro', 'Cama / Jogos de cama', 2, 'Queen', 2000, 'Colchão de referência: 158 × 198 cm', '["1 lençol de elástico","2 fronhas"]'::jsonb),
    ('Edredom Aconchego — Creme', 'Cama / Edredons', 1, 'Solteiro', 0, 'Edredom: 150 × 220 cm', '["1 edredom"]'::jsonb),
    ('Edredom Aconchego — Creme', 'Cama / Edredons', 2, 'Casal', 2000, 'Edredom: 200 × 220 cm', '["1 edredom"]'::jsonb),
    ('Edredom Aconchego — Marrom Cacau', 'Cama / Edredons', 1, 'Solteiro', 0, 'Edredom: 150 × 220 cm', '["1 edredom"]'::jsonb),
    ('Edredom Aconchego — Marrom Cacau', 'Cama / Edredons', 2, 'Casal', 2000, 'Edredom: 200 × 220 cm', '["1 edredom"]'::jsonb),
    ('Edredom Aconchego — Verde Oliva', 'Cama / Edredons', 1, 'Solteiro', 0, 'Edredom: 150 × 220 cm', '["1 edredom"]'::jsonb),
    ('Edredom Aconchego — Verde Oliva', 'Cama / Edredons', 2, 'Casal', 2000, 'Edredom: 200 × 220 cm', '["1 edredom"]'::jsonb),
    ('Edredom Geométrico — Azul Petróleo', 'Cama / Edredons', 1, 'Casal', 0, 'Edredom: 200 × 220 cm', '["1 edredom"]'::jsonb),
    ('Edredom Geométrico — Azul Petróleo', 'Cama / Edredons', 2, 'Queen', 2000, 'Edredom: 240 × 260 cm', '["1 edredom"]'::jsonb),
    ('Edredom Geométrico — Rosa Nude', 'Cama / Edredons', 1, 'Casal', 0, 'Edredom: 200 × 220 cm', '["1 edredom"]'::jsonb),
    ('Edredom Geométrico — Rosa Nude', 'Cama / Edredons', 2, 'Queen', 2000, 'Edredom: 240 × 260 cm', '["1 edredom"]'::jsonb),
    ('Edredom Geométrico — Verde Sálvia', 'Cama / Edredons', 1, 'Casal', 0, 'Edredom: 200 × 220 cm', '["1 edredom"]'::jsonb),
    ('Edredom Geométrico — Verde Sálvia', 'Cama / Edredons', 2, 'Queen', 2000, 'Edredom: 240 × 260 cm', '["1 edredom"]'::jsonb),
    ('Edredom Jardim — Azul Lavanda', 'Cama / Edredons', 1, 'Queen', 0, 'Edredom: 240 × 260 cm', '["1 edredom"]'::jsonb),
    ('Edredom Jardim — Azul Lavanda', 'Cama / Edredons', 2, 'King', 2000, 'Edredom: 260 × 280 cm', '["1 edredom"]'::jsonb),
    ('Edredom Jardim — Verde Musgo', 'Cama / Edredons', 1, 'Queen', 0, 'Edredom: 240 × 260 cm', '["1 edredom"]'::jsonb),
    ('Edredom Jardim — Verde Musgo', 'Cama / Edredons', 2, 'King', 2000, 'Edredom: 260 × 280 cm', '["1 edredom"]'::jsonb),
    ('Cobre-Leito Natural — Verde Botânico', 'Cama / Colchas e cobre-leitos', 1, 'Casal', 0, 'Cobre-leito: 220 × 240 cm', '["1 cobre-leito"]'::jsonb),
    ('Cobre-Leito Natural — Verde Botânico', 'Cama / Colchas e cobre-leitos', 2, 'Queen', 2000, 'Cobre-leito: 240 × 260 cm', '["1 cobre-leito"]'::jsonb),
    ('Cobre-Leito Natural — Folhagens Suaves', 'Cama / Colchas e cobre-leitos', 1, 'Casal', 0, 'Cobre-leito: 220 × 240 cm', '["1 cobre-leito"]'::jsonb),
    ('Cobre-Leito Natural — Folhagens Suaves', 'Cama / Colchas e cobre-leitos', 2, 'Queen', 2000, 'Cobre-leito: 240 × 260 cm', '["1 cobre-leito"]'::jsonb),
    ('Cobre-Leito Natural — Botânico Neutro', 'Cama / Colchas e cobre-leitos', 1, 'Casal', 0, 'Cobre-leito: 220 × 240 cm', '["1 cobre-leito"]'::jsonb),
    ('Cobre-Leito Natural — Botânico Neutro', 'Cama / Colchas e cobre-leitos', 2, 'Queen', 2000, 'Cobre-leito: 240 × 260 cm', '["1 cobre-leito"]'::jsonb),
    ('Colcha Provence — Lilás', 'Cama / Colchas e cobre-leitos', 1, 'Casal', 0, 'Colcha: 220 × 240 cm', '["1 colcha","2 porta-travesseiros"]'::jsonb),
    ('Colcha Provence — Lilás', 'Cama / Colchas e cobre-leitos', 2, 'Queen', 2000, 'Colcha: 240 × 260 cm', '["1 colcha","2 porta-travesseiros"]'::jsonb),
    ('Colcha Provence — Lilás', 'Cama / Colchas e cobre-leitos', 3, 'King', 4000, 'Colcha: 260 × 280 cm', '["1 colcha","2 porta-travesseiros"]'::jsonb),
    ('Colcha Provence — Rosa', 'Cama / Colchas e cobre-leitos', 1, 'Casal', 0, 'Colcha: 220 × 240 cm', '["1 colcha","2 porta-travesseiros"]'::jsonb),
    ('Colcha Provence — Rosa', 'Cama / Colchas e cobre-leitos', 2, 'Queen', 2000, 'Colcha: 240 × 260 cm', '["1 colcha","2 porta-travesseiros"]'::jsonb),
    ('Colcha Provence — Rosa', 'Cama / Colchas e cobre-leitos', 3, 'King', 4000, 'Colcha: 260 × 280 cm', '["1 colcha","2 porta-travesseiros"]'::jsonb),
    ('Protetor SoftCare', 'Cama / Protetores de colchão', 1, 'Solteiro', 0, 'Colchão de referência: 88 × 188 cm', '["1 protetor de colchão"]'::jsonb),
    ('Protetor SoftCare', 'Cama / Protetores de colchão', 2, 'Casal', 2000, 'Colchão de referência: 138 × 188 cm', '["1 protetor de colchão"]'::jsonb),
    ('Protetor SoftCare', 'Cama / Protetores de colchão', 3, 'Queen', 4000, 'Colchão de referência: 158 × 198 cm', '["1 protetor de colchão"]'::jsonb),
    ('Protetor Protege', 'Cama / Protetores de colchão', 1, 'Casal', 0, 'Colchão de referência: 138 × 188 cm', '["1 protetor de colchão"]'::jsonb),
    ('Protetor Protege', 'Cama / Protetores de colchão', 2, 'Queen', 2000, 'Colchão de referência: 158 × 198 cm', '["1 protetor de colchão"]'::jsonb),
    ('Protetor Protege', 'Cama / Protetores de colchão', 3, 'King', 4000, 'Colchão de referência: 193 × 203 cm', '["1 protetor de colchão"]'::jsonb);

INSERT INTO catalog_variant_seed_000014 (product_id, original_quantity)
SELECT p.id, p.quantity
FROM products p
JOIN product_types t ON t.id = p.product_type_id
WHERE p.status = 'active'
  AND EXISTS (
      SELECT 1 FROM catalog_variant_plan_000014 plan
      WHERE plan.product_name = p.name AND plan.category_name = t.name
  )
  AND (SELECT count(*) FROM products other
       WHERE other.name = p.name AND other.product_type_id = p.product_type_id) = 1
  AND NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id)
  AND NOT EXISTS (SELECT 1 FROM cart_items item WHERE item.product_id = p.id)
  AND NOT EXISTS (
      SELECT 1 FROM checkout_order_items item
      JOIN checkout_orders o ON o.id = item.order_id
      WHERE item.product_id = p.id AND o.stock_debited AND o.status <> 'cancelled'
  );

WITH planned AS (
    SELECT seed.product_id, seed.original_quantity, p.price, plan.*,
           count(*) OVER (PARTITION BY seed.product_id)::integer AS variant_count
    FROM catalog_variant_seed_000014 seed
    JOIN products p ON p.id = seed.product_id
    JOIN product_types t ON t.id = p.product_type_id
    JOIN catalog_variant_plan_000014 plan ON plan.product_name = p.name AND plan.category_name = t.name
), inserted AS (
    INSERT INTO product_variants (product_id, size, price, quantity, dimensions, included_items, simulated)
    SELECT product_id, size, price + surcharge_cents / 100.0,
           original_quantity / variant_count +
               CASE WHEN position <= mod(original_quantity, variant_count) THEN 1 ELSE 0 END,
           dimensions, included_items, TRUE
    FROM planned
    ORDER BY product_id, position
    RETURNING id, product_id
), registered AS (
    SELECT product_id, array_agg(id ORDER BY id) AS ids FROM inserted GROUP BY product_id
)
UPDATE catalog_variant_seed_000014 seed
SET variant_ids = registered.ids
FROM registered
WHERE registered.product_id = seed.product_id;

UPDATE products p SET quantity = 0
FROM catalog_variant_seed_000014 seed
WHERE p.id = seed.product_id AND cardinality(seed.variant_ids) > 0;

COMMIT;
