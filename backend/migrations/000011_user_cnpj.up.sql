ALTER TABLE users ADD COLUMN cnpj VARCHAR(14)
    CHECK (cnpj ~ '^[A-Z0-9]{12}[0-9]{2}$');
CREATE UNIQUE INDEX users_cnpj_unique ON users (cnpj) WHERE cnpj IS NOT NULL;
