package bonus

import (
	"encoding/json"
	"fmt"
	"regexp"
	"strings"
	"time"
)

var campaignLaunchCopyProhibited = regexp.MustCompile(`(?i)(\$|\b(cash|cashout|deposit|withdraw|withdrawal|crypto|fiat|freebets?|bets?|prizes?|payout|sportsbook|stakes?|wagers?|wagering|usdc|usd|dollars?|redeem)\b)`)
var campaignRedeemableCopyProhibited = regexp.MustCompile(`(?i)\bredeemable\b`)
var campaignNonRedeemableCopyAllowed = regexp.MustCompile(`(?i)\bnon-redeemable\b`)
var retiredPointPlayRuleConfigKeys = []string{"min_odds_decimal", "parlay_multiplier", "excluded_sports"}

type FieldValidationError struct {
	Field   string
	Message string
}

func (e FieldValidationError) Error() string {
	return e.Message
}

func (e FieldValidationError) FieldName() string {
	return e.Field
}

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
	RuleType   string          `json:"ruleType"` // eligibility, trigger, reward, wagering (internal point-play rule)
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
	Name              string      `json:"name"`
	Description       string      `json:"description"`
	CampaignType      string      `json:"campaign_type"`
	StartAt           time.Time   `json:"start_at"`
	EndAt             time.Time   `json:"end_at"`
	BudgetCents       *int64      `json:"budget_cents"`
	BudgetPointsCents *int64      `json:"budget_points_cents"`
	MaxClaims         *int        `json:"max_claims"`
	Rules             []RuleInput `json:"rules"`
	CreatedBy         string      `json:"-"` // set from auth context
}

// RuleInput is used when creating/updating campaign rules.
type RuleInput struct {
	RuleType        string          `json:"rule_type"`
	RuleConfig      json.RawMessage `json:"rule_config"`
	PointRuleConfig json.RawMessage `json:"point_rule_config"`
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
	TriggerReference string `json:"trigger_reference"` // e.g., "daily-check-in:2026-06-26"
	UserID           string `json:"-"`                 // set from auth context
}

// GrantBonusRequest is the admin-facing input for manually granting a bonus.
type GrantBonusRequest struct {
	UserID              string `json:"user_id"`
	CampaignID          int64  `json:"campaign_id"`
	OverrideAmountCents *int64 `json:"override_amount_cents"`
	OverridePointsCents *int64 `json:"override_points_cents"`
	Reason              string `json:"reason"`
	GrantedBy           string `json:"-"` // set from auth context
}

// ForfeitBonusRequest is the admin action to forfeit a player's bonus.
type ForfeitBonusRequest struct {
	Reason      string `json:"reason"`
	ForfeitedBy string `json:"-"` // set from auth context
}

// NormalizePointAliases maps preferred launch request fields into the legacy
// internal fields still used by repository and rule evaluation code.
func (r *CreateCampaignRequest) NormalizePointAliases() {
	r.CampaignType = pointCampaignType(r.CampaignType)
	if r.BudgetCents == nil && r.BudgetPointsCents != nil {
		r.BudgetCents = r.BudgetPointsCents
	}
	for i := range r.Rules {
		r.Rules[i].NormalizePointAliases()
	}
}

func (r CreateCampaignRequest) HasConflictingBudgetAliases() bool {
	return r.BudgetCents != nil && r.BudgetPointsCents != nil && *r.BudgetCents != *r.BudgetPointsCents
}

func (r CreateCampaignRequest) ValidatePointAliasConflicts() error {
	if r.HasConflictingBudgetAliases() {
		return fmt.Errorf("budget_points_cents conflicts with budget_cents")
	}
	for i, rule := range r.Rules {
		if err := rule.ValidatePointAliasConflicts(); err != nil {
			return fmt.Errorf("rules[%d]: %w", i, err)
		}
	}
	return nil
}

func (r CreateCampaignRequest) ValidateLaunchCopy() error {
	fields := []struct {
		name  string
		value string
	}{
		{name: "name", value: r.Name},
		{name: "description", value: r.Description},
	}
	for _, field := range fields {
		if campaignLaunchCopyHasProhibitedTerm(field.value) {
			return FieldValidationError{
				Field:   field.name,
				Message: "campaign " + field.name + " must use non-redeemable point-play wording",
			}
		}
	}
	for i, rule := range r.Rules {
		if err := rule.ValidateLaunchCopy(i); err != nil {
			return err
		}
	}
	return nil
}

func campaignLaunchCopyHasProhibitedTerm(value string) bool {
	value = strings.TrimSpace(value)
	if value == "" {
		return false
	}
	if campaignLaunchCopyProhibited.MatchString(value) {
		return true
	}
	redeemableCandidate := campaignNonRedeemableCopyAllowed.ReplaceAllString(value, "")
	return campaignRedeemableCopyProhibited.MatchString(redeemableCandidate)
}

func pointCampaignType(campaignType string) string {
	switch campaignType {
	case "freebet_grant", "freebet", "cash", "odds_boost":
		return "point_grant"
	case "deposit_match":
		return "point_match"
	default:
		return campaignType
	}
}

// NormalizePointAliases maps preferred point-rule config keys into the legacy
// internal keys used by the existing bonus service.
func (r *RuleInput) NormalizePointAliases() {
	if r.RuleType == "play" {
		r.RuleType = "wagering"
	}
	raw := r.rawConfig()
	if len(raw) == 0 {
		return
	}
	var cfg map[string]any
	if err := json.Unmarshal(raw, &cfg); err != nil {
		return
	}
	if typeValue, ok := cfg["type"].(string); ok {
		cfg["type"] = pointCampaignType(typeValue)
	}
	copyAlias := func(from, to string) {
		if _, ok := cfg[to]; ok {
			delete(cfg, from)
			return
		}
		if value, ok := cfg[from]; ok {
			cfg[to] = value
			delete(cfg, from)
		}
	}
	copyAlias("max_bonus_points_cents", "max_bonus_cents")
	copyAlias("fixed_amount_points_cents", "fixed_amount_cents")
	copyAlias("max_play_contribution_points_cents", "max_stake_contribution_cents")
	copyAlias("max_stake_contribution_points_cents", "max_stake_contribution_cents")
	copyAlias("min_points_cents", "min_amount_cents")
	copyAlias("min_point_activity_count", "min_deposits")
	copyAlias("rank_min", "tier_min")
	normalized, err := json.Marshal(cfg)
	if err != nil {
		return
	}
	r.RuleConfig = normalized
}

func (r RuleInput) ValidateLaunchCopy(index int) error {
	raw := r.rawConfig()
	if len(raw) == 0 {
		return nil
	}
	var cfg map[string]any
	if err := json.Unmarshal(raw, &cfg); err != nil {
		return nil
	}
	if _, ok := cfg["min_deposits"]; ok {
		return FieldValidationError{
			Field:   fmt.Sprintf("rules[%d].point_rule_config.min_point_activity_count", index),
			Message: "campaign eligibility must use point-native activity wording",
		}
	}
	if _, ok := cfg["tier_min"]; ok {
		return FieldValidationError{
			Field:   fmt.Sprintf("rules[%d].point_rule_config.rank_min", index),
			Message: "campaign eligibility must use point-native rank wording",
		}
	}
	for _, key := range retiredPointPlayRuleConfigKeys {
		if _, ok := cfg[key]; ok {
			return FieldValidationError{
				Field:   fmt.Sprintf("rules[%d].point_rule_config.%s", index, key),
				Message: "campaign point-play rules must use launch point-play mechanics",
			}
		}
	}
	event, ok := cfg["event"].(string)
	if !ok {
		return nil
	}
	if campaignLaunchCopyHasProhibitedTerm(event) {
		return FieldValidationError{
			Field:   fmt.Sprintf("rules[%d].point_rule_config.event", index),
			Message: "campaign trigger event must use point-native wording",
		}
	}
	return nil
}

func (r RuleInput) ValidatePointAliasConflicts() error {
	raw := r.rawConfig()
	if len(raw) == 0 {
		return nil
	}
	var cfg map[string]any
	if err := json.Unmarshal(raw, &cfg); err != nil {
		return nil
	}
	if conflictingConfigValues(cfg, "max_bonus_points_cents", "max_bonus_cents") {
		return fmt.Errorf("max_bonus_points_cents conflicts with max_bonus_cents")
	}
	if conflictingConfigValues(cfg, "fixed_amount_points_cents", "fixed_amount_cents") {
		return fmt.Errorf("fixed_amount_points_cents conflicts with fixed_amount_cents")
	}
	if conflictingConfigValues(cfg, "min_points_cents", "min_amount_cents") {
		return fmt.Errorf("min_points_cents conflicts with min_amount_cents")
	}
	if conflictingConfigValues(cfg, "max_play_contribution_points_cents", "max_stake_contribution_cents") {
		return fmt.Errorf("max_play_contribution_points_cents conflicts with max_stake_contribution_cents")
	}
	if conflictingConfigValues(cfg, "max_stake_contribution_points_cents", "max_stake_contribution_cents") {
		return fmt.Errorf("max_play_contribution_points_cents conflicts with max_stake_contribution_cents")
	}
	if conflictingConfigValues(cfg, "max_play_contribution_points_cents", "max_stake_contribution_points_cents") {
		return fmt.Errorf("max_play_contribution_points_cents conflicts with max_stake_contribution_points_cents")
	}
	return nil
}

func (r RuleInput) rawConfig() json.RawMessage {
	if len(r.PointRuleConfig) != 0 {
		return r.PointRuleConfig
	}
	return r.RuleConfig
}

func conflictingConfigValues(cfg map[string]any, preferredKey string, retiredKey string) bool {
	preferred, hasPreferred := cfg[preferredKey]
	retired, hasRetired := cfg[retiredKey]
	if !hasPreferred || !hasRetired {
		return false
	}
	return !jsonValuesEqual(preferred, retired)
}

func jsonValuesEqual(a any, b any) bool {
	aJSON, err := json.Marshal(a)
	if err != nil {
		return false
	}
	bJSON, err := json.Marshal(b)
	if err != nil {
		return false
	}
	return string(aJSON) == string(bJSON)
}

// NormalizePointAliases maps the preferred launch override amount into the
// legacy internal field used by the service.
func (r *GrantBonusRequest) NormalizePointAliases() {
	if r.OverrideAmountCents == nil && r.OverridePointsCents != nil {
		r.OverrideAmountCents = r.OverridePointsCents
	}
}

func (r GrantBonusRequest) HasConflictingOverrideAliases() bool {
	return r.OverrideAmountCents != nil && r.OverridePointsCents != nil && *r.OverrideAmountCents != *r.OverridePointsCents
}

// WageringConfig holds the internal point-play requirement rules parsed from campaign_rules JSONB.
type WageringConfig struct {
	Multiplier           float64  `json:"multiplier"`        // e.g., 10 means 10x point play
	MinOddsDecimal       float64  `json:"min_odds_decimal"`  // e.g., 1.5
	ParlayMultiplier     float64  `json:"parlay_multiplier"` // e.g., 1.5 for 1.5x contribution
	ExcludedSports       []string `json:"excluded_sports"`
	MaxStakeContribution *int64   `json:"max_stake_contribution_cents"`
}

// RewardConfig holds the reward definition parsed from campaign_rules JSONB.
type RewardConfig struct {
	Type             string `json:"type"`               // point_grant, point_match, or old storage input normalized at boundaries
	MatchPct         int    `json:"match_pct"`          // for point_match: percentage
	MaxBonusCents    int64  `json:"max_bonus_cents"`    // cap on reward
	FixedAmountCents int64  `json:"fixed_amount_cents"` // for fixed rewards
	ExpiryDays       int    `json:"expiry_days"`        // bonus validity period
}

// EligibilityConfig holds eligibility rules parsed from campaign_rules JSONB.
type EligibilityConfig struct {
	NewPlayersOnly  bool   `json:"new_players_only"`
	MinDeposits     int    `json:"min_deposits"` // old storage field; not launch-facing
	TierMin         string `json:"tier_min"`
	RegisteredAfter string `json:"registered_after"`
	// AllowedCountries (GAP-83, §21) restricts who may be granted/claim the bonus
	// by jurisdiction — an ISO-3166 alpha-2 allowlist. Empty = no country
	// restriction. A regulatory control: it prevents offering a promotion into a
	// country where it is impermissible. Enforced fail-closed (an unknown punter
	// country is refused when a restriction is set).
	AllowedCountries []string `json:"allowed_countries"`
	// AllowedTagIDs (GAP-83 slice 2, §21) restricts the bonus to members of one or
	// more segmentation tags (crm_user_tags) — "eligibility by tags". Empty = no
	// tag restriction. Fail-closed: when set, a punter carrying NONE of the listed
	// tags is refused. Any-match (a punter in ANY listed segment is eligible).
	AllowedTagIDs []int64 `json:"allowed_tag_ids"`
}

// hasCheckableEligibility reports whether the config carries any rule that
// checkPunterEligibility enforces against the punter row.
func (c EligibilityConfig) hasCheckableEligibility() bool {
	return c.NewPlayersOnly || c.RegisteredAfter != "" ||
		len(c.AllowedCountries) > 0 || len(c.AllowedTagIDs) > 0
}

// TriggerConfig holds trigger rules parsed from campaign_rules JSONB.
type TriggerConfig struct {
	Event          string `json:"event"` // manual, signup, prediction_order, or old storage input normalized at boundaries
	MinAmountCents int64  `json:"min_amount_cents"`
}
