CREATE TABLE reporting_bets (
    bet_id character varying NOT NULL PRIMARY KEY,
    punter_id character varying NOT NULL,
    market_id character varying NOT NULL,
    stake decimal NOT NULL,
    placed_at timestamptz NOT NULL,
    closed_at timestamptz NULL
);

CREATE INDEX "index_placed_at_and_closed_at" ON reporting_bets USING btree (placed_at, closed_at);
