BEGIN;
DROP TABLE purchase_experience_reviews;
ALTER TABLE promotions DROP COLUMN description,DROP COLUMN image_path,DROP COLUMN home_featured;
COMMIT;
