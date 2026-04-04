-- Phoenix Platform Database Migrations
-- Migration: 027_create_advanced_bet_quotes.sql
-- Purpose: Persist bet builder and fixed exotic quote state
-- Dependencies: 002_create_users.sql, 005_create_markets.sql, 006_create_bets.sql
-- Date: 2026-03-12

-- Up
CREATE TABLE advanced_bet_quotes (
    id TEXT PRIMARY KEY,
    quote_type TEXT NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    request_id TEXT NOT NULL,
    combo_type TEXT,
    exotic_type TEXT,
    stake_cents BIGINT,
    combined_odds NUMERIC(10,4),
    implied_probability NUMERIC(12,6),
    potential_payout_cents BIGINT,
    encoded_ticket TEXT,
    combinable BOOLEAN NOT NULL DEFAULT TRUE,
    reason_code TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    expires_at TIMESTAMP WITH TIME ZONE,
    accepted_at TIMESTAMP WITH TIME ZONE,
    accepted_bet_id UUID REFERENCES bets(id) ON DELETE SET NULL,
    accept_request_id TEXT,
    accept_idempotency_key TEXT,
    last_reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_advanced_bet_quotes_user_id ON advanced_bet_quotes(user_id);
CREATE INDEX idx_advanced_bet_quotes_type ON advanced_bet_quotes(quote_type);
CREATE INDEX idx_advanced_bet_quotes_status ON advanced_bet_quotes(status);
CREATE INDEX idx_advanced_bet_quotes_created_at ON advanced_bet_quotes(created_at DESC);

CREATE TABLE advanced_bet_quote_legs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    quote_id TEXT NOT NULL REFERENCES advanced_bet_quotes(id) ON DELETE CASCADE,
    position INTEGER,
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE RESTRICT,
    outcome_id UUID NOT NULL REFERENCES outcomes(id) ON DELETE RESTRICT,
    fixture_id UUID NOT NULL REFERENCES events(id) ON DELETE RESTRICT,
    requested_odds NUMERIC(10,4),
    current_odds NUMERIC(10,4) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_advanced_bet_quote_legs_quote_id ON advanced_bet_quote_legs(quote_id);
CREATE INDEX idx_advanced_bet_quote_legs_fixture_id ON advanced_bet_quote_legs(fixture_id);

-- Down
DROP TABLE IF EXISTS advanced_bet_quote_legs CASCADE;
DROP TABLE IF EXISTS advanced_bet_quotes CASCADE;
