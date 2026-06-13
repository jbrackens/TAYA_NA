-- Phoenix Platform Database Migrations
-- Migration: 013_create_analytics.sql
-- Purpose: Create analytics ingestion table and analyst role support
-- Dependencies: 002_create_users.sql, 010_create_event_store.sql
-- Date: 2026-03-08

-- Up
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'analyst';

CREATE TABLE analytics_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_type VARCHAR(128) NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    properties JSONB NOT NULL DEFAULT '{}'::jsonb,
    event_timestamp TIMESTAMPTZ NOT NULL,
    received_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_analytics_events_type ON analytics_events(event_type, event_timestamp DESC);
CREATE INDEX idx_analytics_events_user_id ON analytics_events(user_id, event_timestamp DESC);
CREATE INDEX idx_analytics_events_received_at ON analytics_events(received_at DESC);

-- Down
DROP TABLE IF EXISTS analytics_events CASCADE;
