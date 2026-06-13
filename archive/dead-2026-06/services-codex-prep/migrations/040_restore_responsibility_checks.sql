-- Up
-- Migration: 040_restore_responsibility_checks.sql
-- Purpose: Restore responsibility_checks when earlier demo bootstrap runs applied the goose Down section

CREATE TABLE IF NOT EXISTS responsibility_checks (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    accepted_at TIMESTAMPTZ NOT NULL,
    accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_responsibility_checks_user UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS idx_responsibility_checks_user_id ON responsibility_checks(user_id);
CREATE INDEX IF NOT EXISTS idx_responsibility_checks_accepted_at ON responsibility_checks(accepted_at DESC);

-- Down

DROP TABLE IF EXISTS responsibility_checks CASCADE;
