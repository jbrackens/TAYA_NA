CREATE TABLE dge_exclusions (
    unique_id character varying NOT NULL PRIMARY KEY,
    last_name character varying NOT NULL,
    hashed_ssn character varying NULL,
    date_of_birth date NOT NULL,
    exclusion_status character varying NOT NULL,
    exclusion_status_change_date date NOT NULL,
    updated_at timestamptz NOT NULL
);

CREATE INDEX "index_exclusion_status" ON dge_exclusions USING btree (exclusion_status);
CREATE INDEX "index_ssn" ON dge_exclusions USING btree (hashed_ssn);
CREATE INDEX "index_date_of_birth" ON dge_exclusions USING btree (date_of_birth);
CREATE INDEX "index_last_name" ON dge_exclusions USING btree (last_name);