ALTER TABLE users ADD COLUMN business_phone VARCHAR(20);

UPDATE users
SET business_phone = phone, phone = NULL
WHERE regexp_replace(regexp_replace(trim(phone), '^\+55', ''), '[(). -]', '', 'g')
      ~ '^[1-9][0-9][2-5][0-9]{7}$';
