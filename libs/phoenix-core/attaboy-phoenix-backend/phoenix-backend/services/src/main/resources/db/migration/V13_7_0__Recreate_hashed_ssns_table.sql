DROP TABLE hashed_ssns;
CREATE TABLE hashed_ssns (
    ssn character varying NOT NULL PRIMARY KEY,
    punter_id character varying NOT NULL UNIQUE
);
