CREATE TABLE self_excluded_punters (
    punter_id character varying PRIMARY KEY,
    exclusion_duration character varying NOT NULL,
    excluded_at timestamptz NOT NULL
);

CREATE INDEX "index_excluded_at" ON self_excluded_punters USING btree (excluded_at);
