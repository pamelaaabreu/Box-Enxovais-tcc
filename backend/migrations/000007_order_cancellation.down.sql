-- Fails safely if cancelled orders exist.
ALTER TABLE checkout_orders
    DROP CONSTRAINT checkout_orders_status_check,
    ADD CONSTRAINT checkout_orders_status_check CHECK (status = 'simulated_approved'),
    DROP COLUMN stock_debited;
