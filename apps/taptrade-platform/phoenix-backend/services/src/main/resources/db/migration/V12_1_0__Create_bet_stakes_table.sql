CREATE TABLE punter_stakes (
    bet_id character varying NOT NULL PRIMARY KEY,
    punter_id character varying NOT NULL,
    stake jsonb NOT NULL,
    odds decimal NOT NULL,
    placed_at timestamptz NOT NULL,
    status character varying NOT NULL,
    outcome character varying NULL
);

CREATE INDEX "index_punterId_placedAt" ON punter_stakes USING btree (punter_id, placed_at);
