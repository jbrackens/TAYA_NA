ALTER TABLE user_verification_sessions
    ADD COLUMN IF NOT EXISTS assigned_operator_id UUID,
    ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_user_verification_sessions_assigned_operator_id
    ON user_verification_sessions (assigned_operator_id);
