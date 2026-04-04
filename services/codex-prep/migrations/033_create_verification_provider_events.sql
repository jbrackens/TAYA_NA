CREATE TABLE IF NOT EXISTS verification_provider_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    verification_session_id UUID NOT NULL REFERENCES user_verification_sessions(id) ON DELETE CASCADE,
    provider TEXT NOT NULL,
    status TEXT NOT NULL,
    source TEXT NOT NULL,
    reason TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_verification_provider_events_session_created_at
    ON verification_provider_events (verification_session_id, created_at DESC);
