CREATE TABLE user_addresses (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    label VARCHAR(40) NOT NULL,
    recipient VARCHAR(200) NOT NULL,
    zip_code VARCHAR(9) NOT NULL,
    street VARCHAR(200) NOT NULL,
    number VARCHAR(200) NOT NULL,
    complement VARCHAR(200) NOT NULL DEFAULT '',
    neighborhood VARCHAR(200) NOT NULL,
    city VARCHAR(200) NOT NULL,
    state CHAR(2) NOT NULL,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX user_addresses_user_idx ON user_addresses(user_id);
CREATE UNIQUE INDEX user_addresses_default_idx ON user_addresses(user_id) WHERE is_default;
ALTER TABLE checkout_orders ADD COLUMN contact_phone VARCHAR(20);
