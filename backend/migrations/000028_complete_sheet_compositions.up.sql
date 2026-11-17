BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE carts, cart_items, products, checkout_orders, checkout_order_items, product_variants IN SHARE ROW EXCLUSIVE MODE;

CREATE TABLE catalog_sheet_contents_000028 (
    product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    measurements_were_null BOOLEAN NOT NULL
);

INSERT INTO catalog_sheet_contents_000028
SELECT p.id,p.measurements IS NULL
FROM products p JOIN product_types t ON t.id=p.product_type_id
WHERE p.name='Jogo de Cama Essência Floral — Verde Oliva'
  AND t.name='Cama / Jogos de cama' AND p.status='active'
  AND NOT (COALESCE(p.measurements,'{}'::jsonb) ? 'Conteúdo')
  AND NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id=p.id);

UPDATE products p SET measurements=COALESCE(p.measurements,'{}'::jsonb)
    || jsonb_build_object('Conteúdo','1 lençol de elástico; 2 fronhas')
FROM catalog_sheet_contents_000028 s WHERE p.id=s.product_id;

CREATE TABLE catalog_sheet_variant_seed_000028 (
    product_id INTEGER PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
    original_quantity INTEGER NOT NULL,
    variant_ids INTEGER[] NOT NULL DEFAULT '{}'
);

INSERT INTO catalog_sheet_variant_seed_000028(product_id,original_quantity)
SELECT p.id,p.quantity
FROM products p JOIN product_types t ON t.id=p.product_type_id
WHERE p.name IN ('Jogo de Cama Serenidade — Azul','Jogo de Cama Serenidade — Azul Claro')
  AND t.name='Cama / Jogos de cama' AND p.status='active'
  AND NOT EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id=p.id)
  AND NOT EXISTS (SELECT 1 FROM cart_items i WHERE i.product_id=p.id)
  AND NOT EXISTS (
      SELECT 1 FROM checkout_order_items i JOIN checkout_orders o ON o.id=i.order_id
      WHERE i.product_id=p.id AND o.stock_debited AND o.status<>'cancelled'
  );

WITH inserted AS (
    INSERT INTO product_variants(product_id,size,price,quantity,dimensions,included_items,simulated)
    SELECT p.id,v.size,p.price,s.original_quantity/2
             + CASE WHEN v.position=1 THEN mod(s.original_quantity,2) ELSE 0 END,
           v.dimensions,'["1 lençol de elástico","2 fronhas"]'::jsonb,true
    FROM catalog_sheet_variant_seed_000028 s JOIN products p ON p.id=s.product_id
    CROSS JOIN (VALUES (1,'Casal','Colchão de referência: 138 × 188 cm'),
                       (2,'Queen','Colchão de referência: 158 × 198 cm')) v(position,size,dimensions)
    ORDER BY p.id,v.position
    RETURNING id,product_id
), registered AS (
    SELECT product_id,array_agg(id ORDER BY id) AS ids FROM inserted GROUP BY product_id
)
UPDATE catalog_sheet_variant_seed_000028 s SET variant_ids=r.ids
FROM registered r WHERE s.product_id=r.product_id;

UPDATE products p SET quantity=0
FROM catalog_sheet_variant_seed_000028 s
WHERE p.id=s.product_id AND cardinality(s.variant_ids)=2;

COMMIT;
