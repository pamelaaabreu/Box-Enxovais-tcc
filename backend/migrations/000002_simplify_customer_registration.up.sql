ALTER TABLE users
    ALTER COLUMN birth_date DROP NOT NULL,
    ALTER COLUMN national_id DROP NOT NULL;

ALTER TABLE users
    ADD CONSTRAINT users_role_check
        CHECK (role IN ('customer', 'admin'));
