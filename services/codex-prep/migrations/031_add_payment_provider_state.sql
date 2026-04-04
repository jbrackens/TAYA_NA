-- Phoenix Platform Database Migrations
-- Migration: 031_add_payment_provider_state.sql
-- Purpose: Track provider lifecycle state for wallet transactions
-- Dependencies: 003_create_wallets.sql
-- Date: 2026-03-12

ALTER TABLE wallet_transactions
    ADD COLUMN IF NOT EXISTS status VARCHAR(64) NOT NULL DEFAULT 'SUCCEEDED',
    ADD COLUMN IF NOT EXISTS provider VARCHAR(64),
    ADD COLUMN IF NOT EXISTS provider_reference VARCHAR(255),
    ADD COLUMN IF NOT EXISTS provider_updated_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_status
    ON wallet_transactions(status);

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_provider_reference
    ON wallet_transactions(provider_reference);
