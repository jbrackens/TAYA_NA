package service

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-prediction/internal/client"
	"github.com/phoenixbot/phoenix-prediction/internal/models"
	"github.com/phoenixbot/phoenix-prediction/internal/repository"
)

var (
	ErrForbidden    = errors.New("forbidden")
	ErrInvalidInput = errors.New("invalid input")
)

type PredictionService interface {
	GetOverview(ctx context.Context) (*models.PredictionOverviewResponse, error)
	ListCategories(ctx context.Context) (*models.PredictionCategoriesResponse, error)
	ListMarkets(ctx context.Context, filters models.PredictionMarketFilters) (*models.PredictionMarketsResponse, error)
	GetMarketDetail(ctx context.Context, marketID string) (*models.PredictionMarketDetailResponse, error)
	PreviewTicket(ctx context.Context, req *models.PredictionTicketPreviewRequest) (*models.PredictionTicketPreviewResponse, error)
	PlaceOrder(ctx context.Context, authHeader string, actor models.AuthClaims, req *models.PredictionPlaceOrderRequest) (*models.PredictionPlaceOrderResponse, error)
	ListOrders(ctx context.Context, actor models.AuthClaims, status, category string) (*models.PredictionOrdersResponse, error)
	GetOrder(ctx context.Context, actor models.AuthClaims, orderID string) (*models.PredictionOrderView, error)
	CancelOrder(ctx context.Context, authHeader string, actor models.AuthClaims, orderID string) (*models.PredictionCancelOrderResponse, error)
	GetAdminSummary(ctx context.Context, actor models.AuthClaims) (*models.PredictionAdminSummaryResponse, error)
	ListAdminMarkets(ctx context.Context, actor models.AuthClaims, filters models.PredictionMarketFilters) (*models.PredictionMarketsResponse, error)
	GetAdminMarket(ctx context.Context, actor models.AuthClaims, marketID string) (*models.PredictionMarketDetailResponse, error)
	ListAdminOrders(ctx context.Context, actor models.AuthClaims, filters models.AdminOrderFilters) (*models.PredictionOrdersResponse, error)
	GetAdminOrder(ctx context.Context, actor models.AuthClaims, orderID string) (*models.PredictionOrderView, error)
	GetLifecycleHistory(ctx context.Context, actor models.AuthClaims, marketID string) (*models.PredictionLifecycleHistoryResponse, error)
	ExecuteLifecycle(ctx context.Context, actor models.AuthClaims, cmd repository.LifecycleCommand) (*models.PredictionMarketDetailResponse, error)
	IssueBotAPIKey(ctx context.Context, actor models.AuthClaims, req *models.IssuePredictionBotAPIKeyRequest) (*models.IssuedPredictionBotAPIKeyResponse, error)
}

type predictionService struct {
	logger       *slog.Logger
	repo         repository.Repository
	walletClient client.WalletClient
}

func NewPredictionService(logger *slog.Logger, repo repository.Repository, walletClient client.WalletClient) PredictionService {
	return &predictionService{logger: logger, repo: repo, walletClient: walletClient}
}

func (s *predictionService) GetOverview(ctx context.Context) (*models.PredictionOverviewResponse, error) {
	return s.repo.GetOverview(ctx)
}

func (s *predictionService) ListCategories(ctx context.Context) (*models.PredictionCategoriesResponse, error) {
	categories, err := s.repo.ListCategories(ctx)
	if err != nil {
		return nil, err
	}
	return &models.PredictionCategoriesResponse{Categories: categories}, nil
}

func (s *predictionService) ListMarkets(ctx context.Context, filters models.PredictionMarketFilters) (*models.PredictionMarketsResponse, error) {
	markets, err := s.repo.ListMarkets(ctx, normalizeMarketFilters(filters))
	if err != nil {
		return nil, err
	}
	return &models.PredictionMarketsResponse{TotalCount: len(markets), Markets: markets}, nil
}

func (s *predictionService) GetMarketDetail(ctx context.Context, marketID string) (*models.PredictionMarketDetailResponse, error) {
	if strings.TrimSpace(marketID) == "" {
		return nil, fmt.Errorf("%w: market_id is required", ErrInvalidInput)
	}
	return s.repo.GetMarketDetail(ctx, strings.TrimSpace(marketID))
}

func (s *predictionService) PreviewTicket(ctx context.Context, req *models.PredictionTicketPreviewRequest) (*models.PredictionTicketPreviewResponse, error) {
	if req == nil {
		return nil, fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	if strings.TrimSpace(req.MarketID) == "" || strings.TrimSpace(req.OutcomeID) == "" {
		return nil, fmt.Errorf("%w: market_id and outcome_id are required", ErrInvalidInput)
	}
	if req.StakeUSD.LessThanOrEqual(decimal.Zero) {
		return nil, fmt.Errorf("%w: stake_usd must be greater than zero", ErrInvalidInput)
	}
	return s.repo.PreviewTicket(ctx, req)
}

func (s *predictionService) PlaceOrder(ctx context.Context, authHeader string, actor models.AuthClaims, req *models.PredictionPlaceOrderRequest) (*models.PredictionPlaceOrderResponse, error) {
	if actor.UserID == "" {
		return nil, ErrForbidden
	}
	if req == nil {
		return nil, fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	userID := strings.TrimSpace(req.UserID)
	if userID == "" {
		userID = actor.UserID
	}
	if userID != actor.UserID && !hasAnyRole(actor, "admin", "trader") {
		return nil, ErrForbidden
	}
	preview, err := s.PreviewTicket(ctx, &models.PredictionTicketPreviewRequest{MarketID: strings.TrimSpace(req.MarketID), OutcomeID: strings.TrimSpace(req.OutcomeID), StakeUSD: req.StakeUSD})
	if err != nil {
		return nil, err
	}
	reserveResponse, err := s.walletClient.ReserveFunds(ctx, authHeader, userID, &client.ReserveFundsRequest{
		Amount:        preview.StakeUSD,
		ReferenceID:   preview.MarketID,
		ReferenceType: "prediction",
	})
	if err != nil {
		return nil, err
	}
	order, err := s.repo.CreateOrder(ctx, repository.CreateOrderParams{
		UserID:        userID,
		MarketID:      preview.MarketID,
		OutcomeID:     preview.OutcomeID,
		StakeUSD:      preview.StakeUSD,
		PriceCents:    preview.PriceCents,
		Shares:        preview.Shares,
		MaxPayoutUSD:  preview.MaxPayoutUSD,
		MaxProfitUSD:  preview.MaxProfitUSD,
		ReservationID: reserveResponse.ReservationID,
	})
	if err != nil {
		_, _ = s.walletClient.ReleaseReservedFunds(ctx, authHeader, userID, &client.ReleaseReserveRequest{ReservationID: reserveResponse.ReservationID, Amount: preview.StakeUSD})
		return nil, err
	}
	return &models.PredictionPlaceOrderResponse{Order: order}, nil
}

func (s *predictionService) ListOrders(ctx context.Context, actor models.AuthClaims, status, category string) (*models.PredictionOrdersResponse, error) {
	if actor.UserID == "" {
		return nil, ErrForbidden
	}
	orders, err := s.repo.ListUserOrders(ctx, actor.UserID, normalizeStatus(status), normalizeText(category))
	if err != nil {
		return nil, err
	}
	return &models.PredictionOrdersResponse{TotalCount: len(orders), Orders: orders}, nil
}

func (s *predictionService) GetOrder(ctx context.Context, actor models.AuthClaims, orderID string) (*models.PredictionOrderView, error) {
	if actor.UserID == "" {
		return nil, ErrForbidden
	}
	order, err := s.repo.GetOrder(ctx, strings.TrimSpace(orderID))
	if err != nil {
		return nil, err
	}
	if order.UserID != actor.UserID && !hasAnyRole(actor, "admin", "trader") {
		return nil, ErrForbidden
	}
	return order, nil
}

func (s *predictionService) CancelOrder(ctx context.Context, authHeader string, actor models.AuthClaims, orderID string) (*models.PredictionCancelOrderResponse, error) {
	order, err := s.GetOrder(ctx, actor, orderID)
	if err != nil {
		return nil, err
	}
	if order.UserID != actor.UserID && !hasAnyRole(actor, "admin", "trader") {
		return nil, ErrForbidden
	}
	if order.Status != "open" {
		return nil, fmt.Errorf("%w: prediction order not cancellable", ErrInvalidInput)
	}
	if order.ReservationID != nil && strings.TrimSpace(*order.ReservationID) != "" {
		if _, err := s.walletClient.ReleaseReservedFunds(ctx, authHeader, order.UserID, &client.ReleaseReserveRequest{ReservationID: *order.ReservationID, Amount: order.StakeUSD}); err != nil {
			return nil, err
		}
	}
	cancelled, err := s.repo.CancelOrder(ctx, order.UserID, order.OrderID, time.Now().UTC())
	if err != nil {
		if compensationErr := s.restoreReservation(ctx, authHeader, order); compensationErr != nil {
			return nil, fmt.Errorf("cancel order failed: %w (reservation compensation failed: %v)", err, compensationErr)
		}
		return nil, err
	}
	return &models.PredictionCancelOrderResponse{Order: cancelled}, nil
}

func (s *predictionService) GetAdminSummary(ctx context.Context, actor models.AuthClaims) (*models.PredictionAdminSummaryResponse, error) {
	if !canViewPredictionBook(actor) {
		return nil, ErrForbidden
	}
	return s.repo.GetAdminSummary(ctx)
}

func (s *predictionService) ListAdminMarkets(ctx context.Context, actor models.AuthClaims, filters models.PredictionMarketFilters) (*models.PredictionMarketsResponse, error) {
	if !canViewPredictionBook(actor) {
		return nil, ErrForbidden
	}
	return s.ListMarkets(ctx, filters)
}

func (s *predictionService) GetAdminMarket(ctx context.Context, actor models.AuthClaims, marketID string) (*models.PredictionMarketDetailResponse, error) {
	if !canViewPredictionBook(actor) {
		return nil, ErrForbidden
	}
	return s.GetMarketDetail(ctx, marketID)
}

func (s *predictionService) ListAdminOrders(ctx context.Context, actor models.AuthClaims, filters models.AdminOrderFilters) (*models.PredictionOrdersResponse, error) {
	if !canViewPredictionOrderFlow(actor) {
		return nil, ErrForbidden
	}
	orders, err := s.repo.ListAllOrders(ctx, models.AdminOrderFilters{
		UserID:   normalizeText(filters.UserID),
		MarketID: normalizeText(filters.MarketID),
		Status:   normalizeStatus(filters.Status),
		Category: normalizeText(filters.Category),
	})
	if err != nil {
		return nil, err
	}
	return &models.PredictionOrdersResponse{TotalCount: len(orders), Orders: orders}, nil
}

func (s *predictionService) GetAdminOrder(ctx context.Context, actor models.AuthClaims, orderID string) (*models.PredictionOrderView, error) {
	if !canViewPredictionOrderFlow(actor) {
		return nil, ErrForbidden
	}
	return s.repo.GetOrder(ctx, strings.TrimSpace(orderID))
}

func (s *predictionService) GetLifecycleHistory(ctx context.Context, actor models.AuthClaims, marketID string) (*models.PredictionLifecycleHistoryResponse, error) {
	if !canViewPredictionBook(actor) {
		return nil, ErrForbidden
	}
	if strings.TrimSpace(marketID) == "" {
		return nil, fmt.Errorf("%w: market_id is required", ErrInvalidInput)
	}
	return s.repo.GetLifecycleHistory(ctx, strings.TrimSpace(marketID))
}

func (s *predictionService) ExecuteLifecycle(ctx context.Context, actor models.AuthClaims, cmd repository.LifecycleCommand) (*models.PredictionMarketDetailResponse, error) {
	cmd.Action = normalizeText(strings.ToLower(cmd.Action))
	cmd.MarketID = normalizeText(cmd.MarketID)
	cmd.OutcomeID = normalizeText(cmd.OutcomeID)
	cmd.Reason = normalizeText(cmd.Reason)
	cmd.ActorID = actor.UserID
	if cmd.MarketID == "" {
		return nil, fmt.Errorf("%w: market_id is required", ErrInvalidInput)
	}
	switch cmd.Action {
	case "suspend", "open":
		if !canManagePredictionMarket(actor) {
			return nil, ErrForbidden
		}
	case "cancel", "resolve", "resettle":
		if !canSettlePredictionMarket(actor) {
			return nil, ErrForbidden
		}
	default:
		return nil, fmt.Errorf("%w: unsupported lifecycle action", ErrInvalidInput)
	}
	before, err := s.repo.GetMarketDetail(ctx, cmd.MarketID)
	if err != nil {
		return nil, err
	}
	updated, err := s.repo.ExecuteLifecycle(ctx, cmd)
	if err != nil {
		return nil, err
	}
	s.recordAudit(ctx, repository.AuditLogEntry{
		ActorID:    actor.UserID,
		Action:     predictionAuditAction(cmd.Action),
		EntityType: "prediction-market",
		EntityID:   cmd.MarketID,
		OldValue:   predictionAuditSnapshot(before),
		NewValue:   predictionAuditSnapshot(updated),
		CreatedAt:  time.Now().UTC(),
	})
	return updated, nil
}

func (s *predictionService) IssueBotAPIKey(ctx context.Context, actor models.AuthClaims, req *models.IssuePredictionBotAPIKeyRequest) (*models.IssuedPredictionBotAPIKeyResponse, error) {
	if !hasAnyRole(actor, "admin") {
		return nil, ErrForbidden
	}
	if req == nil {
		return nil, fmt.Errorf("%w: request is required", ErrInvalidInput)
	}
	accountKey := normalizeText(req.AccountKey)
	displayName := normalizeText(req.DisplayName)
	scopes := normalizeScopes(req.Scopes)
	if accountKey == "" {
		return nil, fmt.Errorf("%w: account_key is required", ErrInvalidInput)
	}
	if displayName == "" {
		return nil, fmt.Errorf("%w: display_name is required", ErrInvalidInput)
	}
	if len(scopes) == 0 {
		return nil, fmt.Errorf("%w: at least one scope is required", ErrInvalidInput)
	}
	if req.ExpiresAt != nil && req.ExpiresAt.UTC().Before(time.Now().UTC()) {
		return nil, fmt.Errorf("%w: expires_at must be in the future", ErrInvalidInput)
	}

	token, err := generateBotToken()
	if err != nil {
		return nil, err
	}
	issuedAt := time.Now().UTC()
	keyID := uuid.NewString()
	if err := s.repo.IssueBotAPIKey(ctx, repository.IssueBotAPIKeyParams{
		KeyID:       keyID,
		AccountKey:  accountKey,
		DisplayName: displayName,
		Scopes:      scopes,
		TokenHash:   sha256Hex(token),
		IssuedAt:    issuedAt,
		ExpiresAt:   req.ExpiresAt,
		CreatedBy:   actor.UserID,
	}); err != nil {
		return nil, err
	}
	return &models.IssuedPredictionBotAPIKeyResponse{
		AccountID: accountKey,
		KeyID:     keyID,
		Token:     token,
		IssuedAt:  issuedAt,
	}, nil
}

func (s *predictionService) restoreReservation(ctx context.Context, authHeader string, order *models.PredictionOrderView) error {
	reserved, err := s.walletClient.ReserveFunds(ctx, authHeader, order.UserID, &client.ReserveFundsRequest{
		Amount:        order.StakeUSD,
		ReferenceID:   order.MarketID,
		ReferenceType: "prediction",
	})
	if err != nil {
		return err
	}
	if err := s.repo.UpdateOrderReservationID(ctx, order.OrderID, reserved.ReservationID, time.Now().UTC()); err != nil {
		_, releaseErr := s.walletClient.ReleaseReservedFunds(ctx, authHeader, order.UserID, &client.ReleaseReserveRequest{
			ReservationID: reserved.ReservationID,
			Amount:        order.StakeUSD,
		})
		if releaseErr != nil {
			return fmt.Errorf("update reservation id: %w (release restored reservation failed: %v)", err, releaseErr)
		}
		return err
	}
	return nil
}

func normalizeMarketFilters(filters models.PredictionMarketFilters) models.PredictionMarketFilters {
	filters.Category = normalizeText(filters.Category)
	filters.Status = normalizeStatus(filters.Status)
	return filters
}

func normalizeStatus(value string) string {
	return strings.ToLower(normalizeText(value))
}

func normalizeText(value string) string {
	return strings.TrimSpace(value)
}

func (s *predictionService) recordAudit(ctx context.Context, entry repository.AuditLogEntry) {
	if err := s.repo.WriteAuditLog(ctx, entry); err != nil {
		s.logger.Error("prediction audit write failed", slog.String("action", entry.Action), slog.String("entity_id", entry.EntityID), slog.Any("error", err))
	}
}

func predictionAuditAction(action string) string {
	switch action {
	case "suspend":
		return "prediction.market.suspended"
	case "open":
		return "prediction.market.reopened"
	case "cancel":
		return "prediction.market.cancelled"
	case "resolve":
		return "prediction.market.resolved"
	case "resettle":
		return "prediction.market.resettled"
	default:
		return "prediction.market.updated"
	}
}

func predictionAuditSnapshot(response *models.PredictionMarketDetailResponse) map[string]any {
	if response == nil || response.Market == nil {
		return nil
	}
	market := response.Market
	outcomes := make([]map[string]any, 0, len(market.Outcomes))
	for _, outcome := range market.Outcomes {
		outcomes = append(outcomes, map[string]any{
			"outcome_id":  outcome.OutcomeID,
			"label":       outcome.Label,
			"price_cents": outcome.PriceCents,
			"change_1d":   outcome.Change1D.String(),
			"status":      outcome.Status,
			"result":      outcome.Result,
		})
	}
	snapshot := map[string]any{
		"market_id":            market.MarketID,
		"category_key":         market.CategoryKey,
		"category_label":       market.CategoryLabel,
		"title":                market.Title,
		"status":               market.Status,
		"featured":             market.Featured,
		"live":                 market.Live,
		"volume_usd":           market.VolumeUSD.String(),
		"liquidity_usd":        market.LiquidityUSD.String(),
		"participants":         market.Participants,
		"winning_outcome_id":   market.WinningOutcomeID,
		"settlement_note":      market.SettlementNote,
		"probability_percent":  market.ProbabilityPercent,
		"price_change_percent": market.PriceChangePercent.String(),
		"outcomes":             outcomes,
	}
	return snapshot
}

func hasAnyRole(actor models.AuthClaims, roles ...string) bool {
	actorRole := normalizeText(actor.Role)
	for _, role := range roles {
		if actorRole == normalizeText(role) {
			return true
		}
	}
	return false
}

func canViewPredictionBook(actor models.AuthClaims) bool {
	return hasAnyRole(actor, "admin", "operator", "trader", "moderator")
}

func canViewPredictionOrderFlow(actor models.AuthClaims) bool {
	return hasAnyRole(actor, "admin", "trader")
}

func canManagePredictionMarket(actor models.AuthClaims) bool {
	return hasAnyRole(actor, "admin", "trader")
}

func canSettlePredictionMarket(actor models.AuthClaims) bool {
	return hasAnyRole(actor, "admin")
}

func normalizeScopes(scopes []string) []string {
	if len(scopes) == 0 {
		return nil
	}
	seen := make(map[string]struct{}, len(scopes))
	normalized := make([]string, 0, len(scopes))
	for _, scope := range scopes {
		scope = normalizeText(scope)
		if scope == "" {
			continue
		}
		scope = strings.ToLower(scope)
		if _, ok := seen[scope]; ok {
			continue
		}
		seen[scope] = struct{}{}
		normalized = append(normalized, scope)
	}
	return normalized
}

func generateBotToken() (string, error) {
	raw := make([]byte, 24)
	if _, err := rand.Read(raw); err != nil {
		return "", fmt.Errorf("generate bot token: %w", err)
	}
	return "phoenix_bot_" + hex.EncodeToString(raw), nil
}

func sha256Hex(value string) string {
	sum := sha256.Sum256([]byte(value))
	return hex.EncodeToString(sum[:])
}
