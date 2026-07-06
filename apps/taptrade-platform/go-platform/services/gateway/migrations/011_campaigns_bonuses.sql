-- +goose Up

CREATE TABLE campaigns (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    campaign_type TEXT NOT NULL CHECK (campaign_type IN (
        'deposit_match', 'freebet_grant', 'odds_boost_grant',
        'signup_bonus', 'reload_bonus', 'referral_bonus', 'custom'
    )),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'closed')),
    start_at TIMESTAMP WITH TIME ZONE NOT NULL,
    end_at TIMESTAMP WITH TIME ZONE NOT NULL,
    budget_cents BIGINT,
    spent_cents BIGINT NOT NULL DEFAULT 0,
    max_claims INT,
    claim_count INT NOT NULL DEFAULT 0,
    rules JSONB NOT NULL DEFAULT '{}',
    created_by TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE campaign_rules (
    id BIGSERIAL PRIMARY KEY,
    campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    rule_type TEXT NOT NULL CHECK (rule_type IN ('eligibility', 'trigger', 'reward', 'wagering')),
    rule_config JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX idx_campaign_rules_campaign ON campaign_rules (campaign_id, rule_type);

CREATE TABLE player_bonuses (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    campaign_id BIGINT REFERENCES campaigns(id),
    bonus_type TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'expired', 'forfeited')),
    granted_amount_cents BIGINT NOT NULL,
    remaining_amount_cents BIGINT NOT NULL,
    wagering_required_cents BIGINT NOT NULL DEFAULT 0,
    wagering_completed_cents BIGINT NOT NULL DEFAULT 0,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    granted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE,
    forfeited_at TIMESTAMP WITH TIME ZONE,
    forfeited_by TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (user_id, campaign_id)
);
CREATE INDEX idx_player_bonuses_user_status ON player_bonuses (user_id, status);
CREATE INDEX idx_player_bonuses_expires ON player_bonuses (expires_at) WHERE status = 'active';

CREATE TABLE wagering_contributions (
    id BIGSERIAL PRIMARY KEY,
    player_bonus_id BIGINT NOT NULL REFERENCES player_bonuses(id),
    bet_id TEXT NOT NULL,
    bet_type TEXT NOT NULL DEFAULT 'single' CHECK (bet_type IN ('single', 'parlay', 'system')),
    stake_cents BIGINT NOT NULL,
    contribution_cents BIGINT NOT NULL,
    odds_decimal NUMERIC(10, 4),
    leg_count INT DEFAULT 1,
    contributed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (player_bonus_id, bet_id)
);
CREATE INDEX idx_wagering_contrib_bonus ON wagering_contributions (player_bonus_id);

-- +goose Down
DROP TABLE IF EXISTS wagering_contributions;
DROP TABLE IF EXISTS player_bonuses;
DROP TABLE IF EXISTS campaign_rules;
DROP TABLE IF EXISTS campaigns;
