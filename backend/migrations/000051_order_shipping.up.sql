ALTER TABLE checkout_orders
    ADD COLUMN shipping_cents bigint CHECK (shipping_cents >= 0),
    ADD COLUMN shipping_min_days integer CHECK (shipping_min_days >= 0),
    ADD COLUMN shipping_max_days integer CHECK (shipping_max_days >= shipping_min_days),
    ADD COLUMN shipping_method text CHECK (shipping_method = 'delivery'),
    ADD COLUMN products_subtotal_cents bigint CHECK (products_subtotal_cents >= 0),
    ADD COLUMN discount_cents bigint CHECK (discount_cents >= 0),
    ADD CONSTRAINT checkout_order_shipping_snapshot CHECK (
        (shipping_cents IS NULL AND shipping_min_days IS NULL AND shipping_max_days IS NULL AND shipping_method IS NULL AND products_subtotal_cents IS NULL AND discount_cents IS NULL)
        OR (shipping_cents IS NOT NULL AND shipping_min_days IS NOT NULL AND shipping_max_days IS NOT NULL AND shipping_method IS NOT NULL AND products_subtotal_cents IS NOT NULL AND discount_cents IS NOT NULL AND discount_cents <= products_subtotal_cents AND total_cents::numeric = products_subtotal_cents::numeric - discount_cents::numeric + shipping_cents::numeric)
    );
