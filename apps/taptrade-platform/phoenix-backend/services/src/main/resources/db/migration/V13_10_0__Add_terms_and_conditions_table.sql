CREATE TABLE terms_and_conditions (
    current_terms_version integer NOT NULL PRIMARY KEY,
    terms_content character varying NOT NULL,
    terms_days_threshold integer NOT NULL
);