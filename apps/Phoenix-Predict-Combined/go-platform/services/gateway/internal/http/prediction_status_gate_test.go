package http

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"phoenix-revival/gateway/internal/compliance"
	"phoenix-revival/gateway/internal/prediction"
)

// fakeStatusReader returns a canned status or error per user id.
type fakeStatusReader struct {
	statuses map[string]string
	err      error
}

func (f fakeStatusReader) PunterStatus(_ context.Context, userID string) (string, error) {
	if f.err != nil {
		return "", f.err
	}
	return f.statuses[userID], nil
}

// fakeChecker is a plain (non-atomic) ComplianceChecker that records calls.
type fakeChecker struct {
	checkCalled   bool
	recordCalled  bool
	releaseCalled bool
	allowed       bool
	reason        string
	err           error
}

func (f *fakeChecker) CheckBetAllowed(context.Context, string, int64) (bool, string, error) {
	f.checkCalled = true
	return f.allowed, f.reason, f.err
}
func (f *fakeChecker) RecordBet(context.Context, string, int64) error {
	f.recordCalled = true
	return nil
}
func (f *fakeChecker) ReleaseBet(context.Context, string, int64, time.Time) error {
	f.releaseCalled = true
	return nil
}

// fakeAtomicChecker additionally implements AtomicBetGate.
type fakeAtomicChecker struct {
	fakeChecker
	atomicCalled bool
}

func (f *fakeAtomicChecker) CheckAndRecordBet(context.Context, string, int64) (bool, string, error) {
	f.atomicCalled = true
	return f.allowed, f.reason, f.err
}

// GAP-9: non-active admin statuses deny order placement in every environment;
// active/absent rows delegate; reader errors surface as (true, "", err) so the
// protected gate's env policy applies.
func TestPunterStatusOrderGateCheckBetAllowed(t *testing.T) {
	cases := []struct {
		name          string
		status        string
		wantAllowed   bool
		wantDelegated bool
	}{
		{"active delegates", "active", true, true},
		{"absent row delegates", "", true, true},
		{"suspended denies", "suspended", false, false},
		{"self_excluded denies", "self_excluded", false, false},
		{"deactivated denies", "deactivated", false, false},
		{"unknown future status fails closed", "frozen", false, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			inner := &fakeChecker{allowed: true}
			gate := wrapOrderGateWithStatusReader(inner, fakeStatusReader{
				statuses: map[string]string{"u-1": tc.status},
			})
			allowed, reason, err := gate.CheckBetAllowed(context.Background(), "u-1", 100)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if allowed != tc.wantAllowed {
				t.Fatalf("allowed = %v, want %v (reason %q)", allowed, tc.wantAllowed, reason)
			}
			if !tc.wantAllowed && reason == "" {
				t.Fatal("denial must carry a reason")
			}
			if inner.checkCalled != tc.wantDelegated {
				t.Fatalf("inner called = %v, want %v", inner.checkCalled, tc.wantDelegated)
			}
		})
	}
}

func TestPunterStatusOrderGateReaderErrorIsInfraAmbiguity(t *testing.T) {
	inner := &fakeChecker{allowed: true}
	gate := wrapOrderGateWithStatusReader(inner, fakeStatusReader{err: errors.New("db down")})
	allowed, reason, err := gate.CheckBetAllowed(context.Background(), "u-1", 100)
	// (true, "", err): the protected gate treats this as "could not evaluate"
	// and fails closed in production/staging — never a silent pass there.
	if !allowed || reason != "" || err == nil {
		t.Fatalf("want (true, \"\", err), got (%v, %q, %v)", allowed, reason, err)
	}
	if inner.checkCalled {
		t.Fatal("inner must not be consulted when the status read errors")
	}
}

// The wrapper must not change the checker's atomicity in either direction.
func TestPunterStatusOrderGatePreservesAtomicity(t *testing.T) {
	reader := fakeStatusReader{statuses: map[string]string{}}

	nonAtomic := wrapOrderGateWithStatusReader(&fakeChecker{}, reader)
	if _, ok := nonAtomic.(prediction.AtomicBetGate); ok {
		t.Fatal("wrapping a non-atomic checker must not advertise AtomicBetGate")
	}

	atomic := wrapOrderGateWithStatusReader(&fakeAtomicChecker{}, reader)
	if _, ok := atomic.(prediction.AtomicBetGate); !ok {
		t.Fatal("wrapping an atomic checker must preserve AtomicBetGate")
	}
}

func TestPunterStatusOrderGateAtomicPath(t *testing.T) {
	t.Run("suspended denies without recording", func(t *testing.T) {
		inner := &fakeAtomicChecker{fakeChecker: fakeChecker{allowed: true}}
		gate := wrapOrderGateWithStatusReader(inner, fakeStatusReader{
			statuses: map[string]string{"u-1": "suspended"},
		}).(prediction.AtomicBetGate)
		allowed, reason, err := gate.CheckAndRecordBet(context.Background(), "u-1", 100)
		if err != nil || allowed || reason == "" {
			t.Fatalf("want clean deny, got (%v, %q, %v)", allowed, reason, err)
		}
		if inner.atomicCalled {
			t.Fatal("inner atomic gate must not run (nothing may be recorded) for a suspended punter")
		}
	})
	t.Run("active delegates to the atomic inner", func(t *testing.T) {
		inner := &fakeAtomicChecker{fakeChecker: fakeChecker{allowed: true}}
		gate := wrapOrderGateWithStatusReader(inner, fakeStatusReader{
			statuses: map[string]string{"u-1": "active"},
		}).(prediction.AtomicBetGate)
		if allowed, _, err := gate.CheckAndRecordBet(context.Background(), "u-1", 100); err != nil || !allowed {
			t.Fatalf("want delegated allow, got (%v, %v)", allowed, err)
		}
		if !inner.atomicCalled {
			t.Fatal("atomic inner must be used — falling back to the legacy path re-opens the TOCTOU")
		}
	})
}

// Releases must keep working for suspended punters: cancelling an order a
// punter placed before suspension still has to reconcile RG usage.
func TestPunterStatusOrderGateReleaseBypassesStatus(t *testing.T) {
	inner := &fakeChecker{}
	gate := wrapOrderGateWithStatusReader(inner, fakeStatusReader{
		statuses: map[string]string{"u-1": "suspended"},
	})
	if err := gate.ReleaseBet(context.Background(), "u-1", 100, time.Now()); err != nil {
		t.Fatalf("release: %v", err)
	}
	if !inner.releaseCalled {
		t.Fatal("ReleaseBet must delegate regardless of status")
	}
}

func TestWrapOrderGateNilSafety(t *testing.T) {
	if got := wrapOrderGateWithPunterStatus(nil, nil); got != nil {
		t.Fatal("nil inner must stay nil")
	}
	inner := &fakeChecker{}
	if got := wrapOrderGateWithPunterStatus(inner, nil); got != prediction.ComplianceChecker(inner) {
		t.Fatal("nil db must return the inner checker unchanged")
	}
}

// TestDepositStatusGate proves GAP-58: the deposit compliance checker, wrapped
// with the punter-status gate, denies deposits for a non-active punter (who
// cannot trade) while delegating for active/absent punters; a status-read error
// is reported as infra ambiguity so the deposit handler's env policy applies.
func TestDepositStatusGate(t *testing.T) {
	inner := compliance.NewMockResponsibleGamblingService()
	ctx := context.Background()

	// Non-active statuses are denied at the deposit gate even though the inner
	// RG service (no configured limit) would allow the amount.
	for _, status := range []string{"suspended", "self_excluded", "deactivated"} {
		gate := wrapDepositCheckerWithStatusReader(inner, fakeStatusReader{statuses: map[string]string{"u-1": status}})
		allowed, reason, err := gate.CheckDepositAllowed(ctx, "u-1", 100)
		if err != nil || allowed {
			t.Fatalf("%s: deposit must be denied, got allowed=%v reason=%q err=%v", status, allowed, reason, err)
		}
		if !strings.Contains(reason, "deposits are not permitted") {
			t.Fatalf("%s: expected a deposit-not-permitted reason, got %q", status, reason)
		}
	}

	// Active punter and an absent punter row both delegate (allow).
	reader := fakeStatusReader{statuses: map[string]string{"active-user": "active"}}
	for _, uid := range []string{"active-user", "unknown-user"} {
		gate := wrapDepositCheckerWithStatusReader(inner, reader)
		if allowed, _, err := gate.CheckDepositAllowed(ctx, uid, 100); err != nil || !allowed {
			t.Fatalf("%s: active/absent punter should delegate (allow), got allowed=%v err=%v", uid, allowed, err)
		}
	}

	// A status-read error is infra ambiguity: (true, "", err) so the deposit
	// handler's env policy (fail-closed in prod/staging) decides.
	gate := wrapDepositCheckerWithStatusReader(inner, fakeStatusReader{err: errors.New("db down")})
	if allowed, _, err := gate.CheckDepositAllowed(ctx, "u-1", 100); err == nil || !allowed {
		t.Fatalf("status-read error must be reported as (true, _, err), got allowed=%v err=%v", allowed, err)
	}

	// The nil-safe wrapper leaves a nil inner / nil db untouched.
	if got := wrapDepositCheckerWithPunterStatus(nil, nil); got != nil {
		t.Fatal("nil inner must pass through as nil")
	}
}
