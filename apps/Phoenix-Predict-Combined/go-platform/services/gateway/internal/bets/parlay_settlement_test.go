package bets

import (
	"math"
	"testing"
)

func almostEqual(a, b, tolerance float64) bool {
	return math.Abs(a-b) < tolerance
}

func TestSettleParlay_AllLegsWon(t *testing.T) {
	legs := []ParlayLegOutcome{
		{LegIndex: 0, Outcome: "won", Odds: 1.50},
		{LegIndex: 1, Outcome: "won", Odds: 2.00},
		{LegIndex: 2, Outcome: "won", Odds: 1.80},
	}
	result := SettleParlay(legs, 2)
	if result.FinalOutcome != "won" {
		t.Fatalf("expected won, got %s", result.FinalOutcome)
	}
	expected := 1.50 * 2.00 * 1.80
	if !almostEqual(result.PayoutMultiple, expected, 0.001) {
		t.Fatalf("expected payout %.4f, got %.4f", expected, result.PayoutMultiple)
	}
}

func TestSettleParlay_OneLegLost(t *testing.T) {
	legs := []ParlayLegOutcome{
		{LegIndex: 0, Outcome: "won", Odds: 1.50},
		{LegIndex: 1, Outcome: "lost", Odds: 2.00},
		{LegIndex: 2, Outcome: "won", Odds: 1.80},
	}
	result := SettleParlay(legs, 2)
	if result.FinalOutcome != "lost" {
		t.Fatalf("expected lost, got %s", result.FinalOutcome)
	}
	if result.PayoutMultiple != 0 {
		t.Fatalf("expected 0 payout, got %.4f", result.PayoutMultiple)
	}
}

func TestSettleParlay_OneLegVoidRestWon(t *testing.T) {
	legs := []ParlayLegOutcome{
		{LegIndex: 0, Outcome: "won", Odds: 1.50},
		{LegIndex: 1, Outcome: "void", Odds: 2.00, VoidReason: "match cancelled"},
		{LegIndex: 2, Outcome: "won", Odds: 1.80},
	}
	result := SettleParlay(legs, 2)
	if result.FinalOutcome != "won" {
		t.Fatalf("expected won (reduced), got %s", result.FinalOutcome)
	}
	// Void leg removed: odds = 1.50 × 1.80 = 2.70
	expected := 1.50 * 1.80
	if !almostEqual(result.PayoutMultiple, expected, 0.001) {
		t.Fatalf("expected payout %.4f, got %.4f", expected, result.PayoutMultiple)
	}
	if result.ReducedLegs != 2 {
		t.Fatalf("expected 2 reduced legs, got %d", result.ReducedLegs)
	}
	if result.VoidedLegs != 1 {
		t.Fatalf("expected 1 voided leg, got %d", result.VoidedLegs)
	}
}

func TestSettleParlay_OnePushRestWon(t *testing.T) {
	legs := []ParlayLegOutcome{
		{LegIndex: 0, Outcome: "won", Odds: 1.50},
		{LegIndex: 1, Outcome: "push", Odds: 2.00},
		{LegIndex: 2, Outcome: "won", Odds: 1.80},
	}
	result := SettleParlay(legs, 2)
	if result.FinalOutcome != "won" {
		t.Fatalf("expected won, got %s", result.FinalOutcome)
	}
	// Push leg = odds 1.0 (neutral): effective odds = 1.50 × 1.80 = 2.70
	expected := 1.50 * 1.80
	if !almostEqual(result.PayoutMultiple, expected, 0.001) {
		t.Fatalf("expected payout %.4f, got %.4f", expected, result.PayoutMultiple)
	}
}

func TestSettleParlay_TwoVoidsOneLegBelowMinLegs(t *testing.T) {
	legs := []ParlayLegOutcome{
		{LegIndex: 0, Outcome: "won", Odds: 1.50},
		{LegIndex: 1, Outcome: "void", Odds: 2.00},
		{LegIndex: 2, Outcome: "void", Odds: 1.80},
	}
	result := SettleParlay(legs, 2)
	if result.FinalOutcome != "void" {
		t.Fatalf("expected void (below min legs), got %s", result.FinalOutcome)
	}
}

func TestSettleParlay_AllLegsVoided(t *testing.T) {
	legs := []ParlayLegOutcome{
		{LegIndex: 0, Outcome: "void", Odds: 1.50},
		{LegIndex: 1, Outcome: "void", Odds: 2.00},
		{LegIndex: 2, Outcome: "void", Odds: 1.80},
	}
	result := SettleParlay(legs, 2)
	if result.FinalOutcome != "void" {
		t.Fatalf("expected void, got %s", result.FinalOutcome)
	}
}

func TestSettleParlay_MixWonLostVoid(t *testing.T) {
	// 1 won + 1 lost + 1 void → lost (lost trumps void)
	legs := []ParlayLegOutcome{
		{LegIndex: 0, Outcome: "won", Odds: 1.50},
		{LegIndex: 1, Outcome: "lost", Odds: 2.00},
		{LegIndex: 2, Outcome: "void", Odds: 1.80},
	}
	result := SettleParlay(legs, 2)
	if result.FinalOutcome != "lost" {
		t.Fatalf("expected lost, got %s", result.FinalOutcome)
	}
}

func TestSettleParlay_MixWonPushLost(t *testing.T) {
	legs := []ParlayLegOutcome{
		{LegIndex: 0, Outcome: "won", Odds: 1.50},
		{LegIndex: 1, Outcome: "push", Odds: 2.00},
		{LegIndex: 2, Outcome: "lost", Odds: 1.80},
	}
	result := SettleParlay(legs, 2)
	if result.FinalOutcome != "lost" {
		t.Fatalf("expected lost, got %s", result.FinalOutcome)
	}
}

func TestSettleParlay_DeadHeatOnOneLeg(t *testing.T) {
	legs := []ParlayLegOutcome{
		{LegIndex: 0, Outcome: "won", Odds: 1.50},
		{LegIndex: 1, Outcome: "dead_heat", Odds: 2.00, DeadHeatFactor: 0.5},
		{LegIndex: 2, Outcome: "won", Odds: 1.80},
	}
	result := SettleParlay(legs, 2)
	if result.FinalOutcome != "won" {
		t.Fatalf("expected won, got %s", result.FinalOutcome)
	}
	// Dead heat leg: adjusted = 1.0 + (2.00 - 1.0) * 0.5 = 1.50
	// Combined: 1.50 × 1.50 × 1.80 = 4.05
	expected := 1.50 * 1.50 * 1.80
	if !almostEqual(result.PayoutMultiple, expected, 0.001) {
		t.Fatalf("expected payout %.4f, got %.4f", expected, result.PayoutMultiple)
	}
}

func TestSettleParlay_AllPushNothingWon(t *testing.T) {
	legs := []ParlayLegOutcome{
		{LegIndex: 0, Outcome: "push", Odds: 1.50},
		{LegIndex: 1, Outcome: "push", Odds: 2.00},
	}
	result := SettleParlay(legs, 2)
	if result.FinalOutcome != "push" {
		t.Fatalf("expected push, got %s", result.FinalOutcome)
	}
	if result.PayoutMultiple != 1.0 {
		t.Fatalf("expected payout 1.0 (stake return), got %.4f", result.PayoutMultiple)
	}
}

func TestSettleParlay_EmptyLegs(t *testing.T) {
	result := SettleParlay(nil, 2)
	if result.FinalOutcome != "void" {
		t.Fatalf("expected void for empty legs, got %s", result.FinalOutcome)
	}
}

func TestSettleParlay_SingleLegBelowMinLegs(t *testing.T) {
	legs := []ParlayLegOutcome{
		{LegIndex: 0, Outcome: "won", Odds: 2.00},
	}
	result := SettleParlay(legs, 2)
	// 1 leg < minLegs(2), but since no legs are voided, this shouldn't trigger
	// the "below min legs" rule. Single leg that won = won.
	// Actually this tests the "remaining after voids" logic — 1 remaining, 0 voids,
	// so ReducedLegs = 1 which IS < minLegs = 2. This is correct: a 1-leg parlay
	// shouldn't exist (placement should reject it), but if it reaches settlement,
	// it voids because it doesn't meet parlay minimum.
	if result.FinalOutcome != "void" {
		t.Fatalf("expected void (1 leg < minLegs 2), got %s", result.FinalOutcome)
	}
}
