CREATE TABLE order_cancellations (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    order_id BIGINT NOT NULL UNIQUE REFERENCES checkout_orders(id) ON DELETE CASCADE,
    reason_code TEXT NOT NULL CHECK (reason_code IN ('changed_mind', 'wrong_product', 'wrong_address', 'duplicate_order', 'other')),
    reason_details VARCHAR(500) CHECK (reason_code = 'other' OR reason_details IS NULL),
    cancelled_at TIMESTAMPTZ NOT NULL DEFAULT clock_timestamp(),
    cancelled_by INTEGER NOT NULL REFERENCES users(id)
);
