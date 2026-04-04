-- Phoenix Platform Database Migrations
-- Migration: 015_create_settlement.sql
-- Purpose: Create settlement batches, batch items, manual payouts, and reconciliations
-- Dependencies: 003_create_wallets.sql, 006_create_bets.sql, 010_create_event_store.sql
-- Date: 2026-03-08

-- Up
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'settlement_operator';

CREATE TABLE settlement_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    settlement_type VARCHAR(32) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'processing',
    market_count INTEGER NOT NULL DEFAULT 0,
    bet_count INTEGER NOT NULL DEFAULT 0,
    settled_count INTEGER NOT NULL DEFAULT 0,
    pending_count INTEGER NOT NULL DEFAULT 0,
    total_payout NUMERIC(18,2) NOT NULL DEFAULT 0,
    winning_outcomes JSONB NOT NULL DEFAULT '{}'::jsonb,
    payout_state JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ
);

CREATE TABLE settlement_batch_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES settlement_batches(id) ON DELETE CASCADE,
    bet_id UUID NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    market_id UUID REFERENCES markets(id) ON DELETE SET NULL,
    outcome_id UUID REFERENCES outcomes(id) ON DELETE SET NULL,
    result VARCHAR(32) NOT NULL,
    reservation_id UUID,
    stake NUMERIC(18,2) NOT NULL,
    expected_payout NUMERIC(18,2) NOT NULL DEFAULT 0,
    actual_payout NUMERIC(18,2) NOT NULL DEFAULT 0,
    processed_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE manual_payouts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount NUMERIC(18,2) NOT NULL,
    reason VARCHAR(64) NOT NULL,
    reference_id VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'processed',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES settlement_batches(id) ON DELETE CASCADE,
    reconciliation_type VARCHAR(64) NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'in_progress',
    discrepancies_found INTEGER NOT NULL DEFAULT 0,
    reconciliation_details JSONB NOT NULL DEFAULT '[]'::jsonb,
    started_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMPTZ,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_settlement_batches_status ON settlement_batches(status, created_at DESC);
CREATE INDEX idx_settlement_batch_items_batch_id ON settlement_batch_items(batch_id);
CREATE INDEX idx_settlement_batch_items_bet_id ON settlement_batch_items(bet_id);
CREATE INDEX idx_manual_payouts_user_id ON manual_payouts(user_id, created_at DESC);
CREATE INDEX idx_reconciliations_batch_id ON reconciliations(batch_id, started_at DESC);

-- Down
DROP TABLE IF EXISTS reconciliations CASCADE;
DROP TABLE IF EXISTS manual_payouts CASCADE;
DROP TABLE IF EXISTS settlement_batch_items CASCADE;
DROP TABLE IF EXISTS settlement_batches CASCADE;
