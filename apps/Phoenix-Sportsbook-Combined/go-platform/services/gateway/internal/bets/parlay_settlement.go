package bets

// ParlayLegOutcome represents the settlement state of a single parlay leg.
type ParlayLegOutcome struct {
	LegIndex       int
	Outcome        string  // "won", "lost", "void", "push", "dead_heat"
	Odds           float64 // original odds for this leg
	DeadHeatFactor float64 // 1.0 for non-dead-heat outcomes
	VoidReason     string
}

// ParlaySettlementResult is the output of settling a multi-leg bet.
type ParlaySettlementResult struct {
	FinalOutcome   string  // "won", "lost", "void", "push"
	PayoutMultiple float64 // combined odds after adjustments
	ReducedLegs    int     // number of legs after removing voids
	OriginalLegs   int     // number of original legs
	VoidedLegs     int     // number of voided legs
	PushedLegs     int     // number of pushed legs
}

// SettleParlay determines the outcome of a multi-leg parlay bet from its
// individual leg outcomes. The rules follow standard sportsbook conventions:
//
//   - All legs won: full payout at combined odds
//   - Any leg lost: entire parlay lost
//   - Voided leg: remove from odds calculation (divide out)
//   - Push leg: treat as odds = 1.0 (neutral)
//   - Dead heat: adjust that leg's odds by the dead heat factor
//   - If all remaining legs after void removal < minLegs: void entire parlay
func SettleParlay(legs []ParlayLegOutcome, minLegs int) ParlaySettlementResult {
	if minLegs <= 0 {
		minLegs = 2
	}

	result := ParlaySettlementResult{
		OriginalLegs: len(legs),
	}

	if len(legs) == 0 {
		result.FinalOutcome = "void"
		return result
	}

	// First pass: classify legs
	var wonLegs, lostLegs, voidLegs, pushLegs int
	for _, leg := range legs {
		switch leg.Outcome {
		case "won":
			wonLegs++
		case "lost":
			lostLegs++
		case "void":
			voidLegs++
		case "push":
			pushLegs++
		case "dead_heat":
			wonLegs++ // dead heat counts as a "won" leg with reduced odds
		}
	}

	result.VoidedLegs = voidLegs
	result.PushedLegs = pushLegs
	result.ReducedLegs = len(legs) - voidLegs

	// All legs voided → void entire parlay
	if voidLegs == len(legs) {
		result.FinalOutcome = "void"
		result.PayoutMultiple = 0
		return result
	}

	// Too few legs remaining after voids → void entire parlay
	if result.ReducedLegs < minLegs {
		result.FinalOutcome = "void"
		result.PayoutMultiple = 0
		return result
	}

	// Any non-void/non-push leg lost → entire parlay lost
	if lostLegs > 0 {
		result.FinalOutcome = "lost"
		result.PayoutMultiple = 0
		return result
	}

	// All remaining legs are won, push, or dead_heat → calculate payout
	// Push legs contribute odds = 1.0 (neutral multiplier)
	// Dead heat legs contribute reduced odds (odds × deadHeatFactor)
	// Void legs are excluded from calculation
	combinedOdds := 1.0
	for _, leg := range legs {
		switch leg.Outcome {
		case "won":
			combinedOdds *= leg.Odds
		case "push":
			// Push = odds 1.0, no effect on combined odds
			continue
		case "dead_heat":
			factor := leg.DeadHeatFactor
			if factor <= 0 || factor > 1 {
				factor = 0.5 // default dead heat = 2 winners
			}
			adjustedOdds := 1.0 + (leg.Odds-1.0)*factor
			combinedOdds *= adjustedOdds
		case "void":
			// Excluded from calculation
			continue
		}
	}

	// If only push legs remain (no actual wins), it's a push
	if wonLegs == 0 {
		result.FinalOutcome = "push"
		result.PayoutMultiple = 1.0 // stake returned
		return result
	}

	result.FinalOutcome = "won"
	result.PayoutMultiple = combinedOdds
	return result
}
