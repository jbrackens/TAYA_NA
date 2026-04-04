-- Migration: 035_add_payment_review_assignment.sql
-- Purpose: Add operator assignment fields for payment review workflow

ALTER TABLE wallet_transactions
    ADD COLUMN IF NOT EXISTS assigned_operator_id UUID,
    ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX IF NOT EXISTS idx_wallet_transactions_assigned_operator_id
    ON wallet_transactions(assigned_operator_id);
