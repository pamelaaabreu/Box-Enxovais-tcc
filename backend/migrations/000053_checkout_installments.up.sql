ALTER TABLE checkout_orders
    ADD COLUMN installments smallint,
    ADD CONSTRAINT checkout_order_installments_valid CHECK (
        installments IS NULL OR
        (payment_method = 'card' AND installments BETWEEN 1 AND 6) OR
        (payment_method IN ('pix', 'boleto') AND installments = 1)
    );

COMMENT ON COLUMN checkout_orders.installments IS 'Quantidade de parcelas simuladas, sem juros. NULL indica pedido histórico sem informação de parcelamento.';
