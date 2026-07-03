package aml

import (
	"testing"
	"time"
)

// The regime-agnostic default: with no rules loaded, nothing fires.
func TestEvaluateNoRulesNoAlerts(t *testing.T) {
	got := Evaluate(nil, MoneyEvent{SubjectID: "u-1", Kind: "deposit", AmountCents: 1_000_000}, SubjectWindow{})
	if len(got) != 0 {
		t.Fatalf("no rules must produce no alerts, got %d", len(got))
	}
}

func TestEvaluateAmountThreshold(t *testing.T) {
	rule := Rule{ID: 1, Name: "large-deposit", Kind: "amount_threshold", RiskPoints: 30, Severity: "high",
		Enabled: true, Params: map[string]any{"thresholdCents": 1_000_000, "kinds": "deposit"}}

	// At threshold → fires with the rule's risk points.
	at := Evaluate([]Rule{rule}, MoneyEvent{SubjectID: "u-1", Kind: "deposit", AmountCents: 1_000_000, Reference: "l-1"}, SubjectWindow{})
	if len(at) != 1 || at[0].RiskPoints != 30 || at[0].Severity != "high" || at[0].SubjectID != "u-1" {
		t.Fatalf("at-threshold: want 1 high alert w/30pts, got %+v", at)
	}
	if at[0].DedupeKey != "aml:1:u-1:l-1" {
		t.Fatalf("dedupe key: got %q", at[0].DedupeKey)
	}
	// Below threshold → no fire.
	if got := Evaluate([]Rule{rule}, MoneyEvent{SubjectID: "u-1", Kind: "deposit", AmountCents: 999_999, Reference: "l-2"}, SubjectWindow{}); len(got) != 0 {
		t.Fatalf("below threshold must not fire, got %d", len(got))
	}
	// Wrong kind → no fire (kinds filter).
	if got := Evaluate([]Rule{rule}, MoneyEvent{SubjectID: "u-1", Kind: "withdrawal", AmountCents: 2_000_000, Reference: "l-3"}, SubjectWindow{}); len(got) != 0 {
		t.Fatalf("wrong kind must not fire, got %d", len(got))
	}
}

func TestEvaluateVelocity(t *testing.T) {
	rule := Rule{ID: 2, Name: "rapid-withdrawals", Kind: "velocity", RiskPoints: 20, Enabled: true,
		Params: map[string]any{"count": 5, "windowSeconds": 3600, "kinds": "withdrawal"}}
	ev := MoneyEvent{SubjectID: "u-2", Kind: "withdrawal", AmountCents: 100, Reference: "l-9"}

	// 5 within the hour → fires.
	fires := Evaluate([]Rule{rule}, ev, SubjectWindow{CountWithin: func(time.Duration) int { return 5 }})
	if len(fires) != 1 || fires[0].RuleID != 2 {
		t.Fatalf("velocity at threshold should fire once, got %+v", fires)
	}
	// 4 within the hour → no fire.
	if got := Evaluate([]Rule{rule}, ev, SubjectWindow{CountWithin: func(time.Duration) int { return 4 }}); len(got) != 0 {
		t.Fatalf("velocity below threshold must not fire, got %d", len(got))
	}
	// Missing window function → cannot evaluate → no fire (fail-safe, not crash).
	if got := Evaluate([]Rule{rule}, ev, SubjectWindow{}); len(got) != 0 {
		t.Fatalf("missing window fn must not fire, got %d", len(got))
	}
}

func TestEvaluateAggregate(t *testing.T) {
	rule := Rule{ID: 3, Name: "structuring", Kind: "aggregate", RiskPoints: 40, Severity: "high", Enabled: true,
		Params: map[string]any{"thresholdCents": 5_000_000, "windowSeconds": 86400}}
	ev := MoneyEvent{SubjectID: "u-3", Kind: "deposit", AmountCents: 500_000, Reference: "l-20"}

	fires := Evaluate([]Rule{rule}, ev, SubjectWindow{SumWithinCents: func(time.Duration) int64 { return 5_000_000 }})
	if len(fires) != 1 || fires[0].RiskPoints != 40 {
		t.Fatalf("aggregate at threshold should fire, got %+v", fires)
	}
	if got := Evaluate([]Rule{rule}, ev, SubjectWindow{SumWithinCents: func(time.Duration) int64 { return 4_999_999 }}); len(got) != 0 {
		t.Fatalf("aggregate below threshold must not fire, got %d", len(got))
	}
}

// A disabled rule never fires even if passed to Evaluate.
func TestEvaluateSkipsDisabled(t *testing.T) {
	rule := Rule{ID: 4, Name: "off", Kind: "amount_threshold", Enabled: false,
		Params: map[string]any{"thresholdCents": 1}}
	if got := Evaluate([]Rule{rule}, MoneyEvent{SubjectID: "u-4", Kind: "deposit", AmountCents: 1_000_000, Reference: "l-30"}, SubjectWindow{}); len(got) != 0 {
		t.Fatalf("disabled rule must not fire, got %d", len(got))
	}
}

// Malformed params must be skipped, not panic (a bad data row can't crash
// monitoring).
func TestEvaluateMalformedParamsSkipped(t *testing.T) {
	rule := Rule{ID: 5, Name: "bad", Kind: "amount_threshold", Enabled: true,
		Params: map[string]any{"thresholdCents": "not-a-number"}}
	if got := Evaluate([]Rule{rule}, MoneyEvent{SubjectID: "u-5", Kind: "deposit", AmountCents: 9_999_999, Reference: "l-40"}, SubjectWindow{}); len(got) != 0 {
		t.Fatalf("malformed threshold must be skipped (treated as 0/disabled), got %d", len(got))
	}
}

// JSON-sourced params (float64 from a jsonb column) evaluate the same as ints.
func TestEvaluateJSONNumberParams(t *testing.T) {
	rule := Rule{ID: 6, Name: "json", Kind: "amount_threshold", RiskPoints: 10, Enabled: true,
		Params: map[string]any{"thresholdCents": float64(1_000_000)}}
	if got := Evaluate([]Rule{rule}, MoneyEvent{SubjectID: "u-6", Kind: "deposit", AmountCents: 1_000_000, Reference: "l-50"}, SubjectWindow{}); len(got) != 1 {
		t.Fatalf("float64 param must evaluate like int, got %d", len(got))
	}
}
