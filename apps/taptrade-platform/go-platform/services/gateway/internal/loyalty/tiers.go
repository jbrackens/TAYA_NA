package loyalty

// Predict-native tier definitions.
// See PLAN-loyalty-leaderboards.md §2 — Semantic model for the design rationale.
//
// Tiers are *cumulative*: each higher tier inherits the benefits of the ones
// below it. The display tier (what the user sees in the header pill) is the
// highest tier their points qualify for.

// PredictTier is the 0..5 rank. Tier 0 is the hidden "below Newcomer" state —
// no pill, no visible loyalty surfaces. Tier ≥ 1 is visible.
type PredictTier int

const (
	PredictTierHidden    PredictTier = 0 // No pill; user has earned no points
	PredictTierNewcomer  PredictTier = 1
	PredictTierTrader    PredictTier = 2
	PredictTierSharp     PredictTier = 3
	PredictTierWhale     PredictTier = 4
	PredictTierLegend    PredictTier = 5

	// Thresholds match the plan. Tunable — revisit after 2 weeks of usage
	// data per the "Unresolved decisions" table in the plan.
	PredictTierThresholdNewcomer int64 = 1
	PredictTierThresholdTrader   int64 = 500
	PredictTierThresholdSharp    int64 = 2_500
	PredictTierThresholdWhale    int64 = 10_000
	PredictTierThresholdLegend   int64 = 50_000
)

// PredictTierDefinition is the shape the API exposes to the frontend.
// `/api/v1/loyalty/tiers` returns a []PredictTierDefinition so the frontend
// has a single source of truth for names, thresholds, and benefit copy.
type PredictTierDefinition struct {
	Tier              PredictTier `json:"tier"`
	Name              string      `json:"name"`
	PointsThreshold   int64       `json:"pointsThreshold"`
	Benefits          []string    `json:"benefits"`
}

// PredictTiers returns the ordered tier table. Stable, pure function — no
// DB read, safe to call on every request. Frontend caches this as static data.
func PredictTiers() []PredictTierDefinition {
	return []PredictTierDefinition{
		{
			Tier:            PredictTierHidden,
			Name:            "",
			PointsThreshold: 0,
			Benefits:        nil,
		},
		{
			Tier:            PredictTierNewcomer,
			Name:            "Newcomer",
			PointsThreshold: PredictTierThresholdNewcomer,
			Benefits: []string{
				"Tier pill visible in header",
				"Accuracy + rank tracking",
			},
		},
		{
			Tier:            PredictTierTrader,
			Name:            "Trader",
			PointsThreshold: PredictTierThresholdTrader,
			Benefits: []string{
				"Priority queue on new-market push notifications",
			},
		},
		{
			Tier:            PredictTierSharp,
			Name:            "Sharp",
			PointsThreshold: PredictTierThresholdSharp,
			Benefits: []string{
				"Tier-3 pill color (visual distinction)",
			},
		},
		{
			Tier:            PredictTierWhale,
			Name:            "Whale",
			PointsThreshold: PredictTierThresholdWhale,
			Benefits: []string{
				"Name highlighted on Whale Ticker when you trade",
			},
		},
		{
			Tier:            PredictTierLegend,
			Name:            "Legend",
			PointsThreshold: PredictTierThresholdLegend,
			Benefits: []string{
				"Legend pill color",
				"Reserved: future perks land here",
			},
		},
	}
}

// PredictTierForPoints maps a raw points balance to the tier the user has
// qualified for. Always returns a tier ≥ 0.
//
//   points < 1            → Hidden (0)
//   1 ≤ points < 500      → Newcomer (1)
//   500 ≤ points < 2500   → Trader (2)
//   2500 ≤ points < 10k   → Sharp (3)
//   10k ≤ points < 50k    → Whale (4)
//   50k ≤ points          → Legend (5)
func PredictTierForPoints(points int64) PredictTier {
	switch {
	case points >= PredictTierThresholdLegend:
		return PredictTierLegend
	case points >= PredictTierThresholdWhale:
		return PredictTierWhale
	case points >= PredictTierThresholdSharp:
		return PredictTierSharp
	case points >= PredictTierThresholdTrader:
		return PredictTierTrader
	case points >= PredictTierThresholdNewcomer:
		return PredictTierNewcomer
	default:
		return PredictTierHidden
	}
}

// PredictTierName looks up the display name for a tier. Empty string for
// Hidden (no name to show).
func PredictTierName(t PredictTier) string {
	for _, def := range PredictTiers() {
		if def.Tier == t {
			return def.Name
		}
	}
	return ""
}

// PredictPointsToNextTier returns (pointsNeeded, nextTierName). Returns
// (0, "") if the user is already at Legend (max tier).
func PredictPointsToNextTier(currentPoints int64) (int64, string) {
	current := PredictTierForPoints(currentPoints)
	if current >= PredictTierLegend {
		return 0, ""
	}
	// Find the next tier's threshold
	for _, def := range PredictTiers() {
		if def.Tier == current+1 {
			return def.PointsThreshold - currentPoints, def.Name
		}
	}
	return 0, ""
}

// PredictAccrualPoints computes points earned from a settled trade.
//
//   points = round(trade_volume_cents × (1.0 + 0.5 × is_correct))
//
// A $10 winning trade earns 1500 raw points.
// A $10 losing trade earns 1000 raw points.
// Display divides by 100 (handled by the frontend).
//
// See PLAN-loyalty-leaderboards.md §2.Points formula.
func PredictAccrualPoints(volumeCents int64, isCorrect bool) int64 {
	if volumeCents <= 0 {
		return 0
	}
	multiplier := 1.0
	if isCorrect {
		multiplier = 1.5
	}
	// Round to nearest integer. Guard against negative results (shouldn't
	// happen with positive volume + positive multiplier, but defensive).
	result := float64(volumeCents) * multiplier
	if result < 0 {
		return 0
	}
	return int64(result + 0.5)
}
