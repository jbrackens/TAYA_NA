package compliance

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"testing"

	_ "github.com/lib/pq"
)

// skipIfMigratedPayouts skips a self-provisioning RG loss-limit live test when
// prediction_payouts already carries the full migration-014 schema — which has a
// NOT NULL settlement_id the tests' minimal 3-column INSERT cannot satisfy. These
// tests seed a minimal payouts shell and belong to the bare-DB compliance CI
// group (GAP-62); on a migrated DB they would fail on the settlement_id
// constraint, so skip gracefully. The loss-cooldown control itself is proven
// correct against the real schema by the migrated-DB suites. GAP-66.
func skipIfMigratedPayouts(t *testing.T, db *sql.DB) {
	t.Helper()
	var present bool
	if err := db.QueryRow(`
SELECT EXISTS (
  SELECT 1 FROM information_schema.columns
  WHERE table_name = 'prediction_payouts' AND column_name = 'settlement_id'
)`).Scan(&present); err != nil {
		t.Fatalf("payouts schema probe: %v", err)
	}
	if present {
		t.Skip("prediction_payouts carries the migrated schema (settlement_id NOT NULL); this self-provisioning test runs on the bare-DB compliance group")
	}
}

// Opt-in live test for the Postgres RG loss-limit storage (GAP-11): set
// RG_LIVE_DSN to a scratch database. Skipped when unset (CI, plain go test).
func TestPostgresLossLimitLive(t *testing.T) {
	dsn := os.Getenv("RG_LIVE_DSN")
	if dsn == "" {
		t.Skip("RG_LIVE_DSN not set; skipping live Postgres RG loss-limit test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()
	svc, err := NewPostgresResponsibleGamblingService(db)
	if err != nil {
		t.Fatalf("init (ensureSchema must create player_loss_limits): %v", err)
	}
	ctx := context.Background()
	if _, err := db.Exec("DELETE FROM player_loss_limits"); err != nil {
		t.Fatalf("reset (table should exist): %v", err)
	}

	// Set + read back.
	if err := svc.SetLossLimit(ctx, "u-loss-1", "daily", 5000); err != nil {
		t.Fatalf("set: %v", err)
	}
	limits, err := svc.GetLossLimits(ctx, "u-loss-1")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if len(limits) != 1 || limits[0].LimitCents != 5000 || limits[0].Period != "daily" {
		t.Fatalf("unexpected limits: %+v", limits)
	}
	if limits[0].ResetsAt == "" || limits[0].CreatedAt == "" {
		t.Fatalf("missing timestamps: %+v", limits[0])
	}

	// Upsert on (user, period): a TIGHTENING updates the row in place
	// immediately, with no duplicate. (A loosening is now deferred by the GAP-63
	// cooldown — that path is covered by TestPostgresLossLimitLoosenCooldownLive.)
	if err := svc.SetLossLimit(ctx, "u-loss-1", "daily", 2000); err != nil {
		t.Fatalf("upsert: %v", err)
	}
	limits, _ = svc.GetLossLimits(ctx, "u-loss-1")
	if len(limits) != 1 || limits[0].LimitCents != 2000 {
		t.Fatalf("tighten should update in place to 2000: %+v", limits)
	}

	// Invalid period rejected at the service (before the DB).
	if err := svc.SetLossLimit(ctx, "u-loss-1", "hourly", 100); !errors.Is(err, ErrInvalidLimitPeriod) {
		t.Fatalf("bad period: want ErrInvalidLimitPeriod, got %v", err)
	}
	// Non-positive amount is rejected by the table CHECK (limit_cents > 0).
	if err := svc.SetLossLimit(ctx, "u-loss-1", "weekly", 0); err == nil {
		t.Fatal("zero amount must be rejected by the CHECK constraint")
	}
}

// TestPostgresLossLimitEnforcementLive proves the enforcement path (GAP-11
// slice 2): CheckBetAllowed denies new orders once a period's NET realized loss
// reaches the cap, reading settled payouts read-only.
func TestPostgresLossLimitEnforcementLive(t *testing.T) {
	dsn := os.Getenv("RG_LIVE_DSN")
	if dsn == "" {
		t.Skip("RG_LIVE_DSN not set; skipping live Postgres RG loss enforcement test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()
	svc, err := NewPostgresResponsibleGamblingService(db)
	if err != nil {
		t.Fatalf("init: %v", err)
	}
	ctx := context.Background()

	skipIfMigratedPayouts(t, db)

	// Minimal prediction_payouts (the reader only needs user_id/pnl_cents/paid_at;
	// the real table — migration 014 — is richer, with FKs to settlement etc.).
	if _, err := db.Exec(`CREATE TABLE IF NOT EXISTS prediction_payouts (
  id BIGSERIAL PRIMARY KEY,
  user_id TEXT NOT NULL,
  pnl_cents BIGINT NOT NULL,
  paid_at TIMESTAMPTZ NOT NULL DEFAULT now()
)`); err != nil {
		t.Fatalf("create prediction_payouts: %v", err)
	}
	user := "u-lossenf-1"
	for _, stmt := range []struct {
		q    string
		args []any
	}{
		{"DELETE FROM player_loss_limits WHERE user_id=$1", []any{user}},
		{"DELETE FROM prediction_payouts WHERE user_id=$1", []any{user}},
	} {
		if _, err := db.Exec(stmt.q, stmt.args...); err != nil {
			t.Fatalf("reset: %v", err)
		}
	}

	seedPayout := func(pnl int64, ageDays int) {
		if _, err := db.Exec(
			`INSERT INTO prediction_payouts (user_id, pnl_cents, paid_at) VALUES ($1,$2, now() - ($3 || ' days')::interval)`,
			user, pnl, ageDays); err != nil {
			t.Fatalf("seed payout: %v", err)
		}
	}

	// Daily loss cap of 5000.
	if err := svc.SetLossLimit(ctx, user, "daily", 5000); err != nil {
		t.Fatalf("set loss limit: %v", err)
	}

	// No payouts → no realized loss → allowed.
	if ok, reason, err := svc.CheckBetAllowed(ctx, user, 100); err != nil || !ok {
		t.Fatalf("no loss should allow: ok=%v reason=%q err=%v", ok, reason, err)
	}

	// A -6000 payout today → net loss 6000 ≥ 5000 → DENIED with the loss reason.
	seedPayout(-6000, 0)
	ok, reason, err := svc.CheckBetAllowed(ctx, user, 100)
	if err != nil {
		t.Fatalf("over-loss check errored: %v", err)
	}
	if ok || reason != "daily_loss_limit_reached" {
		t.Fatalf("loss at/over cap must deny: ok=%v reason=%q", ok, reason)
	}

	// CRITICAL regression guard (verification #8): the LIVE order path prefers
	// the atomic CheckAndRecordBet, so the loss cap MUST deny there too — not
	// only in CheckBetAllowed. Before the fix this incorrectly returned allowed.
	if okA, reasonA, errA := svc.CheckAndRecordBet(ctx, user, 100); errA != nil || okA || reasonA != "daily_loss_limit_reached" {
		t.Fatalf("atomic path must also deny at the loss cap: ok=%v reason=%q err=%v", okA, reasonA, errA)
	}

	// A +2500 win today → net loss 3500 < 5000 → allowed again (both paths).
	seedPayout(2500, 0)
	if ok, reason, err := svc.CheckBetAllowed(ctx, user, 100); err != nil || !ok {
		t.Fatalf("net loss under cap should allow: ok=%v reason=%q err=%v", ok, reason, err)
	}
	if okA, _, errA := svc.CheckAndRecordBet(ctx, user, 100); errA != nil || !okA {
		t.Fatalf("atomic path should allow under the cap: ok=%v err=%v", okA, errA)
	}

	// An old -9000 loss from 3 days ago is OUTSIDE the daily period → ignored.
	seedPayout(-9000, 3)
	if ok, _, err := svc.CheckBetAllowed(ctx, user, 100); err != nil || !ok {
		t.Fatalf("out-of-period loss must not count: ok=%v err=%v", ok, err)
	}

	// GetLossLimits surfaces the current-period usage (net loss 3500 of 5000).
	limits, err := svc.GetLossLimits(ctx, user)
	if err != nil || len(limits) != 1 {
		t.Fatalf("get loss limits: %v (%d)", err, len(limits))
	}
	if limits[0].UsedCents != 3500 || limits[0].RemainingCents != 1500 {
		t.Fatalf("usage should be 3500 used / 1500 remaining, got %d/%d", limits[0].UsedCents, limits[0].RemainingCents)
	}
}
