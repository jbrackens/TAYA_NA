package provider

import (
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"

	"phoenix-revival/platform/canonical/adapter"
	"phoenix-revival/platform/canonical/replay"
	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

type EventSink interface {
	Apply(ctx context.Context, event canonicalv1.Envelope) error
}

type RuntimeOptions struct {
	EnableSnapshotBootstrap bool          `json:"enableSnapshotBootstrap"`
	SnapshotAtRevision      int64         `json:"snapshotAtRevision"`
	EnabledSports           []string      `json:"enabledSports,omitempty"`
	RateGovernor            *RateGovernor `json:"-"`
	CancelOptions           CancelOptions `json:"cancelOptions"`
}

func DefaultRuntimeOptions() RuntimeOptions {
	return RuntimeOptions{
		EnableSnapshotBootstrap: true,
		SnapshotAtRevision:      -1,
		RateGovernor:            NewRateGovernor(true, defaultRateLimitRPS, defaultRateLimitBurst),
		CancelOptions:           DefaultCancelOptions(),
	}
}

type StreamStatus struct {
	Adapter         string                 `json:"adapter"`
	Stream          canonicalv1.StreamType `json:"stream"`
	State           string                 `json:"state"`
	Applied         int64                  `json:"applied"`
	Skipped         int64                  `json:"skipped"`
	FilteredCount   int64                  `json:"filteredCount"`
	ReplayCount     int64                  `json:"replayCount"`
	DuplicateCount  int64                  `json:"duplicateCount"`
	GapCount        int64                  `json:"gapCount"`
	ErrorCount      int64                  `json:"errorCount"`
	SnapshotApplied int64                  `json:"snapshotApplied"`
	SnapshotSkipped int64                  `json:"snapshotSkipped"`
	LastSnapshotAt  string                 `json:"lastSnapshotAt,omitempty"`
	ThrottleEvents  int64                  `json:"throttleEvents"`
	ThrottleDelayMs int64                  `json:"throttleDelayMs"`
	LastLagMs       int64                  `json:"lastLagMs"`
	LastEventAt     string                 `json:"lastEventAt,omitempty"`
	LastSportKey    string                 `json:"lastSportKey,omitempty"`
	RoutedCount     int64                  `json:"routedCount"`
	UnknownSports   int64                  `json:"unknownSports"`
	LastRevision    int64                  `json:"lastRevision"`
	LastSequence    int64                  `json:"lastSequence"`
	LastError       string                 `json:"lastError,omitempty"`
	UpdatedAt       string                 `json:"updatedAt"`
}

type SportPartitionStatus struct {
	Adapter        string                 `json:"adapter"`
	Stream         canonicalv1.StreamType `json:"stream"`
	SportKey       string                 `json:"sportKey"`
	PartitionKey   string                 `json:"partitionKey"`
	State          string                 `json:"state"`
	Applied        int64                  `json:"applied"`
	Skipped        int64                  `json:"skipped"`
	FilteredCount  int64                  `json:"filteredCount"`
	ReplayCount    int64                  `json:"replayCount"`
	DuplicateCount int64                  `json:"duplicateCount"`
	GapCount       int64                  `json:"gapCount"`
	ErrorCount     int64                  `json:"errorCount"`
	LastLagMs      int64                  `json:"lastLagMs"`
	LastEventAt    string                 `json:"lastEventAt,omitempty"`
	LastRevision   int64                  `json:"lastRevision"`
	LastSequence   int64                  `json:"lastSequence"`
	LastError      string                 `json:"lastError,omitempty"`
	UpdatedAt      string                 `json:"updatedAt"`
}

type eventRoute struct {
	SportKey string
	Fixture  string
	Market   string
}

type Runtime struct {
	registry *adapter.Registry
	engine   *replay.Engine
	sink     EventSink
	options  RuntimeOptions
	canceler *CancelExecutor

	mu            sync.RWMutex
	statuses      map[string]StreamStatus
	partitions    map[string]SportPartitionStatus
	fixtureSports map[string]string
	marketSports  map[string]string
	enabledSports map[string]struct{}
	started       bool
	cancel        context.CancelFunc
	wg            sync.WaitGroup
}

func NewRuntime(registry *adapter.Registry, engine *replay.Engine, sink EventSink) (*Runtime, error) {
	return NewRuntimeWithOptions(registry, engine, sink, DefaultRuntimeOptions())
}

func NewRuntimeWithOptions(
	registry *adapter.Registry,
	engine *replay.Engine,
	sink EventSink,
	options RuntimeOptions,
) (*Runtime, error) {
	if options.RateGovernor == nil {
		options.RateGovernor = NewRateGovernor(true, defaultRateLimitRPS, defaultRateLimitBurst)
	}
	if registry == nil {
		return nil, fmt.Errorf("registry is required")
	}
	if engine == nil {
		return nil, fmt.Errorf("replay engine is required")
	}
	if sink == nil {
		return nil, fmt.Errorf("event sink is required")
	}
	canceler, err := NewCancelExecutor(registry, options.CancelOptions)
	if err != nil {
		return nil, err
	}
	return &Runtime{
		registry:      registry,
		engine:        engine,
		sink:          sink,
		options:       options,
		statuses:      map[string]StreamStatus{},
		partitions:    map[string]SportPartitionStatus{},
		fixtureSports: map[string]string{},
		marketSports:  map[string]string{},
		enabledSports: normalizeEnabledSports(options.EnabledSports),
		canceler:      canceler,
	}, nil
}

func (r *Runtime) Start(parent context.Context) error {
	r.mu.Lock()
	if r.started {
		r.mu.Unlock()
		return nil
	}
	ctx, cancel := context.WithCancel(parent)
	r.cancel = cancel
	r.started = true
	r.mu.Unlock()

	for _, name := range r.registry.Names() {
		adapterImpl, err := r.registry.Get(name)
		if err != nil {
			return err
		}
		for _, stream := range adapterImpl.SupportedStreams() {
			r.wg.Add(1)
			go func(adapterName string, adapterImpl adapter.ProviderAdapter, stream canonicalv1.StreamType) {
				defer r.wg.Done()
				r.runStream(ctx, adapterName, adapterImpl, stream)
			}(name, adapterImpl, stream)
		}
	}

	return nil
}

func (r *Runtime) Stop() {
	r.mu.Lock()
	cancel := r.cancel
	r.cancel = nil
	r.started = false
	r.mu.Unlock()
	if cancel != nil {
		cancel()
	}
}

func (r *Runtime) Wait(ctx context.Context) error {
	done := make(chan struct{})
	go func() {
		r.wg.Wait()
		close(done)
	}()
	select {
	case <-ctx.Done():
		return ctx.Err()
	case <-done:
		return nil
	}
}

func (r *Runtime) IsStarted() bool {
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.started
}

func (r *Runtime) AdapterNames() []string {
	return r.registry.Names()
}

func (r *Runtime) CancelBet(
	ctx context.Context,
	adapterName string,
	request adapter.CancelBetRequest,
) (CancelResult, error) {
	if r == nil || r.canceler == nil {
		return CancelResult{State: cancelStateFailed, LastError: "provider cancel runtime unavailable"}, ErrProviderCancelFailed
	}
	return r.canceler.Cancel(ctx, adapterName, request)
}

func (r *Runtime) CancelMetrics() CancelMetrics {
	if r == nil || r.canceler == nil {
		return CancelMetrics{}
	}
	return r.canceler.Metrics()
}

func (r *Runtime) Snapshot() []StreamStatus {
	r.mu.RLock()
	defer r.mu.RUnlock()

	out := make([]StreamStatus, 0, len(r.statuses))
	for _, status := range r.statuses {
		out = append(out, status)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Adapter != out[j].Adapter {
			return out[i].Adapter < out[j].Adapter
		}
		return out[i].Stream < out[j].Stream
	})
	return out
}

func (r *Runtime) PartitionSnapshot() []SportPartitionStatus {
	r.mu.RLock()
	defer r.mu.RUnlock()

	out := make([]SportPartitionStatus, 0, len(r.partitions))
	for _, status := range r.partitions {
		out = append(out, status)
	}
	sort.Slice(out, func(i, j int) bool {
		if out[i].Adapter != out[j].Adapter {
			return out[i].Adapter < out[j].Adapter
		}
		if out[i].Stream != out[j].Stream {
			return out[i].Stream < out[j].Stream
		}
		return out[i].SportKey < out[j].SportKey
	})
	return out
}

func (r *Runtime) runStream(ctx context.Context, adapterName string, adapterImpl adapter.ProviderAdapter, stream canonicalv1.StreamType) {
	cp, err := r.engine.Checkpoint(adapterName, stream)
	fromRevision := int64(-1)
	if err == nil {
		fromRevision = cp.Revision
		r.setStatus(adapterName, stream, func(status StreamStatus) StreamStatus {
			status.State = "starting"
			status.LastRevision = cp.Revision
			status.LastSequence = cp.Sequence
			status.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
			return status
		})
	}

	if r.options.EnableSnapshotBootstrap {
		r.setStatus(adapterName, stream, func(status StreamStatus) StreamStatus {
			status.State = "snapshotting"
			status.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
			return status
		})

		snapshotRevision := fromRevision
		if r.options.SnapshotAtRevision >= 0 {
			snapshotRevision = r.options.SnapshotAtRevision
		}

		if waitErr := r.applyRateLimit(ctx, adapterName, stream, "snapshot"); waitErr != nil {
			r.setStatus(adapterName, stream, func(status StreamStatus) StreamStatus {
				status.State = "error"
				status.ErrorCount++
				status.LastError = waitErr.Error()
				status.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
				return status
			})
			return
		}

		snapshotEvents, snapshotErr := adapterImpl.FetchSnapshot(ctx, stream, snapshotRevision)
		if snapshotErr != nil {
			r.setStatus(adapterName, stream, func(status StreamStatus) StreamStatus {
				status.State = "error"
				status.ErrorCount++
				status.LastError = snapshotErr.Error()
				status.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
				return status
			})
			return
		}

		var lastCheckpoint replay.Checkpoint
		for _, snapshotEvent := range snapshotEvents {
			result, replayErr := r.replayEvent(ctx, adapterName, stream, snapshotEvent, true)
			if replayErr != nil {
				return
			}
			lastCheckpoint = result.LastCheckpoint
		}
		if len(snapshotEvents) > 0 {
			fromRevision = lastCheckpoint.Revision
		}
		r.setStatus(adapterName, stream, func(status StreamStatus) StreamStatus {
			status.State = "snapshot-ready"
			status.LastSnapshotAt = time.Now().UTC().Format(time.RFC3339)
			status.LastError = ""
			status.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
			return status
		})
	}

	if waitErr := r.applyRateLimit(ctx, adapterName, stream, "subscribe"); waitErr != nil {
		r.setStatus(adapterName, stream, func(status StreamStatus) StreamStatus {
			status.State = "error"
			status.ErrorCount++
			status.LastError = waitErr.Error()
			status.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
			return status
		})
		return
	}

	events, errs, err := adapterImpl.SubscribeStream(ctx, stream, fromRevision)
	if err != nil {
		r.setStatus(adapterName, stream, func(status StreamStatus) StreamStatus {
			status.State = "error"
			status.ErrorCount++
			status.LastError = err.Error()
			status.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
			return status
		})
		return
	}

	r.setStatus(adapterName, stream, func(status StreamStatus) StreamStatus {
		status.State = "running"
		status.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
		return status
	})

	for events != nil || errs != nil {
		select {
		case <-ctx.Done():
			r.setStatus(adapterName, stream, func(status StreamStatus) StreamStatus {
				status.State = "stopped"
				status.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
				return status
			})
			return
		case event, ok := <-events:
			if !ok {
				events = nil
				continue
			}

			if _, replayErr := r.replayEvent(ctx, adapterName, stream, event, false); replayErr != nil {
				continue
			}
		case streamErr, ok := <-errs:
			if !ok {
				errs = nil
				continue
			}
			if streamErr == nil {
				continue
			}
			r.setStatus(adapterName, stream, func(status StreamStatus) StreamStatus {
				status.State = "error"
				status.ErrorCount++
				status.LastError = streamErr.Error()
				status.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
				return status
			})
		}
	}

	r.setStatus(adapterName, stream, func(status StreamStatus) StreamStatus {
		if status.State != "error" {
			status.State = "stopped"
		}
		status.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
		return status
	})
}

func (r *Runtime) applyRateLimit(ctx context.Context, adapterName string, stream canonicalv1.StreamType, operation string) error {
	governor := r.options.RateGovernor
	if governor == nil || !governor.Enabled() {
		return nil
	}

	key := statusKey(adapterName, stream) + "|" + strings.TrimSpace(strings.ToLower(operation))
	waited, err := governor.Wait(ctx, key)
	if waited > 0 {
		r.setStatus(adapterName, stream, func(status StreamStatus) StreamStatus {
			status.ThrottleEvents++
			status.ThrottleDelayMs += waited.Milliseconds()
			status.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
			return status
		})
	}
	return err
}

func (r *Runtime) replayEvent(
	ctx context.Context,
	adapterName string,
	stream canonicalv1.StreamType,
	event canonicalv1.Envelope,
	isSnapshot bool,
) (replay.ReplayResult, error) {
	route := r.resolveEventRoute(event)
	filtered := !r.isSportEnabled(route.SportKey)
	applyFn := r.sink.Apply
	if filtered {
		applyFn = func(context.Context, canonicalv1.Envelope) error {
			return nil
		}
	}
	result, replayErr := r.engine.Replay(ctx, adapterName, stream, []canonicalv1.Envelope{event}, applyFn)

	r.setStatus(adapterName, stream, func(status StreamStatus) StreamStatus {
		previousRevision := status.LastRevision
		previousSequence := status.LastSequence
		if replayErr != nil {
			status.State = "error"
			status.ErrorCount++
			status.LastError = replayErr.Error()
			status.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
			return status
		}

		status.State = "running"
		if filtered {
			status.FilteredCount += int64(result.Applied)
		} else {
			status.Applied += int64(result.Applied)
		}
		status.Skipped += int64(result.Skipped)
		status.ReplayCount += int64(result.Applied + result.Skipped)
		status.DuplicateCount += int64(result.Skipped)
		if isSnapshot {
			if filtered {
				status.SnapshotSkipped += int64(result.Applied)
			} else {
				status.SnapshotApplied += int64(result.Applied)
			}
			status.SnapshotSkipped += int64(result.Skipped)
		}
		if hasGap(previousRevision, previousSequence, event.Revision, event.Sequence) {
			status.GapCount++
		}
		status.RoutedCount++
		status.LastSportKey = route.SportKey
		if route.SportKey == unknownSportKey {
			status.UnknownSports++
		}
		status.LastRevision = result.LastCheckpoint.Revision
		status.LastSequence = result.LastCheckpoint.Sequence
		status.LastLagMs = eventLagMs(event.OccurredAt)
		status.LastEventAt = event.OccurredAt.UTC().Format(time.RFC3339)
		status.LastError = ""
		status.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
		return status
	})

	r.setPartitionStatus(adapterName, stream, route.SportKey, func(status SportPartitionStatus) SportPartitionStatus {
		previousRevision := status.LastRevision
		previousSequence := status.LastSequence
		if replayErr != nil {
			status.State = "error"
			status.ErrorCount++
			status.LastError = replayErr.Error()
			status.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
			return status
		}

		status.State = "running"
		if filtered {
			status.FilteredCount += int64(result.Applied)
		} else {
			status.Applied += int64(result.Applied)
		}
		status.Skipped += int64(result.Skipped)
		status.ReplayCount += int64(result.Applied + result.Skipped)
		status.DuplicateCount += int64(result.Skipped)
		if hasGap(previousRevision, previousSequence, event.Revision, event.Sequence) {
			status.GapCount++
		}
		status.LastRevision = result.LastCheckpoint.Revision
		status.LastSequence = result.LastCheckpoint.Sequence
		status.LastLagMs = eventLagMs(event.OccurredAt)
		status.LastEventAt = event.OccurredAt.UTC().Format(time.RFC3339)
		status.LastError = ""
		status.UpdatedAt = time.Now().UTC().Format(time.RFC3339)
		return status
	})

	return result, replayErr
}

func (r *Runtime) setStatus(adapterName string, stream canonicalv1.StreamType, mutate func(StreamStatus) StreamStatus) {
	key := statusKey(adapterName, stream)
	r.mu.Lock()
	defer r.mu.Unlock()

	current, found := r.statuses[key]
	if !found {
		current = StreamStatus{
			Adapter:   adapterName,
			Stream:    stream,
			State:     "new",
			UpdatedAt: time.Now().UTC().Format(time.RFC3339),
		}
	}
	r.statuses[key] = mutate(current)
}

func (r *Runtime) setPartitionStatus(
	adapterName string,
	stream canonicalv1.StreamType,
	sportKey string,
	mutate func(SportPartitionStatus) SportPartitionStatus,
) {
	key := partitionStatusKey(adapterName, stream, sportKey)
	r.mu.Lock()
	defer r.mu.Unlock()

	current, found := r.partitions[key]
	if !found {
		current = SportPartitionStatus{
			Adapter:      adapterName,
			Stream:       stream,
			SportKey:     sportKey,
			PartitionKey: key,
			State:        "new",
			UpdatedAt:    time.Now().UTC().Format(time.RFC3339),
		}
	}
	r.partitions[key] = mutate(current)
}

func (r *Runtime) resolveEventRoute(event canonicalv1.Envelope) eventRoute {
	route := parseEventRoute(event)
	if route.SportKey == unknownSportKey {
		if route.Fixture != "" {
			if fixtureSport := r.lookupFixtureSport(route.Fixture); fixtureSport != "" {
				route.SportKey = fixtureSport
			}
		}
		if route.SportKey == unknownSportKey && route.Market != "" {
			if marketSport := r.lookupMarketSport(route.Market); marketSport != "" {
				route.SportKey = marketSport
			}
		}
	}

	if route.SportKey == "" {
		route.SportKey = unknownSportKey
	}
	if route.SportKey != unknownSportKey {
		r.rememberEntitySport(route)
	}
	return route
}

func (r *Runtime) lookupFixtureSport(fixtureID string) string {
	key := normalizeEntityKey(fixtureID)
	if key == "" {
		return ""
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.fixtureSports[key]
}

func (r *Runtime) lookupMarketSport(marketID string) string {
	key := normalizeEntityKey(marketID)
	if key == "" {
		return ""
	}
	r.mu.RLock()
	defer r.mu.RUnlock()
	return r.marketSports[key]
}

func (r *Runtime) rememberEntitySport(route eventRoute) {
	r.mu.Lock()
	defer r.mu.Unlock()
	if fixtureKey := normalizeEntityKey(route.Fixture); fixtureKey != "" {
		r.fixtureSports[fixtureKey] = route.SportKey
	}
	if marketKey := normalizeEntityKey(route.Market); marketKey != "" {
		r.marketSports[marketKey] = route.SportKey
	}
}

func (r *Runtime) isSportEnabled(sportKey string) bool {
	if sportKey == unknownSportKey {
		return true
	}
	if len(r.enabledSports) == 0 {
		return true
	}
	_, ok := r.enabledSports[sportKey]
	return ok
}

func statusKey(adapterName string, stream canonicalv1.StreamType) string {
	return strings.TrimSpace(strings.ToLower(adapterName)) + "|" + strings.TrimSpace(strings.ToLower(string(stream)))
}

func partitionStatusKey(adapterName string, stream canonicalv1.StreamType, sportKey string) string {
	if strings.TrimSpace(sportKey) == "" {
		sportKey = unknownSportKey
	}
	return statusKey(adapterName, stream) + "|sport:" + strings.TrimSpace(strings.ToLower(sportKey))
}

const unknownSportKey = "unknown"

func normalizeEnabledSports(raw []string) map[string]struct{} {
	if len(raw) == 0 {
		return map[string]struct{}{}
	}
	out := map[string]struct{}{}
	for _, sport := range raw {
		normalized := normalizeSportIdentifier(sport)
		if normalized == "" || normalized == unknownSportKey {
			continue
		}
		out[normalized] = struct{}{}
	}
	return out
}

func parseEventRoute(event canonicalv1.Envelope) eventRoute {
	route := eventRoute{SportKey: unknownSportKey}

	var payload map[string]any
	if err := json.Unmarshal(event.Payload, &payload); err != nil {
		return route
	}

	route.Fixture = extractString(payload, "fixtureId")
	route.Market = extractString(payload, "marketId")

	sportHint := extractString(payload, "sportKey", "sportId")
	normalized := normalizeSportIdentifier(sportHint)
	if normalized != "" {
		route.SportKey = normalized
	}

	return route
}

func extractString(payload map[string]any, keys ...string) string {
	for _, key := range keys {
		raw, ok := payload[key]
		if !ok {
			continue
		}
		value, ok := raw.(string)
		if !ok {
			continue
		}
		trimmed := strings.TrimSpace(value)
		if trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func normalizeEntityKey(raw string) string {
	return strings.TrimSpace(strings.ToLower(raw))
}

func normalizeSportIdentifier(raw string) string {
	normalized := strings.TrimSpace(strings.ToLower(raw))
	if normalized == "" {
		return ""
	}
	normalized = strings.ReplaceAll(normalized, "-", "_")
	normalized = strings.ReplaceAll(normalized, " ", "_")
	normalized = strings.TrimPrefix(normalized, "sport:")
	normalized = strings.TrimPrefix(normalized, "s:")

	switch normalized {
	case "esports", "esport", "e_sports":
		return "esports"
	case "mlb", "baseball_mlb", "major_league_baseball":
		return "mlb"
	case "nfl", "american_football_nfl", "national_football_league":
		return "nfl"
	case "ncaa_baseball", "ncaa_baseball_division_1", "college_baseball":
		return "ncaa_baseball"
	case "nba", "basketball_nba", "national_basketball_association":
		return "nba"
	case "ufc", "mma", "mixed_martial_arts", "mma_mixed_martial_arts":
		return "ufc"
	default:
		return unknownSportKey
	}
}

func eventLagMs(occurredAt time.Time) int64 {
	if occurredAt.IsZero() {
		return 0
	}
	lag := time.Since(occurredAt.UTC()).Milliseconds()
	if lag < 0 {
		return 0
	}
	return lag
}

func hasGap(previousRevision int64, previousSequence int64, currentRevision int64, currentSequence int64) bool {
	if previousRevision < 0 {
		return false
	}
	if currentRevision > previousRevision+1 {
		return true
	}
	if currentRevision == previousRevision && previousSequence >= 0 && currentSequence > previousSequence+1 {
		return true
	}
	return false
}
