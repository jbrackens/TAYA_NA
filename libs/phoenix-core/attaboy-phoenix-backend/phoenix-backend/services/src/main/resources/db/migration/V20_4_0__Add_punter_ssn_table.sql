CREATE TABLE punter_ssns (
    punter_id character varying NOT NULL PRIMARY KEY,
    hashed_ssn character varying NOT NULL UNIQUE,
    encrypted_ssn character varying NOT NULL
);