-- Phoenix Platform Database Migrations
-- Migration: 030_create_prediction_bot_api_keys.sql
-- Purpose: Persist prediction bot API keys for parity with legacy bot auth routes
-- Dependencies: 002_create_users.sql
-- Date: 2026-03-12

CREATE TABLE IF NOT EXISTS prediction_bot_api_keys (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_key TEXT NOT NULL,
    display_name TEXT NOT NULL,
    scopes TEXT[] NOT NULL DEFAULT '{}'::text[],
    token_hash TEXT NOT NULL UNIQUE,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    last_used_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_prediction_bot_api_keys_account_issued
    ON prediction_bot_api_keys (account_key, issued_at DESC);

CREATE INDEX IF NOT EXISTS idx_prediction_bot_api_keys_revoked
    ON prediction_bot_api_keys (revoked_at, expires_at);
