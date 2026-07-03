package compliance

import (
	"context"
	"database/sql"
	"os"
	"testing"

	_ "github.com/lib/pq"
)

// TestPostgresBetLimitLoosenCooldownLive proves GAP-63 (PAM §13 Responsible
// Gaming, LC-19/D-11) for BET limits in the Postgres service: tightening a limit
// applies immediately; loosening is deferred behind pgLoosenCooldown while the
// current (tighter) limit still governs enforcement; and a matured pending is
// promoted to the active limit on read and on enforcement. Opt-in: set
// RG_LIVE_DSN to a scratch database.
func TestPostgresBetLimitLoosenCooldownLive(t *testing.T) {
	dsn := os.Getenv("RG_LIVE_DSN")
	if dsn == "" {
		t.Skip("RG_LIVE_DSN not set; skipping live Postgres RG loosen-cooldown test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()
	svc, err := NewPostgresResponsibleGamblingService(db)
	if err != nil {
		t.Fatalf("init (ensureSchema must add pending columns): %v", err)
	}
	ctx := context.Background()
	const u = "u-cooldown-1"
	for _, q := range []string{
		"DELETE FROM player_bet_limits WHERE user_id=$1",
		"DELETE FROM player_activity_log WHERE user_id=$1",
	} {
		if _, err := db.Exec(q, u); err != nil {
			t.Fatalf("reset: %v", err)
		}
	}

	betLimit := func() BetLimit {
		t.Helper()
		ls, err := svc.GetBetLimits(ctx, u)
		if err != nil {
			t.Fatalf("get: %v", err)
		}
		if len(ls) != 1 {
			t.Fatalf("want exactly 1 limit, got %d (%+v)", len(ls), ls)
		}
		return ls[0]
	}

	// 1) Initial set: no prior protection, so it takes effect immediately.
	if err := svc.SetBetLimit(ctx, u, "daily", 5000); err != nil {
		t.Fatalf("initial set: %v", err)
	}
	if l := betLimit(); l.LimitCents != 5000 || l.PendingLimitCents != 0 {
		t.Fatalf("initial: want active=5000 pending=0, got active=%d pending=%d", l.LimitCents, l.PendingLimitCents)
	}

	// 2) Tighten: applies immediately, no pending staged.
	if err := svc.SetBetLimit(ctx, u, "daily", 3000); err != nil {
		t.Fatalf("tighten: %v", err)
	}
	if l := betLimit(); l.LimitCents != 3000 || l.PendingLimitCents != 0 {
		t.Fatalf("tighten: want active=3000 pending=0, got active=%d pending=%d", l.LimitCents, l.PendingLimitCents)
	}

	// 3) Loosen: active stays 3000; the new 9000 is staged with a future activation.
	if err := svc.SetBetLimit(ctx, u, "daily", 9000); err != nil {
		t.Fatalf("loosen: %v", err)
	}
	if l := betLimit(); l.LimitCents != 3000 || l.PendingLimitCents != 9000 || l.PendingActivatesAt == "" {
		t.Fatalf("loosen: want active=3000 pending=9000 with activation ts, got active=%d pending=%d at=%q",
			l.LimitCents, l.PendingLimitCents, l.PendingActivatesAt)
	}

	// 4) Enforcement uses the ACTIVE (tighter) limit during the cooldown. Seed
	// 2000 of bet usage today: a further 2000 stake is 4000 > 3000 (deny) but
	// < 9000 (which would wrongly allow if the staged loosening applied early).
	if _, err := db.Exec(
		`INSERT INTO player_activity_log (user_id, activity_type, amount_cents, created_at) VALUES ($1,'bet',2000,NOW())`, u); err != nil {
		t.Fatalf("seed usage: %v", err)
	}
	if ok, reason, err := svc.CheckBetAllowed(ctx, u, 2000); err != nil || ok || reason != "daily_bet_limit_exceeded" {
		t.Fatalf("during cooldown the active 3000 limit must deny: ok=%v reason=%q err=%v", ok, reason, err)
	}
	if ok, reason, err := svc.CheckAndRecordBet(ctx, u, 2000); err != nil || ok || reason != "daily_bet_limit_exceeded" {
		t.Fatalf("atomic path must also deny under the active limit: ok=%v reason=%q err=%v", ok, reason, err)
	}

	// 5) Mature the pending (simulate the cooldown elapsing) → the 9000 limit is
	// now effective, so the same 4000 total is allowed, and a read promotes it.
	if _, err := db.Exec(
		`UPDATE player_bet_limits SET pending_activates_at = NOW() - INTERVAL '1 minute' WHERE user_id=$1 AND period='daily'`, u); err != nil {
		t.Fatalf("mature pending: %v", err)
	}
	if ok, reason, err := svc.CheckBetAllowed(ctx, u, 2000); err != nil || !ok {
		t.Fatalf("after maturation the 9000 limit applies (4000 total allowed): ok=%v reason=%q err=%v", ok, reason, err)
	}
	if l := betLimit(); l.LimitCents != 9000 || l.PendingLimitCents != 0 || l.PendingActivatesAt != "" {
		t.Fatalf("after maturation+read: want active=9000, pending cleared; got active=%d pending=%d at=%q",
			l.LimitCents, l.PendingLimitCents, l.PendingActivatesAt)
	}

	// 6) Re-requesting a higher limit while one is already staged re-arms the
	// window with the latest intent; the active limit does not jump early.
	if err := svc.SetBetLimit(ctx, u, "daily", 12000); err != nil {
		t.Fatalf("loosen again: %v", err)
	}
	if err := svc.SetBetLimit(ctx, u, "daily", 15000); err != nil {
		t.Fatalf("re-request higher: %v", err)
	}
	if l := betLimit(); l.LimitCents != 9000 || l.PendingLimitCents != 15000 {
		t.Fatalf("re-request: active stays 9000, pending re-armed to 15000; got active=%d pending=%d",
			l.LimitCents, l.PendingLimitCents)
	}
}

// TestPostgresDepositLimitLoosenCooldownLive proves GAP-63 slice 2 for DEPOSIT
// limits: the same loosen-cooldown semantics, enforced by CheckDepositAllowed.
// Opt-in: set RG_LIVE_DSN.
func TestPostgresDepositLimitLoosenCooldownLive(t *testing.T) {
	dsn := os.Getenv("RG_LIVE_DSN")
	if dsn == "" {
		t.Skip("RG_LIVE_DSN not set; skipping live Postgres RG deposit cooldown test")
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
	const u = "u-depcool-1"
	for _, q := range []string{
		"DELETE FROM player_deposit_limits WHERE user_id=$1",
		"DELETE FROM player_activity_log WHERE user_id=$1",
	} {
		if _, err := db.Exec(q, u); err != nil {
			t.Fatalf("reset: %v", err)
		}
	}
	depLimit := func() DepositLimit {
		t.Helper()
		ls, err := svc.GetDepositLimits(ctx, u)
		if err != nil {
			t.Fatalf("get: %v", err)
		}
		if len(ls) != 1 {
			t.Fatalf("want exactly 1 limit, got %d (%+v)", len(ls), ls)
		}
		return ls[0]
	}

	if err := svc.SetDepositLimit(ctx, u, "daily", 5000); err != nil { // initial
		t.Fatalf("initial: %v", err)
	}
	if err := svc.SetDepositLimit(ctx, u, "daily", 3000); err != nil { // tighten now
		t.Fatalf("tighten: %v", err)
	}
	if l := depLimit(); l.LimitCents != 3000 || l.PendingLimitCents != 0 {
		t.Fatalf("tighten: want active=3000 pending=0, got active=%d pending=%d", l.LimitCents, l.PendingLimitCents)
	}
	if err := svc.SetDepositLimit(ctx, u, "daily", 9000); err != nil { // loosen deferred
		t.Fatalf("loosen: %v", err)
	}
	if l := depLimit(); l.LimitCents != 3000 || l.PendingLimitCents != 9000 || l.PendingActivatesAt == "" {
		t.Fatalf("loosen: want active=3000 pending=9000 staged, got active=%d pending=%d at=%q",
			l.LimitCents, l.PendingLimitCents, l.PendingActivatesAt)
	}

	// Enforcement uses the active (3000) limit during the cooldown.
	if _, err := db.Exec(
		`INSERT INTO player_activity_log (user_id, activity_type, amount_cents, created_at) VALUES ($1,'deposit',2000,NOW())`, u); err != nil {
		t.Fatalf("seed usage: %v", err)
	}
	if ok, reason, err := svc.CheckDepositAllowed(ctx, u, 2000); err != nil || ok || reason != "daily_deposit_limit_exceeded" {
		t.Fatalf("during cooldown the active 3000 limit must deny: ok=%v reason=%q err=%v", ok, reason, err)
	}

	// Mature the pending → 9000 applies, the same 4000 total is allowed, read promotes.
	if _, err := db.Exec(
		`UPDATE player_deposit_limits SET pending_activates_at = NOW() - INTERVAL '1 minute' WHERE user_id=$1 AND period='daily'`, u); err != nil {
		t.Fatalf("mature: %v", err)
	}
	if ok, reason, err := svc.CheckDepositAllowed(ctx, u, 2000); err != nil || !ok {
		t.Fatalf("after maturation the 9000 limit applies (4000 allowed): ok=%v reason=%q err=%v", ok, reason, err)
	}
	if l := depLimit(); l.LimitCents != 9000 || l.PendingLimitCents != 0 || l.PendingActivatesAt != "" {
		t.Fatalf("after maturation+read: want active=9000 pending cleared, got active=%d pending=%d at=%q",
			l.LimitCents, l.PendingLimitCents, l.PendingActivatesAt)
	}
}
