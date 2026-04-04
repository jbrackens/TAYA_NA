CREATE TABLE market_id_mappings (
    phoenix_market_id uuid NOT NULL PRIMARY KEY,
    oddin_market_id character varying NOT NULL,
    created_at_utc timestamp NOT NULL
);

CREATE UNIQUE INDEX "index_phoenixMarketId_oddinMarketId" ON market_id_mappings USING btree (phoenix_market_id, oddin_market_id);
