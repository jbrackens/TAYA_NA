package prediction

import (
	"testing"
	"time"
)

// TestReservationTTL locks in the policy that a GTC limit order's wallet
// hold survives until the market closes. Before this fix the TTL was a
// flat 24h, so GTC bids that rested on the book for >24h had their
// reservations expire while the orders were still live. The next taker
// to match those orders saw "reservation is not in held status" on the
// maker capture path. Demo seed Phase 4 hit this regularly on bot
// orders that survived a day's reseed cycle.
//
// Cases mirror the real call sites of reservationTTL().
func TestReservationTTL(t *testing.T) {
	now := time.Date(2026, 5, 14, 12, 0, 0, 0, time.UTC)

	cases := []struct {
		name      string
		tif       TimeInForce
		closeAt   time.Time
		wantHours float64
		tolerance time.Duration
	}{
		// GTC: TTL tracks market close, padded by 1h.
		{
			name:      "GTC week away",
			tif:       TIFGTC,
			closeAt:   now.Add(7 * 24 * time.Hour),
			wantHours: 7*24 + 1,
			tolerance: time.Second,
		},
		{
			name:      "GTC year away",
			tif:       TIFGTC,
			closeAt:   now.Add(365 * 24 * time.Hour),
			wantHours: 365*24 + 1,
			tolerance: time.Second,
		},
		{
			name:      "GTC one minute away",
			tif:       TIFGTC,
			closeAt:   now.Add(1 * time.Minute),
			wantHours: 1 + (1.0 / 60.0), // ~1h plus 1 minute
			tolerance: time.Second,
		},
		// GTC with closeAt in the past: market already closed, fall back
		// to the safe 24h default (the order shouldn't be placeable in
		// this state, but the function must not return a negative
		// duration if it ever is).
		{
			name:      "GTC close already past falls back",
			tif:       TIFGTC,
			closeAt:   now.Add(-1 * time.Hour),
			wantHours: 24,
			tolerance: time.Second,
		},
		// IOC / FOK / market: 24h regardless of close (they resolve
		// inside the same match call, so the TTL is just a safety net
		// against bugs that skip the release).
		{
			name:      "IOC ignores close",
			tif:       TIFIOC,
			closeAt:   now.Add(7 * 24 * time.Hour),
			wantHours: 24,
			tolerance: time.Second,
		},
		{
			name:      "FOK ignores close",
			tif:       TIFFOK,
			closeAt:   now.Add(7 * 24 * time.Hour),
			wantHours: 24,
			tolerance: time.Second,
		},
		// Empty TIF (the default-construction path before tif is
		// normalized to GTC in service.go) should not promote to GTC
		// behavior. The fallback is fine.
		{
			name:      "empty TIF falls back",
			tif:       "",
			closeAt:   now.Add(7 * 24 * time.Hour),
			wantHours: 24,
			tolerance: time.Second,
		},
	}

	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			got := reservationTTL(c.tif, c.closeAt, now)
			want := time.Duration(c.wantHours * float64(time.Hour))
			if abs(got-want) > c.tolerance {
				t.Errorf("reservationTTL(%q) = %v, want %v ± %v",
					c.tif, got, want, c.tolerance)
			}
		})
	}
}

func abs(d time.Duration) time.Duration {
	if d < 0 {
		return -d
	}
	return d
}
