package provider

import (
	"fmt"
	"strings"
)

func RenderPrometheusFeedMetrics(service string, runtime *Runtime, thresholds FeedThresholds) string {
	enabled := runtime != nil && runtime.IsStarted()
	streams := []StreamStatus{}
	partitions := []SportPartitionStatus{}
	cancelMetrics := CancelMetrics{}
	if runtime != nil {
		streams = runtime.Snapshot()
		partitions = runtime.PartitionSnapshot()
		cancelMetrics = runtime.CancelMetrics()
	}
	summary := SummarizeFeedHealth(streams, thresholds)

	var builder strings.Builder

	builder.WriteString("# HELP phoenix_provider_runtime_enabled Provider runtime enabled state.\n")
	builder.WriteString("# TYPE phoenix_provider_runtime_enabled gauge\n")
	builder.WriteString(fmt.Sprintf(
		"phoenix_provider_runtime_enabled{service=\"%s\"} %d\n",
		escapePrometheusLabel(service),
		boolToMetric(enabled),
	))

	builder.WriteString("# HELP phoenix_provider_streams_total Total provider streams observed.\n")
	builder.WriteString("# TYPE phoenix_provider_streams_total gauge\n")
	builder.WriteString(fmt.Sprintf(
		"phoenix_provider_streams_total{service=\"%s\"} %d\n",
		escapePrometheusLabel(service),
		summary.StreamCount,
	))

	builder.WriteString("# HELP phoenix_provider_streams_unhealthy_total Total provider streams currently breaching SLO or in error.\n")
	builder.WriteString("# TYPE phoenix_provider_streams_unhealthy_total gauge\n")
	builder.WriteString(fmt.Sprintf(
		"phoenix_provider_streams_unhealthy_total{service=\"%s\"} %d\n",
		escapePrometheusLabel(service),
		summary.UnhealthyStreams,
	))
	builder.WriteString("# HELP phoenix_provider_partitions_total Total provider sport partitions observed.\n")
	builder.WriteString("# TYPE phoenix_provider_partitions_total gauge\n")
	builder.WriteString(fmt.Sprintf(
		"phoenix_provider_partitions_total{service=\"%s\"} %d\n",
		escapePrometheusLabel(service),
		len(partitions),
	))

	builder.WriteString("# HELP phoenix_provider_cancel_attempts_total Total provider cancel attempts.\n")
	builder.WriteString("# TYPE phoenix_provider_cancel_attempts_total counter\n")
	builder.WriteString(fmt.Sprintf(
		"phoenix_provider_cancel_attempts_total{service=\"%s\"} %d\n",
		escapePrometheusLabel(service),
		cancelMetrics.TotalAttempts,
	))

	builder.WriteString("# HELP phoenix_provider_cancel_retries_total Total provider cancel retries.\n")
	builder.WriteString("# TYPE phoenix_provider_cancel_retries_total counter\n")
	builder.WriteString(fmt.Sprintf(
		"phoenix_provider_cancel_retries_total{service=\"%s\"} %d\n",
		escapePrometheusLabel(service),
		cancelMetrics.TotalRetries,
	))

	builder.WriteString("# HELP phoenix_provider_cancel_fallback_total Total provider cancels completed via fallback adapter.\n")
	builder.WriteString("# TYPE phoenix_provider_cancel_fallback_total counter\n")
	builder.WriteString(fmt.Sprintf(
		"phoenix_provider_cancel_fallback_total{service=\"%s\"} %d\n",
		escapePrometheusLabel(service),
		cancelMetrics.TotalFallback,
	))

	builder.WriteString("# HELP phoenix_provider_cancel_success_total Total successful provider cancels.\n")
	builder.WriteString("# TYPE phoenix_provider_cancel_success_total counter\n")
	builder.WriteString(fmt.Sprintf(
		"phoenix_provider_cancel_success_total{service=\"%s\"} %d\n",
		escapePrometheusLabel(service),
		cancelMetrics.TotalSuccess,
	))

	builder.WriteString("# HELP phoenix_provider_cancel_failed_total Total failed provider cancels.\n")
	builder.WriteString("# TYPE phoenix_provider_cancel_failed_total counter\n")
	builder.WriteString(fmt.Sprintf(
		"phoenix_provider_cancel_failed_total{service=\"%s\"} %d\n",
		escapePrometheusLabel(service),
		cancelMetrics.TotalFailed,
	))

	builder.WriteString("# HELP phoenix_provider_stream_applied_total Applied provider events per stream.\n")
	builder.WriteString("# TYPE phoenix_provider_stream_applied_total counter\n")
	builder.WriteString("# HELP phoenix_provider_stream_skipped_total Skipped provider events per stream.\n")
	builder.WriteString("# TYPE phoenix_provider_stream_skipped_total counter\n")
	builder.WriteString("# HELP phoenix_provider_stream_filtered_total Filtered provider events per stream.\n")
	builder.WriteString("# TYPE phoenix_provider_stream_filtered_total counter\n")
	builder.WriteString("# HELP phoenix_provider_stream_replay_total Replay processed events per stream.\n")
	builder.WriteString("# TYPE phoenix_provider_stream_replay_total counter\n")
	builder.WriteString("# HELP phoenix_provider_stream_snapshot_applied_total Applied snapshot events per stream.\n")
	builder.WriteString("# TYPE phoenix_provider_stream_snapshot_applied_total counter\n")
	builder.WriteString("# HELP phoenix_provider_stream_snapshot_skipped_total Skipped snapshot events per stream.\n")
	builder.WriteString("# TYPE phoenix_provider_stream_snapshot_skipped_total counter\n")
	builder.WriteString("# HELP phoenix_provider_stream_throttle_events_total Number of throttle waits applied per stream.\n")
	builder.WriteString("# TYPE phoenix_provider_stream_throttle_events_total counter\n")
	builder.WriteString("# HELP phoenix_provider_stream_throttle_delay_ms_total Total throttle wait delay in milliseconds per stream.\n")
	builder.WriteString("# TYPE phoenix_provider_stream_throttle_delay_ms_total counter\n")
	builder.WriteString("# HELP phoenix_provider_stream_duplicates_total Duplicate provider events per stream.\n")
	builder.WriteString("# TYPE phoenix_provider_stream_duplicates_total counter\n")
	builder.WriteString("# HELP phoenix_provider_stream_gaps_total Gap detections per stream.\n")
	builder.WriteString("# TYPE phoenix_provider_stream_gaps_total counter\n")
	builder.WriteString("# HELP phoenix_provider_stream_errors_total Stream processing errors per stream.\n")
	builder.WriteString("# TYPE phoenix_provider_stream_errors_total counter\n")
	builder.WriteString("# HELP phoenix_provider_stream_last_lag_ms Last observed stream lag in milliseconds.\n")
	builder.WriteString("# TYPE phoenix_provider_stream_last_lag_ms gauge\n")
	builder.WriteString("# HELP phoenix_provider_stream_unhealthy SLO/error unhealthy signal per stream.\n")
	builder.WriteString("# TYPE phoenix_provider_stream_unhealthy gauge\n")
	builder.WriteString("# HELP phoenix_provider_stream_slo_breach SLO breach signal per stream by type.\n")
	builder.WriteString("# TYPE phoenix_provider_stream_slo_breach gauge\n")

	for _, stream := range streams {
		baseLabels := fmt.Sprintf(
			`service="%s",adapter="%s",stream="%s"`,
			escapePrometheusLabel(service),
			escapePrometheusLabel(stream.Adapter),
			escapePrometheusLabel(string(stream.Stream)),
		)
		lagBreach := IsLagBreach(stream, thresholds)
		gapBreach := IsGapBreach(stream, thresholds)
		dupeBreach := IsDuplicateBreach(stream, thresholds)
		errorState := IsErrorState(stream)
		unhealthy := lagBreach || gapBreach || dupeBreach || errorState

		builder.WriteString(fmt.Sprintf("phoenix_provider_stream_applied_total{%s} %d\n", baseLabels, stream.Applied))
		builder.WriteString(fmt.Sprintf("phoenix_provider_stream_skipped_total{%s} %d\n", baseLabels, stream.Skipped))
		builder.WriteString(fmt.Sprintf("phoenix_provider_stream_filtered_total{%s} %d\n", baseLabels, stream.FilteredCount))
		builder.WriteString(fmt.Sprintf("phoenix_provider_stream_replay_total{%s} %d\n", baseLabels, stream.ReplayCount))
		builder.WriteString(fmt.Sprintf("phoenix_provider_stream_snapshot_applied_total{%s} %d\n", baseLabels, stream.SnapshotApplied))
		builder.WriteString(fmt.Sprintf("phoenix_provider_stream_snapshot_skipped_total{%s} %d\n", baseLabels, stream.SnapshotSkipped))
		builder.WriteString(fmt.Sprintf("phoenix_provider_stream_throttle_events_total{%s} %d\n", baseLabels, stream.ThrottleEvents))
		builder.WriteString(fmt.Sprintf("phoenix_provider_stream_throttle_delay_ms_total{%s} %d\n", baseLabels, stream.ThrottleDelayMs))
		builder.WriteString(fmt.Sprintf("phoenix_provider_stream_duplicates_total{%s} %d\n", baseLabels, stream.DuplicateCount))
		builder.WriteString(fmt.Sprintf("phoenix_provider_stream_gaps_total{%s} %d\n", baseLabels, stream.GapCount))
		builder.WriteString(fmt.Sprintf("phoenix_provider_stream_errors_total{%s} %d\n", baseLabels, stream.ErrorCount))
		builder.WriteString(fmt.Sprintf("phoenix_provider_stream_last_lag_ms{%s} %d\n", baseLabels, stream.LastLagMs))
		builder.WriteString(fmt.Sprintf("phoenix_provider_stream_unhealthy{%s} %d\n", baseLabels, boolToMetric(unhealthy)))

		builder.WriteString(fmt.Sprintf(
			`phoenix_provider_stream_slo_breach{%s,type="lag"} %d`+"\n",
			baseLabels,
			boolToMetric(lagBreach),
		))
		builder.WriteString(fmt.Sprintf(
			`phoenix_provider_stream_slo_breach{%s,type="gap"} %d`+"\n",
			baseLabels,
			boolToMetric(gapBreach),
		))
		builder.WriteString(fmt.Sprintf(
			`phoenix_provider_stream_slo_breach{%s,type="duplicate"} %d`+"\n",
			baseLabels,
			boolToMetric(dupeBreach),
		))
		builder.WriteString(fmt.Sprintf(
			`phoenix_provider_stream_slo_breach{%s,type="error"} %d`+"\n",
			baseLabels,
			boolToMetric(errorState),
		))
	}

	builder.WriteString("# HELP phoenix_provider_partition_applied_total Applied provider events per sport partition.\n")
	builder.WriteString("# TYPE phoenix_provider_partition_applied_total counter\n")
	builder.WriteString("# HELP phoenix_provider_partition_skipped_total Skipped provider events per sport partition.\n")
	builder.WriteString("# TYPE phoenix_provider_partition_skipped_total counter\n")
	builder.WriteString("# HELP phoenix_provider_partition_filtered_total Filtered provider events per sport partition.\n")
	builder.WriteString("# TYPE phoenix_provider_partition_filtered_total counter\n")
	builder.WriteString("# HELP phoenix_provider_partition_replay_total Replay processed events per sport partition.\n")
	builder.WriteString("# TYPE phoenix_provider_partition_replay_total counter\n")
	builder.WriteString("# HELP phoenix_provider_partition_duplicates_total Duplicate provider events per sport partition.\n")
	builder.WriteString("# TYPE phoenix_provider_partition_duplicates_total counter\n")
	builder.WriteString("# HELP phoenix_provider_partition_gaps_total Gap detections per sport partition.\n")
	builder.WriteString("# TYPE phoenix_provider_partition_gaps_total counter\n")
	builder.WriteString("# HELP phoenix_provider_partition_errors_total Processing errors per sport partition.\n")
	builder.WriteString("# TYPE phoenix_provider_partition_errors_total counter\n")
	builder.WriteString("# HELP phoenix_provider_partition_last_lag_ms Last observed partition lag in milliseconds.\n")
	builder.WriteString("# TYPE phoenix_provider_partition_last_lag_ms gauge\n")
	builder.WriteString("# HELP phoenix_provider_partition_unhealthy SLO/error unhealthy signal per sport partition.\n")
	builder.WriteString("# TYPE phoenix_provider_partition_unhealthy gauge\n")

	for _, partition := range partitions {
		baseLabels := fmt.Sprintf(
			`service="%s",adapter="%s",stream="%s",sport="%s"`,
			escapePrometheusLabel(service),
			escapePrometheusLabel(partition.Adapter),
			escapePrometheusLabel(string(partition.Stream)),
			escapePrometheusLabel(partition.SportKey),
		)
		streamView := StreamStatus{
			State:          partition.State,
			LastError:      partition.LastError,
			LastLagMs:      partition.LastLagMs,
			GapCount:       partition.GapCount,
			DuplicateCount: partition.DuplicateCount,
		}
		unhealthy := IsLagBreach(streamView, thresholds) ||
			IsGapBreach(streamView, thresholds) ||
			IsDuplicateBreach(streamView, thresholds) ||
			IsErrorState(streamView)

		builder.WriteString(fmt.Sprintf("phoenix_provider_partition_applied_total{%s} %d\n", baseLabels, partition.Applied))
		builder.WriteString(fmt.Sprintf("phoenix_provider_partition_skipped_total{%s} %d\n", baseLabels, partition.Skipped))
		builder.WriteString(fmt.Sprintf("phoenix_provider_partition_filtered_total{%s} %d\n", baseLabels, partition.FilteredCount))
		builder.WriteString(fmt.Sprintf("phoenix_provider_partition_replay_total{%s} %d\n", baseLabels, partition.ReplayCount))
		builder.WriteString(fmt.Sprintf("phoenix_provider_partition_duplicates_total{%s} %d\n", baseLabels, partition.DuplicateCount))
		builder.WriteString(fmt.Sprintf("phoenix_provider_partition_gaps_total{%s} %d\n", baseLabels, partition.GapCount))
		builder.WriteString(fmt.Sprintf("phoenix_provider_partition_errors_total{%s} %d\n", baseLabels, partition.ErrorCount))
		builder.WriteString(fmt.Sprintf("phoenix_provider_partition_last_lag_ms{%s} %d\n", baseLabels, partition.LastLagMs))
		builder.WriteString(fmt.Sprintf("phoenix_provider_partition_unhealthy{%s} %d\n", baseLabels, boolToMetric(unhealthy)))
	}

	builder.WriteString("# HELP phoenix_provider_slo_threshold SLO threshold values used to evaluate provider stream health.\n")
	builder.WriteString("# TYPE phoenix_provider_slo_threshold gauge\n")
	builder.WriteString(fmt.Sprintf(
		`phoenix_provider_slo_threshold{service="%s",type="lag_ms"} %d`+"\n",
		escapePrometheusLabel(service),
		thresholds.MaxLagMs,
	))
	builder.WriteString(fmt.Sprintf(
		`phoenix_provider_slo_threshold{service="%s",type="gap_count"} %d`+"\n",
		escapePrometheusLabel(service),
		thresholds.MaxGapCount,
	))
	builder.WriteString(fmt.Sprintf(
		`phoenix_provider_slo_threshold{service="%s",type="duplicate_count"} %d`+"\n",
		escapePrometheusLabel(service),
		thresholds.MaxDuplicateCount,
	))

	return builder.String()
}

func boolToMetric(value bool) int {
	if value {
		return 1
	}
	return 0
}

func escapePrometheusLabel(value string) string {
	replacer := strings.NewReplacer(`\`, `\\`, `"`, `\"`, "\n", `\n`)
	return replacer.Replace(value)
}
