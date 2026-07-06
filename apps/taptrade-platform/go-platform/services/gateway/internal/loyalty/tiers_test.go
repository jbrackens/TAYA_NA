package loyalty

import "testing"

func TestPredictTierForPoints(t *testing.T) {
	cases := []struct {
		name   string
		points int64
		want   PredictTier
	}{
		{"zero is hidden", 0, PredictTierHidden},
		{"one is newcomer", 1, PredictTierNewcomer},
		{"just below trader", 499, PredictTierNewcomer},
		{"exactly trader", 500, PredictTierTrader},
		{"just below sharp", 2_499, PredictTierTrader},
		{"exactly sharp", 2_500, PredictTierSharp},
		{"just below whale", 9_999, PredictTierSharp},
		{"exactly whale", 10_000, PredictTierWhale},
		{"just below legend", 49_999, PredictTierWhale},
		{"exactly legend", 50_000, PredictTierLegend},
		{"way above legend", 1_000_000, PredictTierLegend},
		{"negative is hidden", -1, PredictTierHidden},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := PredictTierForPoints(tc.points); got != tc.want {
				t.Errorf("PredictTierForPoints(%d) = %d, want %d", tc.points, got, tc.want)
			}
		})
	}
}

func TestPredictAccrualPoints(t *testing.T) {
	cases := []struct {
		name        string
		volumeCents int64
		isCorrect   bool
		want        int64
	}{
		{"$10 winning trade", 1000, true, 1500},
		{"$10 losing trade", 1000, false, 1000},
		{"$1 winning trade", 100, true, 150},
		{"$1 losing trade", 100, false, 100},
		{"zero volume", 0, true, 0},
		{"negative volume", -100, true, 0},
		{"large trade", 1_000_000, true, 1_500_000},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			if got := PredictAccrualPoints(tc.volumeCents, tc.isCorrect); got != tc.want {
				t.Errorf("PredictAccrualPoints(%d, %v) = %d, want %d",
					tc.volumeCents, tc.isCorrect, got, tc.want)
			}
		})
	}
}

func TestPredictPointsToNextTier(t *testing.T) {
	cases := []struct {
		name         string
		points       int64
		wantNeeded   int64
		wantNextName string
	}{
		{"hidden user", 0, 1, "Newcomer"},
		{"newcomer with 100 pts", 100, 400, "Trader"},
		{"trader with 1000 pts", 1_000, 1_500, "Sharp"},
		{"sharp with 5000 pts", 5_000, 5_000, "Whale"},
		{"whale with 20000 pts", 20_000, 30_000, "Legend"},
		{"legend at threshold", 50_000, 0, ""},
		{"legend way over", 100_000, 0, ""},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			needed, name := PredictPointsToNextTier(tc.points)
			if needed != tc.wantNeeded {
				t.Errorf("points=%d: needed = %d, want %d", tc.points, needed, tc.wantNeeded)
			}
			if name != tc.wantNextName {
				t.Errorf("points=%d: next = %q, want %q", tc.points, name, tc.wantNextName)
			}
		})
	}
}

func TestPredictTiersListIsOrdered(t *testing.T) {
	tiers := PredictTiers()
	if len(tiers) != 6 {
		t.Fatalf("expected 6 tier definitions (Hidden + 5 visible), got %d", len(tiers))
	}
	for i, def := range tiers {
		if int(def.Tier) != i {
			t.Errorf("tier at index %d has Tier=%d, expected %d (list must be ordered)", i, def.Tier, i)
		}
	}
	// Thresholds must be strictly increasing for visible tiers.
	for i := 1; i < len(tiers)-1; i++ {
		if tiers[i].PointsThreshold >= tiers[i+1].PointsThreshold {
			t.Errorf("threshold not strictly increasing: tier %d (%d) >= tier %d (%d)",
				i, tiers[i].PointsThreshold, i+1, tiers[i+1].PointsThreshold)
		}
	}
}
