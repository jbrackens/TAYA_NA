package prediction

import (
	"strings"
	"testing"
	"time"
)

func TestRecordLatencyRendersCumulativeHistogram(t *testing.T) {
	m := NewMetrics()
	// Exact durations → deterministic bucket placement (no wall-clock jitter).
	m.RecordLatency("place_order", 3*time.Millisecond)   // first le>=3 is 5
	m.RecordLatency("place_order", 30*time.Millisecond)  // first le>=30 is 50
	m.RecordLatency("place_order", 300*time.Millisecond) // first le>=300 is 500

	body := m.Render()

	for _, expected := range []string{
		"# TYPE prediction_operation_duration_ms histogram",
		`prediction_operation_duration_ms_bucket{op="place_order",le="2"} 0`,
		`prediction_operation_duration_ms_bucket{op="place_order",le="5"} 1`,
		`prediction_operation_duration_ms_bucket{op="place_order",le="50"} 2`,
		`prediction_operation_duration_ms_bucket{op="place_order",le="500"} 3`,
		`prediction_operation_duration_ms_bucket{op="place_order",le="+Inf"} 3`,
		`prediction_operation_duration_ms_sum{op="place_order"} 333`,
		`prediction_operation_duration_ms_count{op="place_order"} 3`,
	} {
		if !strings.Contains(body, expected) {
			t.Errorf("render missing %q\n---\n%s", expected, body)
		}
	}
}

func TestRecordLatencyObservationBeyondLargestBucketLandsInInf(t *testing.T) {
	m := NewMetrics()
	m.RecordLatency("settlement", 9*time.Second) // > 5000ms top bucket
	body := m.Render()

	// Largest explicit bucket stays 0; +Inf and count capture the observation.
	if !strings.Contains(body, `prediction_operation_duration_ms_bucket{op="settlement",le="5000"} 0`) {
		t.Errorf("expected le=5000 bucket to be 0 for a 9s observation\n%s", body)
	}
	if !strings.Contains(body, `prediction_operation_duration_ms_bucket{op="settlement",le="+Inf"} 1`) {
		t.Errorf("expected +Inf bucket to be 1\n%s", body)
	}
	if !strings.Contains(body, `prediction_operation_duration_ms_count{op="settlement"} 1`) {
		t.Errorf("expected count 1\n%s", body)
	}
}

func TestRecordLatencyNilAndEmptyAreNoOps(t *testing.T) {
	var m *Metrics
	// nil receiver must not panic.
	m.RecordLatency("place_order", time.Second)

	m2 := NewMetrics()
	m2.RecordLatency("", time.Second) // empty op ignored
	if strings.Contains(m2.Render(), `op=""`) {
		t.Error("empty op should not be recorded")
	}
}
