package main

import (
	"context"
	"database/sql"
	"fmt"
	"math/rand"
	"time"

	"taptrade/gateway/internal/prediction"
)

// Phase 2 generates historical trading volume on a sample of order_book
// markets. Each trade is a real Service.PlaceOrder market BUY by one of
// alice/bob/charlie, sized small, alternating YES and NO across iterations.
// The trades match against bot bids (placed in Phase 1) via issuance —
// in a binary exchange, a taker BUY of YES + bot's resting NO bid pair
// up to create YES+NO contracts at total collateral 100¢.
//
// After each successful Service.PlaceOrder, the resulting trade rows get
// their traded_at column backdated to a random timestamp within the
// last 30 days. This makes the chart endpoint (which reads traded_at
// for price-history synthesis) produce non-flat curves over real time
// windows. Service writes traded_at = NOW() and doesn't expose a clock
// injection, so a post-hoc SQL UPDATE is the seam.
//
// Determinism: rand.NewSource(market-index-based seed) so re-runs produce
// the same trade pattern. Per-trade idempotency_key encodes the market
// + sequence number so Service.PlaceOrder dedupes on re-run.
const (
	phase2MarketSample = 30
	phase2MinTrades    = 20
	phase2MaxTrades    = 40
	phase2MinQty       = 1
	phase2MaxQty       = 10
)

// RunPhase2Volume picks 30 open order_book markets deterministically,
// generates 20-40 trades per market, and backdates each resulting trade
// across the last 30 days.
func RunPhase2Volume(ctx context.Context, h *Harness, db *sql.DB) (*PhaseStats, error) {
	stats := &PhaseStats{}
	statusOpen := prediction.MarketStatusOpen
	markets, _, err := h.Repo.ListMarkets(ctx, prediction.MarketFilter{
		Status:   &statusOpen,
		Page:     1,
		PageSize: 1000,
		// Demo seeding is ops tooling, not a public surface: keep
		// launch-scrubbed markets visible so behavior matches pre-filter runs.
		IncludeLaunchScrubbed: true,
	})
	if err != nil {
		return stats, fmt.Errorf("list markets: %w", err)
	}

	// Filter to order_book markets. AMM markets have their own price
	// movement via the LMSR engine and don't need synthetic volume —
	// and they don't have a book to fill against either.
	var orderBook []prediction.Market
	for _, m := range markets {
		if m.ExecutionMode == prediction.ExecutionModeOrderBook {
			orderBook = append(orderBook, m)
		}
	}
	if len(orderBook) == 0 {
		return stats, nil
	}

	// Deterministic market selection. RNG seeded by market count so the
	// sample is stable across runs given the same DB shape.
	sampleRng := rand.New(rand.NewSource(int64(len(orderBook))))
	sampleRng.Shuffle(len(orderBook), func(i, j int) {
		orderBook[i], orderBook[j] = orderBook[j], orderBook[i]
	})
	if len(orderBook) > phase2MarketSample {
		orderBook = orderBook[:phase2MarketSample]
	}

	takers := []string{demoTakerUserID1, demoTakerUserID2, demoTakerUserID3}

	for i := range orderBook {
		m := &orderBook[i]
		placed := generateMarketVolume(ctx, h, db, m, takers)
		stats.MarketsTouched++
		stats.OrdersPlaced += placed.placed
		stats.Errors += placed.errors
	}
	return stats, nil
}

type volumeResult struct {
	placed int
	errors int
}

// generateMarketVolume runs the per-market trade loop. Each iteration:
//  1. Pick a taker (round-robin across alice/bob/charlie)
//  2. Pick a side (alternating YES/NO so both halves of the book absorb fills)
//  3. Pick a quantity (deterministic random in [phase2MinQty, phase2MaxQty])
//  4. Submit a market BUY with notional cap = qty × 100¢ (worst-case spend)
//  5. If the trade went through, backdate its trade row's traded_at
//
// Returns placed/error counts. One bad trade does not abort the loop —
// thin books or zero-liquidity edge cases shouldn't blow up the seed.
func generateMarketVolume(ctx context.Context, h *Harness, db *sql.DB, m *prediction.Market, takers []string) volumeResult {
	r := volumeResult{}
	mrng := rand.New(rand.NewSource(hashMarketID(m.ID)))
	tradeCount := phase2MinTrades + mrng.Intn(phase2MaxTrades-phase2MinTrades+1)

	for seq := 0; seq < tradeCount; seq++ {
		taker := takers[seq%len(takers)]
		side := prediction.OrderSideYes
		if seq%2 == 1 {
			side = prediction.OrderSideNo
		}
		qty := phase2MinQty + mrng.Intn(phase2MaxQty-phase2MinQty+1)
		// Notional cap is worst-case 100¢ per share; the engine will fill
		// at the actual mid price and reject anything that would breach
		// the cap. Using 100¢ ceiling means no fill ever fails on cap.
		notionalCap := int64(qty * 100)

		idemKey := fmt.Sprintf("demo:phase2:%s:seq%d", m.ID, seq)
		req := prediction.PlaceOrderRequest{
			MarketID:          m.ID,
			Side:              side,
			Action:            prediction.OrderActionBuy,
			OrderType:         prediction.OrderTypeMarket,
			Quantity:          qty,
			IdempotencyKey:    &idemKey,
			TimeInForce:       prediction.TIFIOC,
			NotionalCapPoints: &notionalCap,
		}
		order, _, err := h.Service.PlaceOrder(ctx, req, taker)
		if err != nil {
			r.errors++
			continue
		}
		r.placed++

		// Backdate trades produced by this order, so chart history has
		// timestamps spread across the last 30 days rather than clustered
		// at NOW. The seq value drives a deterministic offset in days
		// (1..30) and a random offset in seconds within that day.
		daysAgo := 1 + (seq * 30 / tradeCount) // 1..30
		secsOffset := mrng.Intn(86400)
		when := time.Now().Add(-time.Duration(daysAgo)*24*time.Hour - time.Duration(secsOffset)*time.Second)
		if err := backdateTradesForOrder(db, order.ID, when); err != nil {
			// Log but do not increment errors — the trade itself succeeded,
			// only the backdating fudge failed.
			fmt.Printf("    [phase2] %s backdate err: %v\n", m.Ticker, err)
		}
	}
	return r
}

// backdateTradesForOrder rewrites traded_at on every trade row produced
// by the order — including the maker's complementary trade in an
// issuance pair. The "single order" the taker submitted matches against
// a maker's resting order; both sides write a row to prediction_trades
// keyed on the same match_id. Updating by match_id catches both halves
// so the trade history shows a coherent timestamp on each side. Also
// updates the taker order's created_at + filled_at so the orders
// endpoint sees coherent timestamps when paginating "recent activity".
func backdateTradesForOrder(db *sql.DB, orderID string, when time.Time) error {
	if _, err := db.Exec(`
		UPDATE prediction_trades
		   SET traded_at = $1
		 WHERE match_id IN (
		   SELECT match_id FROM prediction_trades
		   WHERE buy_order_id = $2 OR sell_order_id = $2
		 )
	`, when, orderID); err != nil {
		return err
	}
	_, err := db.Exec(`
		UPDATE prediction_orders
		   SET created_at = $1, filled_at = $1
		 WHERE id = $2
	`, when, orderID)
	return err
}

// hashMarketID derives a stable int64 seed from a UUID string so each
// market gets a different RNG stream but the stream is reproducible.
func hashMarketID(id string) int64 {
	var h int64
	for i := 0; i < len(id); i++ {
		h = h*1099511628211 + int64(id[i])
	}
	return h
}
