-- Phoenix Platform Database Migrations
-- Migration: 012_create_compliance.sql
-- Purpose: Create compliance limits, self-exclusion, AML checks, and alert tables
-- Dependencies: 002_create_users.sql, 010_create_event_store.sql
-- Date: 2026-03-08

-- Up
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'operator';
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'system';

CREATE TYPE compliance_limit_type AS ENUM (
    'daily_loss',
    'weekly_loss',
    'monthly_loss',
    'daily_deposit',
    'weekly_deposit',
    'monthly_deposit',
    'daily_stake',
    'weekly_stake',
    'monthly_stake'
);

CREATE TYPE self_exclusion_type AS ENUM ('temporary', 'permanent');
CREATE TYPE self_exclusion_reason AS ENUM ('gambling_problem', 'player_request', 'regulatory_action', 'fraud_risk', 'other');
CREATE TYPE self_exclusion_status AS ENUM ('active', 'expired', 'cancelled');
CREATE TYPE aml_check_status AS ENUM ('in_progress', 'completed', 'failed');
CREATE TYPE aml_check_result AS ENUM ('clear', 'review', 'blocked');
CREATE TYPE aml_risk_level AS ENUM ('low', 'medium', 'high');
CREATE TYPE compliance_alert_type AS ENUM ('unusual_activity', 'velocity_spike', 'deposit_risk', 'withdrawal_risk', 'manual_review');
CREATE TYPE compliance_alert_severity AS ENUM ('low', 'medium', 'high', 'critical');
CREATE TYPE compliance_alert_status AS ENUM ('open', 'acknowledged', 'resolved');

CREATE TABLE compliance_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    limit_type compliance_limit_type NOT NULL,
    limit_amount NUMERIC(18,2) NOT NULL,
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    effective_date TIMESTAMPTZ NOT NULL,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_compliance_limit UNIQUE (user_id, limit_type)
);

CREATE TABLE self_exclusions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    exclusion_type self_exclusion_type NOT NULL,
    reason self_exclusion_reason NOT NULL,
    duration_days INTEGER,
    effective_at TIMESTAMPTZ NOT NULL,
    expires_at TIMESTAMPTZ,
    status self_exclusion_status NOT NULL DEFAULT 'active',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE aml_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    date_of_birth DATE NOT NULL,
    country VARCHAR(2) NOT NULL,
    status aml_check_status NOT NULL DEFAULT 'in_progress',
    result aml_check_result,
    risk_level aml_risk_level,
    initiated_by UUID REFERENCES users(id) ON DELETE SET NULL,
    initiated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    checked_at TIMESTAMPTZ,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE TABLE compliance_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    alert_type compliance_alert_type NOT NULL,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    description TEXT NOT NULL,
    severity compliance_alert_severity NOT NULL,
    status compliance_alert_status NOT NULL DEFAULT 'open',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_compliance_limits_user_id ON compliance_limits(user_id);
CREATE INDEX idx_compliance_limits_effective_date ON compliance_limits(effective_date DESC);
CREATE INDEX idx_self_exclusions_user_id ON self_exclusions(user_id);
CREATE INDEX idx_self_exclusions_status ON self_exclusions(status);
CREATE INDEX idx_aml_checks_user_id ON aml_checks(user_id);
CREATE INDEX idx_aml_checks_status ON aml_checks(status);
CREATE INDEX idx_compliance_alerts_user_id ON compliance_alerts(user_id);
CREATE INDEX idx_compliance_alerts_status ON compliance_alerts(status);
CREATE INDEX idx_compliance_alerts_created_at ON compliance_alerts(created_at DESC);

-- Down
DROP TABLE IF EXISTS compliance_alerts CASCADE;
DROP TABLE IF EXISTS aml_checks CASCADE;
DROP TABLE IF EXISTS self_exclusions CASCADE;
DROP TABLE IF EXISTS compliance_limits CASCADE;
DROP TYPE IF EXISTS compliance_alert_status CASCADE;
DROP TYPE IF EXISTS compliance_alert_severity CASCADE;
DROP TYPE IF EXISTS compliance_alert_type CASCADE;
DROP TYPE IF EXISTS aml_risk_level CASCADE;
DROP TYPE IF EXISTS aml_check_result CASCADE;
DROP TYPE IF EXISTS aml_check_status CASCADE;
DROP TYPE IF EXISTS self_exclusion_status CASCADE;
DROP TYPE IF EXISTS self_exclusion_reason CASCADE;
DROP TYPE IF EXISTS self_exclusion_type CASCADE;
DROP TYPE IF EXISTS compliance_limit_type CASCADE;
