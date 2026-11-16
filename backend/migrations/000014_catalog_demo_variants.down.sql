BEGIN;

SET LOCAL lock_timeout = '5s';
LOCK TABLE carts, cart_items, products, checkout_orders, checkout_order_items, product_variants, product_images
    IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM catalog_variant_seed_000014 seed
        JOIN products p ON p.id = seed.product_id
        WHERE p.quantity <> 0
           OR cardinality(seed.variant_ids) <> (SELECT count(*) FROM product_variants v
                                                WHERE v.product_id = p.id AND v.id = ANY(seed.variant_ids) AND v.simulated)
           OR seed.original_quantity <> (SELECT COALESCE(sum(v.quantity), 0) FROM product_variants v
                                          WHERE v.product_id = p.id AND v.id = ANY(seed.variant_ids))
           OR EXISTS (SELECT 1 FROM product_variants v WHERE v.product_id = p.id AND v.id <> ALL(seed.variant_ids))
           OR EXISTS (SELECT 1 FROM cart_items i WHERE i.product_id = p.id)
           OR EXISTS (SELECT 1 FROM checkout_order_items i WHERE i.variant_id = ANY(seed.variant_ids))
           OR EXISTS (SELECT 1 FROM product_images i WHERE i.variant_id = ANY(seed.variant_ids))
    ) THEN
        RAISE EXCEPTION 'Há movimentação, alteração de estoque ou vínculos posteriores em variantes de demonstração.';
    END IF;
END $$;

UPDATE products p SET quantity = seed.original_quantity
FROM catalog_variant_seed_000014 seed WHERE p.id = seed.product_id;

DELETE FROM product_variants v
USING catalog_variant_seed_000014 seed
WHERE v.product_id = seed.product_id AND v.id = ANY(seed.variant_ids);

DROP TABLE catalog_variant_seed_000014;

COMMIT;
