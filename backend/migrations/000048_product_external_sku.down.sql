DROP TRIGGER products_assign_sku ON products;
DROP FUNCTION assign_product_sku();
ALTER TABLE products DROP COLUMN sku;
DROP SEQUENCE product_sku_sequence;
