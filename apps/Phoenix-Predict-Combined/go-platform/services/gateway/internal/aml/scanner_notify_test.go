package aml

import (
	"context"
	"testing"
)

// TestScannerNotifyFlagged (GAP-82 slice 2) covers the risk-recompute fan-out:
// OnAlert fires exactly once per subject that received a new alert, is a no-op
// when unset, and does nothing for an empty set. Pure dispatch — no DB needed.
func TestScannerNotifyFlagged(t *testing.T) {
	ctx := context.Background()

	// Nil OnAlert must be a safe no-op (memory mode / risk subsystem absent).
	(&Scanner{}).notifyFlagged(ctx, map[string]bool{"a": true})

	var got []string
	sc := &Scanner{OnAlert: func(_ context.Context, subjectID string) { got = append(got, subjectID) }}

	sc.notifyFlagged(ctx, map[string]bool{"u-1": true, "u-2": true})
	seen := map[string]int{}
	for _, s := range got {
		seen[s]++
	}
	if len(got) != 2 || seen["u-1"] != 1 || seen["u-2"] != 1 {
		t.Fatalf("expected OnAlert once per flagged subject, got %v", got)
	}

	// Empty flagged set → no calls (a scan that inserted no new alert recomputes
	// nothing).
	got = nil
	sc.notifyFlagged(ctx, map[string]bool{})
	if len(got) != 0 {
		t.Fatalf("empty flagged set must not call OnAlert, got %v", got)
	}
}
