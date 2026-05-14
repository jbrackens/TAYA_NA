package main

import "testing"

// TestStalePendingCutoff documents the invariant that the cutoff used
// by Phase 0 must be at least 1 minute — any shorter and routine in-flight
// orders during the seed run itself could be mistakenly cancelled. Any
// longer than 1 hour and the demo flow inherits stuck cash. One hour
// matches the runbook on the matcher's worst-case retry window.
func TestStalePendingCutoff(t *testing.T) {
	if stalePendingCutoff.Minutes() < 1 {
		t.Errorf("stalePendingCutoff = %v, must be >= 1 minute to avoid cancelling in-flight seed orders", stalePendingCutoff)
	}
	if stalePendingCutoff.Hours() > 1 {
		t.Errorf("stalePendingCutoff = %v, must be <= 1 hour so demo flow doesn't inherit stuck cash", stalePendingCutoff)
	}
}
