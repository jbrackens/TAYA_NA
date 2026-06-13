package service

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-market-engine/internal/models"
	betgeniusprovider "github.com/phoenixbot/phoenix-market-engine/internal/providers/betgenius"
	mockdataprovider "github.com/phoenixbot/phoenix-market-engine/internal/providers/mockdata"
	oddinprovider "github.com/phoenixbot/phoenix-market-engine/internal/providers/oddin"
	"github.com/phoenixbot/phoenix-market-engine/internal/repository"
)

var ErrInvalidInput = errors.New("invalid input")

type EventPublisher interface {
	SendMessage(ctx context.Context, topic, key string, value any) error
}

type MarketService interface {
	CreateMarket(ctx context.Context, req *models.CreateMarketRequest, actor models.AuthClaims) (*models.Market, error)
	SyncMockDataMarkets(ctx context.Context, req *models.SyncMockDataMarketsRequest, actor models.AuthClaims) (*models.ProviderMarketSyncResponse, error)
	SyncOddinMarkets(ctx context.Context, req *models.SyncOddinMarketsRequest, actor models.AuthClaims) (*models.ProviderMarketSyncResponse, error)
	SyncBetgeniusMarkets(ctx context.Context, req *models.SyncBetgeniusMarketsRequest, actor models.AuthClaims) (*models.ProviderMarketSyncResponse, error)
	GetMarket(ctx context.Context, marketID string) (*models.Market, error)
	ListMarkets(ctx context.Context, filters models.MarketFilters) (*models.ListMarketsResponse, error)
	UpdateOdds(ctx context.Context, marketID string, req *models.UpdateOddsRequest, actor models.AuthClaims) (*models.Market, error)
	UpdateStatus(ctx context.Context, marketID string, req *models.UpdateMarketStatusRequest, actor models.AuthClaims) (*models.Market, error)
	SettleMarket(ctx context.Context, marketID string, req *models.SettleMarketRequest, actor models.AuthClaims) (*models.SettlementAcceptedResponse, error)
	GetLiquidity(ctx context.Context, marketID string) (*models.LiquidityResponse, error)
}

type marketService struct {
	logger     *slog.Logger
	repo       repository.MarketRepository
	publisher  EventPublisher
	defaultMin decimal.Decimal
	defaultMax decimal.Decimal
}

func NewMarketService(logger *slog.Logger, repo repository.MarketRepository, publisher EventPublisher, defaultMin, defaultMax decimal.Decimal) MarketService {
	return &marketService{logger: logger, repo: repo, publisher: publisher, defaultMin: defaultMin, defaultMax: defaultMax}
}

func (s *marketService) CreateMarket(ctx context.Context, req *models.CreateMarketRequest, actor models.AuthClaims) (*models.Market, error) {
	if err := validateCreateMarketRequest(req); err != nil {
		return nil, err
	}
	event, err := s.repo.GetEvent(ctx, req.EventID)
	if err != nil {
		return nil, err
	}
	outcomes := make([]repository.CreateOutcomeParams, 0, len(req.Outcomes))
	for _, outcome := range req.Outcomes {
		outcomes = append(outcomes, repository.CreateOutcomeParams{
			OutcomeID: outcome.OutcomeID,
			Name:      strings.TrimSpace(outcome.Name),
			Odds:      req.Odds[outcome.OutcomeID],
		})
	}
	status := normalizedStatus(req.Status)
	market, err := s.repo.CreateMarket(ctx, repository.CreateMarketParams{
		EventID:    req.EventID,
		ExternalID: strings.TrimSpace(req.ExternalID),
		MarketType: strings.TrimSpace(req.MarketType),
		Status:     status,
		Outcomes:   outcomes,
	})
	if err != nil {
		return nil, err
	}
	s.enrichMarket(market)
	payload := map[string]any{
		"market_id":       market.MarketID,
		"event_id":        market.EventID,
		"event_name":      event.Name,
		"sport":           event.Sport,
		"league":          event.League,
		"market_type":     market.MarketType,
		"outcomes":        market.Outcomes,
		"status":          market.Status,
		"min_bet":         market.MinBet.String(),
		"max_bet":         market.MaxBet.String(),
		"created_at":      market.CreatedAt.Format(time.RFC3339),
		"scheduled_start": event.StartTime.Format(time.RFC3339),
		"created_by":      actor.UserID,
	}
	s.publish(ctx, "phoenix.market.created", market.MarketID, payload)
	s.recordAudit(ctx, repository.AuditLogEntry{
		ActorID:    actor.UserID,
		Action:     "market.created",
		EntityType: "market",
		EntityID:   market.MarketID,
		NewValue:   marketAuditSnapshot(market),
		CreatedAt:  time.Now().UTC(),
	})
	return market, nil
}

func (s *marketService) SyncMockDataMarkets(ctx context.Context, req *models.SyncMockDataMarketsRequest, actor models.AuthClaims) (*models.ProviderMarketSyncResponse, error) {
	if req == nil || len(req.Markets) == 0 {
		return nil, fmt.Errorf("%w: markets are required", ErrInvalidInput)
	}
	if !canManageProviders(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	response := &models.ProviderMarketSyncResponse{
		Provider: "mockdata",
		Items:    make([]models.ProviderMarketSyncItem, 0, len(req.Markets)),
	}
	for _, item := range req.Markets {
		normalized, eventExternalID, err := mockdataprovider.NormalizeMarket(item)
		if err != nil {
			return nil, fmt.Errorf("%w: %v", ErrInvalidInput, err)
		}
		outcomes := make([]repository.CreateOutcomeParams, 0, len(normalized.Outcomes))
		for _, outcome := range normalized.Outcomes {
			outcomes = append(outcomes, repository.CreateOutcomeParams{
				OutcomeID: outcome.OutcomeID,
				Name:      strings.TrimSpace(outcome.Name),
				Odds:      normalized.Odds[outcome.OutcomeID],
			})
		}
		market, created, err := s.repo.UpsertProviderMarket(ctx, repository.UpsertProviderMarketParams{
			EventExternalID: eventExternalID,
			ExternalID:      normalized.ExternalID,
			MarketType:      strings.TrimSpace(normalized.MarketType),
			Status:          normalizedStatus(normalized.Status),
			Outcomes:        outcomes,
		})
		if err != nil {
			return nil, err
		}
		s.enrichMarket(market)
		s.publish(ctx, "phoenix.market.provider-synced", market.MarketID, map[string]any{
			"market_id":          market.MarketID,
			"external_market_id": market.ExternalID,
			"event_external_id":  eventExternalID,
			"market_type":        market.MarketType,
			"status":             market.Status,
			"created":            created,
			"provider":           "mockdata",
			"synced_by":          actor.UserID,
			"synced_at":          time.Now().UTC().Format(time.RFC3339),
		})
		s.recordAudit(ctx, repository.AuditLogEntry{
			ActorID:    actor.UserID,
			Action:     "market.provider-synced",
			EntityType: "market",
			EntityID:   market.MarketID,
			NewValue:   marketAuditSnapshot(market),
			CreatedAt:  time.Now().UTC(),
		})
		response.Synced++
		if created {
			response.Created++
		} else {
			response.Updated++
		}
		response.Items = append(response.Items, models.ProviderMarketSyncItem{
			ExternalID: market.ExternalID,
			MarketID:   market.MarketID,
			Created:    created,
			Status:     market.Status,
		})
	}
	return response, nil
}

func (s *marketService) SyncOddinMarkets(ctx context.Context, req *models.SyncOddinMarketsRequest, actor models.AuthClaims) (*models.ProviderMarketSyncResponse, error) {
	if req == nil || len(req.Markets) == 0 {
		return nil, fmt.Errorf("%w: markets are required", ErrInvalidInput)
	}
	if !canManageProviders(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	response := &models.ProviderMarketSyncResponse{
		Provider: "oddin",
		Items:    make([]models.ProviderMarketSyncItem, 0, len(req.Markets)),
	}
	for _, item := range req.Markets {
		normalized, eventExternalID, err := oddinprovider.NormalizeMarket(item)
		if err != nil {
			return nil, fmt.Errorf("%w: %v", ErrInvalidInput, err)
		}
		outcomes := make([]repository.CreateOutcomeParams, 0, len(normalized.Outcomes))
		for _, outcome := range normalized.Outcomes {
			outcomes = append(outcomes, repository.CreateOutcomeParams{
				OutcomeID: outcome.OutcomeID,
				Name:      strings.TrimSpace(outcome.Name),
				Odds:      normalized.Odds[outcome.OutcomeID],
			})
		}
		market, created, err := s.repo.UpsertProviderMarket(ctx, repository.UpsertProviderMarketParams{
			EventExternalID: eventExternalID,
			ExternalID:      normalized.ExternalID,
			MarketType:      strings.TrimSpace(normalized.MarketType),
			Status:          normalizedStatus(normalized.Status),
			Outcomes:        outcomes,
		})
		if err != nil {
			return nil, err
		}
		s.enrichMarket(market)
		s.publish(ctx, "phoenix.market.provider-synced", market.MarketID, map[string]any{
			"market_id":          market.MarketID,
			"external_market_id": market.ExternalID,
			"event_external_id":  eventExternalID,
			"market_type":        market.MarketType,
			"status":             market.Status,
			"created":            created,
			"provider":           "oddin",
			"synced_by":          actor.UserID,
			"synced_at":          time.Now().UTC().Format(time.RFC3339),
		})
		s.recordAudit(ctx, repository.AuditLogEntry{
			ActorID:    actor.UserID,
			Action:     "market.provider-synced",
			EntityType: "market",
			EntityID:   market.MarketID,
			NewValue:   marketAuditSnapshot(market),
			CreatedAt:  time.Now().UTC(),
		})
		response.Synced++
		if created {
			response.Created++
		} else {
			response.Updated++
		}
		response.Items = append(response.Items, models.ProviderMarketSyncItem{
			ExternalID: market.ExternalID,
			MarketID:   market.MarketID,
			Created:    created,
			Status:     market.Status,
		})
	}
	return response, nil
}

func (s *marketService) SyncBetgeniusMarkets(ctx context.Context, req *models.SyncBetgeniusMarketsRequest, actor models.AuthClaims) (*models.ProviderMarketSyncResponse, error) {
	if req == nil || len(req.Markets) == 0 {
		return nil, fmt.Errorf("%w: markets are required", ErrInvalidInput)
	}
	if !canManageProviders(actor.Role) {
		return nil, fmt.Errorf("%w: insufficient permissions", ErrInvalidInput)
	}
	response := &models.ProviderMarketSyncResponse{
		Provider: "betgenius",
		Items:    make([]models.ProviderMarketSyncItem, 0, len(req.Markets)),
	}
	for _, item := range req.Markets {
		normalized, eventExternalID, err := betgeniusprovider.NormalizeMarket(item)
		if err != nil {
			return nil, fmt.Errorf("%w: %v", ErrInvalidInput, err)
		}
		outcomes := make([]repository.CreateOutcomeParams, 0, len(normalized.Outcomes))
		for _, outcome := range normalized.Outcomes {
			outcomes = append(outcomes, repository.CreateOutcomeParams{
				OutcomeID: outcome.OutcomeID,
				Name:      strings.TrimSpace(outcome.Name),
				Odds:      normalized.Odds[outcome.OutcomeID],
			})
		}
		market, created, err := s.repo.UpsertProviderMarket(ctx, repository.UpsertProviderMarketParams{
			EventExternalID: eventExternalID,
			ExternalID:      normalized.ExternalID,
			MarketType:      strings.TrimSpace(normalized.MarketType),
			Status:          normalizedStatus(normalized.Status),
			Outcomes:        outcomes,
		})
		if err != nil {
			return nil, err
		}
		s.enrichMarket(market)
		s.publish(ctx, "phoenix.market.provider-synced", market.MarketID, map[string]any{
			"market_id":          market.MarketID,
			"external_market_id": market.ExternalID,
			"event_external_id":  eventExternalID,
			"market_type":        market.MarketType,
			"status":             market.Status,
			"created":            created,
			"provider":           "betgenius",
			"synced_by":          actor.UserID,
			"synced_at":          time.Now().UTC().Format(time.RFC3339),
		})
		s.recordAudit(ctx, repository.AuditLogEntry{
			ActorID:    actor.UserID,
			Action:     "market.provider-synced",
			EntityType: "market",
			EntityID:   market.MarketID,
			NewValue:   marketAuditSnapshot(market),
			CreatedAt:  time.Now().UTC(),
		})
		response.Synced++
		if created {
			response.Created++
		} else {
			response.Updated++
		}
		response.Items = append(response.Items, models.ProviderMarketSyncItem{
			ExternalID: market.ExternalID,
			MarketID:   market.MarketID,
			Created:    created,
			Status:     market.Status,
		})
	}
	return response, nil
}

func (s *marketService) GetMarket(ctx context.Context, marketID string) (*models.Market, error) {
	market, err := s.repo.GetMarket(ctx, marketID)
	if err != nil {
		return nil, err
	}
	s.enrichMarket(market)
	return market, nil
}

func (s *marketService) ListMarkets(ctx context.Context, filters models.MarketFilters) (*models.ListMarketsResponse, error) {
	if filters.Page < 1 {
		filters.Page = 1
	}
	if filters.Limit < 1 || filters.Limit > 100 {
		filters.Limit = 50
	}
	markets, total, err := s.repo.ListMarkets(ctx, filters)
	if err != nil {
		return nil, err
	}
	for _, market := range markets {
		s.enrichMarket(market)
	}
	return &models.ListMarketsResponse{
		Data:       markets,
		Pagination: models.Pagination{Page: filters.Page, Limit: filters.Limit, Total: total},
	}, nil
}

func (s *marketService) UpdateOdds(ctx context.Context, marketID string, req *models.UpdateOddsRequest, actor models.AuthClaims) (*models.Market, error) {
	if req == nil || len(req.Odds) == 0 {
		return nil, fmt.Errorf("%w: odds are required", ErrInvalidInput)
	}
	for outcomeID, odd := range req.Odds {
		if strings.TrimSpace(outcomeID) == "" || odd.LessThanOrEqual(decimal.Zero) {
			return nil, fmt.Errorf("%w: odds must be positive for each outcome", ErrInvalidInput)
		}
	}
	market, previousOdds, err := s.repo.UpdateOdds(ctx, marketID, req.Odds)
	if err != nil {
		return nil, err
	}
	s.enrichMarket(market)
	oddsChanges := make(map[string]string, len(req.Odds))
	for outcomeID, newOdds := range req.Odds {
		oldOdds := previousOdds[outcomeID]
		if oldOdds.IsZero() {
			oddsChanges[outcomeID] = decimal.Zero.String()
			continue
		}
		change := newOdds.Sub(oldOdds).Div(oldOdds).Mul(decimal.NewFromInt(100)).Round(2)
		oddsChanges[outcomeID] = change.String()
	}
	s.publish(ctx, "phoenix.market.odds-updated", marketID, map[string]any{
		"market_id":              marketID,
		"previous_odds":          previousOdds,
		"new_odds":               req.Odds,
		"reason":                 strings.TrimSpace(req.Reason),
		"odds_change_percentage": oddsChanges,
		"updated_at":             time.Now().UTC().Format(time.RFC3339),
		"updated_by":             actor.UserID,
	})
	previousSnapshot := marketAuditSnapshot(market)
	previousSnapshot["odds"] = previousOdds
	s.recordAudit(ctx, repository.AuditLogEntry{
		ActorID:    actor.UserID,
		Action:     "market.odds-updated",
		EntityType: "market",
		EntityID:   marketID,
		OldValue:   previousSnapshot,
		NewValue:   marketAuditSnapshot(market),
		CreatedAt:  time.Now().UTC(),
	})
	return market, nil
}

func (s *marketService) UpdateStatus(ctx context.Context, marketID string, req *models.UpdateMarketStatusRequest, actor models.AuthClaims) (*models.Market, error) {
	if req == nil {
		return nil, fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	status := normalizedStatus(req.Status)
	if !isAllowedLifecycleStatus(status) {
		return nil, fmt.Errorf("%w: unsupported market status", ErrInvalidInput)
	}
	market, previousStatus, err := s.repo.UpdateStatus(ctx, marketID, status, func(from, to string) error {
		if !isValidTransition(from, to) {
			return fmt.Errorf("cannot transition market from %q to %q", from, to)
		}
		return nil
	})
	if err != nil {
		if errors.Is(err, repository.ErrInvalidTransition) {
			return nil, fmt.Errorf("%w: %v", ErrInvalidInput, err)
		}
		return nil, err
	}
	s.enrichMarket(market)
	s.publish(ctx, "phoenix.market.status-changed", marketID, map[string]any{
		"market_id":       marketID,
		"previous_status": previousStatus,
		"new_status":      status,
		"reason":          strings.TrimSpace(req.Reason),
		"changed_at":      time.Now().UTC().Format(time.RFC3339),
		"changed_by":      actor.UserID,
	})
	previousSnapshot := marketAuditSnapshot(market)
	previousSnapshot["status"] = previousStatus
	s.recordAudit(ctx, repository.AuditLogEntry{
		ActorID:    actor.UserID,
		Action:     "market.status-changed",
		EntityType: "market",
		EntityID:   marketID,
		OldValue:   previousSnapshot,
		NewValue:   marketAuditSnapshot(market),
		CreatedAt:  time.Now().UTC(),
	})
	return market, nil
}

func (s *marketService) SettleMarket(ctx context.Context, marketID string, req *models.SettleMarketRequest, actor models.AuthClaims) (*models.SettlementAcceptedResponse, error) {
	if req == nil || strings.TrimSpace(req.WinningOutcomeID) == "" {
		return nil, fmt.Errorf("%w: winning_outcome_id is required", ErrInvalidInput)
	}
	settledAt := time.Now().UTC()
	if req.SettledAt != nil {
		settledAt = req.SettledAt.UTC()
	}
	market, err := s.repo.SettleMarket(ctx, marketID, req.WinningOutcomeID, settledAt)
	if err != nil {
		if errors.Is(err, repository.ErrInvalidTransition) {
			return nil, fmt.Errorf("%w: %v", ErrInvalidInput, err)
		}
		return nil, err
	}
	s.enrichMarket(market)
	settlementBatchID := uuid.NewString()
	reason := strings.TrimSpace(req.Reason)
	s.publish(ctx, "phoenix.market.settled", marketID, map[string]any{
		"market_id":           marketID,
		"status":              market.Status,
		"winning_outcome_id":  req.WinningOutcomeID,
		"reason":              reason,
		"settled_at":          settledAt.Format(time.RFC3339),
		"settlement_batch_id": settlementBatchID,
		"settled_by":          actor.UserID,
	})
	auditSnapshot := marketAuditSnapshot(market)
	if reason != "" {
		auditSnapshot["reason"] = reason
	}
	s.recordAudit(ctx, repository.AuditLogEntry{
		ActorID:    actor.UserID,
		Action:     "market.settled",
		EntityType: "market",
		EntityID:   marketID,
		NewValue:   auditSnapshot,
		CreatedAt:  settledAt,
	})
	return &models.SettlementAcceptedResponse{
		MarketID:          marketID,
		Status:            market.Status,
		WinningOutcomeID:  req.WinningOutcomeID,
		SettlementBatchID: settlementBatchID,
	}, nil
}

func (s *marketService) GetLiquidity(ctx context.Context, marketID string) (*models.LiquidityResponse, error) {
	return s.repo.GetLiquidity(ctx, marketID)
}

func (s *marketService) enrichMarket(market *models.Market) {
	if market == nil {
		return
	}
	market.MinBet = s.defaultMin
	market.MaxBet = s.defaultMax
	if market.Odds == nil {
		market.Odds = make(map[string]decimal.Decimal, len(market.Outcomes))
	}
	for _, outcome := range market.Outcomes {
		market.Odds[outcome.OutcomeID] = outcome.Odds
	}
	sort.SliceStable(market.Outcomes, func(i, j int) bool {
		return market.Outcomes[i].Name < market.Outcomes[j].Name
	})
}

func (s *marketService) publish(ctx context.Context, topic, key string, payload any) {
	if s.publisher == nil {
		return
	}
	if err := s.publisher.SendMessage(ctx, topic, key, payload); err != nil {
		s.logger.Error("publish event failed", slog.String("topic", topic), slog.Any("error", err))
	}
}

func (s *marketService) recordAudit(ctx context.Context, entry repository.AuditLogEntry) {
	if err := s.repo.WriteAuditLog(ctx, entry); err != nil {
		s.logger.Error("market audit write failed", slog.String("action", entry.Action), slog.String("entity_id", entry.EntityID), slog.Any("error", err))
	}
}

func marketAuditSnapshot(market *models.Market) map[string]any {
	if market == nil {
		return nil
	}
	outcomes := make([]map[string]any, 0, len(market.Outcomes))
	for _, outcome := range market.Outcomes {
		outcomes = append(outcomes, map[string]any{
			"outcome_id": outcome.OutcomeID,
			"name":       outcome.Name,
			"odds":       outcome.Odds.String(),
			"status":     outcome.Status,
			"result":     outcome.Result,
		})
	}
	odds := make(map[string]string, len(market.Odds))
	for outcomeID, value := range market.Odds {
		odds[outcomeID] = value.String()
	}
	snapshot := map[string]any{
		"market_id":     market.MarketID,
		"event_id":      market.EventID,
		"event_name":    market.EventName,
		"sport":         market.Sport,
		"league":        market.League,
		"market_type":   market.MarketType,
		"status":        market.Status,
		"odds":          odds,
		"outcomes":      outcomes,
		"total_matched": market.TotalMatched.String(),
	}
	if market.ScheduledStart != nil {
		snapshot["scheduled_start"] = market.ScheduledStart.UTC().Format(time.RFC3339)
	}
	return snapshot
}

func validateCreateMarketRequest(req *models.CreateMarketRequest) error {
	if req == nil {
		return fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	if strings.TrimSpace(req.EventID) == "" || strings.TrimSpace(req.MarketType) == "" {
		return fmt.Errorf("%w: event_id and market_type are required", ErrInvalidInput)
	}
	if len(req.Outcomes) < 2 {
		return fmt.Errorf("%w: at least two outcomes are required", ErrInvalidInput)
	}
	for _, outcome := range req.Outcomes {
		if strings.TrimSpace(outcome.Name) == "" {
			return fmt.Errorf("%w: outcome name is required", ErrInvalidInput)
		}
		if strings.TrimSpace(outcome.OutcomeID) == "" {
			return fmt.Errorf("%w: outcome_id is required for each outcome", ErrInvalidInput)
		}
		odds, ok := req.Odds[outcome.OutcomeID]
		if !ok || odds.LessThanOrEqual(decimal.Zero) {
			return fmt.Errorf("%w: odds are required for every outcome", ErrInvalidInput)
		}
	}
	return nil
}

func normalizedStatus(status string) string {
	trimmed := strings.TrimSpace(strings.ToLower(status))
	if trimmed == "" {
		return "open"
	}
	return trimmed
}

func canManageProviders(role string) bool {
	switch strings.TrimSpace(strings.ToLower(role)) {
	case "data-provider", "data_provider", "admin", "operator", "trader":
		return true
	default:
		return false
	}
}

func isAllowedLifecycleStatus(status string) bool {
	switch status {
	case "open", "suspended", "closed", "voided":
		return true
	default:
		return false
	}
}

// isValidTransition enforces the market lifecycle state machine.
// Terminal states (closed, voided, settled) cannot transition to anything.
func isValidTransition(from, to string) bool {
	from = strings.TrimSpace(strings.ToLower(from))
	to = strings.TrimSpace(strings.ToLower(to))
	if from == to {
		return true // idempotent
	}
	switch from {
	case "open":
		return to == "suspended" || to == "closed" || to == "voided"
	case "suspended":
		return to == "open" || to == "closed" || to == "voided"
	case "closed", "voided", "settled":
		return false // terminal states
	default:
		return false
	}
}
