package feed

import (
	"errors"
	"testing"
)

// TestHealthTrackerAlertsOnceThenRecovers verifies the failure streak only
// alerts when it first crosses the threshold (no per-tick spam), reports
// unhealthy in the snapshot, and recovers cleanly on the next success.
func TestHealthTrackerAlertsOnceThenRecovers(t *testing.T) {
	tr := NewHealthTracker()
	const src = "api-feed-crypto"
	boom := errors.New("coingecko 503")

	// Below threshold: no alert.
	for i := 1; i < DefaultUnhealthyThreshold; i++ {
		if tr.RecordFailure(src, boom) {
			t.Fatalf("failure %d should not alert (threshold %d)", i, DefaultUnhealthyThreshold)
		}
	}
	// Crossing the threshold alerts exactly once.
	if !tr.RecordFailure(src, boom) {
		t.Fatal("failure at threshold should alert")
	}
	if tr.RecordFailure(src, boom) {
		t.Fatal("subsequent failures must not re-alert during the same episode")
	}

	snap := snapshotFor(t, tr, src)
	if snap.Healthy {
		t.Fatal("source should be unhealthy after crossing the threshold")
	}
	if snap.ConsecutiveFailures != DefaultUnhealthyThreshold+1 {
		t.Fatalf("consecutiveFailures: got %d, want %d", snap.ConsecutiveFailures, DefaultUnhealthyThreshold+1)
	}
	if snap.LastError != boom.Error() {
		t.Fatalf("lastError: got %q, want %q", snap.LastError, boom.Error())
	}

	// Recovery: the first success after an unhealthy episode reports recovered.
	if !tr.RecordSuccess(src) {
		t.Fatal("first success after unhealthy episode should report recovered=true")
	}
	if tr.RecordSuccess(src) {
		t.Fatal("a healthy source should not report recovered on every success")
	}
	snap = snapshotFor(t, tr, src)
	if !snap.Healthy || snap.ConsecutiveFailures != 0 {
		t.Fatalf("after recovery: healthy=%v consecutiveFailures=%d", snap.Healthy, snap.ConsecutiveFailures)
	}
	if snap.TotalFailures != int64(DefaultUnhealthyThreshold+1) || snap.TotalSuccesses != 2 {
		t.Fatalf("totals: failures=%d successes=%d", snap.TotalFailures, snap.TotalSuccesses)
	}
}

func snapshotFor(t *testing.T, tr *HealthTracker, src string) SourceHealth {
	t.Helper()
	for _, s := range tr.Snapshot() {
		if s.Source == src {
			return s
		}
	}
	t.Fatalf("no health snapshot for source %q", src)
	return SourceHealth{}
}
