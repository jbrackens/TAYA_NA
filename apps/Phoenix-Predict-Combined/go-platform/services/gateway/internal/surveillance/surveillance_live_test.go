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

	engine := NewEngine(store, db)
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
	if results2[0].Inserted != 0 {
		t.Fatalf("re-scan should insert nothing new, got %d", results2[0].Inserted)
	}
}
