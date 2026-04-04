package provider

import (
	"context"
	"strings"
	"testing"
	"time"

	"phoenix-revival/platform/canonical/adapter"
	"phoenix-revival/platform/canonical/replay"
	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

func TestFeedThresholdsFromEnv(t *testing.T) {
	lookup := func(key string) string {
		switch key {
		case "GATEWAY_PROVIDER_SLO_MAX_LAG_MS":
			return "1500"
		case "GATEWAY_PROVIDER_SLO_MAX_GAPS":
			return "2"
		case "GATEWAY_PROVIDER_SLO_MAX_DUPLICATES":
			return "7"
		default:
			return ""
		}
	}

	thresholds := FeedThresholdsFromEnv(lookup)
	if thresholds.MaxLagMs != 1500 {
		t.Fatalf("expected MaxLagMs=1500, got %d", thresholds.MaxLagMs)
	}
	if thresholds.MaxGapCount != 2 {
		t.Fatalf("expected MaxGapCount=2, got %d", thresholds.MaxGapCount)
	}
	if thresholds.MaxDuplicateCount != 7 {
		t.Fatalf("expected MaxDuplicateCount=7, got %d", thresholds.MaxDuplicateCount)
	}
}

func TestSummarizeFeedHealthDetectsBreaches(t *testing.T) {
	thresholds := FeedThresholds{
		MaxLagMs:          1000,
		MaxGapCount:       0,
		MaxDuplicateCount: 0,
	}
	streams := []StreamStatus{
		{
			Adapter:         "odds88-demo",
			Stream:          canonicalv1.StreamDelta,
			State:           "running",
			Applied:         10,
			Skipped:         1,
			FilteredCount:   2,
			ReplayCount:     11,
			SnapshotApplied: 7,
			SnapshotSkipped: 1,
			ThrottleEvents:  2,
			ThrottleDelayMs: 35,
			DuplicateCount:  1,
			GapCount:        2,
			LastLagMs:       3000,
			ErrorCount:      0,
		},
		{
			Adapter:        "betby-demo",
			Stream:         canonicalv1.StreamSettlement,
			State:          "error",
			LastError:      "stream disconnected",
			Applied:        1,
			Skipped:        0,
			FilteredCount:  1,
			ReplayCount:    1,
			DuplicateCount: 0,
			GapCount:       0,
			LastLagMs:      100,
			ErrorCount:     3,
		},
	}

	summary := SummarizeFeedHealth(streams, thresholds)
	if summary.StreamCount != 2 {
		t.Fatalf("expected StreamCount=2, got %d", summary.StreamCount)
	}
	if summary.UnhealthyStreams != 2 {
		t.Fatalf("expected UnhealthyStreams=2, got %d", summary.UnhealthyStreams)
	}
	if summary.LagBreachStreams != 1 {
		t.Fatalf("expected LagBreachStreams=1, got %d", summary.LagBreachStreams)
	}
	if summary.GapBreachStreams != 1 {
		t.Fatalf("expected GapBreachStreams=1, got %d", summary.GapBreachStreams)
	}
	if summary.DupeBreachStreams != 1 {
		t.Fatalf("expected DupeBreachStreams=1, got %d", summary.DupeBreachStreams)
	}
	if summary.ErrorStateStreams != 1 {
		t.Fatalf("expected ErrorStateStreams=1, got %d", summary.ErrorStateStreams)
	}
	if !summary.HasErrors {
		t.Fatal("expected HasErrors=true")
	}
	if summary.TotalErrors != 3 {
		t.Fatalf("expected TotalErrors=3, got %d", summary.TotalErrors)
	}
	if summary.TotalFiltered != 3 {
		t.Fatalf("expected TotalFiltered=3, got %d", summary.TotalFiltered)
	}
	if summary.TotalSnapshotApplied != 7 {
		t.Fatalf("expected TotalSnapshotApplied=7, got %d", summary.TotalSnapshotApplied)
	}
	if summary.TotalSnapshotSkipped != 1 {
		t.Fatalf("expected TotalSnapshotSkipped=1, got %d", summary.TotalSnapshotSkipped)
	}
	if summary.TotalThrottleEvents != 2 {
		t.Fatalf("expected TotalThrottleEvents=2, got %d", summary.TotalThrottleEvents)
	}
	if summary.TotalThrottleDelayMs != 35 {
		t.Fatalf("expected TotalThrottleDelayMs=35, got %d", summary.TotalThrottleDelayMs)
	}
}

func TestSummarizeSportPartitionsGroupsBySportKey(t *testing.T) {
	thresholds := FeedThresholds{
		MaxLagMs:          1000,
		MaxGapCount:       0,
		MaxDuplicateCount: 0,
	}
	partitions := []SportPartitionStatus{
		{
			Adapter:        "odds88-demo",
			Stream:         canonicalv1.StreamDelta,
			SportKey:       "esports",
			State:          "running",
			Applied:        5,
			Skipped:        1,
			ReplayCount:    6,
			DuplicateCount: 1,
			GapCount:       0,
			LastLagMs:      800,
		},
		{
			Adapter:        "betby-demo",
			Stream:         canonicalv1.StreamDelta,
			SportKey:       "mlb",
			State:          "error",
			LastError:      "stream disconnected",
			Applied:        2,
			Skipped:        0,
			FilteredCount:  2,
			ReplayCount:    2,
			DuplicateCount: 0,
			GapCount:       2,
			LastLagMs:      2000,
			ErrorCount:     1,
		},
		{
			Adapter:        "betby-demo",
			Stream:         canonicalv1.StreamMetadata,
			SportKey:       "mlb",
			State:          "running",
			Applied:        3,
			Skipped:        1,
			FilteredCount:  1,
			ReplayCount:    4,
			DuplicateCount: 1,
			GapCount:       0,
			LastLagMs:      300,
		},
	}

	summary := SummarizeSportPartitions(partitions, thresholds)
	if len(summary) != 2 {
		t.Fatalf("expected 2 sport summaries, got %d", len(summary))
	}
	if summary[0].SportKey != "esports" {
		t.Fatalf("expected first sport summary esports, got %s", summary[0].SportKey)
	}
	if summary[0].PartitionCount != 1 || summary[0].TotalApplied != 5 {
		t.Fatalf("unexpected esports summary: %+v", summary[0])
	}
	if summary[1].SportKey != "mlb" {
		t.Fatalf("expected second sport summary mlb, got %s", summary[1].SportKey)
	}
	if summary[1].PartitionCount != 2 || summary[1].TotalApplied != 5 {
		t.Fatalf("unexpected mlb summary: %+v", summary[1])
	}
	if summary[1].TotalFiltered != 3 {
		t.Fatalf("expected mlb filtered total=3, got %d", summary[1].TotalFiltered)
	}
	if summary[1].ErrorStatePartitions != 1 {
		t.Fatalf("expected mlb error partitions=1, got %d", summary[1].ErrorStatePartitions)
	}
	if summary[1].UnhealthyPartitions != 2 {
		t.Fatalf("expected mlb unhealthy partitions=2, got %d", summary[1].UnhealthyPartitions)
	}
}

func TestRenderPrometheusFeedMetricsIncludesStreamSeries(t *testing.T) {
	registry, err := adapter.NewRegistry(NewDemoMultiFeedAdapter("odds88-demo"))
	if err != nil {
		t.Fatalf("expected registry init to succeed, got: %v", err)
	}

	engine := replay.NewEngine(replay.NewMemoryStore())
	sink := NewMemorySink()
	runtime, err := NewRuntime(registry, engine, sink)
	if err != nil {
		t.Fatalf("expected runtime init to succeed, got: %v", err)
	}

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	if err := runtime.Start(ctx); err != nil {
		t.Fatalf("expected runtime start to succeed, got: %v", err)
	}
	waitCtx, waitCancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer waitCancel()
	if err := runtime.Wait(waitCtx); err != nil {
		t.Fatalf("expected runtime wait to succeed, got: %v", err)
	}

	body := RenderPrometheusFeedMetrics("gateway", runtime, DefaultFeedThresholds())
	required := []string{
		`phoenix_provider_runtime_enabled{service="gateway"} 1`,
		"phoenix_provider_stream_applied_total",
		"phoenix_provider_stream_filtered_total",
		"phoenix_provider_partition_applied_total",
		"phoenix_provider_partition_filtered_total",
		"phoenix_provider_stream_snapshot_applied_total",
		"phoenix_provider_stream_throttle_events_total",
		`adapter="odds88-demo",stream="delta"`,
		`sport="esports"`,
		"phoenix_provider_stream_slo_breach",
		`phoenix_provider_slo_threshold{service="gateway",type="lag_ms"}`,
	}
	for _, pattern := range required {
		if !strings.Contains(body, pattern) {
			t.Fatalf("expected metrics output to contain %q", pattern)
		}
	}
}
