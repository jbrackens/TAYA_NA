ALTER TABLE user_verification_sessions
    ADD COLUMN IF NOT EXISTS provider_decision TEXT,
    ADD COLUMN IF NOT EXISTS provider_case_id TEXT;

CREATE INDEX IF NOT EXISTS idx_user_verification_sessions_provider_case_id
    ON user_verification_sessions (provider_case_id);
