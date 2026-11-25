BEGIN;
ALTER TABLE purchase_experience_reviews ADD COLUMN topics text[] NOT NULL DEFAULT '{}';
ALTER TABLE purchase_experience_reviews ADD CONSTRAINT purchase_review_topics_valid CHECK (cardinality(topics)<=5 AND topics <@ ARRAY['navigation','product_information','checkout','payment','shipping']::text[]);
COMMIT;
