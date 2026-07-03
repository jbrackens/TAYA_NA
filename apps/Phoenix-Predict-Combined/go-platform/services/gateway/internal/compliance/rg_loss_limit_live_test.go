package compliance

import (
	"context"
	"database/sql"
	"errors"
	"os"
	"testing"

	_ "github.com/lib/pq"
)

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

	// Upsert on (user, period): updates in place, no duplicate.
	if err := svc.SetLossLimit(ctx, "u-loss-1", "daily", 8000); err != nil {
		t.Fatalf("upsert: %v", err)
	}
	limits, _ = svc.GetLossLimits(ctx, "u-loss-1")
	if len(limits) != 1 || limits[0].LimitCents != 8000 {
		t.Fatalf("upsert should update in place to 8000: %+v", limits)
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
