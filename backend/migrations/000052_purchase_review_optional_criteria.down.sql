DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM purchase_experience_reviews WHERE navigation IS NULL OR service IS NULL OR experience IS NULL) THEN
        RAISE EXCEPTION 'Rollback recusado: existem avaliações sem critérios auxiliares; preserve as opiniões registradas';
    END IF;
END $$;
ALTER TABLE purchase_experience_reviews
    ALTER COLUMN navigation SET NOT NULL,
    ALTER COLUMN service SET NOT NULL,
    ALTER COLUMN experience SET NOT NULL;
