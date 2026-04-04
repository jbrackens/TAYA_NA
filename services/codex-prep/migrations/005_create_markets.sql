-- Phoenix Platform Database Migrations
-- Migration: 005_create_markets.sql
-- Purpose: Create sports events, markets, and outcomes tables
-- Dependencies: None
-- Date: 2026-03-07

-- Up
CREATE TYPE event_status AS ENUM ('scheduled', 'live', 'postponed', 'cancelled', 'completed');
CREATE TYPE market_status AS ENUM ('open', 'suspended', 'closed', 'settled', 'voided');
CREATE TYPE outcome_result AS ENUM ('pending', 'win', 'lose', 'void');

CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    sport VARCHAR(64) NOT NULL,
    league VARCHAR(128),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status event_status NOT NULL DEFAULT 'scheduled',
    external_id VARCHAR(128),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE markets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(128) NOT NULL,
    status market_status NOT NULL DEFAULT 'open',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE outcomes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id UUID NOT NULL REFERENCES markets(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    odds NUMERIC(10,4) NOT NULL,
    status VARCHAR(64) NOT NULL DEFAULT 'active',
    result outcome_result NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_sport ON events(sport);
CREATE INDEX idx_events_start_time ON events(start_time);
CREATE INDEX idx_events_external_id ON events(external_id);
CREATE INDEX idx_markets_event_id ON markets(event_id);
CREATE INDEX idx_markets_status ON markets(status);
CREATE INDEX idx_markets_type ON markets(type);
CREATE INDEX idx_outcomes_market_id ON outcomes(market_id);
CREATE INDEX idx_outcomes_result ON outcomes(result);
CREATE INDEX idx_outcomes_status ON outcomes(status);

-- Down
DROP TABLE IF EXISTS outcomes CASCADE;
DROP TABLE IF EXISTS markets CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TYPE IF EXISTS outcome_result CASCADE;
DROP TYPE IF EXISTS market_status CASCADE;
DROP TYPE IF EXISTS event_status CASCADE;
