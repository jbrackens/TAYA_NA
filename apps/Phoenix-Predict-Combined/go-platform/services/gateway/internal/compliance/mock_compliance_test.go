package compliance

import (
	"context"
	"testing"
	"time"
)

func TestMockGeoComplianceServiceUsesConfiguredApprovedCountries(t *testing.T) {
	t.Setenv("COMPLIANCE_GEO_APPROVED_COUNTRIES", "US,MT")
	t.Setenv("COMPLIANCE_GEO_SANDBOX_MODE", "")

	service := NewMockGeoComplianceServiceFromEnv()

	approved, err := service.IsLocationApproved(context.Background(), "MT", "")
	if err != nil {
		t.Fatalf("IsLocationApproved returned error: %v", err)
	}
	if !approved {
		t.Fatalf("expected MT to be approved from env configuration")
	}
}

func TestMockGeoComplianceServiceSandboxModeApprovesAnyLocation(t *testing.T) {
	t.Setenv("COMPLIANCE_GEO_SANDBOX_MODE", "true")
	t.Setenv("COMPLIANCE_GEO_SANDBOX_COUNTRY", "MT")
	t.Setenv("COMPLIANCE_GEO_SANDBOX_STATE", "MT-LOCAL")
	t.Setenv("COMPLIANCE_GEO_SANDBOX_CITY", "Valletta")

	service := NewMockGeoComplianceServiceFromEnv()

	result, err := service.VerifyLocation(context.Background(), "u-1", 35.8997, 14.5146)
	if err != nil {
		t.Fatalf("VerifyLocation returned error: %v", err)
	}
	if result.Status != "approved" {
		t.Fatalf("expected sandbox result approved, got %s", result.Status)
	}
	if result.Country != "MT" {
		t.Fatalf("expected sandbox country MT, got %s", result.Country)
	}
	if result.State != "MT-LOCAL" {
		t.Fatalf("expected sandbox state MT-LOCAL, got %s", result.State)
	}
	if result.City != "Valletta" {
		t.Fatalf("expected sandbox city Valletta, got %s", result.City)
	}
}

func TestMockResponsibleGamblingServiceDepositLimitTracksUsage(t *testing.T) {
	service := NewMockResponsibleGamblingService()
	ctx := context.Background()

	if err := service.SetDepositLimit(ctx, "u-1", "daily", 1000); err != nil {
		t.Fatalf("SetDepositLimit returned error: %v", err)
	}
	if err := service.RecordDeposit(ctx, "u-1", 100); err != nil {
		t.Fatalf("RecordDeposit returned error: %v", err)
	}

	limits, err := service.GetDepositLimits(ctx, "u-1")
	if err != nil {
		t.Fatalf("GetDepositLimits returned error: %v", err)
	}
	if len(limits) != 1 {
		t.Fatalf("expected 1 deposit limit, got %d", len(limits))
	}
	if limits[0].UsedCents != 100 {
		t.Fatalf("expected used cents 100, got %d", limits[0].UsedCents)
	}
	if limits[0].RemainingCents != 900 {
		t.Fatalf("expected remaining cents 900, got %d", limits[0].RemainingCents)
	}

	allowed, _, err := service.CheckDepositAllowed(ctx, "u-1", 901)
	if allowed {
		t.Fatal("expected deposit above remaining limit to be rejected")
	}
	if err != ErrDepositLimitExceeded {
		t.Fatalf("expected ErrDepositLimitExceeded, got %v", err)
	}
}

func TestMockResponsibleGamblingServiceBetLimitTracksUsage(t *testing.T) {
	service := NewMockResponsibleGamblingService()
	ctx := context.Background()

	if err := service.SetBetLimit(ctx, "u-1", "daily", 500); err != nil {
		t.Fatalf("SetBetLimit returned error: %v", err)
	}
	if err := service.RecordBet(ctx, "u-1", 125); err != nil {
		t.Fatalf("RecordBet returned error: %v", err)
	}

	limits, err := service.GetBetLimits(ctx, "u-1")
	if err != nil {
		t.Fatalf("GetBetLimits returned error: %v", err)
	}
	if len(limits) != 1 {
		t.Fatalf("expected 1 bet limit, got %d", len(limits))
	}
	if limits[0].UsedCents != 125 {
		t.Fatalf("expected used cents 125, got %d", limits[0].UsedCents)
	}
	if limits[0].RemainingCents != 375 {
		t.Fatalf("expected remaining cents 375, got %d", limits[0].RemainingCents)
	}

	allowed, _, err := service.CheckBetAllowed(ctx, "u-1", 376)
	if allowed {
		t.Fatal("expected bet above remaining limit to be rejected")
	}
	if err != ErrBetLimitExceeded {
		t.Fatalf("expected ErrBetLimitExceeded, got %v", err)
	}
}

// ReleaseBet must be the exact inverse of RecordBet (the reserve+reconcile
// model in D-5 codex P1 #2 depends on this), and must never drive usage
// negative even when a release has no matching prior record (e.g. an order
// placed before this accounting existed).
func TestMockResponsibleGamblingServiceReleaseBetReversesUsage(t *testing.T) {
	service := NewMockResponsibleGamblingService()
	ctx := context.Background()

	if err := service.SetBetLimit(ctx, "u-1", "daily", 5000); err != nil {
		t.Fatalf("SetBetLimit: %v", err)
	}
	// Commit 5000 at placement, then release the uncaptured remainder
	// (5000 committed − 190 captured = 4810). Net used must be 190.
	nowCommit := time.Now().UTC()
	if err := service.RecordBet(ctx, "u-1", 5000); err != nil {
		t.Fatalf("RecordBet: %v", err)
	}
	if err := service.ReleaseBet(ctx, "u-1", 4810, nowCommit); err != nil {
		t.Fatalf("ReleaseBet: %v", err)
	}
	limits, err := service.GetBetLimits(ctx, "u-1")
	if err != nil {
		t.Fatalf("GetBetLimits: %v", err)
	}
	if limits[0].UsedCents != 190 {
		t.Fatalf("net used after reserve+release: want 190, got %d", limits[0].UsedCents)
	}
	if limits[0].RemainingCents != 4810 {
		t.Fatalf("remaining after reserve+release: want 4810, got %d", limits[0].RemainingCents)
	}

	// Over-release / orphan release must clamp at zero, not go negative
	// (would otherwise hand the user free limit headroom).
	if err := service.ReleaseBet(ctx, "u-1", 99999, nowCommit); err != nil {
		t.Fatalf("ReleaseBet (over): %v", err)
	}
	limits, _ = service.GetBetLimits(ctx, "u-1")
	if limits[0].UsedCents != 0 {
		t.Fatalf("used must clamp at 0 after over-release, got %d", limits[0].UsedCents)
	}
	if limits[0].RemainingCents != 5000 {
		t.Fatalf("remaining must clamp at the limit after over-release, got %d", limits[0].RemainingCents)
	}
}

// D-7 (codex round-4 P1): changing a self-set limit must NOT clear the
// in-progress period's accumulated usage. Pre-fix, re-POSTing the same limit
// reset UsedCents to 0, so a user could consume the limit, re-set it, and
// get fresh headroom indefinitely (the self-service reset bypass — now
// cleanly reachable per-user after the D-6 session binding).
func TestMockSetBetLimit_RePostDoesNotResetAccumulatedUsage(t *testing.T) {
	service := NewMockResponsibleGamblingService()
	ctx := context.Background()

	if err := service.SetBetLimit(ctx, "u-1", "daily", 1000); err != nil {
		t.Fatalf("SetBetLimit: %v", err)
	}
	if err := service.RecordBet(ctx, "u-1", 800); err != nil {
		t.Fatalf("RecordBet: %v", err)
	}

	// The exploit: re-POST the SAME limit hoping usage resets to 0.
	if err := service.SetBetLimit(ctx, "u-1", "daily", 1000); err != nil {
		t.Fatalf("SetBetLimit (re-post): %v", err)
	}
	limits, _ := service.GetBetLimits(ctx, "u-1")
	if limits[0].UsedCents != 800 {
		t.Fatalf("re-POST must preserve accumulated usage: want used 800, got %d (reset bypass)", limits[0].UsedCents)
	}
	if limits[0].RemainingCents != 200 {
		t.Fatalf("want remaining 200 after re-POST, got %d", limits[0].RemainingCents)
	}
	if allowed, _, _ := service.CheckBetAllowed(ctx, "u-1", 900); allowed {
		t.Fatal("a 900 bet must still be blocked after a same-limit re-POST (reset bypass)")
	}

	// Raising the limit keeps usage; the user only gains the delta.
	if err := service.SetBetLimit(ctx, "u-1", "daily", 1500); err != nil {
		t.Fatalf("SetBetLimit (raise): %v", err)
	}
	limits, _ = service.GetBetLimits(ctx, "u-1")
	if limits[0].UsedCents != 800 || limits[0].RemainingCents != 700 {
		t.Fatalf("raise must keep used=800 and grant only the delta (remaining 700), got used=%d remaining=%d",
			limits[0].UsedCents, limits[0].RemainingCents)
	}

	// Lowering below accumulated usage → no remaining (RG restricts; never negative).
	if err := service.SetBetLimit(ctx, "u-1", "daily", 500); err != nil {
		t.Fatalf("SetBetLimit (lower): %v", err)
	}
	limits, _ = service.GetBetLimits(ctx, "u-1")
	if limits[0].UsedCents != 800 || limits[0].RemainingCents != 0 {
		t.Fatalf("lower below usage → used=800 remaining=0, got used=%d remaining=%d",
			limits[0].UsedCents, limits[0].RemainingCents)
	}
}

// D-7 (deposit limit shares the reset pattern).
func TestMockSetDepositLimit_RePostDoesNotResetAccumulatedUsage(t *testing.T) {
	service := NewMockResponsibleGamblingService()
	ctx := context.Background()

	if err := service.SetDepositLimit(ctx, "u-1", "daily", 1000); err != nil {
		t.Fatalf("SetDepositLimit: %v", err)
	}
	// Consume 600 of the deposit limit.
	if allowed, _, _ := service.CheckDepositAllowed(ctx, "u-1", 600); !allowed {
		t.Fatal("first 600 deposit should be allowed")
	}
	if err := service.RecordDeposit(ctx, "u-1", 600); err != nil {
		t.Fatalf("RecordDeposit: %v", err)
	}
	// Re-POST the same limit; usage must persist.
	if err := service.SetDepositLimit(ctx, "u-1", "daily", 1000); err != nil {
		t.Fatalf("SetDepositLimit (re-post): %v", err)
	}
	limits, _ := service.GetDepositLimits(ctx, "u-1")
	if limits[0].UsedCents != 600 || limits[0].RemainingCents != 400 {
		t.Fatalf("deposit re-POST must preserve usage: want used 600 remaining 400, got used=%d remaining=%d",
			limits[0].UsedCents, limits[0].RemainingCents)
	}
	if allowed, _, _ := service.CheckDepositAllowed(ctx, "u-1", 500); allowed {
		t.Fatal("a 500 deposit must still be blocked after a same-limit re-POST")
	}
}

// D-5 codex re-review round 3 (P1): a release from a cross-period cancel must
// NOT offset the current period's usage. A resting order placed in a prior
// period then cancelled today: its committed stake already aged out at the
// period reset, so reversing it now would wrongly free headroom for an
// unrelated bet placed today. committedAt < current period start ⇒ no-op.
func TestMockResponsibleGamblingServiceReleaseBet_CrossPeriodIsNoOp(t *testing.T) {
	service := NewMockResponsibleGamblingService()
	ctx := context.Background()

	if err := service.SetBetLimit(ctx, "u-1", "daily", 1000); err != nil {
		t.Fatalf("SetBetLimit: %v", err)
	}
	// Today's real bet: 1000 (the user has now used their whole daily limit).
	if err := service.RecordBet(ctx, "u-1", 1000); err != nil {
		t.Fatalf("RecordBet: %v", err)
	}
	// Cancel a resting order that was committed two days ago (prior period).
	priorPeriodCommit := time.Now().UTC().AddDate(0, 0, -2)
	if err := service.ReleaseBet(ctx, "u-1", 1000, priorPeriodCommit); err != nil {
		t.Fatalf("ReleaseBet: %v", err)
	}
	limits, err := service.GetBetLimits(ctx, "u-1")
	if err != nil {
		t.Fatalf("GetBetLimits: %v", err)
	}
	// Must STILL be fully used — the cross-period release is a no-op. Pre-fix
	// it subtracted 1000, dropping used to 0 and handing free headroom.
	if limits[0].UsedCents != 1000 {
		t.Fatalf("cross-period release must not offset current usage: want used 1000, got %d", limits[0].UsedCents)
	}
	if limits[0].RemainingCents != 0 {
		t.Fatalf("want remaining 0 (limit fully used), got %d", limits[0].RemainingCents)
	}
	// Sanity: a same-period release still nets correctly.
	if err := service.ReleaseBet(ctx, "u-1", 400, time.Now().UTC()); err != nil {
		t.Fatalf("ReleaseBet (same period): %v", err)
	}
	limits, _ = service.GetBetLimits(ctx, "u-1")
	if limits[0].UsedCents != 600 {
		t.Fatalf("same-period release must net: want used 600, got %d", limits[0].UsedCents)
	}
}
