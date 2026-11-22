DO $$
BEGIN
 LOCK TABLE checkout_orders IN ACCESS EXCLUSIVE MODE;
 IF EXISTS (SELECT 1 FROM checkout_orders WHERE installments IS NOT NULL) THEN
  RAISE EXCEPTION 'Rollback recusado: existem pedidos com parcelamento histórico registrado';
 END IF;
 ALTER TABLE checkout_orders DROP CONSTRAINT checkout_order_installments_valid;
 ALTER TABLE checkout_orders DROP COLUMN installments;
END $$;
