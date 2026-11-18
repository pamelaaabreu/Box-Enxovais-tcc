BEGIN;
SET LOCAL lock_timeout='5s';
LOCK TABLE products IN SHARE ROW EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS(SELECT 1 FROM catalog_rug_titles_000047 j JOIN products p ON p.id=j.product_id WHERE p.name<>j.new_name)
 THEN RAISE EXCEPTION 'Títulos editados após a migration; rollback interrompido.'; END IF;
END $$;
UPDATE products p SET name=j.old_name FROM catalog_rug_titles_000047 j WHERE p.id=j.product_id;
DROP TABLE catalog_rug_titles_000047;
COMMIT;
