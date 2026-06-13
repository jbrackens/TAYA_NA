-- Phoenix Platform Database Migrations
-- Migration: 006_create_bets.sql
-- Purpose: Create bets and bet_legs tables for single and parlay bets
-- Dependencies: 002_create_users.sql, 005_create_markets.sql
-- Date: 2026-03-07

-- Up
CREATE TYPE bet_status AS ENUM ('pending', 'won', 'lost', 'voided', 'cashed_out', 'settled');
CREATE TYPE bet_leg_status AS ENUM ('pending', 'won', 'lost', 'voided');

CREATE TABLE bets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    market_id UUID REFERENCES markets(id) ON DELETE SET NULL,
    outcome_id UUID REFERENCES outcomes(id) ON DELETE SET NULL,
    stake NUMERIC(18,2) NOT NULL,
    odds_at_placement NUMERIC(10,4) NOT NULL,
    potential_payout NUMERIC(18,2) NOT NULL,
    status bet_status NOT NULL DEFAULT 'pending',
    settled_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bet_legs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    bet_id UUID NOT NULL REFERENCES bets(id) ON DELETE CASCADE,
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE RESTRICT,
    outcome_id UUID NOT NULL REFERENCES outcomes(id) ON DELETE RESTRICT,
    odds NUMERIC(10,4) NOT NULL,
    status bet_leg_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_bets_user_id ON bets(user_id);
CREATE INDEX idx_bets_market_id ON bets(market_id);
CREATE INDEX idx_bets_outcome_id ON bets(outcome_id);
CREATE INDEX idx_bets_status ON bets(status);
CREATE INDEX idx_bets_created_at ON bets(created_at);
CREATE INDEX idx_bets_settled_at ON bets(settled_at);
CREATE INDEX idx_bet_legs_bet_id ON bet_legs(bet_id);
CREATE INDEX idx_bet_legs_market_id ON bet_legs(market_id);
CREATE INDEX idx_bet_legs_outcome_id ON bet_legs(outcome_id);
CREATE INDEX idx_bet_legs_status ON bet_legs(status);

-- Down
DROP TABLE IF EXISTS bet_legs CASCADE;
DROP TABLE IF EXISTS bets CASCADE;
DROP TYPE IF EXISTS bet_leg_status CASCADE;
DROP TYPE IF EXISTS bet_status CASCADE;
