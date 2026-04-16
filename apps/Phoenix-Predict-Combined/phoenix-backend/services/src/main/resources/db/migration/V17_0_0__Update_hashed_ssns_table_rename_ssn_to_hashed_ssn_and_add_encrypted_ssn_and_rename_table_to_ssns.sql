ALTER TABLE hashed_ssns RENAME COLUMN ssn TO hashed_ssn;

ALTER TABLE hashed_ssns ADD COLUMN encrypted_ssn character varying NOT NULL;

ALTER TABLE hashed_ssns RENAME TO ssns;
