package prediction

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

// Service is the primary business logic layer for the prediction platform.
type Service struct {
	repo   Repository
	wallet WalletAdapter
	// AMM execution is retired (P2-09): the order path no longer holds an
	// AMMEngine. The LMSR price math in amm.go remains as an unwired library
	// (used by discover price tests); PlaceOrder/PreviewOrder reject any
	// lingering execution_mode='amm' market.
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
	// ReleaseBet reverses previously-recorded committed stake when a
	// reservation is freed without being spent (cancel / expire / the
	// unfilled remainder of a partial or market order). committedAt is when
	// the original RecordBet was made: a release MUST only reduce usage in
	// the period that commit was counted in — a cross-period cancel must not
	// offset unrelated bets in a later period (D-5 codex re-review round 3).
	// Symmetric inverse of RecordBet; implementations must not let cumulative
	// usage go negative. Best-effort, like RecordBet.
	ReleaseBet(ctx context.Context, userID string, amountCents int64, committedAt time.Time) error
}

// AtomicBetGate is an OPTIONAL ComplianceChecker capability: it performs the
// bet-limit check and the committed-stake record as one atomic per-user
// operation. Separate CheckBetAllowed → RecordBet calls have a TOCTOU
// (codex round-1 #4): N concurrent same-user orders can each pass the gate
// before any RecordBet runs, so aggregate committed stake exceeds the
// period bet-limit (bounded only by wallet balance). When the wired checker
// implements this, the gate uses it and the committed stake is reconciled
// (released down to realized) after execution instead of recorded then;
// a checker that does NOT implement it falls back to the legacy (racy)
// CheckBetAllowed-then-RecordBet path with no behavior change.
type AtomicBetGate interface {
	CheckAndRecordBet(ctx context.Context, userID string, stakeCents int64) (allowed bool, reason string, err error)
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
// Returns recorded=true iff the committed stake was atomically recorded by
// an AtomicBetGate checker (codex-#4 TOCTOU fix) — the caller must then
// reconcile (release committed−realized) after execution instead of
// calling RecordBet. recorded=false means the legacy fall-back path is in
// effect and the caller records as before. recorded is always false when
// the order is blocked, when the checker errored (nothing was recorded),
// for stakeCents<=0 (sells record no usage), and for a non-atomic checker.
func (s *Service) checkComplianceForOrder(ctx context.Context, userID string, stakeCents int64) (recorded bool, _ error) {
	if s.compliance == nil {
		return false, nil
	}
	cctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()
	atomicGate, atomic := s.compliance.(AtomicBetGate)
	var (
		allowed bool
		reason  string
		err     error
	)
	if atomic {
		// Atomic check+record closes the check-then-record TOCTOU: a
		// concurrent same-user order cannot pass the gate between this
		// decision and the usage write — they are one critical section.
		allowed, reason, err = atomicGate.CheckAndRecordBet(cctx, userID, stakeCents)
	} else {
		allowed, reason, err = s.compliance.CheckBetAllowed(cctx, userID, stakeCents)
	}
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
		return false, fmt.Errorf("%s", reason)
	}
	// allowed == true but the checker still errored → it could not evaluate
	// (genuine infra ambiguity). Fail closed in production/staging so an
	// outage cannot silently disable the control; fail open in development
	// so a locally-misconfigured RG backend doesn't block testing. Nothing
	// was recorded in this branch (CheckAndRecordBet records only on a
	// clean allow), so recorded stays false.
	if err != nil {
		env := strings.ToLower(strings.TrimSpace(os.Getenv("ENVIRONMENT")))
		if env == "production" || env == "staging" {
			return false, fmt.Errorf("responsible-gambling check unavailable")
		}
		return false, nil // fail-open in development only
	}
	// Clean allow. The atomic gate recorded the committed stake iff it was
	// positive (sells / zero-stake gate-only orders record nothing).
	return atomic && stakeCents > 0, nil
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

// releaseComplianceOrder reverses committed stake when a reservation is freed
// without being spent (cancel / expire / unfilled remainder). Best-effort and
// symmetric with recordComplianceOrder: skipped for zero/negative amounts and
// a nil checker; a tracking-write failure must not unwind a committed cancel.
func (s *Service) releaseComplianceOrder(ctx context.Context, userID string, amountCents int64, committedAt time.Time) {
	if s.compliance == nil || amountCents <= 0 {
		return
	}
	cctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()
	_ = s.compliance.ReleaseBet(cctx, userID, amountCents, committedAt)
}

// isTerminalReservedStatus reports whether an order-book order has reached a
// state where its wallet reservation's unfilled remainder is freed in the
// same flow (so RG can reconcile committed→realized immediately). A resting
// order (open/partial) is NOT terminal: its committed stake stays counted
// until cancel/expire releases it. 'rejected' is handled by the caller (no
// reservation was ever taken) and deliberately excluded here.
func isTerminalReservedStatus(st OrderStatus) bool {
	return st == OrderStatusFilled || st == OrderStatusCancelled || st == OrderStatusExpired
}

// rgPlacementAccounting is the reserve+reconcile decision for an order-book
// placement (D-5 codex P1 #2). It always records the committed worst-case
// stake — the value the gate evaluated and the wallet reserved — so a
// resting limit order or a future maker fill cannot bypass the period limit
// (the pre-fix code recorded only realizedStakeCents, which is 0 for a
// resting order). If the order is already terminal (market/IOC taker,
// immediate fill) its unfilled remainder is freed in the same flow, so it
// also releases committed−realized: the net equals realized. A resting
// order (open/partial) releases nothing here — its committed stays counted
// until cancel/expire releases the remainder. A never-reserved reject (or a
// zero committed) records nothing.
func rgPlacementAccounting(committed int64, o *Order) (record, release int64) {
	if o == nil || committed <= 0 || o.Status == OrderStatusRejected {
		return 0, 0
	}
	record = committed
	if isTerminalReservedStatus(o.Status) {
		if rel := committed - realizedStakeCents(o); rel > 0 {
			release = rel
		}
	}
	return record, release
}

// rgReleaseAfterAtomicGate is the reconcile-only counterpart of
// rgPlacementAccounting for the AtomicBetGate path: the committed worst-case
// stake was ALREADY recorded atomically at the gate (closing the codex-#4
// TOCTOU), so placement never records again — it only releases the portion
// that did not become realized spend. A failed placement or a concurrent
// idempotent replay releases the whole committed amount (the order did not
// stand / the original request already counts it). A terminal order releases
// committed−realized (the unfilled remainder). A resting order releases
// nothing now: its full committed stays counted until cancel/expire frees
// the remainder (preserves the D-5 resting-order invariant). A
// never-reserved reject releases the whole committed (realized 0).
func rgReleaseAfterAtomicGate(committed int64, o *Order, replayed, hadErr bool) int64 {
	if committed <= 0 {
		return 0
	}
	if hadErr || replayed || o == nil || o.Status == OrderStatusRejected {
		return committed
	}
	if isTerminalReservedStatus(o.Status) {
		if rel := committed - realizedStakeCents(o); rel > 0 {
			return rel
		}
		return 0
	}
	return 0 // resting (open/partial): committed stays counted (D-5)
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

// SetSettlementAuditor wires the optional settlement audit recorder onto the
// settlement engine. Pass nil to disable.
func (s *Service) SetSettlementAuditor(a SettlementAuditor) {
	s.settlement.SetSettlementAuditor(a)
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
	return s.PreviewOrderForUser(ctx, req, "")
}

// PreviewOrderForUser previews a proposed order without executing it. The user
// id is optional for buy previews; sell previews and self-match checks need it
// to reflect the same constraints the execution path will enforce.
func (s *Service) PreviewOrderForUser(ctx context.Context, req PlaceOrderRequest, userID string) (*OrderPreview, error) {
	market, err := s.repo.GetMarket(ctx, req.MarketID)
	if err != nil {
		return nil, fmt.Errorf("market not found: %w", err)
	}
	if market.ExecutionMode == ExecutionModeOrderBook {
		return s.previewExchangeOrder(ctx, req, userID, market)
	}
	// AMM execution is retired (P2-09): no quote is produced for a legacy
	// AMM market — its trading path is closed (positions remain settleable).
	return nil, fmt.Errorf("market %s uses the retired AMM engine and is no longer tradeable", market.Ticker)
}

func (s *Service) previewExchangeOrder(ctx context.Context, req PlaceOrderRequest, userID string, market *Market) (*OrderPreview, error) {
	exchangeRepo, ok := s.repo.(ExchangeRepository)
	if !ok {
		return nil, fmt.Errorf("order-book preview requires SQL repository support")
	}
	if req.Action == OrderActionSell && strings.TrimSpace(userID) == "" {
		return nil, fmt.Errorf("authentication required to preview sell orders")
	}

	var position *Position
	if req.Action == OrderActionSell {
		p, err := s.repo.GetPosition(ctx, userID, req.MarketID, req.Side)
		if err == nil {
			position = p
		}
	}
	if err := ValidatePlaceOrderRequest(req, market, position); err != nil {
		return nil, err
	}

	tif := req.TimeInForce
	if tif == "" {
		tif = TIFGTC
	}
	if req.OrderType == OrderTypeMarket {
		tif = TIFIOC
	}
	smAction := req.SelfMatchAction
	if smAction == "" {
		smAction = SelfMatchCancelTaker
	}

	now := time.Now().UTC()
	taker := Order{
		ID:                "preview-taker",
		UserID:            strings.TrimSpace(userID),
		MarketID:          req.MarketID,
		Side:              req.Side,
		Action:            req.Action,
		OrderType:         req.OrderType,
		PriceCents:        req.PriceCents,
		Quantity:          req.Quantity,
		RemainingQuantity: req.Quantity,
		Status:            OrderStatusPending,
		TimeInForce:       tif,
		PostOnly:          req.PostOnly,
		SelfMatchAction:   smAction,
		NotionalCapCents:  req.NotionalCapCents,
		ReservedCashCents: worstCaseSpend(req),
		TotalCostCents:    worstCaseSpend(req),
		CreatedAt:         now,
		UpdatedAt:         now,
	}

	makersSec, err := exchangeRepo.LoadMakersForSecondary(ctx, market.ID, req.Side, req.Action, req.PriceCents, MaxOrderBookDepth)
	if err != nil {
		return nil, fmt.Errorf("load secondary makers: %w", err)
	}
	var makersIss []Order
	if req.Action == OrderActionBuy {
		otherSide := OrderSideNo
		if req.Side == OrderSideNo {
			otherSide = OrderSideYes
		}
		takerLimit := MaxTickPriceCents
		if req.PriceCents != nil {
			takerLimit = *req.PriceCents
		}
		makersIss, err = exchangeRepo.LoadMakersForIssuance(ctx, market.ID, otherSide, takerLimit, MaxOrderBookDepth)
		if err != nil {
			return nil, fmt.Errorf("load issuance makers: %w", err)
		}
	}

	seq := 0
	plan, err := NewExchangeEngine().BuildPlan(MatchInput{
		Market:          *market,
		Taker:           taker,
		MakersSecondary: makersSec,
		MakersIssuance:  makersIss,
		TakerPosition:   position,
		Now:             now,
		IDFactory: func() string {
			seq++
			return fmt.Sprintf("preview-%d", seq)
		},
	})
	if err != nil {
		return nil, err
	}
	return orderBookPreviewFromPlan(req, market, plan, now), nil
}

func orderBookPreviewFromPlan(req PlaceOrderRequest, market *Market, plan *MatchPlan, now time.Time) *OrderPreview {
	filledQty := plan.Taker.FilledQuantity
	unfilledQty := plan.Taker.RemainingQuantity
	totalCost := plan.Taker.CapturedCashCents
	if req.Action == OrderActionSell {
		totalCost = 0
	}

	var feeCents int64
	for _, trade := range plan.Trades {
		if trade.BuyOrderID != nil && *trade.BuyOrderID == plan.Taker.ID {
			feeCents += int64(trade.FeeCents)
			continue
		}
		if trade.SellOrderID != nil && *trade.SellOrderID == plan.Taker.ID {
			feeCents += int64(trade.FeeCents)
		}
	}

	avg := 0
	if filledQty > 0 && plan.Taker.FilledCostCents > 0 {
		avg = int((plan.Taker.FilledCostCents + int64(filledQty) - 1) / int64(filledQty))
	}
	price := avg
	if price == 0 && req.PriceCents != nil {
		price = *req.PriceCents
	}
	if price == 0 {
		if req.Side == OrderSideYes {
			price = market.YesPriceCents
		} else {
			price = market.NoPriceCents
		}
	}

	referencePrice := price
	if req.PriceCents != nil {
		referencePrice = *req.PriceCents
	} else if req.Side == OrderSideYes {
		referencePrice = market.YesPriceCents
	} else {
		referencePrice = market.NoPriceCents
	}
	slippage := 0
	if avg > 0 && req.Action == OrderActionBuy {
		slippage = avg - referencePrice
		if slippage < 0 {
			slippage = 0
		}
	}

	maxLoss := totalCost + feeCents
	maxProfit := int64(0)
	if req.Action == OrderActionBuy {
		maxProfit = int64(filledQty)*int64(ParPriceCents) - maxLoss
		if maxProfit < 0 {
			maxProfit = 0
		}
	}

	newYesPrice := market.YesPriceCents
	newNoPrice := market.NoPriceCents
	if plan.Market.LastTradePriceCents != nil {
		if req.Side == OrderSideYes {
			newYesPrice = *plan.Market.LastTradePriceCents
			newNoPrice = ParPriceCents - newYesPrice
		} else {
			newNoPrice = *plan.Market.LastTradePriceCents
			newYesPrice = ParPriceCents - newNoPrice
		}
	}

	return &OrderPreview{
		Side:                    req.Side,
		Action:                  req.Action,
		Quantity:                req.Quantity,
		PriceCents:              price,
		TotalCost:               totalCost,
		FeeCents:                feeCents,
		MaxProfit:               maxProfit,
		MaxLoss:                 maxLoss,
		NewYesPrice:             newYesPrice,
		NewNoPrice:              newNoPrice,
		ExecutionMode:           ExecutionModeOrderBook,
		FilledQuantity:          filledQty,
		UnfilledQuantity:        unfilledQty,
		AverageFillPriceCents:   avg,
		TotalCostWithFeesCents:  totalCost + feeCents,
		EstimatedSlippageCents:  slippage,
		QuoteStatus:             plan.Taker.Status,
		QuoteStaleAfterMillis:   int64((3 * time.Second) / time.Millisecond),
		QuoteGeneratedAtUnixSec: now.Unix(),
	}
}

// PlaceOrder executes a market order against the AMM.
// Debits the user's wallet, updates the order book and position, and returns
// the created order and trade fill. Broadcasts the trade via WebSocket is the
// caller's responsibility.
func (s *Service) PlaceOrder(ctx context.Context, req PlaceOrderRequest, userID string) (*Order, *Trade, error) {
	defer func(start time.Time) { s.metrics.RecordLatency("place_order", time.Since(start)) }(time.Now())

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
	committed := worstCaseSpend(req)
	gateRecorded, err := s.checkComplianceForOrder(ctx, userID, committed)
	if err != nil {
		return nil, nil, err
	}

	// Branch on execution mode. Markets created before migration 019 default to
	// 'amm'; new markets default to 'order_book'. The exchange path supports
	// limit + market orders, partial fills, complementary issuance, and sells
	// from existing positions; the AMM path stays buy-only for back-compat.
	if market.ExecutionMode == ExecutionModeOrderBook {
		o, t, replayed, perr := s.placeExchangeOrder(ctx, req, userID, market, idempotencyKey)
		// Reserve+reconcile RG accounting (D-5 codex P1 #2). Recording only
		// the realized taker fill let a user bypass the period limit two ways:
		// (a) many resting limit orders each passed the gate independently
		// because nothing was recorded until fill, and (b) a maker fill was
		// never recorded at all. Instead the *committed* worst-case stake —
		// the same value the gate evaluated and the wallet reserved — counts
		// from placement so it covers a resting order; the unfilled remainder
		// is reconciled (released) once the order is terminal.
		if gateRecorded {
			// codex-#4 path: the committed stake was recorded ATOMICALLY at
			// the gate (no check-then-record TOCTOU). Never record again
			// here — only release the portion that did not become realized
			// spend. A failed placement or a concurrent idempotent replay
			// (#3) releases the whole committed amount; a terminal order
			// releases committed−realized; a resting order releases nothing
			// (its committed stays counted until cancel/expire).
			rel := rgReleaseAfterAtomicGate(committed, o, replayed, perr != nil)
			s.releaseComplianceOrder(ctx, userID, rel, time.Now().UTC())
		} else if perr == nil && !replayed {
			// Legacy fall-back (non-atomic checker): record at placement
			// then release the terminal remainder, exactly as before.
			rec, rel := rgPlacementAccounting(committed, o)
			s.recordComplianceOrder(ctx, userID, rec)
			// committedAt = now: the record and this terminal release happen
			// in the same call, so they are always the same RG period.
			s.releaseComplianceOrder(ctx, userID, rel, time.Now().UTC())
		}
		return o, t, perr
	}

	// AMM execution is RETIRED (audit strategy §4 / P2-09). New markets are
	// always order_book — P1-03 gates creation — but a pre-019 market could
	// still carry execution_mode='amm'. New trades on such a market are refused;
	// existing positions stay fully settleable and voidable because settlement is
	// engine-agnostic (it pays 100c/contract from prediction_positions, never
	// touching AMM state). Release any RG stake the gate atomically recorded,
	// since no order is placed.
	if gateRecorded {
		s.releaseComplianceOrder(ctx, userID, committed, time.Now().UTC())
	}
	return nil, nil, fmt.Errorf("market %s uses the retired AMM engine and is no longer tradeable; existing positions can still be settled", market.Ticker)
}

// placeExchangeOrder is the order-book execution path. Validates, loads the
// taker's existing position (for sell-side checks), persists the pending
// order, runs the match engine against current book state, and commits the
// match plan atomically via PersistMatchAtomic.
//
// Concurrency model: the prediction order INSERT happens in a separate
// pre-match step so that maker/trade FK references resolve. The match itself
// runs under pg_advisory_xact_lock per market — see SQLRepository.PersistMatchAtomic.
// placeExchangeOrder returns replayed=true only when an idempotency-key
// collision (a concurrent duplicate that lost the CreateOrder insert race)
// caused it to return a pre-existing order. The caller MUST NOT re-run the
// RG RecordBet for a replayed order — the original request already recorded
// it, and re-recording double-counts the user toward their period limit
// (D-5 codex review P1 #3). The sequential replay is caught earlier in
// PlaceOrder (GetOrderByIdempotencyKey before the gate); this covers the
// concurrent race that falls through to here.
func (s *Service) placeExchangeOrder(ctx context.Context, req PlaceOrderRequest, userID string, market *Market, idempotencyKey *string) (*Order, *Trade, bool, error) {
	exchangeRepo, repoOK := s.repo.(ExchangeRepository)
	exchangeWallet, walletOK := s.wallet.(ExchangeWalletAdapter)
	if !repoOK || !walletOK {
		return nil, nil, false, fmt.Errorf("exchange engine requires SQL repository and wallet adapter (memory mode not supported for order-book markets)")
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
		o, t, e := s.persistRejectedExchangeOrder(ctx, req, userID, market, idempotencyKey, err.Error())
		return o, t, false, e
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
				return existing, nil, true, nil
			}
		}
		return nil, nil, false, fmt.Errorf("create pending order: %w", err)
	}

	// Match attempt loop. The plan is built from a snapshot of the book read
	// OUTSIDE the per-market lock, then PersistMatchAtomic re-asserts each
	// touched maker's fill state under the lock. If a concurrent taker moved a
	// maker between our read and the commit, PersistMatchAtomic returns
	// ErrBookChanged and we re-load the book and re-plan rather than writing
	// stale absolute fill values that would regress the maker (audit COR-02).
	// Bounded so a pathologically hot market can't spin forever; the taker
	// order row is pristine across attempts (BuildPlan copies it).
	engine := NewExchangeEngine()
	const maxMatchAttempts = 3
	for attempt := 1; attempt <= maxMatchAttempts; attempt++ {
		// Load candidate makers for both match modes. The engine will pick which
		// fills to execute based on price-time priority and feasibility.
		makersSec, err := exchangeRepo.LoadMakersForSecondary(ctx, market.ID, req.Side, req.Action, req.PriceCents, MaxOrderBookDepth)
		if err != nil {
			return nil, nil, false, fmt.Errorf("load secondary makers: %w", err)
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
			takerLimit := MaxTickPriceCents
			if req.PriceCents != nil {
				takerLimit = *req.PriceCents
			}
			makersIss, err = exchangeRepo.LoadMakersForIssuance(ctx, market.ID, otherSide, takerLimit, MaxOrderBookDepth)
			if err != nil {
				return nil, nil, false, fmt.Errorf("load issuance makers: %w", err)
			}
		}

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
			if uerr := s.repo.UpdateOrder(ctx, taker); uerr != nil {
				// A failed mark leaves a phantom 'pending' order the demo sweep
				// only clears after >1h; log so it's visible (audit COR-04).
				slog.WarnContext(ctx, "failed to mark rejected order after engine rejection",
					"order_id", taker.ID, "market_id", market.ID, "error", uerr)
			}
			s.metrics.RecordOrder(market.ID, req.Side, req.Action, req.OrderType, OrderStatusRejected)
			return taker, nil, false, nil
		}

		// Wallet hold for buys: reserve worst-case spend up front. The match
		// captures incrementally; any unfilled remainder is released by
		// applyTIF or the caller's cancel flow. HoldWithTx is idempotent by
		// (type,id), so a retry re-holds harmlessly after the prior attempt's
		// tx rolled back.
		if req.Action == OrderActionBuy && totalCost > 0 {
			plan.HoldReservation = &ReservationHold{
				UserID:      userID,
				AmountCents: totalCost,
				Type:        "prediction_order",
				ID:          taker.ID,
				ExpiresIn:   reservationTTL(tif, market.CloseAt, now),
			}
		}

		perr := exchangeRepo.PersistMatchAtomic(ctx, exchangeWallet, plan)
		if perr == nil {
			// Success. Domain metrics: one order observation by final status,
			// one trade observation per fill.
			s.metrics.RecordOrder(market.ID, req.Side, req.Action, req.OrderType, plan.Taker.Status)
			for _, t := range plan.Trades {
				s.metrics.RecordTrade(market.ID, t.TradeKind, t.EngineKind)
			}
			// Post-commit: refresh top-of-book snapshot. Best-effort — derived
			// columns self-heal on the next match (audit COR-04).
			if rerr := exchangeRepo.RefreshMarketBestQuotes(ctx, market.ID); rerr != nil {
				slog.WarnContext(ctx, "refresh best quotes after match failed",
					"market_id", market.ID, "error", rerr)
			}
			var firstTrade *Trade
			if len(plan.Trades) > 0 {
				t := plan.Trades[0]
				firstTrade = &t
			}
			return &plan.Taker, firstTrade, false, nil
		}

		// A maker moved under the lock: re-load the book and re-plan, up to the
		// attempt bound. The failed attempt's tx already rolled back (no fills,
		// no captures), so nothing to undo.
		if errors.Is(perr, ErrBookChanged) && attempt < maxMatchAttempts {
			slog.InfoContext(ctx, "match replan: book changed under lock",
				"order_id", taker.ID, "market_id", market.ID, "attempt", attempt)
			continue
		}

		// Terminal persist failure (or retries exhausted). The pending order
		// row committed before the match tx (so trade FKs resolve); mark it
		// rejected so it isn't a phantom 'pending' until the stale sweep.
		reason := perr.Error()
		if errors.Is(perr, ErrBookChanged) {
			reason = "order book is moving too fast; please retry"
		}
		taker.Status = OrderStatusRejected
		taker.FailureReason = &reason
		if uerr := s.repo.UpdateOrder(ctx, taker); uerr != nil {
			slog.WarnContext(ctx, "failed to mark rejected order after persist-match failure",
				"order_id", taker.ID, "market_id", market.ID, "error", uerr)
		}
		s.metrics.RecordOrder(market.ID, req.Side, req.Action, req.OrderType, OrderStatusRejected)
		return taker, nil, false, fmt.Errorf("persist match: %w", perr)
	}

	// Unreachable: the loop returns on success, engine rejection, or terminal
	// failure. Present so the function has a terminal statement.
	return taker, nil, false, fmt.Errorf("match exhausted %d attempts", maxMatchAttempts)
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

// cancelExchangeOrder runs a user cancel for an exchange-mode order.
func (s *Service) cancelExchangeOrder(ctx context.Context, exchangeWallet ExchangeWalletAdapter, order *Order) error {
	return s.finalizeRestingExchangeOrder(ctx, exchangeWallet, order, OrderStatusCancelled)
}

// finalizeRestingExchangeOrder moves a resting exchange order to a terminal
// state — OrderStatusCancelled (user cancel) or OrderStatusExpired (the
// close/void sweep: the order's market is no longer tradeable) — in one tx
// so the wallet reservation release commits with the status update, then
// reconciles the RG committed stake (release reserved−captured, scoped to
// the order's original commit period — D-5). Buy orders had cash held; sell
// orders had shares reserved and those share locks are released here.
func (s *Service) finalizeRestingExchangeOrder(ctx context.Context, exchangeWallet ExchangeWalletAdapter, order *Order, terminal OrderStatus) error {
	tx, err := exchangeWallet.BeginExchangeTx(ctx)
	if err != nil {
		return fmt.Errorf("begin %s tx: %w", terminal, err)
	}
	defer func() { _ = tx.Rollback() }()

	// Release the uncaptured cash reservation. Idempotent: if the order
	// never had a reservation (e.g., a sell), this is a no-op at the wallet.
	if err := exchangeWallet.ReleaseReservationWithTx(ctx, tx, "prediction_order", order.ID); err != nil {
		return fmt.Errorf("release reservation: %w", err)
	}
	if order.Action == OrderActionSell && order.RemainingQuantity > 0 {
		if _, err := tx.ExecContext(ctx,
			`UPDATE prediction_positions
			    SET reserved_quantity = GREATEST(reserved_quantity - $4, 0),
			        updated_at = NOW()
			  WHERE user_id = $1 AND market_id = $2 AND side = $3`,
			order.UserID, order.MarketID, string(order.Side), order.RemainingQuantity,
		); err != nil {
			return fmt.Errorf("release reserved shares: %w", err)
		}
	}

	// Update order row inside the same tx via direct SQL — we don't have a
	// "withTx" repo method for this, so we run it here. SQL kept narrow.
	// RETURNING the reservation columns (GetOrder's narrower scan does not
	// load them) gives the exact committed-vs-captured split for the RG
	// release below, without widening the shared order scan path.
	// cancelled_at is only meaningful for a user cancel; an expiry leaves
	// it NULL (the order was not cancelled — its market closed under it).
	now := time.Now().UTC()
	var cancelledAt interface{}
	if terminal == OrderStatusCancelled {
		cancelledAt = now
	}
	var reservedCents, capturedCents int64
	var placedAt time.Time
	if err := tx.QueryRowContext(ctx,
		`UPDATE prediction_orders
		   SET status = $2,
		       reserved_quantity = 0,
		       cancelled_at = $3,
		       updated_at = NOW()
		 WHERE id = $1
		 RETURNING reserved_cash_cents, captured_cash_cents, created_at`,
		order.ID, string(terminal), cancelledAt,
	).Scan(&reservedCents, &capturedCents, &placedAt); err != nil {
		return fmt.Errorf("update order to %s: %w", terminal, err)
	}

	if err := tx.Commit(); err != nil {
		return fmt.Errorf("commit %s tx: %w", terminal, err)
	}
	order.Status = terminal
	if terminal == OrderStatusCancelled {
		order.CancelledAt = &now
	}
	order.UpdatedAt = now

	// Reserve+reconcile (D-5 codex P1 #2): the committed stake was recorded
	// toward the RG period at placement. Cancelling frees the uncaptured
	// remainder, so release exactly that — leaving net RG usage equal to the
	// cash actually captured. Best-effort, post-commit (mirrors RecordBet).
	// committedAt = the order's placement time: if the order has rested past
	// a period boundary the RG service no-ops the release (the original
	// commit already aged out of the current period, so reversing it now
	// would wrongly free headroom for unrelated current-period bets —
	// D-5 codex re-review round 3).
	s.releaseComplianceOrder(ctx, order.UserID, reservedCents-capturedCents, placedAt)
	return nil
}

// SweepExpiredRestingOrders finalizes resting open/partial exchange orders
// whose market is no longer tradeable (closed/settled/voided). No market-
// transition path (admin TransitionMarketStatus, the MarketCloser worker,
// or SettlementEngine void) finalizes resting orders, so without this sweep
// the order's RG committed stake stays counted toward the user's period
// bet-limit and its wallet cash reservation stays held — indefinitely
// (expired-order residual). Each order is finalized to OrderStatusExpired
// via the same tx + RG-reconcile path as a user cancel. Best-effort: a
// per-order failure is counted and retried on the next tick; returns
// (expired, failed). The worker logs.
func (s *Service) SweepExpiredRestingOrders(ctx context.Context) (expired, failed int, err error) {
	orders, lerr := s.repo.ListRestingOrdersOnInactiveMarkets(ctx, 500)
	if lerr != nil {
		return 0, 0, fmt.Errorf("list resting orders on inactive markets: %w", lerr)
	}
	if len(orders) == 0 {
		return 0, 0, nil
	}
	exchangeWallet, ok := s.wallet.(ExchangeWalletAdapter)
	if !ok {
		// Memory/test wallet: the tx-based finalize path is unavailable;
		// nothing to do (the exchange path only runs against a real DB).
		return 0, 0, nil
	}
	for i := range orders {
		o := orders[i]
		if ferr := s.finalizeRestingExchangeOrder(ctx, exchangeWallet, &o, OrderStatusExpired); ferr != nil {
			failed++
			continue
		}
		expired++
	}
	return expired, failed, nil
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

// ResumeIncompleteSettlements finishes disbursing any settlement whose batched
// payouts did not complete (P3-12 / COR-05). Delegates to the settlement engine
// so resume reuses the same loyalty/tier wiring as the live settle path.
func (s *Service) ResumeIncompleteSettlements(ctx context.Context) (int, error) {
	return s.settlement.ResumeIncompleteSettlements(ctx)
}

// SetResolutionStore wires the propose -> finalize resolution store onto the
// settlement engine. Pass nil to disable the windowed path.
func (s *Service) SetResolutionStore(store ResolutionStore) {
	s.settlement.SetResolutionStore(store)
}

// ProposeResolution records a proposed result and opens the challenge window.
func (s *Service) ProposeResolution(ctx context.Context, marketID string, req ResolveMarketRequest, proposedBy *string, window time.Duration) (*ResolutionProposal, error) {
	return s.settlement.ProposeResolution(ctx, req, marketID, proposedBy, window)
}

// FinalizeResolution finalizes a proposed resolution after the window elapses.
func (s *Service) FinalizeResolution(ctx context.Context, marketID string, finalizedBy *string) (*Settlement, []Payout, error) {
	return s.settlement.FinalizeResolution(ctx, marketID, finalizedBy)
}

// MarkMarketDisputed transitions a market to disputed when a dispute is filed.
func (s *Service) MarkMarketDisputed(ctx context.Context, marketID, disputerID string) error {
	return s.settlement.MarkMarketDisputed(ctx, marketID, disputerID)
}

// FileDispute records a user dispute under the per-market lock (insert +
// transition to disputed), serialized against finalize. Eligibility is the
// caller's responsibility.
func (s *Service) FileDispute(ctx context.Context, marketID, userID, reason string) (*Dispute, error) {
	return s.settlement.FileDispute(ctx, marketID, userID, reason)
}

// ResolveDispute applies an admin uphold (void+refund) / reject decision.
func (s *Service) ResolveDispute(ctx context.Context, disputeID string, uphold bool, note string, resolvedBy *string) (*Dispute, error) {
	return s.settlement.ResolveDispute(ctx, disputeID, uphold, note, resolvedBy)
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

func (s *Service) CreateEvent(ctx context.Context, req CreateEventRequest) (*Event, error) {
	if strings.TrimSpace(req.Title) == "" {
		return nil, fmt.Errorf("event title is required")
	}
	if strings.TrimSpace(req.CategoryID) == "" {
		return nil, fmt.Errorf("event categoryId is required")
	}
	if req.CloseAt.IsZero() {
		return nil, fmt.Errorf("event closeAt is required")
	}
	event := &Event{
		SeriesID:    req.SeriesID,
		Title:       req.Title,
		Description: req.Description,
		CategoryID:  req.CategoryID,
		Status:      EventStatusDraft,
		Featured:    req.Featured,
		OpenAt:      req.OpenAt,
		CloseAt:     req.CloseAt,
		Metadata:    defaultJSONObject(req.Metadata),
		CreatedBy:   req.CreatedBy,
		CreatedAt:   time.Now().UTC(),
		UpdatedAt:   time.Now().UTC(),
	}
	if err := s.repo.CreateEvent(ctx, event); err != nil {
		return nil, fmt.Errorf("create event: %w", err)
	}
	return event, nil
}

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
		Translations:        defaultJSONObject(req.Translations),
		Status:              MarketStatusUnopened,
		// New markets are always order-book; the AMM is a legacy mode kept
		// only for pre-019 markets and is slated for removal (audit COR-03 /
		// P2-09). Setting it explicitly (the DB default agrees) documents the
		// intent and guards against a future INSERT that starts writing the
		// column.
		ExecutionMode:       ExecutionModeOrderBook,
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
	market.ArticleSourceID = req.ArticleSourceID

	if err := s.repo.CreateMarket(ctx, market); err != nil {
		return nil, fmt.Errorf("create market: %w", err)
	}
	if len(req.AIGenerationLogIDs) > 0 {
		if err := s.repo.LinkAIGenerationLogsToMarket(ctx, market.ID, req.AIGenerationLogIDs, req.CreatedBy); err != nil {
			return nil, fmt.Errorf("link ai generation logs: %w", err)
		}
	}

	s.repo.CreateLifecycleEvent(ctx, &LifecycleEvent{
		MarketID:   market.ID,
		EventType:  "created",
		ActorID:    req.CreatedBy,
		ActorType:  "admin",
		OccurredAt: time.Now().UTC(),
	})

	return market, nil
}

// CreateArticleSource persists (deduped on TextHash) the provenance record for
// an AI-drafted market and returns the canonical row with its id set.
func (s *Service) CreateArticleSource(ctx context.Context, src *ArticleSource) (*ArticleSource, error) {
	if strings.TrimSpace(src.TextHash) == "" {
		return nil, fmt.Errorf("article source requires textHash")
	}
	if err := s.repo.CreateArticleSource(ctx, src); err != nil {
		return nil, fmt.Errorf("create article source: %w", err)
	}
	return src, nil
}

// LogAIGeneration records one AI model call in the drafting pipeline for audit.
func (s *Service) LogAIGeneration(ctx context.Context, entry *AIGenerationLog) error {
	if strings.TrimSpace(entry.Stage) == "" {
		return fmt.Errorf("ai generation log requires stage")
	}
	if err := s.repo.LogAIGeneration(ctx, entry); err != nil {
		return fmt.Errorf("log ai generation: %w", err)
	}
	return nil
}

// ReserveAIBudget performs the authoritative pre-spend rate/budget check and
// records an attempt before the office route calls the LLM.
func (s *Service) ReserveAIBudget(ctx context.Context, createdBy string, estimatedInputTokens int) (AIBudgetStatus, error) {
	if estimatedInputTokens < 1 {
		estimatedInputTokens = 1
	}
	ratePerMin := aiEnvInt("AI_DRAFT_RATE_PER_MIN", 10)
	dailyTokenCap := aiEnvInt64("AI_DRAFT_DAILY_TOKEN_CAP", 2_000_000)
	status, err := s.repo.ReserveAIUsage(ctx, createdBy, estimatedInputTokens, ratePerMin, dailyTokenCap, time.Now().UTC())
	if err != nil {
		return AIBudgetStatus{}, fmt.Errorf("reserve ai budget: %w", err)
	}
	return status, nil
}

// CheckAIBudget enforces per-admin AI-drafting limits (plan §17c): a
// requests-per-minute rate limit and a daily token cap, both summed from the
// generation logs (DB-backed, correct across instances). Caps come from env.
func (s *Service) CheckAIBudget(ctx context.Context, createdBy string) (AIBudgetStatus, error) {
	ratePerMin := aiEnvInt("AI_DRAFT_RATE_PER_MIN", 10)
	dailyTokenCap := aiEnvInt64("AI_DRAFT_DAILY_TOKEN_CAP", 2_000_000)
	now := time.Now().UTC()

	recent, _, err := s.repo.AIUsage(ctx, createdBy, now.Add(-time.Minute))
	if err != nil {
		return AIBudgetStatus{}, fmt.Errorf("ai budget (rate): %w", err)
	}
	startOfDay := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, time.UTC)
	_, tokensToday, err := s.repo.AIUsage(ctx, createdBy, startOfDay)
	if err != nil {
		return AIBudgetStatus{}, fmt.Errorf("ai budget (spend): %w", err)
	}

	status := AIBudgetStatus{
		Allowed:            true,
		RequestsLastMinute: recent,
		RatePerMinute:      ratePerMin,
		TokensToday:        tokensToday,
		DailyTokenCap:      dailyTokenCap,
	}
	if recent >= ratePerMin {
		status.Allowed = false
		status.Reason = "rate limit exceeded — too many drafts in the last minute"
	} else if tokensToday >= dailyTokenCap {
		status.Allowed = false
		status.Reason = "daily AI token budget exhausted"
	}
	return status, nil
}

func aiEnvInt(key string, def int) int {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return def
}

func aiEnvInt64(key string, def int64) int64 {
	if v := os.Getenv(key); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil && n > 0 {
			return n
		}
	}
	return def
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
