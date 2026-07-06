package alphacashier

import (
	"context"
	"errors"
	"testing"
)

type stubScreener struct {
	status ScreeningStatus
	err    error
}

func (s stubScreener) ScreenAddress(context.Context, string) (ScreeningStatus, error) {
	return s.status, s.err
}

const screenTestAddr = "0x0000000000000000000000000000000000000009"

func withdrawalSvc(t *testing.T, screener AddressScreener, enforce bool) *Service {
	t.Helper()
	cfg := testConfig()
	cfg.ScreeningEnforced = enforce
	svc := NewService(cfg, NewMemoryRepository())
	svc.SetWalletLedger(&fakeLedger{})
	if screener != nil {
		svc.SetScreener(screener)
	}
	return svc
}

// Audit CMP-01: a sanctions hit on the withdrawal destination must block,
// regardless of the enforcement flag.
func TestWithdrawalSanctionsHitAlwaysBlocks(t *testing.T) {
	for _, enforce := range []bool{false, true} {
		svc := withdrawalSvc(t, stubScreener{status: ScreeningSanctionsHit}, enforce)
		_, err := svc.CreateWithdrawalRequest(context.Background(), "u-1", screenTestAddr, 2500, "wd-sanction")
		if !errors.Is(err, ErrAddressScreeningBlocked) {
			t.Fatalf("enforce=%v: sanctions hit must block withdrawal, got %v", enforce, err)
		}
	}
}

// manual_review blocks only under enforcement; observe-only otherwise.
func TestWithdrawalManualReviewBlocksOnlyUnderEnforcement(t *testing.T) {
	enforced := withdrawalSvc(t, stubScreener{status: ScreeningManualReview}, true)
	if _, err := enforced.CreateWithdrawalRequest(context.Background(), "u-1", screenTestAddr, 2500, "wd-mr-1"); !errors.Is(err, ErrAddressScreeningBlocked) {
		t.Fatalf("manual_review under enforcement must block, got %v", err)
	}

	observe := withdrawalSvc(t, stubScreener{status: ScreeningManualReview}, false)
	if _, err := observe.CreateWithdrawalRequest(context.Background(), "u-1", screenTestAddr, 2500, "wd-mr-2"); err != nil {
		t.Fatalf("manual_review observe-only must not block, got %v", err)
	}
}

// A screener error is treated as unavailable → blocks under enforcement (fail
// closed), passes observe-only.
func TestWithdrawalScreenerErrorFailsClosedUnderEnforcement(t *testing.T) {
	enforced := withdrawalSvc(t, stubScreener{err: errors.New("provider down")}, true)
	if _, err := enforced.CreateWithdrawalRequest(context.Background(), "u-1", screenTestAddr, 2500, "wd-err-1"); !errors.Is(err, ErrAddressScreeningBlocked) {
		t.Fatalf("screener error under enforcement must fail closed, got %v", err)
	}
}

// Clear passes through.
func TestWithdrawalClearPasses(t *testing.T) {
	svc := withdrawalSvc(t, stubScreener{status: ScreeningClear}, true)
	if _, err := svc.CreateWithdrawalRequest(context.Background(), "u-1", screenTestAddr, 2500, "wd-clear"); err != nil {
		t.Fatalf("clear screening must pass, got %v", err)
	}
}

// No screener configured = no-op (rail off / unconfigured): withdrawal proceeds.
func TestWithdrawalNoScreenerIsNoOp(t *testing.T) {
	svc := withdrawalSvc(t, nil, true)
	if _, err := svc.CreateWithdrawalRequest(context.Background(), "u-1", screenTestAddr, 2500, "wd-none"); err != nil {
		t.Fatalf("no screener must be a no-op, got %v", err)
	}
}

// The default manual-review screener never auto-clears, so under enforcement it
// blocks — proving the seam is fail-closed by default rather than open.
func TestDefaultScreenerBlocksUnderEnforcement(t *testing.T) {
	svc := withdrawalSvc(t, DefaultScreener(), true)
	if _, err := svc.CreateWithdrawalRequest(context.Background(), "u-1", screenTestAddr, 2500, "wd-default"); !errors.Is(err, ErrAddressScreeningBlocked) {
		t.Fatalf("default screener under enforcement must block, got %v", err)
	}
}
