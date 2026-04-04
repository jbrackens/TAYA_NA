CREATE TABLE IF NOT EXISTS reporting_market_selections (
    selection_id character varying NOT NULL PRIMARY KEY,
    selection_name character varying NOT NULL,
    market_id character varying NOT NULL
);

CREATE INDEX "index_market_selections_marketId" ON reporting_market_selections USING btree (market_id);