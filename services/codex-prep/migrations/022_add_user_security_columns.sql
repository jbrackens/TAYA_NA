-- Phoenix Platform Database Migrations
-- Migration: 022_add_user_security_columns.sql
-- Purpose: Add MFA and phone verification state to users
-- Dependencies: 002_create_users.sql
-- Date: 2026-03-10

-- Up
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS phone_verified_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_users_mfa_enabled ON users(mfa_enabled);
CREATE INDEX IF NOT EXISTS idx_users_phone_verified_at ON users(phone_verified_at);

-- Down
DROP INDEX IF EXISTS idx_users_phone_verified_at;
DROP INDEX IF EXISTS idx_users_mfa_enabled;

ALTER TABLE users
    DROP COLUMN IF EXISTS phone_verified_at,
    DROP COLUMN IF EXISTS mfa_enabled;
