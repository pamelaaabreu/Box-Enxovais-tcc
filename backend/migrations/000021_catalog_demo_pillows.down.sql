BEGIN;
SET LOCAL lock_timeout = '5s';
LOCK TABLE products, cart_items, checkout_order_items, favorites IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cart_items i JOIN catalog_pillows_seed_000021 s USING (product_id))
       OR EXISTS (SELECT 1 FROM checkout_order_items i JOIN catalog_pillows_seed_000021 s USING (product_id))
       OR EXISTS (SELECT 1 FROM favorites i JOIN catalog_pillows_seed_000021 s USING (product_id)) THEN
        RAISE EXCEPTION 'Catálogo de travesseiros em uso em carrinhos, pedidos ou favoritos';
    END IF;
END $$;
DELETE FROM products p USING catalog_pillows_seed_000021 s WHERE p.id = s.product_id;
DELETE FROM product_types t USING catalog_pillow_category_seed_000021 s
WHERE t.id = s.category_id AND NOT EXISTS (SELECT 1 FROM products p WHERE p.product_type_id = t.id);
DROP TABLE catalog_pillows_seed_000021, catalog_pillow_category_seed_000021;
COMMIT;
