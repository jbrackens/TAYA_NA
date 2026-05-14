package prediction

import "testing"

// computeYesNoMismatch decides whether a position-pool asymmetry is a real
// bug or a benign AMM-legacy state. The gating function exists because the
// reconciler used to fire ERROR on every tick for markets migrated from
// execution_mode=amm to order_book — their AMM-era positions are
// one-sided by LMSR design but tripped the YES+NO parity check.
//
// This regression suite locks in the gating contract: the mismatch
// signal must only fire when the market has at least one non-AMM trade
// AND the position pools are unequal.
func TestComputeYesNoMismatch(t *testing.T) {
	cases := []struct {
		name          string
		hasBookTrades bool
		yesPool       int64
		noPool        int64
		want          bool
	}{
		// Regression: ISSUE-004 (QA 2026-05-14) — AMM-legacy markets
		// migrated to order_book mode were ERROR-logging every reconciler
		// tick because their one-sided AMM positions tripped the YES+NO
		// invariant. With no book trades, asymmetry must read clean.
		{"amm-legacy yes-only is clean", false, 2500, 0, false},
		{"amm-legacy no-only is clean", false, 0, 3000, false},
		{"amm-legacy zero pools is clean", false, 0, 0, false},
		{"amm-legacy symmetric is clean", false, 1500, 1500, false},

		// Order-book issuance creates equal YES + NO positions per fill.
		// On a market with any book trades, asymmetry is a real signal.
		{"book trades symmetric is clean", true, 5000, 5000, false},
		{"book trades zero pools is clean", true, 0, 0, false},
		{"book trades yes-heavy is a bug", true, 5000, 4900, true},
		{"book trades no-heavy is a bug", true, 4900, 5000, true},
		{"book trades yes-only is a bug", true, 2500, 0, true},

		// Edge: a market with book trades but every position has been
		// fully closed (issuance + settlement zeroed everything). Pools
		// equal at zero. Not a mismatch.
		{"book trades both pools drained", true, 0, 0, false},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := computeYesNoMismatch(c.hasBookTrades, c.yesPool, c.noPool)
			if got != c.want {
				t.Errorf(
					"computeYesNoMismatch(hasBookTrades=%v, yes=%d, no=%d) = %v, want %v",
					c.hasBookTrades, c.yesPool, c.noPool, got, c.want,
				)
			}
		})
	}
}
