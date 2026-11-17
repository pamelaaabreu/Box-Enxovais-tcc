BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE carts, cart_items, products, checkout_orders, checkout_order_items, product_variants, product_images IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM catalog_sheet_variant_seed_000028 s JOIN products p ON p.id=s.product_id
        WHERE p.quantity<>0
           OR (SELECT count(*) FROM product_variants v WHERE v.product_id=p.id AND v.id=ANY(s.variant_ids) AND v.simulated)<>2
           OR (SELECT count(*) FROM product_variants v WHERE v.product_id=p.id)<>2
           OR (SELECT COALESCE(sum(v.quantity),0) FROM product_variants v WHERE v.id=ANY(s.variant_ids))<>s.original_quantity
           OR EXISTS (SELECT 1 FROM cart_items i WHERE i.product_id=p.id)
           OR EXISTS (SELECT 1 FROM checkout_order_items i WHERE i.variant_id=ANY(s.variant_ids))
           OR EXISTS (SELECT 1 FROM product_images i WHERE i.variant_id=ANY(s.variant_ids))
    ) THEN
        RAISE EXCEPTION 'Variantes Serenidade possuem movimentações ou vínculos posteriores.';
    END IF;
END $$;

UPDATE products p SET quantity=s.original_quantity
FROM catalog_sheet_variant_seed_000028 s WHERE p.id=s.product_id;

DELETE FROM product_variants v USING catalog_sheet_variant_seed_000028 s
WHERE v.product_id=s.product_id AND v.id=ANY(s.variant_ids);

UPDATE products p SET measurements=CASE
    WHEN s.measurements_were_null AND p.measurements-'Conteúdo'='{}'::jsonb THEN NULL
    ELSE p.measurements-'Conteúdo' END
FROM catalog_sheet_contents_000028 s
WHERE p.id=s.product_id AND p.measurements->>'Conteúdo'='1 lençol de elástico; 2 fronhas';

DROP TABLE catalog_sheet_variant_seed_000028;
DROP TABLE catalog_sheet_contents_000028;
COMMIT;
