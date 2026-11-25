BEGIN;
-- Avaliações de produto são independentes das avaliações de experiência do pedido.
CREATE TABLE product_reviews (
 id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 product_id INTEGER NOT NULL REFERENCES products(id),
 user_id INTEGER NOT NULL REFERENCES users(id),
 order_id BIGINT NOT NULL REFERENCES checkout_orders(id),
 rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
 comment TEXT NOT NULL DEFAULT '' CHECK (char_length(comment) <= 1000),
 publication_consent BOOLEAN NOT NULL DEFAULT FALSE,
 status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 moderated_at TIMESTAMPTZ,
 moderated_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
 CONSTRAINT product_reviews_user_product_key UNIQUE(user_id, product_id)
);
CREATE INDEX product_reviews_public_product_idx ON product_reviews(product_id, created_at DESC, id DESC) WHERE status='approved' AND publication_consent;
CREATE INDEX product_reviews_user_created_idx ON product_reviews(user_id, created_at DESC, id DESC);
CREATE INDEX product_reviews_order_idx ON product_reviews(order_id);
COMMIT;
