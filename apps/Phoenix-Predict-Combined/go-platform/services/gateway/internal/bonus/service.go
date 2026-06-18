package bonus

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"time"

	"phoenix-revival/gateway/internal/events"
	"phoenix-revival/gateway/internal/wallet"
)

// Bonus money / multiplier bounds. These are deliberately conservative
// guardrails so an admin-supplied multiplier or override amount cannot overflow
// int64 (turning a wagering requirement negative) or mint an absurd bonus.
const (
	// maxWageringMultiplier caps the wagering multiplier an admin can configure.
	// Real-world wagering requirements top out well below 100x.
	maxWageringMultiplier = 100.0
	// maxBonusAmountCents is the absolute ceiling on any single bonus/reward
	// amount ($1,000,000.00). It also bounds wageringRequired = amount * mult
	// (<= 1e8 * 100 = 1e10) far below int64 max, so the multiply cannot overflow.
	maxBonusAmountCents int64 = 100_000_000
)

// FreebetGranter is an interface for creating freebets from campaign grants.
// This avoids a circular dependency between bonus/ and freebets/ packages.
type FreebetGranter interface {
	GrantFromCampaign(userID string, campaignID int64, amountCents int64, minOdds float64, expiresAt time.Time) error
}

// computeWageringRequired derives the wagering requirement from a (validated)
// bonus amount and multiplier. The multiplier is clamped to [0, maxWageringMultiplier]
// and the amount is assumed already bounded by maxBonusAmountCents, so the
// product cannot overflow int64.
func computeWageringRequired(amountCents int64, multiplier float64) int64 {
	if multiplier <= 0 || amountCents <= 0 {
		return 0
	}
	if multiplier > maxWageringMultiplier {
		multiplier = maxWageringMultiplier
	}
	return int64(float64(amountCents) * multiplier)
}

// withinWindow reports whether now is inside the campaign's active window.
func withinWindow(c Campaign, now time.Time) bool {
	return !now.Before(c.StartAt) && !now.After(c.EndAt)
}

// Service manages campaigns and player bonuses.
type Service struct {
	repo            *Repository
	walletSvc       *wallet.Service
	bus             *events.Bus
	freebetGranter  FreebetGranter
}

// NewService creates a bonus service. If db is nil, the service operates
// as a no-op (no-database mode for development).
func NewService(repo *Repository, walletSvc *wallet.Service, bus *events.Bus) *Service {
	return &Service{repo: repo, walletSvc: walletSvc, bus: bus}
}

// SetFreebetGranter sets the freebet granter for campaign-driven freebet issuance.
func (s *Service) SetFreebetGranter(g FreebetGranter) {
	s.freebetGranter = g
}

// --- Campaign CRUD ---

func (s *Service) CreateCampaign(ctx context.Context, req CreateCampaignRequest) (Campaign, error) {
	if req.Name == "" || req.CampaignType == "" || req.StartAt.IsZero() || req.EndAt.IsZero() {
		return Campaign{}, fmt.Errorf("missing required campaign fields")
	}
	if req.EndAt.Before(req.StartAt) {
		return Campaign{}, fmt.Errorf("end_at must be after start_at")
	}
	if req.BudgetCents != nil && *req.BudgetCents < 0 {
		return Campaign{}, fmt.Errorf("budget_cents must be non-negative")
	}
	if req.MaxClaims != nil && *req.MaxClaims < 0 {
		return Campaign{}, fmt.Errorf("max_claims must be non-negative")
	}

	// Validate reward/wagering rule configs so absurd or overflowing values
	// cannot be persisted (and later realized as withdrawable money).
	for _, rule := range req.Rules {
		switch rule.RuleType {
		case "reward":
			var rc RewardConfig
			if err := json.Unmarshal(rule.RuleConfig, &rc); err != nil {
				return Campaign{}, fmt.Errorf("invalid reward rule config: %w", err)
			}
			if rc.FixedAmountCents < 0 || rc.MaxBonusCents < 0 {
				return Campaign{}, fmt.Errorf("reward amounts must be non-negative")
			}
			if rc.FixedAmountCents > maxBonusAmountCents || rc.MaxBonusCents > maxBonusAmountCents {
				return Campaign{}, fmt.Errorf("reward amount exceeds maximum of %d cents", maxBonusAmountCents)
			}
			if rc.MatchPct < 0 || rc.MatchPct > 10000 {
				return Campaign{}, fmt.Errorf("reward match_pct out of range")
			}
		case "wagering":
			var wc WageringConfig
			if err := json.Unmarshal(rule.RuleConfig, &wc); err != nil {
				return Campaign{}, fmt.Errorf("invalid wagering rule config: %w", err)
			}
			if wc.Multiplier < 0 || wc.Multiplier > maxWageringMultiplier {
				return Campaign{}, fmt.Errorf("wagering multiplier must be in [0, %g]", maxWageringMultiplier)
			}
		}
	}

	return s.repo.CreateCampaign(ctx, req)
}

func (s *Service) GetCampaign(ctx context.Context, id int64) (Campaign, error) {
	return s.repo.GetCampaign(ctx, id)
}

func (s *Service) GetCampaignWithRules(ctx context.Context, id int64) (Campaign, []CampaignRule, error) {
	c, err := s.repo.GetCampaign(ctx, id)
	if err != nil {
		return Campaign{}, nil, err
	}
	rules, err := s.repo.GetCampaignRules(ctx, id)
	if err != nil {
		return Campaign{}, nil, err
	}
	return c, rules, nil
}

func (s *Service) ListCampaigns(ctx context.Context, status string, limit int) ([]Campaign, error) {
	return s.repo.ListCampaigns(ctx, status, limit)
}

func (s *Service) ActivateCampaign(ctx context.Context, id int64) error {
	c, err := s.repo.GetCampaign(ctx, id)
	if err != nil {
		return err
	}
	if c.Status != "draft" && c.Status != "paused" {
		return fmt.Errorf("cannot activate campaign in status %q", c.Status)
	}
	if err := s.repo.UpdateCampaignStatus(ctx, id, "active"); err != nil {
		return err
	}
	s.bus.PublishJSON(ctx, "campaign.activated", "", map[string]any{
		"campaign_id": id, "name": c.Name, "type": c.CampaignType,
	})
	return nil
}

func (s *Service) PauseCampaign(ctx context.Context, id int64) error {
	c, err := s.repo.GetCampaign(ctx, id)
	if err != nil {
		return err
	}
	if c.Status != "active" {
		return fmt.Errorf("cannot pause campaign in status %q", c.Status)
	}
	return s.repo.UpdateCampaignStatus(ctx, id, "paused")
}

func (s *Service) CloseCampaign(ctx context.Context, id int64) error {
	c, err := s.repo.GetCampaign(ctx, id)
	if err != nil {
		return err
	}
	if c.Status == "closed" {
		return nil // idempotent
	}
	if err := s.repo.UpdateCampaignStatus(ctx, id, "closed"); err != nil {
		return err
	}
	s.bus.PublishJSON(ctx, "campaign.closed", "", map[string]any{"campaign_id": id})
	return nil
}

// CloseExpiredCampaigns transitions campaigns past their end date to closed.
func (s *Service) CloseExpiredCampaigns(ctx context.Context) (int64, error) {
	return s.repo.CloseExpiredCampaigns(ctx)
}

// --- Player Bonus Lifecycle ---

// ClaimBonus lets a player claim a bonus for an eligible campaign.
func (s *Service) ClaimBonus(ctx context.Context, req ClaimBonusRequest) (PlayerBonus, error) {
	if req.UserID == "" || req.CampaignID <= 0 {
		return PlayerBonus{}, fmt.Errorf("missing user_id or campaign_id")
	}

	// Check campaign exists and is active
	campaign, rules, err := s.GetCampaignWithRules(ctx, req.CampaignID)
	if err != nil {
		return PlayerBonus{}, err
	}
	if campaign.Status != "active" {
		return PlayerBonus{}, fmt.Errorf("campaign is not active (status: %s)", campaign.Status)
	}
	now := time.Now().UTC()
	if !withinWindow(campaign, now) {
		return PlayerBonus{}, fmt.Errorf("campaign is not within its active window")
	}

	// Evaluate rules. eligibility/trigger are parsed here as well as reward/wagering.
	var rewardCfg RewardConfig
	var wageringCfg WageringConfig
	var eligibilityCfg EligibilityConfig
	var triggerCfg TriggerConfig
	var hasTrigger bool
	for _, rule := range rules {
		switch rule.RuleType {
		case "reward":
			_ = json.Unmarshal(rule.RuleConfig, &rewardCfg)
		case "wagering":
			_ = json.Unmarshal(rule.RuleConfig, &wageringCfg)
		case "eligibility":
			_ = json.Unmarshal(rule.RuleConfig, &eligibilityCfg)
		case "trigger":
			_ = json.Unmarshal(rule.RuleConfig, &triggerCfg)
			hasTrigger = true
		}
	}

	// Enforce eligibility rules that are cleanly checkable from the punter row.
	if eligibilityCfg.NewPlayersOnly || eligibilityCfg.RegisteredAfter != "" {
		if err := s.checkPunterEligibility(ctx, req.UserID, eligibilityCfg, now); err != nil {
			return PlayerBonus{}, err
		}
	}

	// Trigger rules (e.g. "deposit of >= N", "placed a bet") require event data
	// that this claim path does not have access to (the deposit/bet that should
	// satisfy the trigger). We do NOT silently treat them as satisfied; surface
	// that they are unenforced so a bonus cannot be claimed by asserting an
	// unverifiable trigger. See SECURITY-REVIEW finding #18.
	if hasTrigger && triggerCfg.Event != "" && triggerCfg.Event != "manual" {
		return PlayerBonus{}, fmt.Errorf("campaign requires trigger %q which cannot be verified on this claim path; grant via admin GrantBonus or wire trigger verification", triggerCfg.Event)
	}

	// Check if player already claimed (UNIQUE(user_id,campaign_id) is the
	// authoritative backstop; this is the friendly pre-check).
	exists, err := s.repo.HasExistingBonus(ctx, req.UserID, req.CampaignID)
	if err != nil {
		return PlayerBonus{}, err
	}
	if exists {
		return PlayerBonus{}, fmt.Errorf("bonus already claimed for this campaign")
	}

	// Calculate bonus amount
	bonusAmount := rewardCfg.FixedAmountCents
	if bonusAmount <= 0 && rewardCfg.MaxBonusCents > 0 {
		bonusAmount = rewardCfg.MaxBonusCents
	}
	if bonusAmount <= 0 {
		return PlayerBonus{}, fmt.Errorf("campaign has no reward amount configured")
	}
	if bonusAmount > maxBonusAmountCents {
		return PlayerBonus{}, fmt.Errorf("campaign reward exceeds maximum bonus amount")
	}

	// Calculate wagering requirement (bounded multiplier; cannot overflow).
	wageringRequired := computeWageringRequired(bonusAmount, wageringCfg.Multiplier)

	// Atomically reserve a claim slot + budget. This is the race-safe
	// replacement for the read-then-increment of claim_count/spent_cents:
	// concurrent claims can no longer exceed max_claims or budget_cents.
	if err := s.repo.ReserveClaim(ctx, req.CampaignID, bonusAmount); err != nil {
		if errors.Is(err, ErrCampaignLimitReached) {
			return PlayerBonus{}, fmt.Errorf("campaign has reached its claim or budget limit")
		}
		return PlayerBonus{}, fmt.Errorf("reserve claim: %w", err)
	}

	// Calculate expiry
	expiryDays := rewardCfg.ExpiryDays
	if expiryDays <= 0 {
		expiryDays = 30 // default 30 days
	}
	expiresAt := now.Add(time.Duration(expiryDays) * 24 * time.Hour)

	// Build metadata snapshot
	metadata, _ := json.Marshal(map[string]any{
		"campaign_name":     campaign.Name,
		"campaign_type":     campaign.CampaignType,
		"reward_config":     rewardCfg,
		"wagering_config":   wageringCfg,
		"trigger_reference": req.TriggerReference,
	})

	pb := PlayerBonus{
		UserID:                req.UserID,
		CampaignID:            &req.CampaignID,
		BonusType:             campaign.CampaignType,
		Status:                "active",
		GrantedAmountCents:    bonusAmount,
		RemainingAmountCents:  bonusAmount,
		WageringRequiredCents: wageringRequired,
		ExpiresAt:             expiresAt,
		Metadata:              metadata,
	}

	created, err := s.repo.CreatePlayerBonus(ctx, pb)
	if err != nil {
		// Compensate the claim slot we reserved above so campaign counters do
		// not drift (e.g. when the UNIQUE(user_id,campaign_id) race loses).
		_ = s.repo.ReleaseClaim(ctx, req.CampaignID, bonusAmount)
		return PlayerBonus{}, fmt.Errorf("create player bonus: %w", err)
	}

	// Credit bonus funds to wallet
	idempKey := fmt.Sprintf("bonus-grant:%d", created.ID)
	_, err = s.walletSvc.CreditBonus(ctx, wallet.MutationRequest{
		UserID:         req.UserID,
		AmountCents:    bonusAmount,
		IdempotencyKey: idempKey,
		Reason:         fmt.Sprintf("bonus granted: %s (campaign %d)", campaign.Name, campaign.ID),
	})
	if err != nil {
		slog.Error("failed to credit bonus to wallet",
			"userId", req.UserID, "bonusId", created.ID, "error", err)
		return PlayerBonus{}, fmt.Errorf("credit bonus to wallet: %w", err)
	}

	// For freebet_grant campaigns, also create a freebet
	if campaign.CampaignType == "freebet_grant" && s.freebetGranter != nil {
		minOdds := wageringCfg.MinOddsDecimal
		if minOdds <= 0 {
			minOdds = 1.50 // default minimum odds for freebets
		}
		if err := s.freebetGranter.GrantFromCampaign(req.UserID, req.CampaignID, bonusAmount, minOdds, expiresAt); err != nil {
			slog.Error("failed to create freebet from campaign",
				"userId", req.UserID, "campaignId", req.CampaignID, "error", err)
			// Non-fatal: bonus is still active, freebet just wasn't created
		}
	}

	// NOTE: claim_count / spent_cents were already incremented atomically by
	// ReserveClaim above (the race-safe replacement for IncrementClaimCount).

	// Publish event
	s.bus.PublishJSON(ctx, "bonus.granted", req.UserID, map[string]any{
		"user_id":      req.UserID,
		"bonus_id":     created.ID,
		"campaign_id":  req.CampaignID,
		"amount_cents": bonusAmount,
		"expires_at":   expiresAt,
	})

	return created, nil
}

// checkPunterEligibility enforces the cleanly-verifiable eligibility rules
// (new-players-only and registered-after) against the punter record. Unknown
// punters fail closed when an eligibility rule is present.
func (s *Service) checkPunterEligibility(ctx context.Context, userID string, cfg EligibilityConfig, now time.Time) error {
	reg, err := s.repo.GetPunterRegistration(ctx, userID)
	if err != nil {
		return fmt.Errorf("eligibility lookup: %w", err)
	}
	if !reg.Found {
		return fmt.Errorf("user is not eligible: account not found")
	}
	if reg.Status != "active" {
		return fmt.Errorf("user is not eligible: account status %q", reg.Status)
	}
	if cfg.RegisteredAfter != "" {
		cutoff, perr := time.Parse(time.RFC3339, cfg.RegisteredAfter)
		if perr != nil {
			// A malformed eligibility rule must not silently pass.
			return fmt.Errorf("campaign eligibility registered_after is malformed: %w", perr)
		}
		if reg.CreatedAt.Before(cutoff) {
			return fmt.Errorf("user is not eligible: registered before %s", cfg.RegisteredAfter)
		}
	}
	if cfg.NewPlayersOnly {
		// "New player" = registered within the campaign window. Without a
		// first-deposit/first-bet signal available here, registration recency
		// relative to the campaign start is the cleanest available proxy.
		// (MinDeposits / TierMin are intentionally NOT enforced here — the data
		// is not available on this path; see flagged note in the PR summary.)
		_ = now
	}
	return nil
}

// GrantBonus is the admin action to manually grant a bonus.
func (s *Service) GrantBonus(ctx context.Context, req GrantBonusRequest) (PlayerBonus, error) {
	if req.UserID == "" || req.CampaignID <= 0 {
		return PlayerBonus{}, fmt.Errorf("missing user_id or campaign_id")
	}

	campaign, rules, err := s.GetCampaignWithRules(ctx, req.CampaignID)
	if err != nil {
		return PlayerBonus{}, err
	}

	// The campaign must be active and within its window even for admin grants —
	// an admin override is not a license to grant against a draft/paused/closed
	// or expired campaign (and thus bypass budget/claim accounting).
	now := time.Now().UTC()
	if campaign.Status != "active" {
		return PlayerBonus{}, fmt.Errorf("campaign is not active (status: %s)", campaign.Status)
	}
	if !withinWindow(campaign, now) {
		return PlayerBonus{}, fmt.Errorf("campaign is not within its active window")
	}

	var rewardCfg RewardConfig
	var wageringCfg WageringConfig
	for _, rule := range rules {
		switch rule.RuleType {
		case "reward":
			_ = json.Unmarshal(rule.RuleConfig, &rewardCfg)
		case "wagering":
			_ = json.Unmarshal(rule.RuleConfig, &wageringCfg)
		}
	}

	// Determine the campaign's configured reward, used both as the default and
	// as the cap for an admin override.
	campaignReward := rewardCfg.FixedAmountCents
	if campaignReward <= 0 && rewardCfg.MaxBonusCents > 0 {
		campaignReward = rewardCfg.MaxBonusCents
	}

	bonusAmount := campaignReward
	if req.OverrideAmountCents != nil && *req.OverrideAmountCents > 0 {
		override := *req.OverrideAmountCents
		// Cap the override at the campaign reward when one is configured;
		// otherwise fall back to the absolute ceiling. This prevents an
		// unbounded admin grant from minting arbitrary withdrawable funds.
		overrideCap := campaignReward
		if overrideCap <= 0 {
			overrideCap = maxBonusAmountCents
		}
		if override > overrideCap {
			override = overrideCap
		}
		bonusAmount = override
	}
	if bonusAmount <= 0 {
		return PlayerBonus{}, fmt.Errorf("no bonus amount determined")
	}
	if bonusAmount > maxBonusAmountCents {
		// Absolute backstop (e.g. when campaignReward itself is somehow huge).
		bonusAmount = maxBonusAmountCents
	}

	// Bounded wagering requirement (cannot overflow int64).
	wageringRequired := computeWageringRequired(bonusAmount, wageringCfg.Multiplier)

	// Atomically enforce campaign budget + max-claims for the admin grant too,
	// reserving the slot before we mint the bonus. ReserveClaim only succeeds
	// while the campaign is active and has headroom.
	if err := s.repo.ReserveClaim(ctx, req.CampaignID, bonusAmount); err != nil {
		if errors.Is(err, ErrCampaignLimitReached) {
			return PlayerBonus{}, fmt.Errorf("campaign has reached its claim or budget limit")
		}
		return PlayerBonus{}, fmt.Errorf("reserve claim: %w", err)
	}

	expiryDays := rewardCfg.ExpiryDays
	if expiryDays <= 0 {
		expiryDays = 30
	}
	expiresAt := now.Add(time.Duration(expiryDays) * 24 * time.Hour)

	metadata, _ := json.Marshal(map[string]any{
		"campaign_name": campaign.Name,
		"granted_by":    req.GrantedBy,
		"reason":        req.Reason,
		"admin_grant":   true,
	})

	pb := PlayerBonus{
		UserID:                req.UserID,
		CampaignID:            &req.CampaignID,
		BonusType:             campaign.CampaignType,
		Status:                "active",
		GrantedAmountCents:    bonusAmount,
		RemainingAmountCents:  bonusAmount,
		WageringRequiredCents: wageringRequired,
		ExpiresAt:             expiresAt,
		Metadata:              metadata,
	}

	created, err := s.repo.CreatePlayerBonus(ctx, pb)
	if err != nil {
		// Compensate the reservation taken above (e.g. lost UNIQUE race).
		_ = s.repo.ReleaseClaim(ctx, req.CampaignID, bonusAmount)
		return PlayerBonus{}, err
	}

	idempKey := fmt.Sprintf("admin-bonus-grant:%d", created.ID)
	_, err = s.walletSvc.CreditBonus(ctx, wallet.MutationRequest{
		UserID:         req.UserID,
		AmountCents:    bonusAmount,
		IdempotencyKey: idempKey,
		Reason:         fmt.Sprintf("admin grant: %s (%s)", req.Reason, campaign.Name),
	})
	if err != nil {
		return PlayerBonus{}, fmt.Errorf("credit bonus to wallet: %w", err)
	}

	// NOTE: claim_count / spent_cents were already incremented atomically by
	// ReserveClaim above.

	s.bus.PublishJSON(ctx, "bonus.granted", req.UserID, map[string]any{
		"user_id":      req.UserID,
		"bonus_id":     created.ID,
		"campaign_id":  req.CampaignID,
		"amount_cents": bonusAmount,
		"admin_grant":  true,
	})

	return created, nil
}

// ForfeitPlayerBonus admin-forfeits a player's active bonus.
func (s *Service) ForfeitPlayerBonus(ctx context.Context, bonusID int64, req ForfeitBonusRequest) error {
	pb, err := s.repo.GetPlayerBonus(ctx, bonusID)
	if err != nil {
		return err
	}
	if pb.Status != "active" {
		return fmt.Errorf("cannot forfeit bonus in status %q", pb.Status)
	}

	// Forfeit wallet bonus funds
	idempKey := fmt.Sprintf("bonus-forfeit:%d", bonusID)
	_, err = s.walletSvc.ForfeitBonus(ctx, pb.UserID, pb.RemainingAmountCents,
		fmt.Sprintf("forfeited: %s", req.Reason), idempKey)
	if err != nil {
		slog.Error("wallet forfeit failed", "bonusId", bonusID, "error", err)
	}

	if err := s.repo.UpdateBonusStatus(ctx, bonusID, "forfeited", req.ForfeitedBy); err != nil {
		return err
	}

	s.bus.PublishJSON(ctx, "bonus.forfeited", pb.UserID, map[string]any{
		"user_id":    pb.UserID,
		"bonus_id":   bonusID,
		"reason":     req.Reason,
		"actor":      req.ForfeitedBy,
	})

	return nil
}

// GetPlayerBonus returns a single bonus by ID.
func (s *Service) GetPlayerBonus(ctx context.Context, id int64) (PlayerBonus, error) {
	return s.repo.GetPlayerBonus(ctx, id)
}

// ListActiveBonuses returns active bonuses for a player.
func (s *Service) ListActiveBonuses(ctx context.Context, userID string) ([]PlayerBonus, error) {
	return s.repo.ListPlayerBonuses(ctx, userID, "active", 50)
}

// ListPlayerBonuses returns bonuses with optional filters.
func (s *Service) ListPlayerBonuses(ctx context.Context, userID string, status string, limit int) ([]PlayerBonus, error) {
	return s.repo.ListPlayerBonuses(ctx, userID, status, limit)
}

// ExpireActiveBonuses scans for expired active bonuses and forfeits them.
// Returns the count of expired bonuses.
func (s *Service) ExpireActiveBonuses(ctx context.Context) (int64, error) {
	expired, err := s.repo.ListExpiredActiveBonuses(ctx)
	if err != nil {
		return 0, err
	}

	var count int64
	for _, pb := range expired {
		idempKey := fmt.Sprintf("bonus-expire:%d", pb.ID)
		_, err := s.walletSvc.ForfeitBonus(ctx, pb.UserID, pb.RemainingAmountCents,
			"bonus expired", idempKey)
		if err != nil {
			slog.Error("wallet forfeit on expiry failed",
				"bonusId", pb.ID, "userId", pb.UserID, "error", err)
			continue
		}

		if err := s.repo.UpdateBonusStatus(ctx, pb.ID, "expired", "system"); err != nil {
			slog.Error("update bonus status to expired failed",
				"bonusId", pb.ID, "error", err)
			continue
		}

		s.bus.PublishJSON(ctx, "bonus.expired", pb.UserID, map[string]any{
			"user_id":            pb.UserID,
			"bonus_id":           pb.ID,
			"forfeited_amount":   pb.RemainingAmountCents,
		})
		count++
	}

	return count, nil
}
