ALTER TABLE markets ADD COLUMN updated_at timestamptz NOT NULL DEFAULT NOW()::timestamptz;

CREATE INDEX "index_updated_at" on markets (fixture_id);