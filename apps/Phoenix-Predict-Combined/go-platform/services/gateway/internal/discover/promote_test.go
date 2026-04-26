package discover

import (
	"math"
	"strings"
	"testing"
	"time"

	"phoenix-revival/gateway/internal/prediction"
)

func pastTime() time.Time { return time.Now().UTC().Add(-24 * time.Hour) }

// TestInitAMMShares_PriceMatchesLMSR is the most important invariant: the
// share state we initialize must produce the displayed price under the
// LMSR. If this drifts, every promoted market starts with a price the
// trader sees that differs from what executes (P0-2).
func TestInitAMMShares_PriceMatchesLMSR(t *testing.T) {
	amm := &prediction.AMMEngine{}
	const b = 100.0

	cases := []struct {
		name string
		p    float64
	}{
		{"low_long_shot", 0.05},
		{"slight_long_shot", 0.20},
		{"underdog", 0.42},
		{"even", 0.50},
		{"slight_favorite", 0.58},
		{"strong_favorite", 0.80},
		{"near_certain", 0.95},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			yesShares, noShares := initAMMShares(c.p, b)
			gotPrice := amm.PriceYes(yesShares, noShares, b)
			diff := math.Abs(gotPrice - c.p)
			if diff > 0.01 {
				t.Fatalf("p=%.2f: initAMMShares produced shares (yes=%.4f no=%.4f) "+
					"but LMSR returns %.4f (diff %.4f). Trader sees %.0f¢ "+
					"YES, executes at %.0f¢ — exactly the P0-2 mismatch.",
					c.p, yesShares, noShares, gotPrice, diff, c.p*100, gotPrice*100)
			}
		})
	}
}

// TestInitAMMShares_OutOfRangeReturnsZero documents the safety bound.
// p outside (0, 1) means the upstream is broken or we got bad data; default
// to 50/50 rather than NaN/Inf.
func TestInitAMMShares_OutOfRangeReturnsZero(t *testing.T) {
	cases := []float64{-0.1, 0, 1.0, 1.5, math.NaN()}
	for _, p := range cases {
		yes, no := initAMMShares(p, 100)
		if yes != 0 || no != 0 {
			t.Fatalf("p=%v: expected (0,0), got (%v,%v)", p, yes, no)
		}
	}
}

// TestInitAMMShares_OneSidePinnedAtZero documents the construction
// invariant: we always set one side to zero and put the magnitude on the
// other. This keeps the AMM economically equivalent to "the house pre-loaded
// half a position" without making one side go below zero (which the LMSR
// allows mathematically but the column type doesn't).
func TestInitAMMShares_OneSidePinnedAtZero(t *testing.T) {
	for _, p := range []float64{0.05, 0.42, 0.50, 0.58, 0.95} {
		yes, no := initAMMShares(p, 100)
		if yes < 0 || no < 0 {
			t.Fatalf("p=%.2f: negative shares (yes=%v, no=%v); column is non-negative", p, yes, no)
		}
		if yes > 0 && no > 0 {
			t.Fatalf("p=%.2f: both sides non-zero (yes=%v, no=%v); should pin one to zero", p, yes, no)
		}
	}
}

// TestClampPrices covers the cents-conversion contract. The CHECK constraint
// on prediction_markets requires both in [1,99] summing to 100; this helper
// is the only place we satisfy that, so its invariants matter.
func TestClampPrices(t *testing.T) {
	cases := []struct {
		name      string
		input     []float64
		wantYes   int
		wantNo    int
		wantSum   int
	}{
		{"normal_42", []float64{0.42, 0.58}, 42, 58, 100},
		{"normal_58", []float64{0.58, 0.42}, 58, 42, 100},
		{"floor_clamp", []float64{0.001, 0.999}, 1, 99, 100},
		{"ceil_clamp", []float64{0.999, 0.001}, 99, 1, 100},
		{"empty_defaults_to_50", []float64{}, 50, 50, 100},
		{"single_value", []float64{0.30}, 30, 70, 100},
		{"negative_clamps_floor", []float64{-0.5}, 1, 99, 100},
		{"above_one_clamps_ceil", []float64{1.5}, 99, 1, 100},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			yes, no := clampPrices(c.input)
			if yes != c.wantYes || no != c.wantNo {
				t.Errorf("clampPrices(%v) = (%d,%d), want (%d,%d)", c.input, yes, no, c.wantYes, c.wantNo)
			}
			if yes+no != c.wantSum {
				t.Errorf("clampPrices(%v) sum = %d, want %d (CHECK constraint requires 100)", c.input, yes+no, c.wantSum)
			}
			if yes < 1 || yes > 99 || no < 1 || no > 99 {
				t.Errorf("clampPrices(%v) out of [1,99] range: yes=%d no=%d", c.input, yes, no)
			}
		})
	}
}

// TestGenerateTicker_StableAcrossSyncs is the round-2 idempotency invariant:
// re-running sync against the same upstream market yields the same ticker.
// Earlier we considered deriving the ticker from imported_markets.id (a UUID);
// that would rotate on every re-sync. We use external_hash (SHA-256 of
// source:external_id) which is stable.
func TestGenerateTicker_StableAcrossSyncs(t *testing.T) {
	m := Market{Source: "polymarket", ExternalID: "0x123abc"}
	t1 := generateTicker(m)
	t2 := generateTicker(m)
	if t1 != t2 {
		t.Fatalf("ticker not stable: first=%q second=%q", t1, t2)
	}
	if !strings.HasPrefix(t1, "IMP-") {
		t.Fatalf("ticker missing IMP- prefix: %q", t1)
	}
	if len(t1) != len("IMP-")+8 {
		t.Fatalf("ticker length wrong: got %d want %d", len(t1), len("IMP-")+8)
	}
}

// TestGenerateTicker_DifferentSourcesDifferentTickers covers the dedupe case
// where the same external_id slug exists across upstreams (e.g., Polymarket
// and Kalshi both have a market called "trump-2028"). Each must get a unique
// ticker so neither overwrites the other.
func TestGenerateTicker_DifferentSourcesDifferentTickers(t *testing.T) {
	m1 := Market{Source: "polymarket", ExternalID: "trump-2028"}
	m2 := Market{Source: "kalshi", ExternalID: "trump-2028"}
	t1 := generateTicker(m1)
	t2 := generateTicker(m2)
	if t1 == t2 {
		t.Fatalf("same ticker for different sources: %q", t1)
	}
}

// TestPickCloseAt covers the edge where upstream end_time is in the past
// (resolved markets, mostly) — we need a sensible default to avoid
// CloseAt < CreatedAt invariant violations.
func TestPickCloseAt_PastTimeFallsBack(t *testing.T) {
	past := pastTime()
	got := pickCloseAt(&past)
	if !got.After(past) {
		t.Fatalf("pickCloseAt returned past time %v for past input %v", got, past)
	}
}
