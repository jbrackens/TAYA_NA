CREATE TABLE punter_cool_offs_history (
    id bigserial NOT NULL PRIMARY KEY,
    punter_id character varying NOT NULL,
    cool_off_start timestamptz NOT NULL,
    cool_off_end timestamptz NOT NULL,
    cool_off_cause character varying NOT NULL
);

CREATE INDEX "punter_cool_offs_history_punterId" ON punter_cool_offs_history USING btree (punter_id);
