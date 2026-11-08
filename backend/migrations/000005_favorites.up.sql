CREATE TABLE favorites (
 user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
 product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
 created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
 PRIMARY KEY (user_id, product_id)
);
CREATE INDEX favorites_product_id_idx ON favorites(product_id);
