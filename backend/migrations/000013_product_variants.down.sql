BEGIN;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM cart_items WHERE variant_id IS NOT NULL)
       OR EXISTS (SELECT 1 FROM checkout_order_items WHERE variant_id IS NOT NULL)
       OR EXISTS (SELECT 1 FROM product_images WHERE variant_id IS NOT NULL) THEN
        RAISE EXCEPTION 'Existem referências comerciais a variantes. Preserve esses dados antes da reversão.';
    END IF;
END $$;

ALTER TABLE checkout_order_items DROP COLUMN variant_id;
DROP INDEX cart_items_sellable_key;
ALTER TABLE cart_items DROP COLUMN variant_id;
ALTER TABLE cart_items ADD UNIQUE (cart_id, product_id);
ALTER TABLE product_images DROP COLUMN variant_id;
DROP TABLE product_variants;

COMMIT;
