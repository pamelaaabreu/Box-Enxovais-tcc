BEGIN;
-- Não modifica os registros existentes. Duplicatas normalizadas impedem a aplicação.
CREATE UNIQUE INDEX users_email_normalized_key ON users (lower(btrim(email)));
CREATE UNIQUE INDEX subscribers_email_normalized_key ON subscribers (lower(btrim(email)));
CREATE UNIQUE INDEX users_national_id_normalized_key
    ON users (translate(national_id, '.- ', ''))
    WHERE national_id IS NOT NULL AND translate(national_id, '.- ', '') <> '';
COMMIT;
