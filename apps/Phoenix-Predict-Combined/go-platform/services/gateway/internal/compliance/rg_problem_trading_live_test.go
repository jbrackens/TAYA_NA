package compliance

import (
	"context"
	"database/sql"
	"os"
	"testing"

	_ "github.com/lib/pq"
)

// TestPostgresProblemTradingFlagLive (GAP-39) exercises the problem-trading
// marker end-to-end on Postgres: the ensureSchema ALTERs create the columns, a
// flag round-trips through GetPlayerRestrictions with reason/who/when, and
// clearing nulls the marker. Opt-in: RG_LIVE_DSN.
func TestPostgresProblemTradingFlagLive(t *testing.T) {
	dsn := os.Getenv("RG_LIVE_DSN")
	if dsn == "" {
		t.Skip("RG_LIVE_DSN not set; skipping live Postgres problem-trading test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()
	svc, err := NewPostgresResponsibleGamblingService(db)
	if err != nil {
		t.Fatalf("init (ensureSchema): %v", err)
	}
	ctx := context.Background()
	const user = "u-problemflag-1"
	_, _ = db.Exec(`DELETE FROM player_restrictions WHERE user_id = $1`, user)

	// Unflagged by default.
	if r, err := svc.GetPlayerRestrictions(ctx, user); err != nil || r.ProblemTradingFlag {
		t.Fatalf("default must be unflagged: %+v err=%v", r, err)
	}

	// Flag with a reason + actor.
	if err := svc.SetProblemTradingFlag(ctx, user, true, "chasing losses", "admin-42"); err != nil {
		t.Fatalf("set flag: %v", err)
	}
	r, err := svc.GetPlayerRestrictions(ctx, user)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if !r.ProblemTradingFlag || r.ProblemTradingReason != "chasing losses" ||
		r.ProblemTradingFlaggedBy != "admin-42" || r.ProblemTradingFlaggedAt == "" {
		t.Fatalf("flag not persisted with evidence: %+v", r)
	}
	// The marker must NOT block trading (it is not self-exclusion).
	if r.IsExcluded || r.IsBlocked {
		t.Fatalf("problem-trading marker must not block trading: %+v", r)
	}

	// Clear nulls the marker.
	if err := svc.SetProblemTradingFlag(ctx, user, false, "", ""); err != nil {
		t.Fatalf("clear flag: %v", err)
	}
	r2, err := svc.GetPlayerRestrictions(ctx, user)
	if err != nil {
		t.Fatalf("get after clear: %v", err)
	}
	if r2.ProblemTradingFlag || r2.ProblemTradingReason != "" || r2.ProblemTradingFlaggedBy != "" {
		t.Fatalf("marker must be cleared: %+v", r2)
	}
}
