package provider

import (
	"context"
	"errors"
	"fmt"
	"testing"
	"time"

	"phoenix-revival/platform/canonical/adapter"
	"phoenix-revival/platform/canonical/replay"
	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

func TestRuntimeChaosReconnectReplayAvoidsDuplicateApply(t *testing.T) {
	events := []canonicalv1.Envelope{
		mustChaosEnvelope("chaos-reconnect", canonicalv1.StreamDelta, 1, 1),
		mustChaosEnvelope("chaos-reconnect", canonicalv1.StreamDelta, 2, 1),
		mustChaosEnvelope("chaos-reconnect", canonicalv1.StreamDelta, 3, 1),
	}

	adapterImpl := newChaosAdapter("chaos-reconnect", events, nil)
	adapterImpl.ignoreFromRevision = true
	registry, err := adapter.NewRegistry(adapterImpl)
	if err != nil {
		t.Fatalf("registry init: %v", err)
	}

	store := replay.NewMemoryStore()
	engine := replay.NewEngine(store)
	sink := NewMemorySink()

	firstRun := runChaosRuntime(t, registry, engine, sink)
	if firstRun.Applied != 3 || firstRun.Skipped != 0 {
		t.Fatalf("first run mismatch: %+v", firstRun)
	}
	if got := len(sink.Snapshot()); got != 3 {
		t.Fatalf("first run sink expected 3 events, got %d", got)
	}

	secondRun := runChaosRuntime(t, registry, engine, sink)
	if secondRun.Applied != 0 {
		t.Fatalf("second run should apply 0 events, got %d", secondRun.Applied)
	}
	if secondRun.Skipped != 3 {
		t.Fatalf("second run should skip 3 replayed events, got %d", secondRun.Skipped)
	}
	if secondRun.DuplicateCount != 3 {
		t.Fatalf("second run duplicate telemetry mismatch: got %d want %d", secondRun.DuplicateCount, 3)
	}
	if got := len(sink.Snapshot()); got != 3 {
		t.Fatalf("second run must not add new sink events, got %d", got)
	}
}

func TestRuntimeChaosReorderAndDuplicateTelemetry(t *testing.T) {
	events := []canonicalv1.Envelope{
		mustChaosEnvelope("chaos-reorder", canonicalv1.StreamDelta, 3, 1),
		mustChaosEnvelope("chaos-reorder", canonicalv1.StreamDelta, 1, 1),
		mustChaosEnvelope("chaos-reorder", canonicalv1.StreamDelta, 2, 1),
	}

	status := runChaosRuntimeWithAdapter(t, newChaosAdapter("chaos-reorder", events, nil))
	if status.Applied != 1 {
		t.Fatalf("expected one applied event in reorder case, got %d", status.Applied)
	}
	if status.Skipped != 2 {
		t.Fatalf("expected two skipped events in reorder case, got %d", status.Skipped)
	}
	if status.DuplicateCount != 2 {
		t.Fatalf("expected duplicate telemetry=2 for reorder case, got %d", status.DuplicateCount)
	}
}

func TestRuntimeChaosDropGapTelemetry(t *testing.T) {
	events := []canonicalv1.Envelope{
		mustChaosEnvelope("chaos-gap", canonicalv1.StreamDelta, 1, 1),
		mustChaosEnvelope("chaos-gap", canonicalv1.StreamDelta, 3, 1),
		mustChaosEnvelope("chaos-gap", canonicalv1.StreamDelta, 4, 1),
	}

	status := runChaosRuntimeWithAdapter(t, newChaosAdapter("chaos-gap", events, nil))
	if status.Applied != 3 {
		t.Fatalf("expected all drop-case events to be applied, got %d", status.Applied)
	}
	if status.GapCount != 1 {
		t.Fatalf("expected gap telemetry=1 for drop case, got %d", status.GapCount)
	}
}

func TestRuntimeChaosStreamErrorTelemetry(t *testing.T) {
	events := []canonicalv1.Envelope{
		mustChaosEnvelope("chaos-error", canonicalv1.StreamDelta, 1, 1),
	}

	status := runChaosRuntimeWithAdapter(t, newChaosAdapter("chaos-error", events, errors.New("stream disconnected")))
	if status.ErrorCount == 0 {
		t.Fatal("expected error telemetry to increment")
	}
	if status.State != "error" {
		t.Fatalf("expected stream state=error after emitted stream error, got %s", status.State)
	}
}

func runChaosRuntimeWithAdapter(t *testing.T, adapterImpl adapter.ProviderAdapter) StreamStatus {
	t.Helper()

	registry, err := adapter.NewRegistry(adapterImpl)
	if err != nil {
		t.Fatalf("registry init: %v", err)
	}
	engine := replay.NewEngine(replay.NewMemoryStore())
	sink := NewMemorySink()
	return runChaosRuntime(t, registry, engine, sink)
}

func runChaosRuntime(t *testing.T, registry *adapter.Registry, engine *replay.Engine, sink *MemorySink) StreamStatus {
	t.Helper()

	runtime, err := NewRuntimeWithOptions(registry, engine, sink, RuntimeOptions{
		EnableSnapshotBootstrap: false,
		SnapshotAtRevision:      -1,
		RateGovernor:            NewRateGovernor(false, 1000, 1000),
		CancelOptions:           DefaultCancelOptions(),
	})
	if err != nil {
		t.Fatalf("runtime init: %v", err)
	}

	if err := runtime.Start(context.Background()); err != nil {
		t.Fatalf("runtime start: %v", err)
	}

	waitCtx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := runtime.Wait(waitCtx); err != nil {
		t.Fatalf("runtime wait: %v", err)
	}

	statuses := runtime.Snapshot()
	if len(statuses) != 1 {
		t.Fatalf("expected single stream status, got %d", len(statuses))
	}
	return statuses[0]
}

type chaosAdapter struct {
	name         string
	streamEvents []canonicalv1.Envelope
	streamErr    error
	// ignoreFromRevision simulates provider reconnect behavior where old events
	// may be replayed and must be deduplicated by checkpoint logic.
	ignoreFromRevision bool
}

func newChaosAdapter(name string, streamEvents []canonicalv1.Envelope, streamErr error) *chaosAdapter {
	return &chaosAdapter{
		name:         name,
		streamEvents: append([]canonicalv1.Envelope(nil), streamEvents...),
		streamErr:    streamErr,
	}
}

func (a *chaosAdapter) Name() string {
	return a.name
}

func (a *chaosAdapter) CanonicalSchema() canonicalv1.SchemaInfo {
	return canonicalv1.CurrentSchema()
}

func (a *chaosAdapter) SupportedStreams() []canonicalv1.StreamType {
	return []canonicalv1.StreamType{canonicalv1.StreamDelta}
}

func (a *chaosAdapter) SubscribeStream(
	ctx context.Context,
	stream canonicalv1.StreamType,
	fromRevision int64,
) (<-chan canonicalv1.Envelope, <-chan error, error) {
	if stream != canonicalv1.StreamDelta {
		return nil, nil, fmt.Errorf("unsupported stream: %s", stream)
	}

	events := make(chan canonicalv1.Envelope, len(a.streamEvents))
	errs := make(chan error, 1)
	go func() {
		defer close(events)
		defer close(errs)

		for _, event := range a.streamEvents {
			if !a.ignoreFromRevision && event.Revision <= fromRevision {
				continue
			}
			select {
			case <-ctx.Done():
				return
			case events <- event:
			}
		}

		if a.streamErr != nil {
			select {
			case <-ctx.Done():
				return
			case errs <- a.streamErr:
			}
		}
	}()

	return events, errs, nil
}

func (a *chaosAdapter) FetchSnapshot(context.Context, canonicalv1.StreamType, int64) ([]canonicalv1.Envelope, error) {
	return nil, nil
}

func (a *chaosAdapter) PlaceBet(context.Context, adapter.PlaceBetRequest) (adapter.PlaceBetResponse, error) {
	return adapter.PlaceBetResponse{}, nil
}

func (a *chaosAdapter) CancelBet(context.Context, adapter.CancelBetRequest) (adapter.CancelBetResponse, error) {
	return adapter.CancelBetResponse{}, nil
}

func (a *chaosAdapter) MaxStake(context.Context, adapter.MaxStakeRequest) (adapter.MaxStakeResponse, error) {
	return adapter.MaxStakeResponse{}, nil
}

func (a *chaosAdapter) CashoutQuote(context.Context, adapter.CashoutQuoteRequest) (adapter.CashoutQuoteResponse, error) {
	return adapter.CashoutQuoteResponse{}, nil
}

func (a *chaosAdapter) CashoutAccept(context.Context, adapter.CashoutAcceptRequest) (adapter.CashoutAcceptResponse, error) {
	return adapter.CashoutAcceptResponse{}, nil
}

func mustChaosEnvelope(providerName string, stream canonicalv1.StreamType, revision int64, sequence int64) canonicalv1.Envelope {
	now := time.Date(2026, 3, 5, 9, 0, 0, 0, time.UTC).Add(time.Duration(revision) * time.Second)
	envelope, err := canonicalv1.NewEnvelope(
		canonicalv1.ProviderRef{Name: providerName, Feed: string(stream)},
		stream,
		revision,
		sequence,
		canonicalv1.EntityFixture,
		canonicalv1.ActionUpsert,
		now,
		canonicalv1.Fixture{
			FixtureID: fmt.Sprintf("fixture:%s:%d", providerName, revision),
			SportID:   "sport:test",
			Name:      "Chaos Fixture",
			StartsAt:  now.Add(1 * time.Hour),
			Status:    canonicalv1.FixtureStatusScheduled,
			UpdatedAt: now,
		},
	)
	if err != nil {
		panic(err)
	}
	return envelope
}
