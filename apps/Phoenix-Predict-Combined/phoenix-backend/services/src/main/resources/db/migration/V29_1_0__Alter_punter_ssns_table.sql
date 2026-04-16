ALTER TABLE punter_ssns
    ALTER COLUMN hashed_ssn DROP NOT NULL,
    ALTER COLUMN encrypted_ssn DROP NOT NULL;
