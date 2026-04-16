DROP INDEX IF EXISTS "index_phoenixMarketId_oddinMarketId";

CREATE UNIQUE INDEX "index_oddinMarketId" ON market_id_mappings (oddin_market_id);
