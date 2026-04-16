package bonus

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"phoenix-revival/gateway/internal/events"
	"phoenix-revival/gateway/internal/wallet"
)

// Service manages campaigns and player bonuses.
type Service struct {
	repo      *Repository
	walletSvc *wallet.Service
	bus       *events.Bus
}

// NewService creates a bonus service. If db is nil, the service operates
// as a no-op (no-database mode for development).
func NewService(repo *Repository, walletSvc *wallet.Service, bus *events.Bus) *Service {
	return &Service{repo: repo, walletSvc: walletSvc, bus: bus}
}

// --- Campaign CRUD ---

func (s *Service) CreateCampaign(ctx context.Context, req CreateCampaignRequest) (Campaign, error) {
	if req.Name == "" || req.CampaignType == "" || req.StartAt.IsZero() || req.EndAt.IsZero() {
		return Campaign{}, fmt.Errorf("missing required campaign fields")
	}
	if req.EndAt.Before(req.StartAt) {
		return Campaign{}, fmt.Errorf("end_at must be after start_at")
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
	if now.Before(campaign.StartAt) || now.After(campaign.EndAt) {
		return PlayerBonus{}, fmt.Errorf("campaign is not within its active window")
	}

	// Check budget and claim limits
	if campaign.MaxClaims != nil && campaign.ClaimCount >= *campaign.MaxClaims {
		return PlayerBonus{}, fmt.Errorf("campaign has reached maximum claims")
	}

	// Check if player already claimed
	exists, err := s.repo.HasExistingBonus(ctx, req.UserID, req.CampaignID)
	if err != nil {
		return PlayerBonus{}, err
	}
	if exists {
		return PlayerBonus{}, fmt.Errorf("bonus already claimed for this campaign")
	}

	// Evaluate reward rules
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

	// Calculate bonus amount
	bonusAmount := rewardCfg.FixedAmountCents
	if bonusAmount <= 0 && rewardCfg.MaxBonusCents > 0 {
		bonusAmount = rewardCfg.MaxBonusCents
	}
	if bonusAmount <= 0 {
		return PlayerBonus{}, fmt.Errorf("campaign has no reward amount configured")
	}

	// Calculate wagering requirement
	wageringRequired := int64(0)
	if wageringCfg.Multiplier > 0 {
		wageringRequired = int64(float64(bonusAmount) * wageringCfg.Multiplier)
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
		return PlayerBonus{}, fmt.Errorf("create player bonus: %w", err)
	}

	// Credit bonus funds to wallet
	idempKey := fmt.Sprintf("bonus-grant:%d", created.ID)
	_, err = s.walletSvc.CreditBonus(wallet.MutationRequest{
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

	// Update campaign claim count
	_ = s.repo.IncrementClaimCount(ctx, req.CampaignID, bonusAmount)

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

// GrantBonus is the admin action to manually grant a bonus.
func (s *Service) GrantBonus(ctx context.Context, req GrantBonusRequest) (PlayerBonus, error) {
	if req.UserID == "" || req.CampaignID <= 0 {
		return PlayerBonus{}, fmt.Errorf("missing user_id or campaign_id")
	}

	campaign, rules, err := s.GetCampaignWithRules(ctx, req.CampaignID)
	if err != nil {
		return PlayerBonus{}, err
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

	bonusAmount := rewardCfg.FixedAmountCents
	if req.OverrideAmountCents != nil && *req.OverrideAmountCents > 0 {
		bonusAmount = *req.OverrideAmountCents
	}
	if bonusAmount <= 0 && rewardCfg.MaxBonusCents > 0 {
		bonusAmount = rewardCfg.MaxBonusCents
	}
	if bonusAmount <= 0 {
		return PlayerBonus{}, fmt.Errorf("no bonus amount determined")
	}

	wageringRequired := int64(0)
	if wageringCfg.Multiplier > 0 {
		wageringRequired = int64(float64(bonusAmount) * wageringCfg.Multiplier)
	}

	expiryDays := rewardCfg.ExpiryDays
	if expiryDays <= 0 {
		expiryDays = 30
	}
	now := time.Now().UTC()
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
		return PlayerBonus{}, err
	}

	idempKey := fmt.Sprintf("admin-bonus-grant:%d", created.ID)
	_, err = s.walletSvc.CreditBonus(wallet.MutationRequest{
		UserID:         req.UserID,
		AmountCents:    bonusAmount,
		IdempotencyKey: idempKey,
		Reason:         fmt.Sprintf("admin grant: %s (%s)", req.Reason, campaign.Name),
	})
	if err != nil {
		return PlayerBonus{}, fmt.Errorf("credit bonus to wallet: %w", err)
	}

	_ = s.repo.IncrementClaimCount(ctx, req.CampaignID, bonusAmount)

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
	_, err = s.walletSvc.ForfeitBonus(pb.UserID, pb.RemainingAmountCents,
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
		_, err := s.walletSvc.ForfeitBonus(pb.UserID, pb.RemainingAmountCents,
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
