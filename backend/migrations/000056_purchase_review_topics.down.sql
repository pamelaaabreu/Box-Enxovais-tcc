BEGIN;
LOCK TABLE purchase_experience_reviews IN ACCESS EXCLUSIVE MODE;
DO $$ BEGIN IF EXISTS(SELECT 1 FROM purchase_experience_reviews WHERE cardinality(topics)>0) THEN RAISE EXCEPTION 'Rollback bloqueado: existem critérios de avaliações que devem ser preservados'; END IF; END $$;
ALTER TABLE purchase_experience_reviews DROP CONSTRAINT purchase_review_topics_valid;
ALTER TABLE purchase_experience_reviews DROP COLUMN topics;
COMMIT;
