ALTER TABLE promotions ADD COLUMN created_at TIMESTAMPTZ, ADD COLUMN updated_at TIMESTAMPTZ;
ALTER TABLE promotions ALTER COLUMN created_at SET DEFAULT NOW();
CREATE FUNCTION set_promotion_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = clock_timestamp();
  RETURN NEW;
END;
$$;
CREATE TRIGGER promotion_updated_at BEFORE UPDATE ON promotions FOR EACH ROW EXECUTE FUNCTION set_promotion_updated_at();
