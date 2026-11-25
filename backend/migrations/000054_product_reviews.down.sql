BEGIN;
LOCK TABLE product_reviews IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN
 IF EXISTS (SELECT 1 FROM product_reviews) THEN
  RAISE EXCEPTION 'Rollback recusado: existem avaliações de produtos que devem ser preservadas';
 END IF;
END $$;
DROP TABLE product_reviews;
COMMIT;
