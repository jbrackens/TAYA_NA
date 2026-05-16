package prediction

import (
	"context"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Service is the primary business logic layer for the prediction platform.
type Service struct {
	repo              Repository
	wallet            WalletAdapter
	amm               *AMMEngine
	settlement        *SettlementEngine
	onMarketLifecycle MarketLifecycleHandler // optional; fired post-commit
	// Optional Prometheus-format counter registry. nil is safe — Record*
	// methods no-op when the receiver is nil. Wired in main.go alongside
	// the platform-level httpx.MetricsRegistry.
	metrics *Metrics
	// Optional responsible-gambling gate. nil disables the check (tests and
	// any deployment that has not wired RG). Wired in internal/http.
	compliance ComplianceChecker
}

// ComplianceChecker gates order placement against responsible-gambling
// controls (self-exclusion, cool-off, deposit/bet stake limits). It is an
// interface so the prediction package stays decoupled from internal/compliance
// — same rationale as WalletAdapter (see CLAUDE.md "Keep the prediction Go
// package decoupled from wallet"). A nil checker is a no-op.
type ComplianceChecker interface {
	// CheckBetAllowed reports whether userID may commit stakeCents on a new
	// order. reason is a human-readable rejection message when allowed is false.
	CheckBetAllowed(ctx context.Context, userID string, stakeCents int64) (allowed bool, reason string, err error)
	// RecordBet records committed stake for cumulative period-limit tracking.
	RecordBet(ctx context.Context, userID string, stakeCents int64) error
}

// SetComplianceChecker wires the responsible-gambling gate. Optional — pass
// nil (or never call) to leave order placement ungated. Mirrors SetMetrics /
// SetLoyaltyAdapter: wire after construction so tests can omit it.
func (s *Service) SetComplianceChecker(c ComplianceChecker) {
	s.compliance = c
}

// checkComplianceForOrder blocks an order before any market-state mutation or
// wallet debit if responsible-gambling controls disallow it. Mirrors the
// legacy bets.Service.checkComplianceForPlacement contract: fail-closed in
// production/staging when the RG service errors, fail-open in development so
// local testing isn't blocked by a misconfigured checker. nil checker = no-op.
func (s *Service) checkComplianceForOrder(ctx context.Context, userID string, stakeCents int64) error {
	if s.compliance == nil {
		return nil
	}
	cctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	allowed, reason, err := s.compliance.CheckBetAllowed(cctx, userID, stakeCents)
	// `allowed == false` is an authoritative RG denial (bet limit /
	// self-exclusion / cool-off). The wired RG service returns a sentinel
	// error *alongside* allowed=false on a deliberate block — that is a
	// decision, not an outage, so it MUST block regardless of environment.
	// Treating that sentinel as an infra error and failing open in dev is
	// exactly what let an over-limit order through (UAT 2026-05-16 LC-17).
	if !allowed {
		if strings.TrimSpace(reason) == "" {
			reason = "order blocked by responsible-gambling controls"
		}
		return fmt.Errorf("%s", reason)
	}
	// allowed == true but the checker still errored → it could not evaluate
	// (genuine infra ambiguity). Fail closed in production/staging so an
	// outage cannot silently disable the control; fail open in development
	// so a locally-misconfigured RG backend doesn't block testing.
	if err != nil {
		env := strings.ToLower(strings.TrimSpace(os.Getenv("ENVIRONMENT")))
		if env == "production" || env == "staging" {
			return fmt.Errorf("responsible-gambling check unavailable")
		}
		return nil // fail-open in development only
	}
	return nil
}

// realizedStakeCents is the cash actually staked by a placed order, for
// cumulative RG period-limit tracking. It must be the amount that really left
// the wallet — never the reserved notional — or a thin/partial fill would
// over-count and wrongly lock the user out for the rest of the period.
//   - Nothing filled (rejected / cancelled-zero-fill / still-resting limit):
//     0 — no stake consumed yet.
//   - Order-book fill: CapturedCashCents (realized; TotalCostCents on this
//     path is the reserved cap, not what was spent — UAT 2026-05-16 LC-17).
//   - AMM fill: TotalCostCents (the AMM path's realized executed cost;
//     CapturedCashCents is an exchange-engine-only field, 0 here).
func realizedStakeCents(o *Order) int64 {
	if o == nil || o.FilledQuantity <= 0 {
		return 0
	}
	if o.CapturedCashCents > 0 {
		return o.CapturedCashCents
	}
	return o.TotalCostCents
}

// recordComplianceOrder records realized committed stake for cumulative
// period-limit tracking. Best-effort: a tracking-write failure must not unwind
// a committed order (the funds already moved), so the error is swallowed.
// Skipped for zero/negative stake (sells reserve no cash) and nil checker.
func (s *Service) recordComplianceOrder(ctx context.Context, userID string, stakeCents int64) {
	if s.compliance == nil || stakeCents <= 0 {
		return
	}
	cctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	_ = s.compliance.RecordBet(cctx, userID, stakeCents)
}

// SetMetrics enables domain-level Prometheus counter emission. Wire after
// construction so tests that don't care about observability can pass nil.
func (s *Service) SetMetrics(m *Metrics) {
	s.metrics = m
	if s.settlement != nil {
		s.settlement.metrics = m
	}
}

// MarketLifecycleHandler is a post-commit callback invoked after a successful
// market lifecycle transition (open / halt / close / void / settled). The
// `market` argument is the post-transition market state. The `event` argument
// is the lifecycle audit record that was just persisted.
//
// Handlers run in a goroutine, fire-and-forget — failures should not block
// the caller. Typical use: publish a WebSocket update on `market:<id>` so
// subscribers see the new state without refreshing.
type MarketLifecycleHandler func(market *Market, event LifecycleEvent)

// NewService creates a new prediction service.
// If wallet is nil, a NoopWallet is used (useful for tests).
func NewService(repo Repository, wallet WalletAdapter) *Service {
	if wallet == nil {
		wallet = NoopWallet{}
	}
	return &Service{
		repo:       repo,
		wallet:     wallet,
		amm:        &AMMEngine{},
		settlement: NewSettlementEngine(repo, wallet),
	}
}

// SetLoyaltyAdapter enables loyalty accrual on the settlement path. Optional —
// passing nil leaves the service as a no-op for loyalty. See PLAN-loyalty-
// leaderboards.md §8 for the atomic (shared-tx) accrual contract.
func (s *Service) SetLoyaltyAdapter(adapter LoyaltyAdapter) {
	s.settlement.SetLoyaltyAdapter(adapter)
}

// SetTierPromotedHandler wires the post-commit callback fired whenever an
// accrual advances a user's tier. Callers typically hook this up to a
// WebSocket publish.
func (s *Service) SetTierPromotedHandler(fn TierPromotedHandler) {
	s.settlement.SetTierPromotedHandler(fn)
}

// SetMarketLifecycleHandler wires the post-commit callback fired after every
// successful market lifecycle transition: open / halt / close / void from
// TransitionMarketStatus, settled from ResolveMarket, voided from VoidMarket.
// Both HTTP-triggered admin actions and background-worker auto-transitions
// (closer, settler, discover.promote) flow through these methods, so a single
// hook covers all paths. Pass nil to disable.
func (s *Service) SetMarketLifecycleHandler(fn MarketLifecycleHandler) {
	s.onMarketLifecycle = fn
	s.settlement.SetMarketLifecycleHandler(fn)
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

func (s *Service) DashboardVolumeStats(ctx context.Context, since time.Time, topMovers int) (*DashboardVolumeStats, error) {
	return s.repo.DashboardVolumeStatsSince(ctx, since, topMovers)
}

// --- Trading ---

// WalletBalance returns the current wallet balance in cents for a user,
// or -1 if the wallet adapter is unavailable / errors. Used by the HTTP
// layer to populate wallet:<uid> WS broadcasts after order fills without
// having to import the wallet package directly.
func (s *Service) WalletBalance(userID string) int64 {
	if s == nil || s.wallet == nil {
		return -1
	}
	return s.wallet.Balance(userID)
}

// GetOrderBook returns the L2 order book for a market. Requires the
// repository to implement ExchangeRepository (SQL mode); memory-mode test
// fakes that don't will get an "unsupported" error.
//
// depth is the user-supplied request value; clamping to [1, 100] happens
// inside the repo layer.
func (s *Service) GetOrderBook(ctx context.Context, marketID string, depth int) (*OrderBook, error) {
	exchangeRepo, ok := s.repo.(ExchangeRepository)
	if !ok {
		return nil, fmt.Errorf("order book unavailable in this repository mode")
	}
	return exchangeRepo.GetOrderBook(ctx, marketID, depth)
}

// ListRecentDriftAlerts returns markets that had a collateral adjustment
// row written within `lookback`. Empty list when nothing tripped.
// AMM-only deployments (memory-mode repo) return an empty list silently.
func (s *Service) ListRecentDriftAlerts(ctx context.Context, lookback time.Duration) ([]CollateralDriftAlert, error) {
	exchangeRepo, ok := s.repo.(ExchangeRepository)
	if !ok {
		return []CollateralDriftAlert{}, nil
	}
	since := time.Now().UTC().Add(-lookback)
	return exchangeRepo.ListRecentDriftAlerts(ctx, since)
}

// PreviewOrder returns a cost preview for a proposed order without executing it.
func (s *Service) PreviewOrder(ctx context.Context, req PlaceOrderRequest) (*OrderPreview, error) {
	market, err := s.repo.GetMarket(ctx, req.MarketID)
	if err != nil {
		return nil, fmt.Errorf("market not found: %w", err)
	}
	return s.amm.PreviewTrade(market, req.Side, req.Action, req.Quantity)
}

// PlaceOrder executes a market order against the AMM.
// Debits the user's wallet, updates the order book and position, and returns
// the created order and trade fill. Broadcasts the trade via WebSocket is the
// caller's responsibility.
func (s *Service) PlaceOrder(ctx context.Context, req PlaceOrderRequest, userID string) (*Order, *Trade, error) {
	idempotencyKey := ensureOrderIdempotencyKey(req, userID)

	// Idempotency check
	if idempotencyKey != nil {
		existing, err := s.repo.GetOrderByIdempotencyKey(ctx, *idempotencyKey)
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

	// Responsible-gambling gate — runs before any market-state mutation or
	// wallet debit so a self-excluded / cool-off / over-limit user is stopped
	// before money moves. worstCaseSpend is the cash committed (price×qty for
	// limit buys, notional cap for market buys, 0 for sells). Sells still hit
	// the gate (stake 0) so self-exclusion / cool-off block them too, while
	// per-bet stake limits don't apply to position-closing sells.
	if err := s.checkComplianceForOrder(ctx, userID, worstCaseSpend(req)); err != nil {
		return nil, nil, err
	}

	// Branch on execution mode. Markets created before migration 019 default to
	// 'amm'; new markets default to 'order_book'. The exchange path supports
	// limit + market orders, partial fills, complementary issuance, and sells
	// from existing positions; the AMM path stays buy-only for back-compat.
	if market.ExecutionMode == ExecutionModeOrderBook {
		o, t, perr := s.placeExchangeOrder(ctx, req, userID, market, idempotencyKey)
		if perr == nil {
			s.recordComplianceOrder(ctx, userID, realizedStakeCents(o))
		}
		return o, t, perr
	}

	if req.Action == OrderActionSell {
		return nil, nil, fmt.Errorf("sell orders not yet supported (requires existing position)")
	}

	// Preview cost without mutating market state, so we can check balance first.
	preview, err := s.amm.PreviewTrade(market, req.Side, req.Action, req.Quantity)
	if err != nil {
		return nil, nil, fmt.Errorf("AMM preview failed: %w", err)
	}

	totalCost := preview.TotalCost + preview.FeeCents

	// Notional-cap ceiling — the order-book path clamps fills to
	// notionalCapCents (capFillQtyByNotionalCap); the AMM path historically
	// did not, so an LMSR cost above the cap both fat-fingered the wallet AND
	// slipped the responsible-gambling gate, which evaluated worstCaseSpend
	// (= cap for market buys, price×qty for limit buys) — not the real cost.
	// Reject here, before ExecuteTrade mutates market state, so the RG gate's
	// worst-case is an enforced upper bound on the AMM path too. (UAT
	// 2026-05-16 D-5 codex review P1 #1.)
	if cap := worstCaseSpend(req); cap > 0 && totalCost > cap {
		return nil, nil, fmt.Errorf("order cost %d cents exceeds notional cap %d cents", totalCost, cap)
	}

	// Balance check — reject early before mutating anything. NoopWallet returns
	// math.MaxInt64 so test paths that don't care about wallet state pass
	// through; real wallets return actual balances and will reject correctly.
	if balance := s.wallet.Balance(userID); balance < totalCost {
		return nil, nil, fmt.Errorf("insufficient balance: have %d cents, need %d cents", balance, totalCost)
	}

	// Execute against AMM (mutates market.AMMYesShares / AMMNoShares / prices)
	costCents, feeCents, err := s.amm.ExecuteTrade(market, req.Side, req.Quantity)
	if err != nil {
		return nil, nil, fmt.Errorf("AMM execution failed: %w", err)
	}

	// Use the actual executed cost (should match preview, but trust the engine).
	totalCost = costCents + feeCents
	debitKey := "prediction_order:" + *idempotencyKey
	debitReason := fmt.Sprintf("prediction order: %s %s x%d", req.Side, market.Ticker, req.Quantity)
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
		IdempotencyKey:    idempotencyKey,
		FilledAt:          &now,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

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

	// Build the final position snapshot before persisting so the repository can
	// commit the fill as one prediction-side unit.
	var position *Position
	existing, _ := s.repo.GetPosition(ctx, userID, req.MarketID, req.Side)
	if existing != nil {
		totalQty := existing.Quantity + req.Quantity
		totalCostAll := existing.TotalCostCents + totalCost
		existing.AvgPriceCents = int(totalCostAll / int64(totalQty))
		existing.Quantity = totalQty
		existing.TotalCostCents = totalCostAll
		existing.UpdatedAt = now
		position = existing
	} else {
		position = &Position{
			UserID:         userID,
			MarketID:       req.MarketID,
			Side:           req.Side,
			Quantity:       req.Quantity,
			AvgPriceCents:  int(totalCost / int64(req.Quantity)),
			TotalCostCents: totalCost,
			CreatedAt:      now,
			UpdatedAt:      now,
		}
	}

	if atomicRepo, ok := s.repo.(AtomicFilledOrderPersister); ok {
		if _, walletIsTxCapable := s.wallet.(TxWalletAdapter); walletIsTxCapable {
			if err := atomicRepo.PersistFilledOrderAtomic(
				ctx,
				s.wallet,
				userID,
				totalCost,
				debitKey,
				debitReason,
				order,
				trade,
				position,
				market,
			); err != nil {
				return nil, nil, fmt.Errorf("persist filled order atomically: %w", err)
			}
			s.recordComplianceOrder(ctx, userID, realizedStakeCents(order))
			return order, trade, nil
		}
	}

	// Fallback path for memory-mode/local tests where wallet and prediction
	// state cannot share one SQL transaction.
	if err := s.wallet.Debit(userID, totalCost, debitKey, debitReason); err != nil {
		return nil, nil, fmt.Errorf("wallet debit failed: %w", err)
	}

	if err := s.repo.PersistFilledOrder(ctx, order, trade, position, market); err != nil {
		_ = s.wallet.Credit(userID, totalCost, debitKey+":refund",
			fmt.Sprintf("refund: filled order persistence failed for %s", market.Ticker))
		return nil, nil, fmt.Errorf("persist filled order: %w", err)
	}

	s.recordComplianceOrder(ctx, userID, realizedStakeCents(order))
	return order, trade, nil
}

// placeExchangeOrder is the order-book execution path. Validates, loads the
// taker's existing position (for sell-side checks), persists the pending
// order, runs the match engine against current book state, and commits the
// match plan atomically via PersistMatchAtomic.
//
// Concurrency model: the prediction order INSERT happens in a separate
// pre-match step so that maker/trade FK references resolve. The match itself
// runs under pg_advisory_xact_lock per market — see SQLRepository.PersistMatchAtomic.
func (s *Service) placeExchangeOrder(ctx context.Context, req PlaceOrderRequest, userID string, market *Market, idempotencyKey *string) (*Order, *Trade, error) {
	exchangeRepo, repoOK := s.repo.(ExchangeRepository)
	exchangeWallet, walletOK := s.wallet.(ExchangeWalletAdapter)
	if !repoOK || !walletOK {
		return nil, nil, fmt.Errorf("exchange engine requires SQL repository and wallet adapter (memory mode not supported for order-book markets)")
	}

	// Sell validation: load existing position, compute available shares.
	var position *Position
	if req.Action == OrderActionSell {
		p, err := s.repo.GetPosition(ctx, userID, req.MarketID, req.Side)
		if err == nil {
			position = p
		}
	}

	if err := ValidatePlaceOrderRequest(req, market, position); err != nil {
		return s.persistRejectedExchangeOrder(ctx, req, userID, market, idempotencyKey, err.Error())
	}

	// Defaults for unset exchange fields.
	tif := req.TimeInForce
	if tif == "" {
		tif = TIFGTC
	}
	if req.OrderType == OrderTypeMarket {
		tif = TIFIOC // market orders behave as IOC
	}
	smAction := req.SelfMatchAction
	if smAction == "" {
		smAction = SelfMatchCancelTaker
	}

	// Build the pending taker order. ID is generated by the DB on INSERT.
	now := time.Now().UTC()
	totalCost := worstCaseSpend(req)
	taker := &Order{
		UserID:            userID,
		MarketID:          req.MarketID,
		Side:              req.Side,
		Action:            req.Action,
		OrderType:         req.OrderType,
		PriceCents:        req.PriceCents,
		Quantity:          req.Quantity,
		FilledQuantity:    0,
		RemainingQuantity: req.Quantity,
		TotalCostCents:    totalCost,
		Status:            OrderStatusPending,
		IdempotencyKey:    idempotencyKey,
		TimeInForce:       tif,
		PostOnly:          req.PostOnly,
		ClientOrderID:     req.ClientOrderID,
		SelfMatchAction:   smAction,
		NotionalCapCents:  req.NotionalCapCents,
		ReservedCashCents: totalCost,
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	// Persist the pending order so it has a stable ID for trade FKs.
	// Idempotency-key collision falls through to GetOrderByIdempotencyKey —
	// returning the original order satisfies retry-safe clients.
	if err := s.repo.CreateOrder(ctx, taker); err != nil {
		if idempotencyKey != nil {
			if existing, lookupErr := s.repo.GetOrderByIdempotencyKey(ctx, *idempotencyKey); lookupErr == nil && existing != nil {
				return existing, nil, nil
			}
		}
		return nil, nil, fmt.Errorf("create pending order: %w", err)
	}

	// Load candidate makers for both match modes. The engine will pick which
	// fills to execute based on price-time priority and feasibility.
	makersSec, err := exchangeRepo.LoadMakersForSecondary(ctx, market.ID, req.Side, req.Action, req.PriceCents, MaxOrderBookDepth)
	if err != nil {
		return nil, nil, fmt.Errorf("load secondary makers: %w", err)
	}
	var makersIss []Order
	if req.Action == OrderActionBuy {
		otherSide := OrderSideNo
		if req.Side == OrderSideNo {
			otherSide = OrderSideYes
		}
		// For market buys the taker has no explicit price; treat it as
		// willing to pay up to the highest in-band price (MaxTickPriceCents)
		// for issuance feasibility. That makes every Buy-NO maker eligible
		// because `taker_limit + maker_limit >= par` reduces to
		// `99 + maker_limit >= 100`, which is true for any maker_limit >= 1.
		// The notional cap on the request bounds the dollar exposure
		// upstream of the match loop.
		//
		// Before this change, market buys returned "cancelled — no matching
		// liquidity" on every order_book market even when SMM-provided Buy-NO
		// quotes were sitting on the book — flagged in SMM Phase 1's runbook
		// known-constraint section. With this fix, the default trade ticket
		// (market buy) fills against issuance makers correctly.
		takerLimit := MaxTickPriceCents
		if req.PriceCents != nil {
			takerLimit = *req.PriceCents
		}
		makersIss, err = exchangeRepo.LoadMakersForIssuance(ctx, market.ID, otherSide, takerLimit, MaxOrderBookDepth)
		if err != nil {
			return nil, nil, fmt.Errorf("load issuance makers: %w", err)
		}
	}

	engine := NewExchangeEngine()
	plan, err := engine.BuildPlan(MatchInput{
		Market:          *market,
		Taker:           *taker,
		MakersSecondary: makersSec,
		MakersIssuance:  makersIss,
		TakerPosition:   position,
		Now:             now,
		IDFactory:       newUUIDString,
	})
	if err != nil {
		// Engine sentinel rejection (FOK / post-only / self-match). Mark the
		// already-persisted pending order as rejected and surface the reason.
		reason := err.Error()
		taker.Status = OrderStatusRejected
		taker.FailureReason = &reason
		_ = s.repo.UpdateOrder(ctx, taker)
		s.metrics.RecordOrder(market.ID, req.Side, req.Action, req.OrderType, OrderStatusRejected)
		return taker, nil, nil
	}

	// Wallet hold for buys: reserve worst-case spend up front. The match
	// captures incrementally; any unfilled remainder is released by
	// applyTIF or the caller's cancel flow.
	if req.Action == OrderActionBuy && totalCost > 0 {
		plan.HoldReservation = &ReservationHold{
			UserID:      userID,
			AmountCents: totalCost,
			Type:        "prediction_order",
			ID:          taker.ID,
			ExpiresIn:   reservationTTL(tif, market.CloseAt, now),
		}
	}

	if err := exchangeRepo.PersistMatchAtomic(ctx, exchangeWallet, plan); err != nil {
		// The pending order row is already committed (the INSERT at the
		// top of this function happens outside the match tx so the trade
		// FKs can resolve). PersistMatchAtomic's tx rolls back its own
		// inserts on error, but the pending order survives. Without
		// cleanup it sits as a status='pending' orphan with no fills,
		// no reservations, and no cancelled_at — users see "Order failed"
		// in the toast but /portfolio/ keeps showing it as pending until
		// the next demo-seed Phase 0 sweep cancels stale-pendings >1h.
		// Mirror the engine-error path (line ~470 above): mark the order
		// rejected with the rollback reason. The taker pointer is still
		// the latest in-memory state, so failed-fill counters / failure
		// reasons propagate to the response.
		reason := err.Error()
		taker.Status = OrderStatusRejected
		taker.FailureReason = &reason
		_ = s.repo.UpdateOrder(ctx, taker)
		s.metrics.RecordOrder(market.ID, req.Side, req.Action, req.OrderType, OrderStatusRejected)
		return taker, nil, fmt.Errorf("persist match: %w", err)
	}

	// Domain metrics: one order observation by final status, one trade
	// observation per fill. Cheap (a few map ops under a mutex). Failure
	// to record is silent — see Metrics docstring.
	s.metrics.RecordOrder(market.ID, req.Side, req.Action, req.OrderType, plan.Taker.Status)
	for _, t := range plan.Trades {
		s.metrics.RecordTrade(market.ID, t.TradeKind, t.EngineKind)
	}

	// Post-commit: refresh top-of-book snapshot on the market row so
	// market:<id> subscribers see the new best bid/ask. Best-effort —
	// failures here don't roll back the match (the columns are derived
	// data; a missed refresh self-heals on the next match).
	if err := exchangeRepo.RefreshMarketBestQuotes(ctx, market.ID); err != nil {
		// Log via existing pattern; don't propagate. The next match — or
		// a periodic background refresher — will fix the staleness.
		_ = err
	}

	var firstTrade *Trade
	if len(plan.Trades) > 0 {
		t := plan.Trades[0]
		firstTrade = &t
	}
	return &plan.Taker, firstTrade, nil
}

// worstCaseSpend computes the maximum cents a buy order could spend. For
// limit orders it's price × quantity; for market orders it's notionalCapCents
// (validated upstream to be non-nil). Sells reserve no cash.
func worstCaseSpend(req PlaceOrderRequest) int64 {
	if req.Action == OrderActionSell {
		return 0
	}
	if req.OrderType == OrderTypeLimit && req.PriceCents != nil {
		return int64(*req.PriceCents) * int64(req.Quantity)
	}
	if req.NotionalCapCents != nil {
		return *req.NotionalCapCents
	}
	return 0
}

// persistRejectedExchangeOrder writes a rejected order row for audit when
// validation fails before any matching occurs. Returns the order so the API
// can surface failure_reason to the caller without a separate error path.
func (s *Service) persistRejectedExchangeOrder(ctx context.Context, req PlaceOrderRequest, userID string, market *Market, idempotencyKey *string, reason string) (*Order, *Trade, error) {
	now := time.Now().UTC()
	o := &Order{
		UserID:            userID,
		MarketID:          req.MarketID,
		Side:              req.Side,
		Action:            req.Action,
		OrderType:         req.OrderType,
		PriceCents:        req.PriceCents,
		Quantity:          req.Quantity,
		FilledQuantity:    0,
		RemainingQuantity: req.Quantity,
		TotalCostCents:    0,
		Status:            OrderStatusRejected,
		IdempotencyKey:    idempotencyKey,
		TimeInForce:       req.TimeInForce,
		PostOnly:          req.PostOnly,
		ClientOrderID:     req.ClientOrderID,
		SelfMatchAction:   req.SelfMatchAction,
		NotionalCapCents:  req.NotionalCapCents,
		FailureReason:     &reason,
		CreatedAt:         now,
		UpdatedAt:         now,
	}
	if err := s.repo.CreateOrder(ctx, o); err != nil {
		return nil, nil, fmt.Errorf("persist rejected order: %w", err)
	}
	s.metrics.RecordOrder(market.ID, req.Side, req.Action, req.OrderType, OrderStatusRejected)
	return o, nil, nil
}

// newUUIDString generates a UUID v4 as a string. Used by the match engine
// as its IDFactory so trade rows carry stable IDs from plan-time through
// persistence (so issuance pairs can share match_id and ledger entries can
// reference trade_id).
func newUUIDString() string {
	return uuid.New().String()
}

func ensureOrderIdempotencyKey(req PlaceOrderRequest, userID string) *string {
	if req.IdempotencyKey != nil {
		trimmed := strings.TrimSpace(*req.IdempotencyKey)
		if trimmed != "" {
			return &trimmed
		}
	}

	key := fmt.Sprintf(
		"auto:%s:%s:%s:%s:%d:%d",
		userID,
		req.MarketID,
		req.Side,
		req.Action,
		req.Quantity,
		time.Now().UTC().UnixNano(),
	)
	return &key
}

// CancelOrder cancels an open order and releases its wallet reservation.
//
// Idempotent ownership check: cancelling another user's order returns an
// error; cancelling your own already-cancelled or already-filled order is a
// no-op (returns the current state via the repo's update path).
//
// For exchange-mode orders the cancellation runs in a tx that releases the
// uncaptured cash reservation alongside the order status update, so the two
// commit together (no window where cash is held but the order is gone).
// For AMM orders we just update the order row.
func (s *Service) CancelOrder(ctx context.Context, orderID, userID string) error {
	order, err := s.repo.GetOrder(ctx, orderID)
	if err != nil {
		return fmt.Errorf("order not found: %w", err)
	}
	if order.UserID != userID {
		return fmt.Errorf("order does not belong to user")
	}

	// Already in terminal state: idempotent no-op.
	switch order.Status {
	case OrderStatusFilled, OrderStatusCancelled, OrderStatusExpired, OrderStatusRejected:
		return nil
	}
	if order.Status != OrderStatusOpen && order.Status != OrderStatusPending && order.Status != OrderStatusPartial {
		return fmt.Errorf("cannot cancel order in status %s", order.Status)
	}

	// Exchange-mode market: load market to check execution_mode. If the
	// market is gone, fall back to the simple update.
	market, mErr := s.repo.GetMarket(ctx, order.MarketID)
	if mErr == nil && market.ExecutionMode == ExecutionModeOrderBook {
		exchangeWallet, ok := s.wallet.(ExchangeWalletAdapter)
		if ok {
			return s.cancelExchangeOrder(ctx, exchangeWallet, order)
		}
	}

	// AMM / fallback path: simple status update, no reservation release.
	now := time.Now().UTC()
	order.Status = OrderStatusCancelled
	order.CancelledAt = &now
	order.UpdatedAt = now
	return s.repo.UpdateOrder(ctx, order)
}

// cancelExchangeOrder runs the cancel for an exchange-mode order in one tx
// so the wallet reservation release commits with the order status update.
// Buy orders had cash held; sell orders had shares reserved (TODO follow-up
// for resting-sell reserved_quantity bookkeeping).
func (s *Service) cancelExchangeOrder(ctx context.Context, exchangeWallet ExchangeWalletAdapter, order *Order) error {
	tx, err := exchangeWallet.BeginExchangeTx(ctx)
	if err != nil {
		return fmt.Errorf("begin cancel tx: %w", err)
	}
	defer func() { _ = tx.Rollback() }()

	// Release the uncaptured cash reservation. Idempotent: if the order
	// never had a reservation (e.g., a sell), this is a no-op at the wallet.
	if err := exchangeWallet.ReleaseReservationWithTx(ctx, tx, "prediction_order", order.ID); err != nil {
		return fmt.Errorf("release reservation: %w", err)
	}

	// Update order row inside the same tx via direct SQL — we don't have a
	// "withTx" repo method for this, so we run it here. SQL kept narrow.
	now := time.Now().UTC()
	if _, err := tx.ExecContext(ctx,
		`UPDATE prediction_orders
		   SET status = 'cancelled',
		       cancelled_at = $2,
		       updated_at = NOW()
		 WHERE id = $1`,
		order.ID, now,
	); err != nil {
		return fmt.Errorf("update order to cancelled: %w", err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit cancel tx: %w", err)
	}
	order.Status = OrderStatusCancelled
	order.CancelledAt = &now
	order.UpdatedAt = now
	return nil
}

// --- Portfolio ---

func (s *Service) ListPositions(ctx context.Context, userID string) ([]Position, error) {
	return s.repo.ListPositions(ctx, userID)
}

func (s *Service) GetPortfolioSummary(ctx context.Context, userID string) (*PortfolioSummary, error) {
	return s.repo.GetPortfolioSummary(ctx, userID)
}

// ListSettledPositions returns paginated payout history for a user.
// Used by the player app's portfolio "history" tab.
func (s *Service) ListSettledPositions(ctx context.Context, userID string, page, pageSize int) ([]Payout, int, error) {
	return s.repo.ListSettledPositions(ctx, userID, page, pageSize)
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

	event := LifecycleEvent{
		MarketID:   marketID,
		EventType:  string(to),
		ActorID:    actorID,
		ActorType:  actorType(actorID),
		Reason:     &reason,
		OccurredAt: time.Now().UTC(),
	}
	s.repo.CreateLifecycleEvent(ctx, &event)

	// Post-commit hook fires the new status to WebSocket subscribers, so
	// clients see the transition without refreshing. UpdateMarketStatus
	// only mutates status + updated_at, so the in-memory `market` plus
	// the new status reflects the post-transition state without a re-fetch.
	if s.onMarketLifecycle != nil {
		market.Status = to
		market.UpdatedAt = event.OccurredAt
		go s.onMarketLifecycle(market, event)
	}

	return nil
}

// --- Admin: Create Market ---

func (s *Service) CreateMarket(ctx context.Context, req CreateMarketRequest) (*Market, error) {
	b := req.AMMLiquidityParam
	if b <= 0 {
		b = 100
	}

	// Fee policy: req.FeeRateBps == 0 means "use the platform default"
	// rather than "this market is fee-free." The 2026-04-24 fee-model
	// design call settled on DefaultTakerFeeBps (100 bps). To set a
	// market to true zero fees, callers can pass a negative value and
	// we clamp to zero — keeps the explicit-fee-free path available
	// without making it the silent default.
	feeBps := req.FeeRateBps
	if feeBps == 0 {
		feeBps = DefaultTakerFeeBps
	} else if feeBps < 0 {
		feeBps = 0
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
		SettlementParams:    defaultJSONObject(req.SettlementParams),
		SettlementCutoffAt:  req.SettlementCutoffAt,
		FeeRateBps:          feeBps,
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

// reservationTTL computes the wallet hold expiry for a placed order. Old
// code hardcoded 24h, which was wrong for GTC limit orders that sit on
// the book for days waiting to match — when a taker eventually crossed
// the bot's resting bid 25h+ later, the maker's reservation had aged
// past 24h and was already 'expired', so the capture path errored with
// "reservation is not in held status" (ErrReservationNotHeld). Demo
// seed Phase 4 hit this on bot orders left over from the prior day's
// run.
//
// Policy: a GTC reservation must outlive the market it's posted in.
// Market.CloseAt is the latest moment a fill is possible; padding 1h
// past close covers the auto-closer + reconciler tick window where a
// late-arriving match could still hit (defense in depth — the closer
// usually moves the market to 'closed' before then). IOC/FOK + the
// fallback for closed-or-missing CloseAt keep the original 24h default.
//
// Tested in service_reservation_ttl_test.go.
func reservationTTL(tif TimeInForce, marketCloseAt, now time.Time) time.Duration {
	const fallback = 24 * time.Hour
	if tif == TIFGTC && marketCloseAt.After(now) {
		return marketCloseAt.Sub(now) + time.Hour
	}
	return fallback
}
