-- Phoenix Platform Database Migrations
-- Migration: 004_create_referrals.sql
-- Purpose: Create referral management tables (codes, relationships, commissions)
-- Dependencies: 002_create_users.sql
-- Date: 2026-03-07

-- Up
CREATE TYPE referral_commission_type AS ENUM ('fixed', 'percentage', 'bonus_points');
CREATE TYPE referral_commission_status AS ENUM ('pending', 'paid', 'cancelled', 'expired');

CREATE TABLE referral_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    code VARCHAR(32) NOT NULL UNIQUE,
    uses_count INTEGER NOT NULL DEFAULT 0,
    max_uses INTEGER,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE referral_relationships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    referred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    referral_code_id UUID REFERENCES referral_codes(id) ON DELETE SET NULL,
    bonus_paid NUMERIC(18,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT unique_referral_pair UNIQUE(referrer_id, referred_id)
);

CREATE TABLE referral_commissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referral_relationship_id UUID NOT NULL REFERENCES referral_relationships(id) ON DELETE CASCADE,
    amount NUMERIC(18,2) NOT NULL,
    type referral_commission_type NOT NULL,
    status referral_commission_status NOT NULL DEFAULT 'pending',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    paid_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX idx_referral_codes_user_id ON referral_codes(user_id);
CREATE INDEX idx_referral_codes_code ON referral_codes(code);
CREATE INDEX idx_referral_codes_is_active ON referral_codes(is_active);
CREATE INDEX idx_referral_relationships_referrer_id ON referral_relationships(referrer_id);
CREATE INDEX idx_referral_relationships_referred_id ON referral_relationships(referred_id);
CREATE INDEX idx_referral_relationships_code_id ON referral_relationships(referral_code_id);
CREATE INDEX idx_referral_commissions_relationship_id ON referral_commissions(referral_relationship_id);
CREATE INDEX idx_referral_commissions_status ON referral_commissions(status);
CREATE INDEX idx_referral_commissions_created_at ON referral_commissions(created_at);

-- Down
DROP TABLE IF EXISTS referral_commissions CASCADE;
DROP TABLE IF EXISTS referral_relationships CASCADE;
DROP TABLE IF EXISTS referral_codes CASCADE;
DROP TYPE IF EXISTS referral_commission_status CASCADE;
DROP TYPE IF EXISTS referral_commission_type CASCADE;
