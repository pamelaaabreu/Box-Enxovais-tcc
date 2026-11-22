DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM checkout_orders WHERE shipping_cents IS NOT NULL) THEN
        RAISE EXCEPTION 'Rollback recusado: existem pedidos com valores históricos de frete registrados';
    END IF;
END $$;
ALTER TABLE checkout_orders
    DROP CONSTRAINT checkout_order_shipping_snapshot,
    DROP COLUMN shipping_cents,
    DROP COLUMN shipping_min_days,
    DROP COLUMN shipping_max_days,
    DROP COLUMN shipping_method,
    DROP COLUMN products_subtotal_cents,
    DROP COLUMN discount_cents;
