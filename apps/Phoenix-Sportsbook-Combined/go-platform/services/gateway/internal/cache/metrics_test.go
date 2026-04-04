package cache

import (
	"strings"
	"testing"
	"time"
)

func TestCacheMetricsRecordHit(t *testing.T) {
	metrics := NewCacheMetrics()

	metrics.RecordHit("fixture")
	metrics.RecordHit("fixture")

	metric, ok := metrics.GetMetric("fixture")
	if !ok {
		t.Fatalf("metric not found")
	}

	if metric.Hits != 2 {
		t.Errorf("expected 2 hits, got %d", metric.Hits)
	}
	if metric.Misses != 0 {
		t.Errorf("expected 0 misses, got %d", metric.Misses)
	}
	if metric.HitRate != 1.0 {
		t.Errorf("expected hit rate 1.0, got %.4f", metric.HitRate)
	}
}

func TestCacheMetricsRecordMiss(t *testing.T) {
	metrics := NewCacheMetrics()

	metrics.RecordMiss("market")
	metrics.RecordMiss("market")
	metrics.RecordMiss("market")

	metric, ok := metrics.GetMetric("market")
	if !ok {
		t.Fatalf("metric not found")
	}

	if metric.Hits != 0 {
		t.Errorf("expected 0 hits, got %d", metric.Hits)
	}
	if metric.Misses != 3 {
		t.Errorf("expected 3 misses, got %d", metric.Misses)
	}
	if metric.HitRate != 0.0 {
		t.Errorf("expected hit rate 0.0, got %.4f", metric.HitRate)
	}
}

func TestCacheMetricsHitRate(t *testing.T) {
	metrics := NewCacheMetrics()

	// Record 7 hits and 3 misses = 70% hit rate
	for i := 0; i < 7; i++ {
		metrics.RecordHit("punter")
	}
	for i := 0; i < 3; i++ {
		metrics.RecordMiss("punter")
	}

	metric, ok := metrics.GetMetric("punter")
	if !ok {
		t.Fatalf("metric not found")
	}

	expectedRate := 0.7
	if metric.HitRate < expectedRate-0.01 || metric.HitRate > expectedRate+0.01 {
		t.Errorf("expected hit rate ~%.4f, got %.4f", expectedRate, metric.HitRate)
	}
}

func TestCacheMetricsRecordError(t *testing.T) {
	metrics := NewCacheMetrics()

	metrics.RecordHit("bet")
	metrics.RecordError("bet")
	metrics.RecordError("bet")

	metric, ok := metrics.GetMetric("bet")
	if !ok {
		t.Fatalf("metric not found")
	}

	if metric.Errors != 2 {
		t.Errorf("expected 2 errors, got %d", metric.Errors)
	}
	if metric.Hits != 1 {
		t.Errorf("expected 1 hit, got %d", metric.Hits)
	}
}

func TestCacheMetricsSnapshot(t *testing.T) {
	metrics := NewCacheMetrics()

	metrics.RecordHit("fixture")
	metrics.RecordMiss("market")
	metrics.RecordHit("punter")

	snapshot := metrics.Snapshot()
	if len(snapshot) != 3 {
		t.Errorf("expected 3 metrics, got %d", len(snapshot))
	}

	// Verify ordering (should be alphabetical by entity)
	if snapshot[0].Entity != "fixture" || snapshot[1].Entity != "market" || snapshot[2].Entity != "punter" {
		t.Errorf("metrics not sorted correctly: %v", snapshot)
	}
}

func TestCacheMetricsMultipleEntities(t *testing.T) {
	metrics := NewCacheMetrics()

	// Different entities
	metrics.RecordHit("fixture")
	metrics.RecordMiss("fixture")

	metrics.RecordHit("market")
	metrics.RecordHit("market")
	metrics.RecordHit("market")

	metrics.RecordMiss("punter")
	metrics.RecordMiss("punter")
	metrics.RecordMiss("punter")
	metrics.RecordMiss("punter")

	snapshot := metrics.Snapshot()
	if len(snapshot) != 3 {
		t.Errorf("expected 3 metrics, got %d", len(snapshot))
	}

	// Find each metric
	var fixtureMetric, marketMetric, punterMetric CacheMetric
	for _, m := range snapshot {
		switch m.Entity {
		case "fixture":
			fixtureMetric = m
		case "market":
			marketMetric = m
		case "punter":
			punterMetric = m
		}
	}

	// Verify fixture metrics
	if fixtureMetric.Hits != 1 || fixtureMetric.Misses != 1 {
		t.Errorf("fixture metrics incorrect: hits=%d misses=%d", fixtureMetric.Hits, fixtureMetric.Misses)
	}

	// Verify market metrics
	if marketMetric.Hits != 3 || marketMetric.Misses != 0 {
		t.Errorf("market metrics incorrect: hits=%d misses=%d", marketMetric.Hits, marketMetric.Misses)
	}

	// Verify punter metrics
	if punterMetric.Hits != 0 || punterMetric.Misses != 4 {
		t.Errorf("punter metrics incorrect: hits=%d misses=%d", punterMetric.Hits, punterMetric.Misses)
	}
}

func TestCacheMetricsReset(t *testing.T) {
	metrics := NewCacheMetrics()

	metrics.RecordHit("fixture")
	metrics.RecordHit("fixture")
	metrics.RecordMiss("market")

	snapshot := metrics.Snapshot()
	if len(snapshot) != 2 {
		t.Errorf("expected 2 metrics before reset, got %d", len(snapshot))
	}

	metrics.Reset()

	snapshot = metrics.Snapshot()
	if len(snapshot) != 0 {
		t.Errorf("expected 0 metrics after reset, got %d", len(snapshot))
	}
}

func TestCacheMetricsPrometheus(t *testing.T) {
	metrics := NewCacheMetrics()

	metrics.RecordHit("fixture")
	metrics.RecordHit("fixture")
	metrics.RecordMiss("fixture")

	prometheus := metrics.FormatPrometheus()

	// Verify Prometheus format
	if !strings.Contains(prometheus, "# HELP") {
		t.Errorf("missing HELP comment")
	}
	if !strings.Contains(prometheus, "# TYPE") {
		t.Errorf("missing TYPE comment")
	}
	if !strings.Contains(prometheus, "gateway_cache_hits_total") {
		t.Errorf("missing hits metric")
	}
	if !strings.Contains(prometheus, "gateway_cache_misses_total") {
		t.Errorf("missing misses metric")
	}
	if !strings.Contains(prometheus, "gateway_cache_errors_total") {
		t.Errorf("missing errors metric")
	}
	if !strings.Contains(prometheus, "gateway_cache_hit_rate") {
		t.Errorf("missing hit_rate metric")
	}

	// Verify entity labels
	if !strings.Contains(prometheus, `entity="fixture"`) {
		t.Errorf("missing entity label")
	}

	// Verify values
	if !strings.Contains(prometheus, "2") { // 2 hits
		t.Errorf("missing hit count")
	}
	if !strings.Contains(prometheus, "1") { // 1 miss
		t.Errorf("missing miss count")
	}
}

func TestCacheMetricsLastUpdate(t *testing.T) {
	metrics := NewCacheMetrics()

	metrics.RecordHit("fixture")
	metric1, _ := metrics.GetMetric("fixture")
	if metric1.LastUpdate == "" {
		t.Errorf("last update not set")
	}

	// Record another event (sleep to ensure timestamp changes)
	time.Sleep(2 * time.Millisecond)
	metrics.RecordMiss("fixture")
	metric2, _ := metrics.GetMetric("fixture")

	// Last update should be updated
	if metric2.LastUpdate == metric1.LastUpdate {
		t.Errorf("last update should have changed")
	}
}
