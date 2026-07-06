package main

import (
	"context"
	"fmt"
	"math/rand"

	"taptrade/gateway/internal/prediction"
)

// Phase 4 places 12 market BUY orders for the demo user (u-1) across
// open order-book markets, mixing YES and NO sides and spreading across
// categories. Orders match against the resting bot bids (Phase 1), so each one
// produces a fill and a position row. Legacy AMM markets remain quote-only and
// are intentionally skipped.
//
// PnL diversity comes for free: Phase 2 has already moved order_book
// prices via 870+ taker fills, so by the time Phase 4 runs the demo
// user's entry prices will differ from the current market mid. The
// portfolio page's PnL display ((current_price - avg_price) * qty)
// will read non-zero on every position.
const (
	phase4OrderCount = 12
	phase4QtyMin     = 5
	phase4QtyMax     = 30
)

// phase4Plan is the deterministic set of (market_ticker_prefix, side) tuples
// the demo user buys. Tickers are matched by prefix because some markets'
// IDs are stable but their tickers may be regenerated; matching the prefix
// lets the seed survive minor seed-data edits.
//
// Mix: 8 YES, 4 NO. Spread across politics (SENATE, HOUSE), esports
// (VAL), sports (UCL), entertainment (AVATAR3), tech (GPT5, APPLE-LLM),
// and economics (FED, US-RECESSION).
var phase4Plan = []struct {
	tickerPrefix string
	side         prediction.OrderSide
}{
	{"SENATE-DEM-2026", prediction.OrderSideYes},
	{"HOUSE-DEM-2026", prediction.OrderSideYes},
	{"SENATE-GOP-2026", prediction.OrderSideNo},
	{"GPT5-JUL26", prediction.OrderSideYes},
	{"APPLE-LLM-2026", prediction.OrderSideYes},
	{"VAL-MASTERS-FINAL", prediction.OrderSideYes},
	{"FED-HOLD-MAY26", prediction.OrderSideNo},
	{"UCL-REAL", prediction.OrderSideYes},
	{"UCL-CITY", prediction.OrderSideNo},
	{"UCL-BARCA", prediction.OrderSideYes},
	{"AVATAR3-200M", prediction.OrderSideYes},
	{"FED-CUT-MAY", prediction.OrderSideYes},
	{"US-RECESSION-2026", prediction.OrderSideNo},
}

// RunPhase4DemoUser places the demo user's 12 portfolio positions. Tickers
// not found in the open market set are silently skipped — phase4Plan is a
// best-effort wish list, not a hard contract.
func RunPhase4DemoUser(ctx context.Context, h *Harness) (*PhaseStats, error) {
	stats := &PhaseStats{}
	statusOpen := prediction.MarketStatusOpen
	markets, _, err := h.Repo.ListMarkets(ctx, prediction.MarketFilter{
		Status:   &statusOpen,
		Page:     1,
		PageSize: 1000,
	})
	if err != nil {
		return stats, fmt.Errorf("list markets: %w", err)
	}

	// Index markets by ticker prefix → first match wins. Deterministic
	// because ListMarkets returns by created_at ordering.
	byPrefix := make(map[string]*prediction.Market)
	for i := range markets {
		m := &markets[i]
		if m.ExecutionMode != prediction.ExecutionModeOrderBook {
			continue
		}
		for _, p := range phase4Plan {
			if _, ok := byPrefix[p.tickerPrefix]; ok {
				continue
			}
			if startsWith(m.Ticker, p.tickerPrefix) {
				byPrefix[p.tickerPrefix] = m
				break
			}
		}
	}

	rng := rand.New(rand.NewSource(42)) // deterministic qty rolls

	for i, entry := range phase4Plan {
		m, ok := byPrefix[entry.tickerPrefix]
		if !ok {
			stats.OrdersSkipped++
			continue
		}
		qty := phase4QtyMin + rng.Intn(phase4QtyMax-phase4QtyMin+1)
		notionalCap := int64(qty * 100)
		idemKey := fmt.Sprintf("demo:phase4:slot%d:%s", i, m.ID)

		req := prediction.PlaceOrderRequest{
			MarketID:         m.ID,
			Side:             entry.side,
			Action:           prediction.OrderActionBuy,
			OrderType:        prediction.OrderTypeMarket,
			Quantity:         qty,
			IdempotencyKey:   &idemKey,
			TimeInForce:      prediction.TIFIOC,
			NotionalCapCents: &notionalCap,
		}
		if _, _, err := h.Service.PlaceOrder(ctx, req, demoUserID); err != nil {
			stats.Errors++
			fmt.Printf("    [phase4] %s %s qty=%d err: %v\n", m.Ticker, entry.side, qty, err)
			continue
		}
		stats.OrdersPlaced++
		stats.MarketsTouched++
	}
	return stats, nil
}

func startsWith(s, prefix string) bool {
	if len(s) < len(prefix) {
		return false
	}
	return s[:len(prefix)] == prefix
}
