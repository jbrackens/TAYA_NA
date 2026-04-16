ALTER TABLE fixtures
    ADD COLUMN score_history jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN status_history jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN finish_time timestamptz,
    ADD COLUMN created_at timestamptz NOT NULL DEFAULT NOW()::timestamptz;
