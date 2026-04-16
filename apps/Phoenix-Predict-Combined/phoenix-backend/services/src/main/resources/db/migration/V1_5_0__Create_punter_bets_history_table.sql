CREATE TABLE punter_bets_history (
    bet_id character varying NOT NULL PRIMARY KEY,
    punter_id character varying NOT NULL,
    stake jsonb NOT NULL,
    odds decimal NOT NULL,
    placed_at timestamptz NOT NULL,
    settled_at timestamptz NULL,
    outcome character varying NULL,
    status character varying NOT NULL,
    sport_id character varying NOT NULL,
    sport_name character varying NOT NULL,
    fixture_id character varying NOT NULL,
    fixture_name character varying NOT NULL,
    market_id character varying NOT NULL,
    market_name character varying NOT NULL,
    selection_id character varying NOT NULL,
    selection_name character varying NOT NULL
);

CREATE INDEX "index_punterId" ON punter_bets_history USING btree (punter_id);
CREATE INDEX "index_placedAt" ON punter_bets_history USING btree (placed_at);
CREATE INDEX "index_status" ON punter_bets_history USING btree (status);