package bonus

import (
	"encoding/json"
	"time"
)

// Campaign represents a promotional campaign that can grant bonuses to players.
type Campaign struct {
	ID           int64           `json:"id"`
	Name         string          `json:"name"`
	Description  string          `json:"description,omitempty"`
	CampaignType string          `json:"campaignType"`
	Status       string          `json:"status"`
	StartAt      time.Time       `json:"startAt"`
	EndAt        time.Time       `json:"endAt"`
	BudgetCents  *int64          `json:"budgetCents,omitempty"`
	SpentCents   int64           `json:"spentCents"`
	MaxClaims    *int            `json:"maxClaims,omitempty"`
	ClaimCount   int             `json:"claimCount"`
	Rules        json.RawMessage `json:"rules"`
	CreatedBy    string          `json:"createdBy"`
	CreatedAt    time.Time       `json:"createdAt"`
	UpdatedAt    time.Time       `json:"updatedAt"`
}

// CampaignRule defines one aspect of a campaign's behavior.
type CampaignRule struct {
	ID         int64           `json:"id"`
	CampaignID int64           `json:"campaignId"`
	RuleType   string          `json:"ruleType"` // eligibility, trigger, reward, wagering
	RuleConfig json.RawMessage `json:"ruleConfig"`
	CreatedAt  time.Time       `json:"createdAt"`
}

// PlayerBonus tracks a single bonus instance for a player.
type PlayerBonus struct {
	ID                     int64           `json:"id"`
	UserID                 string          `json:"userId"`
	CampaignID             *int64          `json:"campaignId,omitempty"`
	BonusType              string          `json:"bonusType"`
	Status                 string          `json:"status"` // active, completed, expired, forfeited
	GrantedAmountCents     int64           `json:"grantedAmountCents"`
	RemainingAmountCents   int64           `json:"remainingAmountCents"`
	WageringRequiredCents  int64           `json:"wageringRequiredCents"`
	WageringCompletedCents int64           `json:"wageringCompletedCents"`
	ExpiresAt              time.Time       `json:"expiresAt"`
	GrantedAt              time.Time       `json:"grantedAt"`
	CompletedAt            *time.Time      `json:"completedAt,omitempty"`
	ForfeitedAt            *time.Time      `json:"forfeitedAt,omitempty"`
	ForfeitedBy            string          `json:"forfeitedBy,omitempty"`
	Metadata               json.RawMessage `json:"metadata,omitempty"`
	CreatedAt              time.Time       `json:"createdAt"`
	UpdatedAt              time.Time       `json:"updatedAt"`
}

// WageringProgressPct returns the completion percentage (0–100).
func (pb *PlayerBonus) WageringProgressPct() float64 {
	if pb.WageringRequiredCents <= 0 {
		return 100.0
	}
	pct := float64(pb.WageringCompletedCents) / float64(pb.WageringRequiredCents) * 100.0
	if pct > 100.0 {
		return 100.0
	}
	return pct
}

// CreateCampaignRequest is the input for creating a new campaign.
type CreateCampaignRequest struct {
	Name         string          `json:"name"`
	Description  string          `json:"description"`
	CampaignType string          `json:"campaign_type"`
	StartAt      time.Time       `json:"start_at"`
	EndAt        time.Time       `json:"end_at"`
	BudgetCents  *int64          `json:"budget_cents"`
	MaxClaims    *int            `json:"max_claims"`
	Rules        []RuleInput     `json:"rules"`
	CreatedBy    string          `json:"-"` // set from auth context
}

// RuleInput is used when creating/updating campaign rules.
type RuleInput struct {
	RuleType   string          `json:"rule_type"`
	RuleConfig json.RawMessage `json:"rule_config"`
}

// UpdateCampaignRequest is the input for updating a campaign.
type UpdateCampaignRequest struct {
	Name        *string    `json:"name"`
	Description *string    `json:"description"`
	StartAt     *time.Time `json:"start_at"`
	EndAt       *time.Time `json:"end_at"`
	BudgetCents *int64     `json:"budget_cents"`
	MaxClaims   *int       `json:"max_claims"`
}

// ClaimBonusRequest is the player-facing input for claiming a bonus.
type ClaimBonusRequest struct {
	CampaignID       int64  `json:"campaign_id"`
	TriggerReference string `json:"trigger_reference"` // e.g., "deposit:txn_abc123"
	UserID           string `json:"-"`                 // set from auth context
}

// GrantBonusRequest is the admin-facing input for manually granting a bonus.
type GrantBonusRequest struct {
	UserID              string `json:"user_id"`
	CampaignID          int64  `json:"campaign_id"`
	OverrideAmountCents *int64 `json:"override_amount_cents"`
	Reason              string `json:"reason"`
	GrantedBy           string `json:"-"` // set from auth context
}

// ForfeitBonusRequest is the admin action to forfeit a player's bonus.
type ForfeitBonusRequest struct {
	Reason      string `json:"reason"`
	ForfeitedBy string `json:"-"` // set from auth context
}

// WageringConfig holds the wagering requirement rules parsed from campaign_rules JSONB.
type WageringConfig struct {
	Multiplier           float64  `json:"multiplier"`             // e.g., 10 means 10x deposit
	MinOddsDecimal       float64  `json:"min_odds_decimal"`       // e.g., 1.5
	ParlayMultiplier     float64  `json:"parlay_multiplier"`      // e.g., 1.5 for 1.5x contribution
	ExcludedSports       []string `json:"excluded_sports"`
	MaxStakeContribution *int64   `json:"max_stake_contribution_cents"`
}

// RewardConfig holds the reward definition parsed from campaign_rules JSONB.
type RewardConfig struct {
	Type            string `json:"type"`            // deposit_match, freebet, odds_boost, cash
	MatchPct        int    `json:"match_pct"`       // for deposit_match: percentage
	MaxBonusCents   int64  `json:"max_bonus_cents"` // cap on reward
	FixedAmountCents int64 `json:"fixed_amount_cents"` // for fixed rewards
	ExpiryDays      int    `json:"expiry_days"`     // bonus validity period
}

// EligibilityConfig holds eligibility rules parsed from campaign_rules JSONB.
type EligibilityConfig struct {
	NewPlayersOnly  bool   `json:"new_players_only"`
	MinDeposits     int    `json:"min_deposits"`
	TierMin         string `json:"tier_min"`
	RegisteredAfter string `json:"registered_after"`
}

// TriggerConfig holds trigger rules parsed from campaign_rules JSONB.
type TriggerConfig struct {
	Event          string `json:"event"`            // deposit, signup, bet, manual
	MinAmountCents int64  `json:"min_amount_cents"`
}
