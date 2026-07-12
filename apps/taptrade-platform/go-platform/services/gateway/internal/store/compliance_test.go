package store

import (
	"context"
	"errors"
	"testing"

	"taptrade/gateway/internal/compliance"
)

// withRGLimits installs a responsible-play checker for one test and restores
// the nil default afterwards (package seams are process-global).
func withRGLimits(t *testing.T, svc compliance.ResponsibleGamblingService) {
	t.Helper()
	prev := RGLimits
	RGLimits = svc
	t.Cleanup(func() { RGLimits = prev })
}

// erringRG wraps the mock so CheckDepositAllowed fails with a non-denial
// error (checker outage), for the fail-open/fail-closed matrix.
type erringRG struct {
	compliance.ResponsibleGamblingService
}

func (erringRG) CheckDepositAllowed(context.Context, string, int64) (bool, string, error) {
	return false, "", errors.New("rg store unavailable")
}

// TestCheckoutDeniedOverDepositLimit — owner decision 2026-07-12: point-pack
// purchases count toward responsible-play deposit limits. A pack priced over
// the user's remaining limit must be refused BEFORE any purchase row exists.
func TestCheckoutDeniedOverDepositLimit(t *testing.T) {
	f := newFixture(t, Config{})
	rg := compliance.NewMockResponsibleGamblingService()
	withRGLimits(t, rg)
	if err := rg.SetDepositLimit(context.Background(), "u-limit", "daily", 1000); err != nil {
		t.Fatalf("set limit: %v", err)
	}

	// popular = $25.00 -> 2500 cents > 1000 limit.
	_, _, _, err := f.svc.CreateCheckout(context.Background(), "u-limit", "popular", "k-limit-1")
	if !errors.Is(err, ErrPurchaseLimit) {
		t.Fatalf("expected ErrPurchaseLimit, got %v", err)
	}
	// No purchase row may exist after a denial.
	rows, err := f.repo.PurchasesByUser(context.Background(), "u-limit", 10)
	if err != nil {
		t.Fatalf("list purchases: %v", err)
	}
	if len(rows) != 0 {
		t.Fatalf("denied checkout must not create a purchase, got %d rows", len(rows))
	}

	// starter = $5.00 -> 500 cents, within the limit.
	if _, _, _, err := f.svc.CreateCheckout(context.Background(), "u-limit", "starter", "k-limit-2"); err != nil {
		t.Fatalf("within-limit checkout should pass: %v", err)
	}
}

// TestFulfillmentRecordsSpendExactlyOnce — the first completion consumes
// limit headroom; confirmation replays must not consume it again. Proven via
// limit math on the real mock: limit 1000, starter=500. After one recorded
// fulfillment a further 500 must still be allowed (500+500 = limit); a
// double-record would push tracking to 1000 and deny it.
func TestFulfillmentRecordsSpendExactlyOnce(t *testing.T) {
	f := newFixture(t, Config{})
	rg := compliance.NewMockResponsibleGamblingService()
	withRGLimits(t, rg)
	if err := rg.SetDepositLimit(context.Background(), "u-rec", "daily", 1000); err != nil {
		t.Fatalf("set limit: %v", err)
	}

	purchase := checkoutSuccess(t, f, "u-rec", "starter", "k-rec-1")
	if _, already, err := f.svc.Confirm(context.Background(), purchase, "success"); err != nil || already {
		t.Fatalf("first confirm: already=%v err=%v", already, err)
	}
	// Replay: idempotent no-op, must not re-record.
	current, err := f.svc.Purchase(context.Background(), purchase.ID)
	if err != nil {
		t.Fatalf("reload purchase: %v", err)
	}
	if _, already, err := f.svc.Confirm(context.Background(), current, "success"); err != nil || !already {
		t.Fatalf("replay confirm should be alreadyFulfilled, got already=%v err=%v", already, err)
	}

	allowed, reason, err := rg.CheckDepositAllowed(context.Background(), "u-rec", 500)
	if err != nil || !allowed {
		t.Fatalf("second 500 within the 1000 limit should be allowed after ONE recorded spend; allowed=%v reason=%q err=%v (double-record suspected)", allowed, reason, err)
	}
}

// TestFailedAndCanceledOutcomesRecordNothing — only completed purchases
// consume limit headroom.
func TestFailedAndCanceledOutcomesRecordNothing(t *testing.T) {
	f := newFixture(t, Config{})
	rg := compliance.NewMockResponsibleGamblingService()
	withRGLimits(t, rg)
	if err := rg.SetDepositLimit(context.Background(), "u-fail", "daily", 1000); err != nil {
		t.Fatalf("set limit: %v", err)
	}

	p1 := checkoutSuccess(t, f, "u-fail", "starter", "k-fail-1")
	if _, _, err := f.svc.Confirm(context.Background(), p1, "failure"); err != nil {
		t.Fatalf("fail confirm: %v", err)
	}
	p2 := checkoutSuccess(t, f, "u-fail", "starter", "k-fail-2")
	if _, _, err := f.svc.Confirm(context.Background(), p2, "cancel"); err != nil {
		t.Fatalf("cancel confirm: %v", err)
	}

	// Full headroom must remain: a 1000 spend is still allowed.
	allowed, reason, err := rg.CheckDepositAllowed(context.Background(), "u-fail", 1000)
	if err != nil || !allowed {
		t.Fatalf("failed/canceled purchases must not consume limit headroom; allowed=%v reason=%q err=%v", allowed, reason, err)
	}
}

// TestSelfExcludedUserCannotCheckout — exclusion blocks purchases outright.
func TestSelfExcludedUserCannotCheckout(t *testing.T) {
	f := newFixture(t, Config{})
	rg := compliance.NewMockResponsibleGamblingService()
	withRGLimits(t, rg)
	if err := rg.SetSelfExclusion(context.Background(), "u-excl", true); err != nil {
		t.Fatalf("self-exclude: %v", err)
	}
	_, _, _, err := f.svc.CreateCheckout(context.Background(), "u-excl", "starter", "k-excl-1")
	if !errors.Is(err, ErrPurchaseLimit) {
		t.Fatalf("self-excluded checkout should be refused, got %v", err)
	}
}

// TestCheckerOutageFailsClosedInDeployedEnvs — dev boots stay permissive,
// production/staging refuse checkout when the checker is unavailable.
func TestCheckerOutageFailsClosedInDeployedEnvs(t *testing.T) {
	withRGLimits(t, erringRG{compliance.NewMockResponsibleGamblingService()})

	dev := newFixture(t, Config{})
	if _, _, _, err := dev.svc.CreateCheckout(context.Background(), "u-out", "starter", "k-out-1"); err != nil {
		t.Fatalf("dev mode should fail open on checker outage: %v", err)
	}

	deployed := newFixture(t, Config{DeployedEnv: true})
	_, _, _, err := deployed.svc.CreateCheckout(context.Background(), "u-out", "starter", "k-out-2")
	if !errors.Is(err, ErrPurchaseLimit) {
		t.Fatalf("deployed env should fail closed on checker outage, got %v", err)
	}
}

// TestNilSeamsAreNoOps — without wiring, checkout and fulfillment behave
// exactly as before the responsible-play integration.
func TestNilSeamsAreNoOps(t *testing.T) {
	withRGLimits(t, nil)
	f := newFixture(t, Config{})
	purchase := checkoutSuccess(t, f, "u-nil", "popular", "k-nil-1")
	if _, already, err := f.svc.Confirm(context.Background(), purchase, "success"); err != nil || already {
		t.Fatalf("confirm with nil seams: already=%v err=%v", already, err)
	}
}
