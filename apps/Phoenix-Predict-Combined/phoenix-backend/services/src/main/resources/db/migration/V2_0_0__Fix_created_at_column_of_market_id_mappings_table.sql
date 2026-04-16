
ALTER TABLE market_id_mappings RENAME COLUMN created_at_utc TO created_at;

ALTER TABLE market_id_mappings ALTER COLUMN created_at TYPE timestamptz;
