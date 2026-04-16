package bets

import (
	"testing"
)

func TestValidateParlay_ValidThreeLegParlay(t *testing.T) {
	rules := DefaultParlayRules()
	legs := []ParlayLegInput{
		{FixtureID: "f1", Odds: 1.50},
		{FixtureID: "f2", Odds: 2.00},
		{FixtureID: "f3", Odds: 1.80},
	}
	result := ValidateParlay(rules, legs)
	if !result.Valid {
		t.Fatalf("expected valid parlay, got errors: %v", result.Errors)
	}
	expectedOdds := 1.50 * 2.00 * 1.80
	if diff := result.CombinedOdds - expectedOdds; diff > 0.001 || diff < -0.001 {
		t.Fatalf("expected combined odds %.4f, got %.4f", expectedOdds, result.CombinedOdds)
	}
}

func TestValidateParlay_TooFewLegs(t *testing.T) {
	rules := DefaultParlayRules()
	rules.MinLegs = 3
	legs := []ParlayLegInput{
		{FixtureID: "f1", Odds: 1.50},
		{FixtureID: "f2", Odds: 2.00},
	}
	result := ValidateParlay(rules, legs)
	if result.Valid {
		t.Fatal("expected invalid parlay for too few legs")
	}
	found := false
	for _, e := range result.Errors {
		if e.Code == "min_legs" {
			found = true
		}
	}
	if !found {
		t.Fatal("expected min_legs error")
	}
}

func TestValidateParlay_TooManyLegs(t *testing.T) {
	rules := DefaultParlayRules()
	rules.MaxLegs = 3
	legs := make([]ParlayLegInput, 4)
	for i := range legs {
		legs[i] = ParlayLegInput{FixtureID: "f" + string(rune('1'+i)), Odds: 1.50}
	}
	result := ValidateParlay(rules, legs)
	if result.Valid {
		t.Fatal("expected invalid parlay for too many legs")
	}
}

func TestValidateParlay_LowOddsPerLeg(t *testing.T) {
	rules := DefaultParlayRules()
	rules.MinOddsPerLeg = 1.30
	legs := []ParlayLegInput{
		{FixtureID: "f1", Odds: 1.50},
		{FixtureID: "f2", Odds: 1.10}, // below 1.30
	}
	result := ValidateParlay(rules, legs)
	if result.Valid {
		t.Fatal("expected invalid parlay for low odds per leg")
	}
	found := false
	for _, e := range result.Errors {
		if e.Code == "min_odds_per_leg" {
			found = true
		}
	}
	if !found {
		t.Fatal("expected min_odds_per_leg error")
	}
}

func TestValidateParlay_SameFixturePrevented(t *testing.T) {
	rules := DefaultParlayRules()
	rules.MaxSameFixture = 1
	legs := []ParlayLegInput{
		{FixtureID: "f1", MarketID: "m1", Odds: 1.50},
		{FixtureID: "f1", MarketID: "m2", Odds: 2.00}, // same fixture
	}
	result := ValidateParlay(rules, legs)
	if result.Valid {
		t.Fatal("expected invalid parlay for same fixture")
	}
	found := false
	for _, e := range result.Errors {
		if e.Code == "same_fixture" {
			found = true
		}
	}
	if !found {
		t.Fatal("expected same_fixture error")
	}
}

func TestValidateParlay_ExcludedSport(t *testing.T) {
	rules := DefaultParlayRules()
	rules.ExcludedSports = []string{"esports"}
	legs := []ParlayLegInput{
		{FixtureID: "f1", SportKey: "football", Odds: 1.50},
		{FixtureID: "f2", SportKey: "esports", Odds: 2.00},
	}
	result := ValidateParlay(rules, legs)
	if result.Valid {
		t.Fatal("expected invalid parlay for excluded sport")
	}
}

func TestValidateParlay_LowCombinedOdds(t *testing.T) {
	rules := DefaultParlayRules()
	rules.MinCombinedOdds = 3.00
	legs := []ParlayLegInput{
		{FixtureID: "f1", Odds: 1.20},
		{FixtureID: "f2", Odds: 1.30},
	}
	result := ValidateParlay(rules, legs)
	if result.Valid {
		t.Fatal("expected invalid parlay for low combined odds")
	}
	found := false
	for _, e := range result.Errors {
		if e.Code == "min_combined_odds" {
			found = true
		}
	}
	if !found {
		t.Fatal("expected min_combined_odds error")
	}
}

func TestValidateParlay_TwoLegMinimum(t *testing.T) {
	rules := DefaultParlayRules()
	legs := []ParlayLegInput{
		{FixtureID: "f1", Odds: 2.00},
		{FixtureID: "f2", Odds: 3.00},
	}
	result := ValidateParlay(rules, legs)
	if !result.Valid {
		t.Fatalf("expected valid two-leg parlay, got errors: %v", result.Errors)
	}
}
