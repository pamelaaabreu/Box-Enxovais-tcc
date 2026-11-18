BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE products,product_types,product_images,product_variants,cart_items,checkout_order_items,favorites,promotion_products IN SHARE ROW EXCLUSIVE MODE;
DO $$
BEGIN
 IF EXISTS(
 SELECT 1 FROM catalog_decor_seed_000042 j JOIN products p ON p.id=j.product_id
 WHERE to_jsonb(p) IS DISTINCT FROM j.product_snapshot
 OR (SELECT jsonb_agg(to_jsonb(i) ORDER BY id) FROM product_images i WHERE i.product_id=p.id) IS DISTINCT FROM j.images_snapshot
 OR EXISTS(SELECT 1 FROM cart_items i WHERE i.product_id=p.id)
 OR EXISTS(SELECT 1 FROM checkout_order_items i WHERE i.product_id=p.id)
 OR EXISTS(SELECT 1 FROM favorites i WHERE i.product_id=p.id)
 OR EXISTS(SELECT 1 FROM product_variants i WHERE i.product_id=p.id)
 OR EXISTS(SELECT 1 FROM promotion_products i WHERE i.product_id=p.id)
 ) THEN RAISE EXCEPTION 'Produtos de Decoração possuem alterações ou vínculos posteriores; rollback interrompido.'; END IF;
END $$;
DELETE FROM products p USING catalog_decor_seed_000042 j WHERE p.id=j.product_id;
DELETE FROM product_types t USING catalog_decor_category_000042 j
WHERE t.id=j.category_id AND NOT EXISTS(SELECT 1 FROM products p WHERE p.product_type_id=t.id);
DROP TABLE catalog_decor_seed_000042,catalog_decor_category_000042;
COMMIT;
