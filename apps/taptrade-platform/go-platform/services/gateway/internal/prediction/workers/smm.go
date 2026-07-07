// Package workers — SMM (Synthetic Market Maker).
//
// # PURPOSE
//
// The CLOB launches into an empty book because no external market makers
// have signed agreements yet (HUMAN_ONLY_ITEMS.md #1). An empty book means
// every market buy / market sell cancels with "no matching liquidity,"
// which makes the order_book mode unusable end-to-end and forces a
// regression back to AMM mode for any market that needs to demo as
// "tradable."
//
// The SMM is a platform-operated bot that posts two-sided limit orders
// on every open order_book market, providing the liquidity that external
// MMs would otherwise provide. It exists to bridge the gap between
// "CLOB engine works" (true today) and "CLOB has real liquidity" (gated
// on item #1). When external MMs sign, the SMM steps back or is disabled
// per-market.
//
// # DESIGN
//
// **Identity.** The SMM trades as `user-bot` — a seeded user with $10K
// starting balance and a wallet/punter row already in place. No new
// auth path; it uses the existing user account.
//
// **Execution path.** The SMM is an in-process goroutine in the gateway
// (same shape as MarketCloser, AutoSettler, Reconciler). It calls
// service.PlaceOrder + service.CancelOrder directly — same code path as
// every other order, same validation, same metrics. Nothing about the
// SMM bypasses the engine.
//
// **Quoting.** For each open order_book market on each tick:
//  1. Read the market's current yes_price_points as the fair-price anchor.
//  2. Compute target bid = max(MinTick, fair - halfSpread).
//     Compute target ask = min(MaxTick, fair + halfSpread).
//  3. Look at the SMM's existing open orders on this market.
//  4. Cancel any SMM order whose price has drifted > maxDriftPoints from
//     its current target. Keeps the book aligned without spamming
//     cancel+repost on every tick.
//  5. If no SMM order exists at the target bid, post a Buy YES limit
//     at bid price for `depthQty` shares.
//  6. If no SMM order exists at the target ask, post a Buy NO limit
//     at (100 - ask) price for `depthQty` shares. (The exchange
//     engine's complementary-issuance path then matches user Buy YES
//     against this Buy NO, minting a YES+NO pair — the SMM ends up
//     with NO inventory and the user gets YES.)
//
// We deliberately don't post Sell YES / Sell NO orders in Phase 1: that
// would require the SMM to hold inventory first, and the cold-start
// case has no inventory yet. Two-sided issuance quotes are sufficient
// to provide liquidity to user buys on either side. Phase 2 can add
// sell-side quotes once inventory exists.
//
// **Risk controls (Phase 1).**
//   - SMM_ENABLED env var, default "false". Bot does nothing when off.
//   - SMM_DEPTH_CENTS: max cash committed per market (default 5000c = $50).
//   - SMM_HALF_SPREAD_CENTS: half the bid-ask spread (default 3c).
//   - SMM_MAX_DRIFT_CENTS: how far the market's mid can move before we
//     cancel + repost (default 2c).
//   - SMM_TICK_INTERVAL: tick cadence (default 30s).
//
// **Restart behaviour.** On worker startup the SMM cancels all of
// user-bot's existing open orders on order_book markets and starts
// fresh. Simpler than resuming + reconciling; the existing orders are
// fungible with newly-placed ones from the user's perspective.
//
// **What this is NOT (Phase 1 limits).**
//   - No volatility halt: a market that jumps 50% in a tick still gets
//     re-quoted at the new anchor. Bad for the bot's P&L. Phase 2.
//   - No drawdown halt: bot keeps quoting even if it's underwater.
//     Phase 2.
//   - No inventory-based price skew: bot quotes symmetrically even
//     when it's lopsided on one side. Phase 2.
//   - No volume-aware sizing: depth is fixed regardless of market
//     volume. Phase 2.
//   - No fee accounting: the bot pays the same taker fees as any
//     user when one of its orders crosses (the bot mostly rests, so
//     this is small).
//
// These gaps are intentional. Phase 1's goal is "user buy fills against
// an SMM-provided book at all." Phase 2 adds the risk machinery a
// real production deployment needs.
package workers

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"os"
	"strconv"
	"time"

	"taptrade/gateway/internal/prediction"
)

// SMMConfig is the bot's per-run configuration. Loaded from env in
// NewSMMFromEnv. Exported for tests + override hooks.
type SMMConfig struct {
	Enabled           bool
	UserID            string // wallet/punter id, defaults to "user-bot"
	TickInterval      time.Duration
	DepthPoints       int64 // max committed cash per market per side
	HalfSpreadPoints  int   // 1¢ → 2¢ spread (bid at mid-1, ask at mid+1)
	MaxDriftPoints    int   // re-quote if our resting price has drifted > this from current target
	MaxMarketsPerTick int   // safety cap; 0 = no limit
	// MaxPositionQty caps total accumulated YES or NO inventory the bot
	// can hold on a single market. When the bot's existing position on a
	// side hits this, it stops posting quotes that would grow that side
	// further. 0 = no limit (Phase 1 behaviour). Phase 2.1 risk control;
	// see SMM_MAX_POSITION_QTY in the README + RUNBOOK.
	MaxPositionQty int
}

// DefaultSMMConfig returns the documented defaults. Used when env vars
// are missing or malformed.
func DefaultSMMConfig() SMMConfig {
	return SMMConfig{
		Enabled:           false,
		UserID:            "user-bot",
		TickInterval:      30 * time.Second,
		DepthPoints:       5000,
		HalfSpreadPoints:  3,
		MaxDriftPoints:    2,
		MaxMarketsPerTick: 0,
		// Default 500 shares per side per market. At a 50¢ mid that's
		// $250 of one-sided exposure (worst case if the market crashes
		// to 0). Tunable per environment.
		MaxPositionQty: 500,
	}
}

// NewSMMFromEnv reads config from env vars and returns a configured SMM
// worker. Defaults are conservative (Enabled=false, $50 per-market cap,
// 6¢ spread).
func NewSMMFromEnv(svc *prediction.Service, repo prediction.Repository) *SMM {
	cfg := DefaultSMMConfig()
	if v := os.Getenv("SMM_ENABLED"); v == "true" || v == "1" {
		cfg.Enabled = true
	}
	if v := os.Getenv("SMM_USER_ID"); v != "" {
		cfg.UserID = v
	}
	if v := os.Getenv("SMM_TICK_INTERVAL"); v != "" {
		if d, err := time.ParseDuration(v); err == nil && d >= time.Second {
			cfg.TickInterval = d
		}
	}
	if v := os.Getenv("SMM_DEPTH_CENTS"); v != "" {
		if n, err := strconv.ParseInt(v, 10, 64); err == nil && n > 0 {
			cfg.DepthPoints = n
		}
	}
	if v := os.Getenv("SMM_HALF_SPREAD_CENTS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 1 && n <= 49 {
			cfg.HalfSpreadPoints = n
		}
	}
	if v := os.Getenv("SMM_MAX_DRIFT_CENTS"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 1 && n <= 50 {
			cfg.MaxDriftPoints = n
		}
	}
	if v := os.Getenv("SMM_MAX_MARKETS_PER_TICK"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			cfg.MaxMarketsPerTick = n
		}
	}
	if v := os.Getenv("SMM_MAX_POSITION_QTY"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n >= 0 {
			cfg.MaxPositionQty = n
		}
	}
	return &SMM{cfg: cfg, svc: svc, repo: repo}
}

// SMM is the synthetic market maker worker.
type SMM struct {
	cfg     SMMConfig
	svc     *prediction.Service
	repo    prediction.Repository
	metrics *prediction.Metrics // optional; nil-safe via RecordSMMSkip
}

// SetMetrics wires the prediction-domain Prometheus counter registry so
// the bot can emit skip counters. nil-safe.
func (s *SMM) SetMetrics(m *prediction.Metrics) {
	s.metrics = m
}

// Run starts the SMM tick loop. Blocks until ctx is cancelled. Safe to
// call when Enabled=false — it returns immediately after a single log
// line so operators can see the bot was wired but disabled.
func (s *SMM) Run(ctx context.Context) {
	if !s.cfg.Enabled {
		slog.Info("smm: disabled (set SMM_ENABLED=true to start)",
			"user_id", s.cfg.UserID)
		return
	}
	slog.Info("smm: starting",
		"user_id", s.cfg.UserID,
		"tick_interval", s.cfg.TickInterval,
		"depth_points", s.cfg.DepthPoints,
		"half_spread_points", s.cfg.HalfSpreadPoints,
		"max_drift_points", s.cfg.MaxDriftPoints,
		"max_position_qty", s.cfg.MaxPositionQty,
	)

	// Cancel any leftover open orders from a previous run before quoting.
	// Cheaper than reconciling; the bot re-posts on the first tick anyway.
	if err := s.cancelAllBotOrders(ctx); err != nil {
		slog.Warn("smm: startup cancel failed (continuing)", "error", err)
	}

	ticker := time.NewTicker(s.cfg.TickInterval)
	defer ticker.Stop()
	// First tick fires immediately so the book gets quoted at startup
	// without waiting an interval.
	s.tick(ctx)
	for {
		select {
		case <-ctx.Done():
			slog.Info("smm: stopping")
			// Best-effort cleanup so we don't leave stale quotes during
			// graceful shutdown. Failures here are logged but not retried.
			if err := s.cancelAllBotOrders(context.Background()); err != nil {
				slog.Warn("smm: shutdown cancel failed", "error", err)
			}
			return
		case <-ticker.C:
			s.tick(ctx)
		}
	}
}

// tick walks every open order_book market and re-quotes if needed. One
// market's failure doesn't stop the rest of the sweep — each iteration
// is logged independently.
func (s *SMM) tick(ctx context.Context) {
	statusOpen := prediction.MarketStatusOpen
	markets, _, err := s.repo.ListMarkets(ctx, prediction.MarketFilter{
		Status:   &statusOpen,
		Page:     1,
		PageSize: 1000,
		// Launch-scrubbed markets are hidden from public lists but remain
		// tradeable by direct link, so the SMM keeps quoting them.
		IncludeLaunchScrubbed: true,
	})
	if err != nil {
		slog.Warn("smm: list markets failed", "error", err)
		return
	}

	processed := 0
	for _, m := range markets {
		if s.cfg.MaxMarketsPerTick > 0 && processed >= s.cfg.MaxMarketsPerTick {
			break
		}
		if m.ExecutionMode != prediction.ExecutionModeOrderBook {
			continue
		}
		if err := s.quoteMarket(ctx, &m); err != nil {
			slog.Warn("smm: quote failed",
				"market", m.Ticker, "market_id", m.ID, "error", err)
		}
		processed++
	}
}

// quoteMarket implements the per-market re-quote logic. See the package
// doc for the strategy. This function is the place a future Phase-2
// risk control (volatility halt, inventory skew, drawdown halt) would
// hook in — keep the steps independent so guards can short-circuit.
func (s *SMM) quoteMarket(ctx context.Context, m *prediction.Market) error {
	fair := m.YesPricePoints
	if fair < prediction.MinTickPricePoints+s.cfg.HalfSpreadPoints ||
		fair > prediction.MaxTickPricePoints-s.cfg.HalfSpreadPoints {
		// Market is at the edge of the price band. Quoting symmetrically
		// would put one of our orders outside [1,99]. Skip for now;
		// Phase 2 can implement asymmetric quoting at the edges.
		return nil
	}

	bidYesPrice := fair - s.cfg.HalfSpreadPoints                                      // Buy YES limit at this price
	bidNoComplementary := prediction.ParPricePoints - (fair + s.cfg.HalfSpreadPoints) // Buy NO price so YES+NO sum = 100+spread

	// Look at the SMM's existing open orders on this market. The repo
	// already supports filtering by user + market via ListOrders.
	open, _, err := s.repo.ListOrders(ctx, prediction.OrderFilter{
		UserID:   s.cfg.UserID,
		MarketID: ptrStr(m.ID),
		Status:   ptrOrderStatus(prediction.OrderStatusOpen),
		Page:     1,
		PageSize: 50,
	})
	if err != nil {
		return fmt.Errorf("list open: %w", err)
	}

	// Decide what we already have at the target prices vs. what's drifted.
	hasGoodYesBid := false
	hasGoodNoBid := false
	for _, o := range open {
		if o.PricePoints == nil {
			continue
		}
		drift := *o.PricePoints - bidYesPrice
		if drift < 0 {
			drift = -drift
		}
		switch o.Side {
		case prediction.OrderSideYes:
			if drift <= s.cfg.MaxDriftPoints {
				hasGoodYesBid = true
				continue
			}
			// Drifted too far — cancel.
			if cerr := s.svc.CancelOrder(ctx, o.ID, s.cfg.UserID); cerr != nil {
				slog.Warn("smm: cancel stale yes bid failed",
					"order_id", o.ID, "error", cerr)
			}
		case prediction.OrderSideNo:
			driftNo := *o.PricePoints - bidNoComplementary
			if driftNo < 0 {
				driftNo = -driftNo
			}
			if driftNo <= s.cfg.MaxDriftPoints {
				hasGoodNoBid = true
				continue
			}
			if cerr := s.svc.CancelOrder(ctx, o.ID, s.cfg.UserID); cerr != nil {
				slog.Warn("smm: cancel stale no bid failed",
					"order_id", o.ID, "error", cerr)
			}
		}
	}

	// Position-cap check before posting fresh quotes. Phase 2.1 risk
	// control — bounds the worst-case loss on any one market regardless
	// of volatility or P&L. A Buy YES limit that fills via secondary
	// match grows the bot's YES inventory; a Buy NO limit that fills
	// via complementary issuance grows NO inventory. If either side is
	// already at MaxPositionQty, skip posting on that side.
	//
	// MaxPositionQty=0 disables the check entirely (Phase 1 behaviour).
	yesPosQty, noPosQty := s.botPositionQtys(ctx, m.ID)
	yesCapped := s.cfg.MaxPositionQty > 0 && yesPosQty >= s.cfg.MaxPositionQty
	noCapped := s.cfg.MaxPositionQty > 0 && noPosQty >= s.cfg.MaxPositionQty

	// Post fresh orders where needed. Depth converts cents → shares at
	// the order's limit price: $50 at 60c = 83 shares. Floor to whole.
	if !hasGoodYesBid {
		if yesCapped {
			s.metrics.RecordSMMSkip(m.ID, "yes", "position_cap")
			slog.Info("smm: skip yes — position cap",
				"market", m.Ticker, "position", yesPosQty, "cap", s.cfg.MaxPositionQty)
		} else {
			qty := int(s.cfg.DepthPoints / int64(bidYesPrice))
			if qty > 0 {
				if err := s.placeBuyLimit(ctx, m.ID, prediction.OrderSideYes, bidYesPrice, qty); err != nil {
					slog.Warn("smm: place yes bid failed",
						"market", m.Ticker, "price", bidYesPrice, "qty", qty, "error", err)
				}
			}
		}
	}
	if !hasGoodNoBid {
		if noCapped {
			s.metrics.RecordSMMSkip(m.ID, "no", "position_cap")
			slog.Info("smm: skip no — position cap",
				"market", m.Ticker, "position", noPosQty, "cap", s.cfg.MaxPositionQty)
		} else {
			qty := int(s.cfg.DepthPoints / int64(bidNoComplementary))
			if qty > 0 {
				if err := s.placeBuyLimit(ctx, m.ID, prediction.OrderSideNo, bidNoComplementary, qty); err != nil {
					slog.Warn("smm: place no bid failed",
						"market", m.Ticker, "price", bidNoComplementary, "qty", qty, "error", err)
				}
			}
		}
	}
	return nil
}

// botPositionQtys returns the SMM's current YES and NO holdings on the
// given market. Best-effort: a load failure returns (0, 0), which
// effectively disables the cap for this tick rather than blocking the
// bot. Logged so on-call sees repeated failures.
func (s *SMM) botPositionQtys(ctx context.Context, marketID string) (yes int, no int) {
	yesPos, err := s.repo.GetPosition(ctx, s.cfg.UserID, marketID, prediction.OrderSideYes)
	if err == nil && yesPos != nil {
		yes = yesPos.Quantity
	} else if err != nil && !errors.Is(err, sql.ErrNoRows) {
		// sql.ErrNoRows simply means the bot holds no YES position on this
		// market yet — the common case on cold markets, not a failure. Only
		// a real load error is worth a warning.
		slog.Warn("smm: get yes position failed", "market_id", marketID, "error", err)
	}
	noPos, err := s.repo.GetPosition(ctx, s.cfg.UserID, marketID, prediction.OrderSideNo)
	if err == nil && noPos != nil {
		no = noPos.Quantity
	} else if err != nil && !errors.Is(err, sql.ErrNoRows) {
		slog.Warn("smm: get no position failed", "market_id", marketID, "error", err)
	}
	return yes, no
}

// placeBuyLimit posts one buy-limit order for the bot. Idempotency-Key
// is deterministic per (market, side, price, tick-bucket) so a retry of
// the same tick doesn't double-place — the bucket changes once per
// interval, so the next tick gets a fresh key.
func (s *SMM) placeBuyLimit(ctx context.Context, marketID string, side prediction.OrderSide, pricePoints, qty int) error {
	bucket := time.Now().Unix() / int64(s.cfg.TickInterval.Seconds())
	idem := fmt.Sprintf("smm:%s:%s:%s:%d:%d", s.cfg.UserID, marketID, side, pricePoints, bucket)
	req := prediction.PlaceOrderRequest{
		MarketID:        marketID,
		Side:            side,
		Action:          prediction.OrderActionBuy,
		OrderType:       prediction.OrderTypeLimit,
		PricePoints:     &pricePoints,
		Quantity:        qty,
		TimeInForce:     prediction.TIFGTC,
		PostOnly:        true,                            // never cross with a taker order
		SelfMatchAction: prediction.SelfMatchCancelTaker, // safe default
		IdempotencyKey:  &idem,                           // flows through req field on the API
	}
	_, _, err := s.svc.PlaceOrder(ctx, req, s.cfg.UserID)
	if err != nil {
		return err
	}
	return nil
}

// cancelAllBotOrders sweeps the SMM's open orders on order_book markets
// and cancels each. Used on startup + shutdown.
func (s *SMM) cancelAllBotOrders(ctx context.Context) error {
	open, _, err := s.repo.ListOrders(ctx, prediction.OrderFilter{
		UserID:   s.cfg.UserID,
		Status:   ptrOrderStatus(prediction.OrderStatusOpen),
		Page:     1,
		PageSize: 1000,
	})
	if err != nil {
		return err
	}
	if len(open) == 0 {
		return nil
	}
	slog.Info("smm: cancelling existing open orders", "count", len(open))
	var firstErr error
	for _, o := range open {
		if err := s.svc.CancelOrder(ctx, o.ID, s.cfg.UserID); err != nil {
			if firstErr == nil {
				firstErr = err
			}
			slog.Warn("smm: cancel failed", "order_id", o.ID, "error", err)
		}
	}
	if firstErr != nil {
		return errors.New("one or more cancels failed; see warnings above")
	}
	return nil
}

func ptrStr(s string) *string                                         { return &s }
func ptrOrderStatus(s prediction.OrderStatus) *prediction.OrderStatus { return &s }
