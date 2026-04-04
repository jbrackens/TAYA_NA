CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    ended_at TIMESTAMPTZ,
    ip_address TEXT,
    user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_started_at
    ON user_sessions (user_id, started_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_open
    ON user_sessions (user_id)
    WHERE ended_at IS NULL;

CREATE TABLE IF NOT EXISTS user_terms_acceptance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    terms_version TEXT NOT NULL,
    accepted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, terms_version)
);

CREATE INDEX IF NOT EXISTS idx_user_terms_acceptance_user_accepted_at
    ON user_terms_acceptance (user_id, accepted_at DESC);
