package provider

import (
	"sort"
	"strconv"
	"strings"
)

const (
	defaultMaxLagMs          int64 = 30000
	defaultMaxGapCount       int64 = 0
	defaultMaxDuplicateCount int64 = 50
)

type FeedThresholds struct {
	MaxLagMs          int64 `json:"maxLagMs"`
	MaxGapCount       int64 `json:"maxGapCount"`
	MaxDuplicateCount int64 `json:"maxDuplicateCount"`
}

type FeedSummary struct {
	StreamCount          int   `json:"streamCount"`
	TotalApplied         int64 `json:"totalApplied"`
	TotalSkipped         int64 `json:"totalSkipped"`
	TotalFiltered        int64 `json:"totalFiltered"`
	TotalReplay          int64 `json:"totalReplay"`
	TotalSnapshotApplied int64 `json:"totalSnapshotApplied"`
	TotalSnapshotSkipped int64 `json:"totalSnapshotSkipped"`
	TotalThrottleEvents  int64 `json:"totalThrottleEvents"`
	TotalThrottleDelayMs int64 `json:"totalThrottleDelayMs"`
	TotalDuplicates      int64 `json:"totalDuplicates"`
	TotalGaps            int64 `json:"totalGaps"`
	TotalErrors          int64 `json:"totalErrors"`
	MaxLagMs             int64 `json:"maxLagMs"`
	HasErrors            bool  `json:"hasErrors"`
	LagBreachStreams     int   `json:"lagBreachStreams"`
	GapBreachStreams     int   `json:"gapBreachStreams"`
	DupeBreachStreams    int   `json:"duplicateBreachStreams"`
	ErrorStateStreams    int   `json:"errorStateStreams"`
	UnhealthyStreams     int   `json:"unhealthyStreams"`
}

type SportPartitionSummary struct {
	SportKey             string `json:"sportKey"`
	PartitionCount       int    `json:"partitionCount"`
	TotalApplied         int64  `json:"totalApplied"`
	TotalSkipped         int64  `json:"totalSkipped"`
	TotalFiltered        int64  `json:"totalFiltered"`
	TotalReplay          int64  `json:"totalReplay"`
	TotalDuplicates      int64  `json:"totalDuplicates"`
	TotalGaps            int64  `json:"totalGaps"`
	TotalErrors          int64  `json:"totalErrors"`
	MaxLagMs             int64  `json:"maxLagMs"`
	ErrorStatePartitions int    `json:"errorStatePartitions"`
	UnhealthyPartitions  int    `json:"unhealthyPartitions"`
}

func DefaultFeedThresholds() FeedThresholds {
	return FeedThresholds{
		MaxLagMs:          defaultMaxLagMs,
		MaxGapCount:       defaultMaxGapCount,
		MaxDuplicateCount: defaultMaxDuplicateCount,
	}
}

func FeedThresholdsFromEnv(getenv func(string) string) FeedThresholds {
	thresholds := DefaultFeedThresholds()
	if getenv == nil {
		return thresholds
	}

	thresholds.MaxLagMs = parseInt64OrDefault(getenv("GATEWAY_PROVIDER_SLO_MAX_LAG_MS"), thresholds.MaxLagMs)
	thresholds.MaxGapCount = parseInt64OrDefault(getenv("GATEWAY_PROVIDER_SLO_MAX_GAPS"), thresholds.MaxGapCount)
	thresholds.MaxDuplicateCount = parseInt64OrDefault(getenv("GATEWAY_PROVIDER_SLO_MAX_DUPLICATES"), thresholds.MaxDuplicateCount)

	return thresholds
}

func SummarizeFeedHealth(streams []StreamStatus, thresholds FeedThresholds) FeedSummary {
	summary := FeedSummary{
		StreamCount: len(streams),
	}

	for _, stream := range streams {
		summary.TotalApplied += stream.Applied
		summary.TotalSkipped += stream.Skipped
		summary.TotalFiltered += stream.FilteredCount
		summary.TotalReplay += stream.ReplayCount
		summary.TotalSnapshotApplied += stream.SnapshotApplied
		summary.TotalSnapshotSkipped += stream.SnapshotSkipped
		summary.TotalThrottleEvents += stream.ThrottleEvents
		summary.TotalThrottleDelayMs += stream.ThrottleDelayMs
		summary.TotalDuplicates += stream.DuplicateCount
		summary.TotalGaps += stream.GapCount
		summary.TotalErrors += stream.ErrorCount
		if stream.LastLagMs > summary.MaxLagMs {
			summary.MaxLagMs = stream.LastLagMs
		}

		lagBreach := IsLagBreach(stream, thresholds)
		gapBreach := IsGapBreach(stream, thresholds)
		dupeBreach := IsDuplicateBreach(stream, thresholds)
		errorState := IsErrorState(stream)
		if lagBreach {
			summary.LagBreachStreams++
		}
		if gapBreach {
			summary.GapBreachStreams++
		}
		if dupeBreach {
			summary.DupeBreachStreams++
		}
		if errorState {
			summary.ErrorStateStreams++
			summary.HasErrors = true
		}
		if lagBreach || gapBreach || dupeBreach || errorState {
			summary.UnhealthyStreams++
		}
	}

	return summary
}

func SummarizeSportPartitions(partitions []SportPartitionStatus, thresholds FeedThresholds) []SportPartitionSummary {
	if len(partitions) == 0 {
		return []SportPartitionSummary{}
	}

	bySport := map[string]SportPartitionSummary{}
	for _, partition := range partitions {
		sportKey := strings.TrimSpace(strings.ToLower(partition.SportKey))
		if sportKey == "" {
			sportKey = "unknown"
		}

		summary, found := bySport[sportKey]
		if !found {
			summary = SportPartitionSummary{SportKey: sportKey}
		}

		summary.PartitionCount++
		summary.TotalApplied += partition.Applied
		summary.TotalSkipped += partition.Skipped
		summary.TotalFiltered += partition.FilteredCount
		summary.TotalReplay += partition.ReplayCount
		summary.TotalDuplicates += partition.DuplicateCount
		summary.TotalGaps += partition.GapCount
		summary.TotalErrors += partition.ErrorCount
		if partition.LastLagMs > summary.MaxLagMs {
			summary.MaxLagMs = partition.LastLagMs
		}

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
		if IsErrorState(streamView) {
			summary.ErrorStatePartitions++
		}
		if unhealthy {
			summary.UnhealthyPartitions++
		}

		bySport[sportKey] = summary
	}

	out := make([]SportPartitionSummary, 0, len(bySport))
	for _, summary := range bySport {
		out = append(out, summary)
	}
	sort.Slice(out, func(i, j int) bool {
		return out[i].SportKey < out[j].SportKey
	})
	return out
}

func IsLagBreach(stream StreamStatus, thresholds FeedThresholds) bool {
	if thresholds.MaxLagMs < 0 {
		return false
	}
	return stream.LastLagMs > thresholds.MaxLagMs
}

func IsGapBreach(stream StreamStatus, thresholds FeedThresholds) bool {
	if thresholds.MaxGapCount < 0 {
		return false
	}
	return stream.GapCount > thresholds.MaxGapCount
}

func IsDuplicateBreach(stream StreamStatus, thresholds FeedThresholds) bool {
	if thresholds.MaxDuplicateCount < 0 {
		return false
	}
	return stream.DuplicateCount > thresholds.MaxDuplicateCount
}

func IsErrorState(stream StreamStatus) bool {
	return stream.State == "error" || strings.TrimSpace(stream.LastError) != ""
}

func parseInt64OrDefault(raw string, fallback int64) int64 {
	trimmed := strings.TrimSpace(raw)
	if trimmed == "" {
		return fallback
	}
	value, err := strconv.ParseInt(trimmed, 10, 64)
	if err != nil {
		return fallback
	}
	return value
}
