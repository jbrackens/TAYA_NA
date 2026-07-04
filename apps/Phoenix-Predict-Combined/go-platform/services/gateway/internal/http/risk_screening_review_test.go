package http

import (
	"context"
	"errors"
	"testing"

	"phoenix-revival/gateway/internal/risk"
)

// fakeRiskOverrideStore records SetOverride/ClearOverride and serves a
// preloaded rating for Get, so applyScreeningReviewToRisk is testable with no DB.
type fakeRiskOverrideStore struct {
	rating       *risk.Rating
	getErr       error
	setCalls     []risk.Tier
	setBy        []string
	clearCalls   int
	setErr       error
	clearErr     error
	recomputeFor []string
}

func (f *fakeRiskOverrideStore) SetOverride(_ context.Context, _ string, tier risk.Tier, by, _ string) error {
	f.setCalls = append(f.setCalls, tier)
	f.setBy = append(f.setBy, by)
	return f.setErr
}
func (f *fakeRiskOverrideStore) ClearOverride(_ context.Context, _ string) error {
	f.clearCalls++
	return f.clearErr
}
func (f *fakeRiskOverrideStore) Get(_ context.Context, _ string) (*risk.Rating, error) {
	return f.rating, f.getErr
}

// TestApplyScreeningReviewToRisk (verification #24 MED fix) locks the durable
// risk consequence of a screening review.
func TestApplyScreeningReviewToRisk(t *testing.T) {
	rec := func(f *fakeRiskOverrideStore) func(context.Context, string) error {
		return func(_ context.Context, subjectID string) error {
			f.recomputeFor = append(f.recomputeFor, subjectID)
			return nil
		}
	}

	// confirmed → sets a prohibited override tagged screening-review, then recomputes.
	t.Run("confirmed sets prohibited override", func(t *testing.T) {
		f := &fakeRiskOverrideStore{}
		applyScreeningReviewToRisk(context.Background(), f, rec(f), "u-1", "confirmed")
		if len(f.setCalls) != 1 || f.setCalls[0] != risk.TierProhibited {
			t.Fatalf("expected one prohibited SetOverride, got %v", f.setCalls)
		}
		if f.setBy[0] != screeningOverrideActor {
			t.Fatalf("override must be tagged %q, got %q", screeningOverrideActor, f.setBy[0])
		}
		if f.clearCalls != 0 {
			t.Fatal("confirmed must not clear")
		}
		if len(f.recomputeFor) != 1 {
			t.Fatalf("expected a recompute, got %v", f.recomputeFor)
		}
	})

	// cleared + the override is OURS → clears it, then recomputes.
	t.Run("cleared removes our screening override", func(t *testing.T) {
		f := &fakeRiskOverrideStore{rating: &risk.Rating{OverrideBy: screeningOverrideActor, OverrideTier: risk.TierProhibited}}
		applyScreeningReviewToRisk(context.Background(), f, rec(f), "u-1", "cleared")
		if f.clearCalls != 1 {
			t.Fatalf("expected ClearOverride once, got %d", f.clearCalls)
		}
		if len(f.setCalls) != 0 {
			t.Fatal("cleared must not set an override")
		}
		if len(f.recomputeFor) != 1 {
			t.Fatalf("expected a recompute, got %v", f.recomputeFor)
		}
	})

	// cleared but the override is a MANUAL admin one → must NOT be clobbered.
	t.Run("cleared preserves a manual admin override", func(t *testing.T) {
		f := &fakeRiskOverrideStore{rating: &risk.Rating{OverrideBy: "admin-9", OverrideTier: risk.TierProhibited}}
		applyScreeningReviewToRisk(context.Background(), f, rec(f), "u-1", "cleared")
		if f.clearCalls != 0 {
			t.Fatal("a manual admin override must not be cleared by a screening-clear")
		}
	})

	// cleared with no rating yet (Get errors) → no clear, still recomputes.
	t.Run("cleared with no rating", func(t *testing.T) {
		f := &fakeRiskOverrideStore{getErr: errors.New("not found")}
		applyScreeningReviewToRisk(context.Background(), f, rec(f), "u-1", "cleared")
		if f.clearCalls != 0 {
			t.Fatal("no rating → nothing to clear")
		}
		if len(f.recomputeFor) != 1 {
			t.Fatalf("expected a recompute, got %v", f.recomputeFor)
		}
	})
}
