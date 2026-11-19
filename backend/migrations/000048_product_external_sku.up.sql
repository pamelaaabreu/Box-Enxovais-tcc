ALTER TABLE products ADD COLUMN sku VARCHAR(32);
CREATE SEQUENCE product_sku_sequence;

CREATE FUNCTION assign_product_sku() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE category_name TEXT; prefix TEXT; number TEXT;
BEGIN
  NEW.sku := upper(btrim(COALESCE(NEW.sku, '')));
  IF TG_OP = 'UPDATE' AND NEW.sku = '' AND OLD.sku IS NOT NULL THEN
    NEW.sku := OLD.sku;
    RETURN NEW;
  END IF;
  IF NEW.sku = '' THEN
    SELECT name INTO category_name FROM product_types WHERE id = NEW.product_type_id;
    prefix := CASE
      WHEN category_name = 'Cama / Edredons' THEN 'EDR'
      WHEN category_name = 'Cama / Colchas e cobre-leitos' THEN 'COL'
      WHEN category_name = 'Cama / Mantas e peseiras' THEN 'MAN'
      WHEN category_name = 'Cama / Protetores de colchão' THEN 'PRO'
      WHEN category_name IN ('Cama', 'Cama / Jogos de cama') THEN 'CAM'
      WHEN category_name = 'Travesseiros' THEN 'TRA'
      WHEN category_name = 'Toalhas' THEN 'TOA'
      WHEN category_name = 'Almofadas' THEN 'ALM'
      WHEN category_name = 'Mesa' THEN 'MES'
      WHEN category_name = 'Decoração' AND NEW.measurements->>'Tipo' = 'Cortinas' THEN 'COR'
      WHEN category_name = 'Decoração' AND NEW.measurements->>'Tipo' IN ('Tapetes para quarto e sala', 'Tapetes para banheiro / saída de box') THEN 'TAP'
      WHEN category_name = 'Decoração' THEN 'DEC'
      ELSE 'PRD' END;
    LOOP
      number := nextval('product_sku_sequence')::text;
      NEW.sku := 'BX-' || prefix || '-' || lpad(number, greatest(3, length(number)), '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM products WHERE sku = NEW.sku);
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER products_assign_sku BEFORE INSERT OR UPDATE OF sku ON products FOR EACH ROW EXECUTE FUNCTION assign_product_sku();
DO $$
DECLARE product_id BIGINT;
BEGIN
  FOR product_id IN SELECT id FROM products ORDER BY id LOOP
    UPDATE products SET sku = '' WHERE id = product_id;
  END LOOP;
END;
$$;
ALTER TABLE products ALTER COLUMN sku SET NOT NULL;
ALTER TABLE products ADD CONSTRAINT products_sku_format CHECK (length(sku) BETWEEN 3 AND 32 AND sku ~ '^[A-Z0-9]+(-[A-Z0-9]+)*$');
ALTER TABLE products ADD CONSTRAINT products_sku_key UNIQUE (sku);
