ALTER TABLE punter_ssns ADD last_4_ssn_digits VARCHAR NOT NULL;
CREATE INDEX "index_punter_ssns_last_4_ssn_digits" ON punter_ssns USING btree (last_4_ssn_digits);

ALTER TABLE dge_exclusions ADD last_4_ssn_digits VARCHAR NULL;
CREATE INDEX "index_dge_exclusions_last_4_ssn_digits" ON dge_exclusions USING btree (last_4_ssn_digits);