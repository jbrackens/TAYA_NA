package surveillance

// Opt-in live test (SURV_LIVE_DSN): exercises the GAP-22 InsiderPatternDetector
// against seeded prediction_markets/prediction_trades. Skipped when unset, or
// when the DB has no seeded closed market / punters (same contract as the
// wash/spoof/collusion live tests — they attach synthetic trades to real seed
// rows rather than seeding the full market FK chain).

import (
	"context"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func TestInsiderPatternDetectorLive(t *testing.T) {
	db := liveDB(t)
	defer db.Close()
	ctx := context.Background()

	store, err := NewStore(db)
	if err != nil {
		t.Fatalf("store: %v", err)
	}

	// A closed market (past close_at) so the pre-close window is a fixed past
	// interval and the seeded trades have realistic timestamps.
	var marketID string
	var closeAt time.Time
	if err := db.QueryRowContext(ctx,
		`SELECT id, close_at FROM prediction_markets WHERE close_at < NOW() ORDER BY close_at DESC LIMIT 1`,
	).Scan(&marketID, &closeAt); err != nil {
		t.Skipf("no closed seeded market to attach synthetic trades to: %v", err)
	}

	rows, err := db.QueryContext(ctx, `SELECT id FROM punters LIMIT 2`)
	if err != nil {
		t.Skipf("punters query: %v", err)
	}
	var ids []string
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			t.Fatalf("scan punter: %v", err)
		}
		ids = append(ids, id)
	}
	rows.Close()
	if len(ids) < 2 {
		t.Skip("need at least two seeded punters")
	}
	bigBuyer, smallBuyer := ids[0], ids[1]

	insertLateBuy := func(buyer, seller string, qty int) {
		t.Helper()
		if _, err := db.ExecContext(ctx, `
INSERT INTO prediction_trades
  (market_id, buyer_id, seller_id, side, price_cents, quantity, is_amm_trade, traded_at,
   match_id, trade_kind, engine_kind)
VALUES ($1, $2, $3, 'yes', 60, $4, false, $5::timestamptz - INTERVAL '20 minutes',
   gen_random_uuid(), 'secondary', 'clob')`, marketID, buyer, seller, qty, closeAt); err != nil {
			t.Fatalf("seed late buy: %v", err)
		}
	}

	// Positive: a large late accumulation (600 >= MinQty 500) 20m before close.
	insertLateBuy(bigBuyer, smallBuyer, 600)
	// Negative: a small late buy by the other account (10 < 500) must NOT trip.
	insertLateBuy(smallBuyer, bigBuyer, 10)

	// Window must reach back to the trades at (close_at - 20m).
	window := time.Since(closeAt) + time.Hour
	engine := NewEngine(store, db, InsiderPatternDetector{MinQty: 500, WindowMins: 60})
	results, err := engine.Scan(ctx, window)
	if err != nil {
		t.Fatalf("scan: %v", err)
	}
	if len(results) != 1 || results[0].Detector != "insider_pattern" {
		t.Fatalf("unexpected scan results: %+v", results)
	}
	if results[0].Found < 1 {
		t.Fatalf("expected the late accumulation to be flagged, got %+v", results[0])
	}

	alerts, err := store.ListAlerts(ctx, "open", 500, 0)
	if err != nil {
		t.Fatalf("list alerts: %v", err)
	}
	var flaggedBig, flaggedSmall bool
	for _, a := range alerts {
		if a.Kind != "insider_pattern" || a.MarketID != marketID {
			continue
		}
		if a.SubjectID == bigBuyer {
			flaggedBig = true
		}
		if a.SubjectID == smallBuyer {
			flaggedSmall = true
		}
	}
	if !flaggedBig {
		t.Fatalf("the large late accumulator %s was not flagged for market %s", bigBuyer, marketID)
	}
	if flaggedSmall {
		t.Fatalf("the small buyer %s (10 < MinQty) must not be flagged", smallBuyer)
	}

	// Re-scan is idempotent: no NEW inserts for the same day/window.
	results2, err := engine.Scan(ctx, window)
	if err != nil {
		t.Fatalf("re-scan: %v", err)
	}
	for _, r := range results2 {
		if r.Inserted != 0 {
			t.Fatalf("re-scan should insert nothing new, got %d", r.Inserted)
		}
	}
}
