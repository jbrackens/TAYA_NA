package surveillance

// Opt-in live test: set SURV_LIVE_DSN to a scratch database (the same schema
// the gateway migrations produce, so prediction_trades exists). Exercises the
// store round-trip, the wash-self-trade detector against seeded self-trades,
// idempotent re-scan, and the alert→case lifecycle. Skipped when unset.

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

func liveDB(t *testing.T) *sql.DB {
	t.Helper()
	dsn := os.Getenv("SURV_LIVE_DSN")
	if dsn == "" {
		t.Skip("SURV_LIVE_DSN not set; skipping live surveillance test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	return db
}

func TestSurveillanceStoreLive(t *testing.T) {
	db := liveDB(t)
	defer db.Close()
	ctx := context.Background()

	store, err := NewStore(db)
	if err != nil {
		t.Fatalf("store init: %v", err)
	}

	key := fmt.Sprintf("test-alert:%d", time.Now().UnixNano())
	inserted, err := store.InsertAlert(ctx, Alert{
		Kind: "wash_self_trade", Severity: "high", SubjectID: "u-live",
		Summary: "test", DedupeKey: key,
	})
	if err != nil || !inserted {
		t.Fatalf("first insert: inserted=%v err=%v", inserted, err)
	}
	// Idempotent: same dedupe key does not insert twice.
	again, err := store.InsertAlert(ctx, Alert{Kind: "wash_self_trade", SubjectID: "u-live", Summary: "test", DedupeKey: key})
	if err != nil || again {
		t.Fatalf("dedupe failed: again=%v err=%v", again, err)
	}

	alerts, err := store.ListAlerts(ctx, "open", 100, 0)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	var alertID int64
	for _, a := range alerts {
		if a.DedupeKey == key {
			alertID = a.ID
		}
	}
	if alertID == 0 {
		t.Fatal("inserted alert not found in open list")
	}

	// Case lifecycle: open from the alert, then require a resolution to close.
	c, err := store.OpenCase(ctx, "live test case", "high", "admin-live", []int64{alertID})
	if err != nil {
		t.Fatalf("open case: %v", err)
	}
	if c.AlertCount != 1 {
		t.Fatalf("expected 1 linked alert, got %d", c.AlertCount)
	}
	if _, err := store.UpdateCaseStatus(ctx, c.ID, "closed_action", ""); err != ErrResolutionRequired {
		t.Fatalf("expected ErrResolutionRequired, got %v", err)
	}
	closed, err := store.UpdateCaseStatus(ctx, c.ID, "closed_action", "confirmed wash trading, account restricted")
	if err != nil || closed.Status != "closed_action" {
		t.Fatalf("close case: status=%v err=%v", closed.Status, err)
	}
}

func TestWashDetectorLive(t *testing.T) {
	db := liveDB(t)
	defer db.Close()
	ctx := context.Background()

	store, err := NewStore(db)
	if err != nil {
		t.Fatalf("store init: %v", err)
	}

	// Seed a self-trade: same account as buyer and seller on a real market,
	// using the seeded punters/markets from the gateway seed. Look one up.
	var marketID string
	if err := db.QueryRowContext(ctx, `SELECT id FROM prediction_markets LIMIT 1`).Scan(&marketID); err != nil {
		t.Skipf("no seeded market to attach a synthetic trade to: %v", err)
	}
	var userID string
	if err := db.QueryRowContext(ctx, `SELECT id FROM punters LIMIT 1`).Scan(&userID); err != nil {
		t.Skipf("no seeded punter: %v", err)
	}

	// prediction_trades gained match_id/trade_kind/engine_kind (migration 019).
	// The detector reads none of them; the seed just has to satisfy NOT NULL.
	if _, err := db.ExecContext(ctx, `
INSERT INTO prediction_trades
  (market_id, buyer_id, seller_id, side, price_cents, quantity, is_amm_trade, traded_at,
   match_id, trade_kind, engine_kind)
VALUES ($1, $2, $2, 'yes', 50, 10, false, NOW(),
   gen_random_uuid(), 'secondary', 'clob')`, marketID, userID); err != nil {
		t.Fatalf("seed self-trade: %v", err)
	}

	// Isolate the wash detector so seeded spoof/collusion rows from other
	// live tests don't perturb this assertion.
	engine := NewEngine(store, db, WashSelfTradeDetector{})
	results, err := engine.Scan(ctx, time.Hour)
	if err != nil {
		t.Fatalf("scan: %v", err)
	}
	if len(results) != 1 || results[0].Detector != "wash_self_trade" {
		t.Fatalf("unexpected scan results: %+v", results)
	}
	if results[0].Found < 1 {
		t.Fatalf("expected the seeded self-trade to be found, got %+v", results[0])
	}

	// Re-scan is idempotent: no NEW inserts for the same window/day.
	results2, err := engine.Scan(ctx, time.Hour)
	if err != nil {
		t.Fatalf("re-scan: %v", err)
	}
	for _, r := range results2 {
		if r.Inserted != 0 {
			t.Fatalf("re-scan should insert nothing new for %s, got %d", r.Detector, r.Inserted)
		}
	}
}

func twoSeededPunters(t *testing.T, ctx context.Context, db *sql.DB) (string, string, string) {
	t.Helper()
	var marketID string
	if err := db.QueryRowContext(ctx, `SELECT id FROM prediction_markets LIMIT 1`).Scan(&marketID); err != nil {
		t.Skipf("no seeded market: %v", err)
	}
	rows, err := db.QueryContext(ctx, `SELECT id FROM punters LIMIT 2`)
	if err != nil {
		t.Skipf("punters query: %v", err)
	}
	defer rows.Close()
	ids := []string{}
	for rows.Next() {
		var id string
		if err := rows.Scan(&id); err != nil {
			t.Fatalf("scan punter: %v", err)
		}
		ids = append(ids, id)
	}
	if len(ids) < 2 {
		t.Skip("need at least two seeded punters")
	}
	return marketID, ids[0], ids[1]
}

func TestSpoofingDetectorLive(t *testing.T) {
	db := liveDB(t)
	defer db.Close()
	ctx := context.Background()
	if _, err := NewStore(db); err != nil {
		t.Fatalf("store: %v", err)
	}
	marketID, userID, _ := twoSeededPunters(t, ctx, db)

	// Seed 3 quick, unfilled, sizeable limit-order cancels.
	for i := 0; i < 3; i++ {
		if _, err := db.ExecContext(ctx, `
INSERT INTO prediction_orders
  (user_id, market_id, side, action, order_type, price_cents, quantity,
   filled_quantity, remaining_quantity, total_cost_cents, status,
   created_at, cancelled_at)
VALUES ($1, $2, 'yes', 'buy', 'limit', 50, 200, 0, 200, 10000, 'cancelled',
   NOW() - interval '30 seconds', NOW())`, userID, marketID); err != nil {
			t.Fatalf("seed spoof order: %v", err)
		}
	}

	results, err := SpoofingDetector{}.Scan(ctx, db, time.Now().Add(-time.Hour))
	if err != nil {
		t.Fatalf("spoof scan: %v", err)
	}
	found := false
	for _, a := range results {
		if a.SubjectID == userID && a.MarketID == marketID {
			found = true
		}
	}
	if !found {
		t.Fatalf("expected a spoofing alert for %s/%s, got %+v", userID, marketID, results)
	}
}

func TestCollusionDetectorLive(t *testing.T) {
	db := liveDB(t)
	defer db.Close()
	ctx := context.Background()
	_, err := NewStore(db)
	if err != nil {
		t.Fatalf("store: %v", err)
	}
	marketID, a, b := twoSeededPunters(t, ctx, db)

	insertTrade := func(buyer, seller string) {
		if _, err := db.ExecContext(ctx, `
INSERT INTO prediction_trades
  (market_id, buyer_id, seller_id, side, price_cents, quantity, is_amm_trade, traded_at,
   match_id, trade_kind, engine_kind)
VALUES ($1, $2, $3, 'yes', 50, 10, false, NOW(),
   gen_random_uuid(), 'secondary', 'clob')`, marketID, buyer, seller); err != nil {
			t.Fatalf("seed collusion trade: %v", err)
		}
	}
	// Two reversal pairs: a↔b then b↔a, twice.
	insertTrade(a, b)
	insertTrade(b, a)
	insertTrade(a, b)
	insertTrade(b, a)

	results, err := CollusionDetector{}.Scan(ctx, db, time.Now().Add(-time.Hour))
	if err != nil {
		t.Fatalf("collusion scan: %v", err)
	}
	if len(results) == 0 {
		t.Fatalf("expected a collusion alert for the %s/%s pair, got none", a, b)
	}
}
