ALTER TABLE purchase_experience_reviews
    ALTER COLUMN navigation DROP NOT NULL,
    ALTER COLUMN service DROP NOT NULL,
    ALTER COLUMN experience DROP NOT NULL;
