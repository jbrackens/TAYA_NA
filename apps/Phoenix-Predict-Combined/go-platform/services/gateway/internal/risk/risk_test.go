package risk

import (
	"context"
	"testing"
)

// computeTier is the compliance heart of the rating: the most severe of the AML
// points band and the screening floor. A confirmed hit is always prohibited; an
// unresolved/unavailable screening floors at high; a control never lowers risk.
func TestComputeTier(t *testing.T) {
	b := DefaultBands() // medium>=50, high>=100
	cases := []struct {
		name      string
		points    int
		screening string
		wantTier  Tier
		wantScore int
	}{
		{"clean low", 0, "clear", TierLow, 0},
		{"below medium band", 49, "clear", TierLow, 49},
		{"medium band", 50, "clear", TierMedium, 50},
		{"below high band", 99, "clear", TierMedium, 99},
		{"high band", 100, "clear", TierHigh, 100},
		{"well above high band", 250, "clear", TierHigh, 250},
		{"confirmed hit is prohibited", 0, "hit", TierProhibited, 0},
		{"reviewer-confirmed hit is prohibited", 0, "hit_confirmed", TierProhibited, 0},
		{"hit overrides high points", 250, "hit", TierProhibited, 250},
		{"potential match floors at high", 0, "potential_match", TierHigh, 0},
		{"unavailable screening floors at high", 0, "unavailable", TierHigh, 0},
		{"potential match does not lower high", 120, "potential_match", TierHigh, 120},
		{"cleared by review does not elevate", 10, "cleared_by_review", TierLow, 10},
		{"clear does not elevate", 10, "clear", TierLow, 10},
		{"unscreened is neutral", 60, "unscreened", TierMedium, 60},
		{"empty screening is neutral", 0, "", TierLow, 0},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			tier, score := computeTier(Factors{AMLOpenAlertPoints: tc.points, ScreeningStatus: tc.screening}, b)
			if tier != tc.wantTier || score != tc.wantScore {
				t.Fatalf("computeTier(%d,%q) = (%s,%d), want (%s,%d)",
					tc.points, tc.screening, tier, score, tc.wantTier, tc.wantScore)
			}
		})
	}
}

func TestEffectiveTier(t *testing.T) {
	// No override → computed tier.
	if got := (Rating{Tier: TierMedium}).EffectiveTier(); got != TierMedium {
		t.Fatalf("no override: got %s, want medium", got)
	}
	// Override present → override wins (both up and down).
	if got := (Rating{Tier: TierLow, OverrideTier: TierProhibited}).EffectiveTier(); got != TierProhibited {
		t.Fatalf("override up: got %s, want prohibited", got)
	}
	if got := (Rating{Tier: TierHigh, OverrideTier: TierLow}).EffectiveTier(); got != TierLow {
		t.Fatalf("override down: got %s, want low", got)
	}
	// An invalid override tier is ignored (falls back to computed).
	if got := (Rating{Tier: TierMedium, OverrideTier: Tier("bogus")}).EffectiveTier(); got != TierMedium {
		t.Fatalf("invalid override: got %s, want medium", got)
	}
}

func TestValidTier(t *testing.T) {
	for _, ok := range []Tier{TierLow, TierMedium, TierHigh, TierProhibited} {
		if !ValidTier(ok) {
			t.Fatalf("%s should be valid", ok)
		}
	}
	for _, bad := range []Tier{"", "critical", "LOW", "unknown"} {
		if ValidTier(bad) {
			t.Fatalf("%q should be invalid", bad)
		}
	}
}

func TestNewEngineBandsFallback(t *testing.T) {
	// Zero bands → DefaultBands.
	e := NewEngine(nil, nil, Bands{})
	if e.bands != DefaultBands() {
		t.Fatalf("zero bands should fall back to default, got %+v", e.bands)
	}
	// Explicit bands are honored.
	custom := Bands{MediumMinPoints: 10, HighMinPoints: 20}
	e2 := NewEngine(nil, nil, custom)
	if e2.bands != custom {
		t.Fatalf("custom bands not honored, got %+v", e2.bands)
	}
}

func TestRecomputeRejectsEmptySubject(t *testing.T) {
	// Returns before touching the (nil) source/store, so nil deps are safe.
	e := NewEngine(nil, nil, DefaultBands())
	if _, err := e.Recompute(context.Background(), ""); err != ErrInvalidInput {
		t.Fatalf("empty subject: want ErrInvalidInput, got %v", err)
	}
}
