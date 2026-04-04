-- Up
-- Migration: 023_create_responsibility_checks.sql
-- Purpose: Persist responsibility-check acknowledgements for legacy frontend parity

CREATE TABLE responsibility_checks (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    accepted_at TIMESTAMPTZ NOT NULL,
    accepted_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_responsibility_checks_user UNIQUE (user_id)
);

CREATE INDEX idx_responsibility_checks_user_id ON responsibility_checks(user_id);
CREATE INDEX idx_responsibility_checks_accepted_at ON responsibility_checks(accepted_at DESC);

-- Down

DROP TABLE IF EXISTS responsibility_checks CASCADE;
