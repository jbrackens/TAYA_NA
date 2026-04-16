ALTER TABLE markets
    ADD COLUMN attributes jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN transitions jsonb NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN created_at timestamptz NOT NULL DEFAULT NOW()::timestamptz;
