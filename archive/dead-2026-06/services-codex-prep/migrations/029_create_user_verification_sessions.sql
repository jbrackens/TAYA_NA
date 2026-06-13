-- Phoenix Platform Database Migrations
-- Migration: 029_create_user_verification_sessions.sql
-- Purpose: Persist KBA and IDPV verification sessions for frontend-compatible identity flows
-- Dependencies: 002_create_users.sql
-- Date: 2026-03-12

CREATE TABLE IF NOT EXISTS user_verification_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    flow_type VARCHAR(32) NOT NULL,
    provider VARCHAR(64) NOT NULL,
    status VARCHAR(64) NOT NULL,
    questions JSONB NOT NULL DEFAULT '[]'::jsonb,
    answers JSONB NOT NULL DEFAULT '[]'::jsonb,
    redirect_url TEXT,
    provider_reference VARCHAR(255),
    last_error_code VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_user_verification_sessions_user_flow_updated
    ON user_verification_sessions (user_id, flow_type, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_verification_sessions_status
    ON user_verification_sessions (status);
