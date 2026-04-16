package bets

import (
	"fmt"
	"strings"
)

// ParlayQualificationRules defines constraints for valid parlay bets.
type ParlayQualificationRules struct {
	MinLegs         int      // minimum legs (default: 2)
	MaxLegs         int      // maximum legs (default: 20)
	MinOddsPerLeg   float64  // minimum odds per individual leg (default: 1.10)
	MinCombinedOdds float64  // minimum combined odds (default: 1.50)
	MaxSameFixture  int      // max legs from same fixture (default: 1, prevents same-game parlay)
	ExcludedSports  []string // sport keys excluded from parlays
	ExcludedMarkets []string // market types excluded from parlays
}

// DefaultParlayRules returns the default parlay qualification rules.
func DefaultParlayRules() ParlayQualificationRules {
	return ParlayQualificationRules{
		MinLegs:         2,
		MaxLegs:         20,
		MinOddsPerLeg:   1.10,
		MinCombinedOdds: 1.50,
		MaxSameFixture:  1,
	}
}

// ParlayLegInput represents a single leg being validated.
type ParlayLegInput struct {
	FixtureID  string
	MarketID   string
	SportKey   string
	MarketType string
	Odds       float64
}

// ParlayValidationError describes a specific validation failure.
type ParlayValidationError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
}

// ParlayValidationResult holds the outcome of parlay qualification validation.
type ParlayValidationResult struct {
	Valid        bool                    `json:"valid"`
	CombinedOdds float64                `json:"combinedOdds"`
	Errors       []ParlayValidationError `json:"errors,omitempty"`
}

// ValidateParlay checks whether a set of legs forms a valid parlay according to the rules.
func ValidateParlay(rules ParlayQualificationRules, legs []ParlayLegInput) ParlayValidationResult {
	result := ParlayValidationResult{Valid: true, CombinedOdds: 1.0}

	// Apply defaults for zero values
	if rules.MinLegs <= 0 {
		rules.MinLegs = 2
	}
	if rules.MaxLegs <= 0 {
		rules.MaxLegs = 20
	}
	if rules.MinOddsPerLeg <= 0 {
		rules.MinOddsPerLeg = 1.10
	}
	if rules.MinCombinedOdds <= 0 {
		rules.MinCombinedOdds = 1.50
	}
	if rules.MaxSameFixture <= 0 {
		rules.MaxSameFixture = 1
	}

	// 1. Check leg count
	if len(legs) < rules.MinLegs {
		result.Valid = false
		result.Errors = append(result.Errors, ParlayValidationError{
			Code:    "min_legs",
			Message: fmt.Sprintf("parlay requires at least %d legs, got %d", rules.MinLegs, len(legs)),
		})
	}
	if len(legs) > rules.MaxLegs {
		result.Valid = false
		result.Errors = append(result.Errors, ParlayValidationError{
			Code:    "max_legs",
			Message: fmt.Sprintf("parlay exceeds maximum of %d legs, got %d", rules.MaxLegs, len(legs)),
		})
	}

	// Build excluded sets for O(1) lookup
	excludedSports := toSet(rules.ExcludedSports)
	excludedMarkets := toSet(rules.ExcludedMarkets)

	// Fixture count tracker for same-game detection
	fixtureCount := map[string]int{}

	// 2. Per-leg validation
	for i, leg := range legs {
		// Calculate combined odds
		result.CombinedOdds *= leg.Odds

		// Check per-leg minimum odds
		if leg.Odds < rules.MinOddsPerLeg {
			result.Valid = false
			result.Errors = append(result.Errors, ParlayValidationError{
				Code:    "min_odds_per_leg",
				Message: fmt.Sprintf("leg %d odds %.4f below minimum %.4f", i+1, leg.Odds, rules.MinOddsPerLeg),
			})
		}

		// Check sport exclusion
		if leg.SportKey != "" {
			if _, excluded := excludedSports[strings.ToLower(leg.SportKey)]; excluded {
				result.Valid = false
				result.Errors = append(result.Errors, ParlayValidationError{
					Code:    "excluded_sport",
					Message: fmt.Sprintf("leg %d sport %q is excluded from parlays", i+1, leg.SportKey),
				})
			}
		}

		// Check market exclusion
		if leg.MarketType != "" {
			if _, excluded := excludedMarkets[strings.ToLower(leg.MarketType)]; excluded {
				result.Valid = false
				result.Errors = append(result.Errors, ParlayValidationError{
					Code:    "excluded_market",
					Message: fmt.Sprintf("leg %d market type %q is excluded from parlays", i+1, leg.MarketType),
				})
			}
		}

		// Track fixture for same-game check
		if leg.FixtureID != "" {
			fixtureCount[leg.FixtureID]++
		}
	}

	// 3. Check fixture uniqueness (same-game prevention)
	for fixtureID, count := range fixtureCount {
		if count > rules.MaxSameFixture {
			result.Valid = false
			result.Errors = append(result.Errors, ParlayValidationError{
				Code:    "same_fixture",
				Message: fmt.Sprintf("fixture %s has %d legs, maximum %d per fixture", fixtureID, count, rules.MaxSameFixture),
			})
		}
	}

	// 4. Check combined odds minimum
	if result.CombinedOdds < rules.MinCombinedOdds {
		result.Valid = false
		result.Errors = append(result.Errors, ParlayValidationError{
			Code:    "min_combined_odds",
			Message: fmt.Sprintf("combined odds %.4f below minimum %.4f", result.CombinedOdds, rules.MinCombinedOdds),
		})
	}

	return result
}

func toSet(items []string) map[string]struct{} {
	s := make(map[string]struct{}, len(items))
	for _, item := range items {
		s[strings.ToLower(item)] = struct{}{}
	}
	return s
}
