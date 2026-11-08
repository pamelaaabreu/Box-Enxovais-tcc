-- Abort without changing existing negative quantities.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM products WHERE quantity < 0) THEN
        RAISE EXCEPTION 'Existem produtos com estoque negativo. Revise os registros antes de aplicar esta migration.';
    END IF;
END $$;
ALTER TABLE products ADD CONSTRAINT products_quantity_nonnegative CHECK (quantity >= 0);
