DROP TRIGGER promotion_updated_at ON promotions;
DROP FUNCTION set_promotion_updated_at();
ALTER TABLE promotions DROP COLUMN created_at, DROP COLUMN updated_at;
