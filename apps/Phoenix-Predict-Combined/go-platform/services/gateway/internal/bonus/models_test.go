package bonus

import (
	"testing"
)

func TestWageringProgressPct_NormalProgress(t *testing.T) {
	pb := PlayerBonus{
		WageringRequiredCents:  10000,
		WageringCompletedCents: 2500,
	}
	pct := pb.WageringProgressPct()
	if pct < 24.9 || pct > 25.1 {
		t.Fatalf("expected ~25%%, got %.2f%%", pct)
	}
}

func TestWageringProgressPct_ZeroRequired(t *testing.T) {
	pb := PlayerBonus{
		WageringRequiredCents:  0,
		WageringCompletedCents: 0,
	}
	pct := pb.WageringProgressPct()
	if pct != 100.0 {
		t.Fatalf("expected 100%% when no wagering required, got %.2f%%", pct)
	}
}

func TestWageringProgressPct_Complete(t *testing.T) {
	pb := PlayerBonus{
		WageringRequiredCents:  5000,
		WageringCompletedCents: 5000,
	}
	pct := pb.WageringProgressPct()
	if pct != 100.0 {
		t.Fatalf("expected 100%% when complete, got %.2f%%", pct)
	}
}

func TestWageringProgressPct_OverComplete(t *testing.T) {
	pb := PlayerBonus{
		WageringRequiredCents:  5000,
		WageringCompletedCents: 7500,
	}
	pct := pb.WageringProgressPct()
	if pct != 100.0 {
		t.Fatalf("expected capped at 100%%, got %.2f%%", pct)
	}
}

func TestWageringProgressPct_HalfWay(t *testing.T) {
	pb := PlayerBonus{
		WageringRequiredCents:  10000,
		WageringCompletedCents: 5000,
	}
	pct := pb.WageringProgressPct()
	if pct < 49.9 || pct > 50.1 {
		t.Fatalf("expected ~50%%, got %.2f%%", pct)
	}
}

func TestWageringProgressPct_NegativeRequired(t *testing.T) {
	pb := PlayerBonus{
		WageringRequiredCents:  -100,
		WageringCompletedCents: 0,
	}
	pct := pb.WageringProgressPct()
	// Negative required treated same as zero — 100%
	if pct != 100.0 {
		t.Fatalf("expected 100%% for negative requirement, got %.2f%%", pct)
	}
}
