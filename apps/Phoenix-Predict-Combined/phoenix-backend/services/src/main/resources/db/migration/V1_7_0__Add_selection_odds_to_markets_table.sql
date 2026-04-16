ALTER TABLE markets
    ADD COLUMN selection_odds jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX "index_fixture_id" on markets (fixture_id);