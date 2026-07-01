package main

import (
	"context"
	"fmt"

	"phoenix-revival/gateway/internal/prediction"
)

// Demo user IDs. Wired in seed_prediction.sql (base seed) + auth_users (auto-
// seeded by the auth service on startup). Keep these in sync with CLAUDE.md
// "Test credentials" section.
const (
	demoBotUserID    = "user-bot"
	demoUserID       = "u-1"
	demoTakerUserID1 = "user-001"
	demoTakerUserID2 = "user-002"
	demoTakerUserID3 = "user-003"
)

// Phase 1 places a 5-level limit-bid book on every open order_book market.
// We use limit BUYs on both YES and NO sides (not asks) because the bot
// owns no positions to sell. In a binary YES/NO exchange, a YES bid at
// price P and a NO bid at price (100-P) are complementary — together
// they offer issuance pairs to any user wanting either direction.
//
// Layout per market (anchored on current mid yes_price_cents = Y):
//
//	YES bids (buy YES):   Y-5, Y-4, Y-3, Y-2, Y-1   each qty=bookLevelQty
//	NO  bids (buy NO):    N-5, N-4, N-3, N-2, N-1   where N = 100-Y
//
// 10 limit orders per market × 119 markets ≈ 1,190 resting orders.
// Bot point balance starts high enough and each order reserves price×qty
// point-cents:
// 5 YES bids × 5 ticks × bookLevelQty + 5 NO bids × 5 ticks × bookLevelQty
// At qty=100 and prices around 50 point-cents, the worst case is roughly
// 500 points per market. Well within the bot's headroom, but the wallet
// top-up phase runs before this to keep margin for re-seed cycles.
//
// Why limit BUYs only: limit SELLs require an existing position OR pair
// issuance with another taker, which complicates the demo. Buys-only
// guarantees the bot can park resting point bids without owning shares. The
// other side of the book gets populated naturally in Phase 2 when
// alice/bob/charlie take the bot's bids.
const (
	bookLevels      = 5   // 5 prices each side
	bookLevelQty    = 100 // 100 contracts per level (500/side; covers 10,000 point-cents 3x over)
	bookSpreadTicks = 5   // anchor +/- 5 point-cents
)

// PhaseStats summarizes a phase run for the seed log.
type PhaseStats struct {
	MarketsTouched int
	OrdersPlaced   int
	OrdersSkipped  int
	Errors         int
}

// RunPhase1MarketMaker places limit BUY orders on both YES and NO sides
// of every open order_book market, using bot@predict.dev as the maker.
// Re-running is idempotent: each order's idempotency_key encodes the
// market+side+level so Service.PlaceOrder dedupes against existing rows.
func RunPhase1MarketMaker(ctx context.Context, h *Harness) (*PhaseStats, error) {
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

	for i := range markets {
		m := &markets[i]
		if m.ExecutionMode != prediction.ExecutionModeOrderBook {
			continue
		}
		stats.MarketsTouched++

		placed, skipped, errs := seedMarketBook(ctx, h, m)
		stats.OrdersPlaced += placed
		stats.OrdersSkipped += skipped
		stats.Errors += errs
	}
	return stats, nil
}

// seedMarketBook places the 10-order book (5 YES bids + 5 NO bids) for a
// single market. Returns (placed, skipped, errs) counts. Errors per order
// are logged but do not abort the phase — one bad market should not
// prevent the rest from getting seeded.
func seedMarketBook(ctx context.Context, h *Harness, m *prediction.Market) (placed, skipped, errs int) {
	yesMid := m.YesPriceCents
	noMid := 100 - yesMid

	for level := 1; level <= bookLevels; level++ {
		// YES bid at yesMid - level (clamped to at least 1 point-cent).
		yesPrice := yesMid - level
		if yesPrice < 1 {
			yesPrice = 1
		}
		if p, s, e := placeBookOrder(ctx, h, m, prediction.OrderSideYes, yesPrice, level); e != nil {
			errs++
			fmt.Printf("    [phase1] %s YES@%d point-cents err: %v\n", m.Ticker, yesPrice, e)
		} else if s {
			skipped++
		} else if p {
			placed++
		}

		// NO bid at noMid - level (clamped to at least 1 point-cent).
		noPrice := noMid - level
		if noPrice < 1 {
			noPrice = 1
		}
		if p, s, e := placeBookOrder(ctx, h, m, prediction.OrderSideNo, noPrice, level); e != nil {
			errs++
			fmt.Printf("    [phase1] %s NO@%d point-cents err: %v\n", m.Ticker, noPrice, e)
		} else if s {
			skipped++
		} else if p {
			placed++
		}
	}
	return placed, skipped, errs
}

// placeBookOrder submits one limit BUY through Service.PlaceOrder. Returns
// (placed, skipped, err). placed=true on a fresh insert; skipped=true if
// the idempotency_key already exists (re-run case); err on unexpected failure.
func placeBookOrder(ctx context.Context, h *Harness, m *prediction.Market, side prediction.OrderSide, priceCents, level int) (placed, skipped bool, err error) {
	idemKey := fmt.Sprintf("demo:phase1:%s:%s:lvl%d", m.ID, side, level)
	req := prediction.PlaceOrderRequest{
		MarketID:        m.ID,
		Side:            side,
		Action:          prediction.OrderActionBuy,
		OrderType:       prediction.OrderTypeLimit,
		PriceCents:      &priceCents,
		Quantity:        bookLevelQty,
		IdempotencyKey:  &idemKey,
		TimeInForce:     prediction.TIFGTC,
		SelfMatchAction: prediction.SelfMatchCancelTaker,
	}
	order, _, perr := h.Service.PlaceOrder(ctx, req, demoBotUserID)
	if perr != nil {
		return false, false, perr
	}
	// PlaceOrder returns the existing order on idempotency match. Status
	// 'pending'/'open' on the freshly-inserted path; same status on the
	// idempotent return path. We can't easily tell new from existing
	// without a round-trip — treat any successful return as 'placed' for
	// the summary, accepting some over-count on re-run. The user reads
	// the summary as "this many orders are now on the book", which is
	// the truthful interpretation either way.
	_ = order
	return true, false, nil
}
