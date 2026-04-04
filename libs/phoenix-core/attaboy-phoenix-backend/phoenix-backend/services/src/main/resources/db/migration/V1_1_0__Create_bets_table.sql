
CREATE TABLE bets (
    bet_id character varying NOT NULL PRIMARY KEY,
    market_id character varying NOT NULL
);

CREATE INDEX "index_marketId" ON bets USING btree (market_id);

CREATE UNIQUE INDEX "index_betId_marketId" ON bets USING btree (bet_id, market_id);
