DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM users WHERE phone IS NOT NULL AND business_phone IS NOT NULL) THEN
        RAISE EXCEPTION 'Rollback would discard a business phone';
    END IF;
END $$;

UPDATE users SET phone = business_phone WHERE phone IS NULL AND business_phone IS NOT NULL;
ALTER TABLE users DROP COLUMN business_phone;
