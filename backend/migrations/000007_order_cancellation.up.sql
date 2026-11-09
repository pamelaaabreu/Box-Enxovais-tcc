ALTER TABLE checkout_orders
    ADD COLUMN stock_debited BOOLEAN NOT NULL DEFAULT FALSE,
    DROP CONSTRAINT checkout_orders_status_check,
    ADD CONSTRAINT checkout_orders_status_check CHECK (status IN ('simulated_approved', 'cancelled'));
