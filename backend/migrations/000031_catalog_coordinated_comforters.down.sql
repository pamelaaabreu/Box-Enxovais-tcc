BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE cart_items, checkout_order_items, favorites, promotion_products,
           products, product_variants, product_images IN SHARE ROW EXCLUSIVE MODE;

DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM catalog_coordinated_comforters_000031 j
        JOIN products p ON p.id = j.product_id
        WHERE to_jsonb(p) IS DISTINCT FROM j.product_snapshot
           OR (SELECT jsonb_agg(to_jsonb(v) ORDER BY v.id) FROM product_variants v WHERE v.product_id = p.id)
              IS DISTINCT FROM j.variants_snapshot
           OR (SELECT jsonb_agg(to_jsonb(i) ORDER BY i.id) FROM product_images i WHERE i.product_id = p.id)
              IS DISTINCT FROM j.images_snapshot
           OR EXISTS (SELECT 1 FROM cart_items i WHERE i.product_id = p.id)
           OR EXISTS (SELECT 1 FROM checkout_order_items i WHERE i.product_id = p.id)
           OR EXISTS (SELECT 1 FROM favorites f WHERE f.product_id = p.id)
           OR EXISTS (SELECT 1 FROM promotion_products o WHERE o.product_id = p.id)
    ) THEN
        RAISE EXCEPTION 'Os edredons coordenados possuem alterações ou vínculos posteriores.';
    END IF;
END $$;

DELETE FROM products p USING catalog_coordinated_comforters_000031 j WHERE p.id = j.product_id;
DROP TABLE catalog_coordinated_comforters_000031;

COMMIT;
