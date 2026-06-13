-- Phoenix Platform Database Migrations
-- Migration: 017_create_stella_engagement.sql
-- Purpose: Create engagement score, achievement, and aggregation tables
-- Dependencies: 002_create_users.sql, 010_create_event_store.sql
-- Date: 2026-03-08

-- Up
CREATE TABLE engagement_scores (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    betting_activity INTEGER NOT NULL DEFAULT 0,
    social_engagement INTEGER NOT NULL DEFAULT 0,
    achievements INTEGER NOT NULL DEFAULT 0,
    last_updated TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE engagement_achievement_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    achievement_id VARCHAR(128) NOT NULL,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reward_points INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE engagement_point_calculations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(64) NOT NULL,
    event_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    points_awarded INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE engagement_aggregations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    aggregation_type VARCHAR(64) NOT NULL,
    period DATE NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'completed',
    result JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_engagement_achievement_events_user ON engagement_achievement_events(user_id, created_at DESC);
CREATE INDEX idx_engagement_point_calculations_user ON engagement_point_calculations(user_id, created_at DESC);
CREATE INDEX idx_engagement_aggregations_user_period ON engagement_aggregations(user_id, period DESC);

-- Down
DROP TABLE IF EXISTS engagement_aggregations CASCADE;
DROP TABLE IF EXISTS engagement_point_calculations CASCADE;
DROP TABLE IF EXISTS engagement_achievement_events CASCADE;
DROP TABLE IF EXISTS engagement_scores CASCADE;
