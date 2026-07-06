CREATE TABLE punter_limits_history (
    id bigserial NOT NULL PRIMARY KEY,
    punter_id character varying NOT NULL,
    limit_type character varying NOT NULL,
    period_type character varying NOT NULL,
    limit_value character varying NOT NULL,
    effective_from timestamptz NOT NULL,
    requested_at timestamptz NOT NULL
);

CREATE INDEX "index_punter_id" ON punter_limits_history USING btree (punter_id);