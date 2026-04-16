package prediction

import (
	"context"
	"fmt"
	"time"
)

// Service is the primary business logic layer for the prediction platform.
type Service struct {
	repo       Repository
	amm        *AMMEngine
	settlement *SettlementEngine
}

// NewService creates a new prediction service.
func NewService(repo Repository) *Service {
	return &Service{
		repo:       repo,
		amm:        &AMMEngine{},
		settlement: NewSettlementEngine(repo),
	}
}

// --- Categories ---

func (s *Service) ListCategories(ctx context.Context, activeOnly bool) ([]Category, error) {
	return s.repo.ListCategories(ctx, activeOnly)
}

func (s *Service) GetCategory(ctx context.Context, slug string) (*Category, error) {
	return s.repo.GetCategory(ctx, slug)
}

// --- Events ---

func (s *Service) ListEvents(ctx context.Context, filter EventFilter) ([]Event, int, error) {
	return s.repo.ListEvents(ctx, filter)
}

func (s *Service) GetEvent(ctx context.Context, id string) (*Event, error) {
	event, err := s.repo.GetEvent(ctx, id)
	if err != nil {
		return nil, err
	}
	// Load markets for this event
	markets, _, err := s.repo.ListMarkets(ctx, MarketFilter{EventID: &id, Page: 1, PageSize: 100})
	if err != nil {
		return nil, err
	}
	event.Markets = markets
	return event, nil
}

// --- Markets ---

func (s *Service) ListMarkets(ctx context.Context, filter MarketFilter) ([]Market, int, error) {
	return s.repo.ListMarkets(ctx, filter)
}

func (s *Service) GetMarket(ctx context.Context, id string) (*Market, error) {
	return s.repo.GetMarket(ctx, id)
}

func (s *Service) GetMarketByTicker(ctx context.Context, ticker string) (*Market, error) {
	return s.repo.GetMarketByTicker(ctx, ticker)
}

func (s *Service) GetDiscovery(ctx context.Context) (*DiscoveryResponse, error) {
	return s.repo.GetDiscovery(ctx)
}

// --- Trading ---

// PreviewOrder returns a cost preview for a proposed order without executing it.
func (s *Service) PreviewOrder(ctx context.Context, req PlaceOrderRequest) (*OrderPreview, error) {
	market, err := s.repo.GetMarket(ctx, req.MarketID)
	if err != nil {
		return nil, fmt.Errorf("market not found: %w", err)
	}
	return s.amm.PreviewTrade(market, req.Side, req.Action, req.Quantity)
}

// PlaceOrder executes a market order against the AMM.
// Returns the created order and the trade fill.
//
// The caller is responsible for:
// 1. Reserving funds from the user's wallet before calling this
// 2. Broadcasting the trade via WebSocket after
func (s *Service) PlaceOrder(ctx context.Context, req PlaceOrderRequest, userID string) (*Order, *Trade, error) {
	// Idempotency check
	if req.IdempotencyKey != nil {
		existing, err := s.repo.GetOrderByIdempotencyKey(ctx, *req.IdempotencyKey)
		if err == nil && existing != nil {
			return existing, nil, nil
		}
	}

	market, err := s.repo.GetMarket(ctx, req.MarketID)
	if err != nil {
		return nil, nil, fmt.Errorf("market not found: %w", err)
	}

	if !IsTradeable(market.Status) {
		return nil, nil, fmt.Errorf("market %s is not open for trading", market.Ticker)
	}

	if req.Action == OrderActionSell {
		return nil, nil, fmt.Errorf("sell orders not yet supported (requires existing position)")
	}

	// Execute against AMM
	costCents, feeCents, err := s.amm.ExecuteTrade(market, req.Side, req.Quantity)
	if err != nil {
		return nil, nil, fmt.Errorf("AMM execution failed: %w", err)
	}

	totalCost := costCents + feeCents
	now := time.Now().UTC()
	priceCents := market.YesPriceCents
	if req.Side == OrderSideNo {
		priceCents = market.NoPriceCents
	}

	// Create order
	order := &Order{
		UserID:            userID,
		MarketID:          req.MarketID,
		Side:              req.Side,
		Action:            req.Action,
		OrderType:         req.OrderType,
		PriceCents:        &priceCents,
		Quantity:          req.Quantity,
		FilledQuantity:    req.Quantity,
		RemainingQuantity: 0,
		TotalCostCents:    totalCost,
		Status:            OrderStatusFilled,
		IdempotencyKey:    req.IdempotencyKey,
		FilledAt:          &now,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	if err := s.repo.CreateOrder(ctx, order); err != nil {
		return nil, nil, fmt.Errorf("create order: %w", err)
	}

	// Create trade record
	trade := &Trade{
		MarketID:   req.MarketID,
		BuyOrderID: &order.ID,
		BuyerID:    userID,
		Side:       req.Side,
		PriceCents: priceCents,
		Quantity:   req.Quantity,
		FeeCents:   int(feeCents),
		IsAMMTrade: true,
		TradedAt:   now,
	}

	if err := s.repo.CreateTrade(ctx, trade); err != nil {
		return nil, nil, fmt.Errorf("create trade: %w", err)
	}

	// Upsert position
	existing, _ := s.repo.GetPosition(ctx, userID, req.MarketID, req.Side)
	if existing != nil {
		// Update existing position
		totalQty := existing.Quantity + req.Quantity
		totalCostAll := existing.TotalCostCents + totalCost
		existing.AvgPriceCents = int(totalCostAll / int64(totalQty))
		existing.Quantity = totalQty
		existing.TotalCostCents = totalCostAll
		existing.UpdatedAt = now
		if err := s.repo.UpsertPosition(ctx, existing); err != nil {
			return nil, nil, fmt.Errorf("update position: %w", err)
		}
	} else {
		// Create new position
		pos := &Position{
			UserID:         userID,
			MarketID:       req.MarketID,
			Side:           req.Side,
			Quantity:       req.Quantity,
			AvgPriceCents:  int(totalCost / int64(req.Quantity)),
			TotalCostCents: totalCost,
			CreatedAt:      now,
			UpdatedAt:      now,
		}
		if err := s.repo.UpsertPosition(ctx, pos); err != nil {
			return nil, nil, fmt.Errorf("create position: %w", err)
		}
	}

	// Update market in DB
	if err := s.repo.UpdateMarket(ctx, market); err != nil {
		return nil, nil, fmt.Errorf("update market: %w", err)
	}

	return order, trade, nil
}

// CancelOrder cancels an open order and releases the wallet reservation.
func (s *Service) CancelOrder(ctx context.Context, orderID, userID string) error {
	order, err := s.repo.GetOrder(ctx, orderID)
	if err != nil {
		return fmt.Errorf("order not found: %w", err)
	}

	if order.UserID != userID {
		return fmt.Errorf("order does not belong to user")
	}

	if order.Status != OrderStatusOpen && order.Status != OrderStatusPending && order.Status != OrderStatusPartial {
		return fmt.Errorf("cannot cancel order in status %s", order.Status)
	}

	now := time.Now().UTC()
	order.Status = OrderStatusCancelled
	order.CancelledAt = &now
	order.UpdatedAt = now

	return s.repo.UpdateOrder(ctx, order)
}

// --- Portfolio ---

func (s *Service) ListPositions(ctx context.Context, userID string) ([]Position, error) {
	return s.repo.ListPositions(ctx, userID)
}

func (s *Service) GetPortfolioSummary(ctx context.Context, userID string) (*PortfolioSummary, error) {
	return s.repo.GetPortfolioSummary(ctx, userID)
}

func (s *Service) ListOrders(ctx context.Context, filter OrderFilter) ([]Order, int, error) {
	return s.repo.ListOrders(ctx, filter)
}

// --- Settlement ---

func (s *Service) ResolveMarket(ctx context.Context, marketID string, req ResolveMarketRequest, settledBy *string) (*Settlement, []Payout, error) {
	return s.settlement.ResolveMarket(ctx, req, marketID, settledBy)
}

func (s *Service) VoidMarket(ctx context.Context, marketID, reason string, actorID *string) ([]Payout, error) {
	return s.settlement.VoidMarket(ctx, marketID, reason, actorID)
}

// --- Market Trades ---

func (s *Service) ListTrades(ctx context.Context, marketID string, limit int) ([]Trade, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	return s.repo.ListTrades(ctx, marketID, limit)
}

// --- Lifecycle ---

func (s *Service) ListLifecycleEvents(ctx context.Context, marketID string) ([]LifecycleEvent, error) {
	return s.repo.ListLifecycleEvents(ctx, marketID)
}

// TransitionMarketStatus changes a market's status with validation and audit logging.
func (s *Service) TransitionMarketStatus(ctx context.Context, marketID string, to MarketStatus, reason string, actorID *string) error {
	market, err := s.repo.GetMarket(ctx, marketID)
	if err != nil {
		return fmt.Errorf("market not found: %w", err)
	}

	if err := TransitionMarket(market, to); err != nil {
		return err
	}

	if err := s.repo.UpdateMarketStatus(ctx, marketID, to); err != nil {
		return fmt.Errorf("update market status: %w", err)
	}

	s.repo.CreateLifecycleEvent(ctx, &LifecycleEvent{
		MarketID:   marketID,
		EventType:  string(to),
		ActorID:    actorID,
		ActorType:  actorType(actorID),
		Reason:     &reason,
		OccurredAt: time.Now().UTC(),
	})

	return nil
}

// --- Admin: Create Market ---

func (s *Service) CreateMarket(ctx context.Context, req CreateMarketRequest) (*Market, error) {
	b := req.AMMLiquidityParam
	if b <= 0 {
		b = 100
	}

	market := &Market{
		EventID:             req.EventID,
		Ticker:              req.Ticker,
		Title:               req.Title,
		Description:         req.Description,
		Status:              MarketStatusUnopened,
		YesPriceCents:       50,
		NoPriceCents:        50,
		AMMLiquidityParam:   b,
		AMMSubsidyCents:     req.AMMSubsidyCents,
		SettlementSourceKey: req.SettlementSourceKey,
		SettlementRule:      req.SettlementRule,
		SettlementParams:    req.SettlementParams,
		SettlementCutoffAt:  req.SettlementCutoffAt,
		FeeRateBps:          req.FeeRateBps,
		CloseAt:             req.CloseAt,
		CreatedAt:           time.Now().UTC(),
		UpdatedAt:           time.Now().UTC(),
	}

	if req.FallbackSourceKey != nil {
		market.FallbackSourceKey = req.FallbackSourceKey
	}

	if err := s.repo.CreateMarket(ctx, market); err != nil {
		return nil, fmt.Errorf("create market: %w", err)
	}

	s.repo.CreateLifecycleEvent(ctx, &LifecycleEvent{
		MarketID:   market.ID,
		EventType:  "created",
		ActorType:  "admin",
		OccurredAt: time.Now().UTC(),
	})

	return market, nil
}
