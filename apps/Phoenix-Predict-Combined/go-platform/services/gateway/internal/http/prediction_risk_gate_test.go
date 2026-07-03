package http

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/gateway/internal/risk"
)

// fakeRiskReader returns a canned effective tier or error.
type fakeRiskReader struct {
	tier risk.Tier
	err  error
}

func (f fakeRiskReader) EffectiveTier(context.Context, string) (risk.Tier, error) {
	return f.tier, f.err
}

// GAP-12: a prohibited effective tier denies order placement in every
// environment; every other tier (and an unrated customer) delegates; a rating
// read error surfaces as (true, "", err) so the protected gate's env policy
// applies (fail-closed prod/staging).
func TestRiskTierGateCheckBetAllowed(t *testing.T) {
	cases := []struct {
		name        string
		tier        risk.Tier
		wantAllowed bool
		wantDenied  bool // expect an authoritative denial (inner NOT consulted)
	}{
		{"prohibited denies", risk.TierProhibited, false, true},
		{"high delegates", risk.TierHigh, true, false},
		{"medium delegates", risk.TierMedium, true, false},
		{"low delegates", risk.TierLow, true, false},
		{"unrated delegates", risk.Tier(""), true, false},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			inner := &fakeChecker{allowed: true}
			gate := wrapOrderGateWithRiskReader(inner, fakeRiskReader{tier: tc.tier})
			allowed, reason, err := gate.CheckBetAllowed(context.Background(), "u-1", 100)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if allowed != tc.wantAllowed {
				t.Fatalf("allowed = %v, want %v", allowed, tc.wantAllowed)
			}
			if tc.wantDenied {
				if reason != riskProhibitedReason {
					t.Fatalf("denial reason = %q, want the neutral prohibited reason", reason)
				}
				if inner.checkCalled {
					t.Fatal("prohibited tier must not consult the inner checker")
				}
			} else if !inner.checkCalled {
				t.Fatal("non-prohibited tier must delegate to the inner checker")
			}
		})
	}
}

func TestRiskTierGateReaderErrorIsInfraAmbiguity(t *testing.T) {
	inner := &fakeChecker{allowed: true}
	gate := wrapOrderGateWithRiskReader(inner, fakeRiskReader{err: errors.New("risk store down")})
	allowed, reason, err := gate.CheckBetAllowed(context.Background(), "u-1", 100)
	// (true, "", err): the protected gate then applies its env policy.
	if !allowed || reason != "" || err == nil {
		t.Fatalf("reader error: got (allowed=%v reason=%q err=%v), want (true, \"\", err)", allowed, reason, err)
	}
	if inner.checkCalled {
		t.Fatal("on a reader error the inner checker must not be consulted")
	}
}

func TestRiskTierGatePreservesAtomicity(t *testing.T) {
	reader := fakeRiskReader{tier: risk.TierLow}
	if _, ok := wrapOrderGateWithRiskReader(&fakeChecker{}, reader).(prediction.AtomicBetGate); ok {
		t.Fatal("wrapping a non-atomic checker must not advertise AtomicBetGate")
	}
	atomic := wrapOrderGateWithRiskReader(&fakeAtomicChecker{fakeChecker: fakeChecker{allowed: true}}, reader)
	if _, ok := atomic.(prediction.AtomicBetGate); !ok {
		t.Fatal("wrapping an atomic checker must preserve AtomicBetGate")
	}
}

func TestRiskTierGateAtomicPath(t *testing.T) {
	// Prohibited: authoritative denial without recording.
	inner := &fakeAtomicChecker{fakeChecker: fakeChecker{allowed: true}}
	gate := wrapOrderGateWithRiskReader(inner, fakeRiskReader{tier: risk.TierProhibited}).(prediction.AtomicBetGate)
	allowed, reason, err := gate.CheckAndRecordBet(context.Background(), "u-1", 100)
	if allowed || reason != riskProhibitedReason || err != nil {
		t.Fatalf("prohibited atomic: got (%v,%q,%v), want (false, reason, nil)", allowed, reason, err)
	}
	if inner.atomicCalled {
		t.Fatal("prohibited tier must not record via the atomic inner")
	}
	// Allowed: delegates to the atomic inner.
	inner2 := &fakeAtomicChecker{fakeChecker: fakeChecker{allowed: true}}
	gate2 := wrapOrderGateWithRiskReader(inner2, fakeRiskReader{tier: risk.TierLow}).(prediction.AtomicBetGate)
	if allowed, _, err := gate2.CheckAndRecordBet(context.Background(), "u-1", 100); err != nil || !allowed {
		t.Fatalf("low atomic: got (%v,_,%v), want (true,_,nil)", allowed, err)
	}
	if !inner2.atomicCalled {
		t.Fatal("non-prohibited tier must delegate to the atomic inner")
	}
}

func TestRiskTierGateReleaseBypassesRisk(t *testing.T) {
	// Releasing already-committed stake for a now-prohibited customer must still
	// reconcile — the gate only guards NEW commitments.
	inner := &fakeChecker{}
	gate := wrapOrderGateWithRiskReader(inner, fakeRiskReader{tier: risk.TierProhibited})
	if err := gate.ReleaseBet(context.Background(), "u-1", 100, time.Time{}); err != nil {
		t.Fatalf("release: %v", err)
	}
	if !inner.releaseCalled {
		t.Fatal("ReleaseBet must delegate regardless of risk tier")
	}
}

func TestRiskProhibitedReasonNonDisclosing(t *testing.T) {
	// Tipping-off guard: the user-facing reason must not reveal WHY.
	for _, banned := range []string{"sanction", "pep", "prohibit", "watchlist", "aml"} {
		if strings.Contains(strings.ToLower(riskProhibitedReason), banned) {
			t.Fatalf("denial reason %q leaks %q — must not disclose the cause", riskProhibitedReason, banned)
		}
	}
}
