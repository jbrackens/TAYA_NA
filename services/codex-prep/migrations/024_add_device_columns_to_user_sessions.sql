ALTER TABLE user_sessions
    ADD COLUMN IF NOT EXISTS device_id TEXT,
    ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;

CREATE INDEX IF NOT EXISTS idx_user_sessions_user_device_id
    ON user_sessions (user_id, device_id)
    WHERE device_id IS NOT NULL;
