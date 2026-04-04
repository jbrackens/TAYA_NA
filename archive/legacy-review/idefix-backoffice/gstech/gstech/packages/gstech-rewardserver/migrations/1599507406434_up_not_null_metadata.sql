UPDATE rewards SET metadata='{}'::json WHERE metadata IS null;
ALTER TABLE rewards ALTER COLUMN metadata SET DEFAULT '{}'::json;
ALTER TABLE rewards ALTER COLUMN metadata SET NOT NULL;

