ALTER TABLE users
    DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
    ALTER COLUMN birth_date SET NOT NULL,
    ALTER COLUMN national_id SET NOT NULL;
