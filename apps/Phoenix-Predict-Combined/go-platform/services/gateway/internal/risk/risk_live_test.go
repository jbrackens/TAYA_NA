package risk

// Opt-in live test for the risk-rating store + engine: set RISK_LIVE_DSN to a
// scratch database. Skipped everywhere the env is unset (CI, plain `go test`).

import (
	"context"
	"database/sql"
	"fmt"
	"os"
	"testing"
	"time"

	_ "github.com/lib/pq"
)

// fakeFactorSource returns canned factors, so the engine is exercised without
// wiring the real AML/KYC readers (that adapter lands in a later slice).
type fakeFactorSource struct{ f Factors }

func (s fakeFactorSource) Gather(context.Context, string) (Factors, error) { return s.f, nil }

func TestRiskStoreAndEngineLive(t *testing.T) {
	dsn := os.Getenv("RISK_LIVE_DSN")
	if dsn == "" {
		t.Skip("RISK_LIVE_DSN not set; skipping live Postgres risk test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()
	store, err := NewStore(db)
	if err != nil {
		t.Fatalf("init (ensureSchema): %v", err)
	}
	ctx := context.Background()
	// Hermetic across container reuse.
	if _, err := db.Exec("DELETE FROM customer_risk_ratings"); err != nil {
		t.Fatalf("reset: %v", err)
	}
	subject := fmt.Sprintf("u-risk-%d", time.Now().UnixNano())

	// Unknown subject → ErrNotFound.
	if _, err := store.Get(ctx, subject); err != ErrNotFound {
		t.Fatalf("unknown subject: want ErrNotFound, got %v", err)
	}

	// Recompute with 120 AML points and a clear screen → high, score 120.
	eng := NewEngine(store, fakeFactorSource{Factors{AMLOpenAlertPoints: 120, ScreeningStatus: "clear"}}, DefaultBands())
	r, err := eng.Recompute(ctx, subject)
	if err != nil {
		t.Fatalf("recompute: %v", err)
	}
	if r.Tier != TierHigh || r.Score != 120 || r.EffectiveTier() != TierHigh {
		t.Fatalf("recompute high: got tier=%s score=%d eff=%s", r.Tier, r.Score, r.EffectiveTier())
	}
	if r.Factors.AMLOpenAlertPoints != 120 || r.Factors.ScreeningStatus != "clear" {
		t.Fatalf("factors not persisted: %+v", r.Factors)
	}

	// Apply a manual override directly (the admin path lands in a later slice),
	// then recompute with LOWER risk: the computed tier drops but the override is
	// preserved and remains the effective tier.
	if _, err := db.Exec(`UPDATE customer_risk_ratings
SET override_tier='prohibited', override_by='officer-1', override_reason='SAR filed', overridden_at=NOW()
WHERE subject_id=$1`, subject); err != nil {
		t.Fatalf("apply override: %v", err)
	}
	engLow := NewEngine(store, fakeFactorSource{Factors{AMLOpenAlertPoints: 0, ScreeningStatus: "clear"}}, DefaultBands())
	r2, err := engLow.Recompute(ctx, subject)
	if err != nil {
		t.Fatalf("recompute low: %v", err)
	}
	if r2.Tier != TierLow {
		t.Fatalf("computed tier should drop to low, got %s", r2.Tier)
	}
	if r2.OverrideTier != TierProhibited || r2.OverrideBy != "officer-1" {
		t.Fatalf("override must be preserved across recompute, got tier=%s by=%s", r2.OverrideTier, r2.OverrideBy)
	}
	if r2.EffectiveTier() != TierProhibited {
		t.Fatalf("effective tier must be the override, got %s", r2.EffectiveTier())
	}

	// List filters by EFFECTIVE tier: the subject is prohibited (via override),
	// so it appears under prohibited and NOT under its computed 'low'.
	proh, err := store.List(ctx, "prohibited", 100, 0)
	if err != nil {
		t.Fatalf("list prohibited: %v", err)
	}
	if !containsSubject(proh, subject) {
		t.Fatal("subject should be listed under its effective (override) prohibited tier")
	}
	low, err := store.List(ctx, "low", 100, 0)
	if err != nil {
		t.Fatalf("list low: %v", err)
	}
	if containsSubject(low, subject) {
		t.Fatal("subject must NOT be listed under its computed low tier while overridden")
	}
}

// TestRiskStoreOverrideLive exercises the real SetOverride/ClearOverride SQL
// (the route tests use a stub, so this is the only coverage of the upsert +
// clear paths and their validation).
func TestRiskStoreOverrideLive(t *testing.T) {
	dsn := os.Getenv("RISK_LIVE_DSN")
	if dsn == "" {
		t.Skip("RISK_LIVE_DSN not set; skipping live Postgres risk override test")
	}
	db, err := sql.Open("postgres", dsn)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	defer db.Close()
	store, err := NewStore(db)
	if err != nil {
		t.Fatalf("init: %v", err)
	}
	ctx := context.Background()
	if _, err := db.Exec("DELETE FROM customer_risk_ratings"); err != nil {
		t.Fatalf("reset: %v", err)
	}

	// SetOverride upserts even with NO prior computed rating (officer forces a
	// tier, e.g. after filing a SAR, before any recompute).
	fresh := fmt.Sprintf("u-ovr-%d", time.Now().UnixNano())
	if err := store.SetOverride(ctx, fresh, TierProhibited, "officer-1", "SAR filed"); err != nil {
		t.Fatalf("set override on fresh subject: %v", err)
	}
	got, err := store.Get(ctx, fresh)
	if err != nil {
		t.Fatalf("get after override: %v", err)
	}
	if got.EffectiveTier() != TierProhibited || got.OverrideBy != "officer-1" || got.OverrideReason != "SAR filed" {
		t.Fatalf("override not persisted: eff=%s by=%s reason=%q", got.EffectiveTier(), got.OverrideBy, got.OverrideReason)
	}
	// The computed tier still defaults low underneath the override.
	if got.Tier != TierLow {
		t.Fatalf("computed tier should default low, got %s", got.Tier)
	}

	// ClearOverride restores the computed tier as effective.
	if err := store.ClearOverride(ctx, fresh); err != nil {
		t.Fatalf("clear override: %v", err)
	}
	cleared, err := store.Get(ctx, fresh)
	if err != nil {
		t.Fatalf("get after clear: %v", err)
	}
	if ValidTier(cleared.OverrideTier) || cleared.EffectiveTier() != TierLow {
		t.Fatalf("override should be cleared, got override=%q eff=%s", cleared.OverrideTier, cleared.EffectiveTier())
	}

	// Clearing a subject with no rating → ErrNotFound.
	if err := store.ClearOverride(ctx, "nobody-here"); err != ErrNotFound {
		t.Fatalf("clear unknown: want ErrNotFound, got %v", err)
	}
	// Validation: bad tier, empty actor, empty reason all rejected.
	for _, bad := range []struct {
		tier         Tier
		by, reason   string
	}{
		{Tier("bogus"), "o", "r"},
		{TierHigh, "", "r"},
		{TierHigh, "o", "   "},
	} {
		if err := store.SetOverride(ctx, fresh, bad.tier, bad.by, bad.reason); err != ErrInvalidInput {
			t.Fatalf("SetOverride(%q,%q,%q): want ErrInvalidInput, got %v", bad.tier, bad.by, bad.reason, err)
		}
	}
}

func containsSubject(rs []Rating, subject string) bool {
	for _, r := range rs {
		if r.SubjectID == subject {
			return true
		}
	}
	return false
}
