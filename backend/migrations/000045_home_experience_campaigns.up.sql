BEGIN;
CREATE TABLE purchase_experience_reviews (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 order_id BIGINT NOT NULL UNIQUE REFERENCES checkout_orders(id),
 user_id INTEGER NOT NULL REFERENCES users(id),
 overall SMALLINT NOT NULL CHECK(overall BETWEEN 1 AND 5),
 navigation SMALLINT NOT NULL CHECK(navigation BETWEEN 1 AND 5),
 service SMALLINT NOT NULL CHECK(service BETWEEN 1 AND 5),
 experience SMALLINT NOT NULL CHECK(experience BETWEEN 1 AND 5),
 comment TEXT NOT NULL DEFAULT '' CHECK(char_length(comment)<=1000),
 publication_consent BOOLEAN NOT NULL DEFAULT FALSE,
 status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN('pending','approved','rejected')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 moderated_at TIMESTAMPTZ,
 moderated_by INTEGER REFERENCES users(id) ON DELETE SET NULL
);
ALTER TABLE promotions ADD COLUMN description TEXT NOT NULL DEFAULT '', ADD COLUMN image_path TEXT NOT NULL DEFAULT '', ADD COLUMN home_featured BOOLEAN NOT NULL DEFAULT FALSE;
COMMIT;
