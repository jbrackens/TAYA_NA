package prediction

import "testing"

// TestCapFillQtyByNotionalCap locks the budget-cap fix that prevents the
// matching engine from issuing a capture that overshoots a market BUY's
// notional reservation. The bug surfaced in production on a $5 market
// BUY (notionalCapCents=500) that had captured 240 cents across earlier
// fills, then asked the wallet to capture another 275 — leaving only 260
// remaining. CaptureReservationWithTx rejected with "capture 275 exceeds
// remaining 260". Root cause: the issuance + secondary match loops both
// derived fillQty from min(taker_remaining, maker_remaining) without
// budget-checking the taker's notional cap.
//
// The helper rounds down via integer division so the fill never
// overshoots. Limit orders (no notional cap) pass through unchanged.
func TestCapFillQtyByNotionalCap(t *testing.T) {
	cap500 := int64(500)
	cap0 := int64(0)
	cases := []struct {
		name           string
		notionalCap    *int64
		captured       int64
		proposedQty    int
		takerPriceCents int
		want           int
	}{
		// The exact production scenario: $5 cap, 240 already captured,
		// proposed fill of 11 shares at takerPrice 25¢ (= 275 cents).
		// remaining = 260; 260 / 25 = 10. Must clamp to 10.
		{"production: 240 captured, 11 shares at 25¢ clamps to 10", &cap500, 240, 11, 25, 10},

		// Whole-share fits exactly: 500 / 50 = 10, no clamp.
		{"exact fit", &cap500, 0, 10, 50, 10},

		// Asking for more than the budget allows: 500 / 73 = 6, not 7.
		{"issuance pricing rounds down", &cap500, 0, 7, 73, 6},

		// Budget already exhausted: clamp to zero, not negative.
		{"budget exhausted", &cap500, 500, 5, 25, 0},
		{"budget overspent (defensive)", &cap500, 600, 5, 25, 0},

		// No notional cap (limit orders): proposedQty passes through.
		{"no notional cap", nil, 0, 100, 25, 100},

		// Zero notional cap (defensive, treated like no cap): proposedQty
		// passes through. Zero-cap orders should be rejected upstream.
		{"zero notional cap", &cap0, 0, 100, 25, 100},

		// Zero or negative takerPriceCents (defensive): proposedQty
		// passes through so we don't divide by zero. Upstream
		// validation should reject these.
		{"zero takerPrice", &cap500, 0, 5, 0, 5},

		// Captured cash matches cap exactly: no more headroom, clamp to 0.
		{"captured == cap", &cap500, 500, 5, 25, 0},

		// Proposed qty is already smaller than budget would allow: pass through.
		{"proposed smaller than budget allows", &cap500, 0, 3, 25, 3},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			taker := &Order{
				NotionalCapCents:  c.notionalCap,
				CapturedCashCents: c.captured,
			}
			got := capFillQtyByNotionalCap(taker, c.proposedQty, c.takerPriceCents)
			if got != c.want {
				t.Errorf(
					"capFillQtyByNotionalCap(cap=%v, captured=%d, proposed=%d, price=%d) = %d, want %d",
					c.notionalCap, c.captured, c.proposedQty, c.takerPriceCents, got, c.want,
				)
			}
		})
	}
}
