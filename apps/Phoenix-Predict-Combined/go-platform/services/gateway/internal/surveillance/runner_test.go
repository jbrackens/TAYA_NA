package surveillance

import (
	"context"
	"database/sql"
	"sync/atomic"
	"testing"
	"time"
)

// countingDetector is a Detector that touches neither the DB nor the store: it
// records each Scan call and returns no alerts. That lets us exercise the
// Engine.Run ticker loop end-to-end without a live Postgres (no alerts ⇒
// InsertAlert is never called ⇒ the nil store/db are never dereferenced).
type countingDetector struct {
	calls  int64
	lastCh chan struct{}
}

func (*countingDetector) Name() string { return "counting" }

func (d *countingDetector) Scan(_ context.Context, _ *sql.DB, _ time.Time) ([]Alert, error) {
	atomic.AddInt64(&d.calls, 1)
	select {
	case d.lastCh <- struct{}{}:
	default:
	}
	return nil, nil
}

// TestEngineRunTicksAndStops (GAP-78) proves the continuous-surveillance loop:
// Run invokes the detectors on each tick, and returns promptly when the context
// is cancelled. No DB required.
func TestEngineRunTicksAndStops(t *testing.T) {
	det := &countingDetector{lastCh: make(chan struct{}, 4)}
	// Construct the Engine directly with the fake detector (white-box). store/db
	// stay nil: with zero alerts they are never touched.
	engine := &Engine{detectors: []Detector{det}}

	ctx, cancel := context.WithCancel(context.Background())
	done := make(chan struct{})
	go func() {
		engine.Run(ctx, 2*time.Millisecond, time.Minute)
		close(done)
	}()

	// Wait for at least one tick to fire the detector.
	select {
	case <-det.lastCh:
	case <-time.After(2 * time.Second):
		t.Fatal("Run did not invoke the detector within 2s")
	}

	cancel()
	select {
	case <-done:
	case <-time.After(2 * time.Second):
		t.Fatal("Run did not return promptly after context cancellation")
	}

	if got := atomic.LoadInt64(&det.calls); got < 1 {
		t.Fatalf("expected the detector to be scanned at least once, got %d", got)
	}
}
