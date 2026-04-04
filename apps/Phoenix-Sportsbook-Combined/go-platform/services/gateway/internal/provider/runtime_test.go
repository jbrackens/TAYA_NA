package provider

import (
	"context"
	"fmt"
	"sync"
	"testing"
	"time"

	"phoenix-revival/platform/canonical/adapter"
	"phoenix-revival/platform/canonical/replay"
	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

func TestRuntimeProcessesMultipleStreams(t *testing.T) {
	registry, err := adapter.NewRegistry(NewDemoMultiFeedAdapter("odds88-demo"))
	if err != nil {
		t.Fatalf("expected registry init to succeed, got: %v", err)
	}

	store := replay.NewMemoryStore()
	engine := replay.NewEngine(store)
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

	statuses := runtime.Snapshot()
	if len(statuses) != 4 {
		t.Fatalf("expected 4 stream statuses, got %d", len(statuses))
	}

	var totalApplied int64
	var totalReplay int64
	for _, status := range statuses {
		totalApplied += status.Applied
		totalReplay += status.ReplayCount
		if status.State != "stopped" && status.State != "running" {
			t.Fatalf("unexpected stream state %q for %s/%s", status.State, status.Adapter, status.Stream)
		}
	}
	if totalApplied == 0 {
		t.Fatalf("expected at least one applied event, got %d", totalApplied)
	}
	if totalReplay == 0 {
		t.Fatalf("expected replay counter to be incremented, got %d", totalReplay)
	}

	events := sink.Snapshot()
	if len(events) == 0 {
		t.Fatal("expected sink to receive events")
	}
}

func TestRuntimeAppliesSnapshotThenSubscribesFromCheckpoint(t *testing.T) {
	adapterImpl := newSnapshotTestAdapter("snapshot-demo")
	registry, err := adapter.NewRegistry(adapterImpl)
	if err != nil {
		t.Fatalf("expected registry init to succeed, got: %v", err)
	}

	engine := replay.NewEngine(replay.NewMemoryStore())
	sink := NewMemorySink()
	runtime, err := NewRuntimeWithOptions(registry, engine, sink, RuntimeOptions{
		EnableSnapshotBootstrap: true,
		SnapshotAtRevision:      -1,
	})
	if err != nil {
		t.Fatalf("expected runtime init to succeed, got: %v", err)
	}

	if err := runtime.Start(context.Background()); err != nil {
		t.Fatalf("expected runtime start to succeed, got: %v", err)
	}
	waitCtx, waitCancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer waitCancel()
	if err := runtime.Wait(waitCtx); err != nil {
		t.Fatalf("expected runtime wait to succeed, got: %v", err)
	}

	statuses := runtime.Snapshot()
	if len(statuses) != 1 {
		t.Fatalf("expected 1 stream status, got %d", len(statuses))
	}
	status := statuses[0]
	if status.SnapshotApplied != 2 {
		t.Fatalf("expected snapshotApplied=2, got %d", status.SnapshotApplied)
	}
	if status.Applied != 3 {
		t.Fatalf("expected applied=3 (2 snapshot + 1 stream), got %d", status.Applied)
	}
	if status.LastRevision != 3 || status.LastSequence != 1 {
		t.Fatalf("expected last checkpoint 3/1, got %d/%d", status.LastRevision, status.LastSequence)
	}
	if adapterImpl.snapshotCallCount() != 1 {
		t.Fatalf("expected snapshot call count=1, got %d", adapterImpl.snapshotCallCount())
	}
	fromRevisions := adapterImpl.subscribeRevisions()
	if len(fromRevisions) != 1 || fromRevisions[0] != 2 {
		t.Fatalf("expected subscribe from revision 2, got %v", fromRevisions)
	}
}

func TestRuntimeCanDisableSnapshotBootstrap(t *testing.T) {
	adapterImpl := newSnapshotTestAdapter("snapshot-demo")
	registry, err := adapter.NewRegistry(adapterImpl)
	if err != nil {
		t.Fatalf("expected registry init to succeed, got: %v", err)
	}

	engine := replay.NewEngine(replay.NewMemoryStore())
	sink := NewMemorySink()
	runtime, err := NewRuntimeWithOptions(registry, engine, sink, RuntimeOptions{
		EnableSnapshotBootstrap: false,
		SnapshotAtRevision:      -1,
	})
	if err != nil {
		t.Fatalf("expected runtime init to succeed, got: %v", err)
	}

	if err := runtime.Start(context.Background()); err != nil {
		t.Fatalf("expected runtime start to succeed, got: %v", err)
	}
	waitCtx, waitCancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer waitCancel()
	if err := runtime.Wait(waitCtx); err != nil {
		t.Fatalf("expected runtime wait to succeed, got: %v", err)
	}

	statuses := runtime.Snapshot()
	if len(statuses) != 1 {
		t.Fatalf("expected 1 stream status, got %d", len(statuses))
	}
	status := statuses[0]
	if status.SnapshotApplied != 0 {
		t.Fatalf("expected snapshotApplied=0 when disabled, got %d", status.SnapshotApplied)
	}
	if adapterImpl.snapshotCallCount() != 0 {
		t.Fatalf("expected no snapshot fetch calls, got %d", adapterImpl.snapshotCallCount())
	}
	fromRevisions := adapterImpl.subscribeRevisions()
	if len(fromRevisions) != 1 || fromRevisions[0] != -1 {
		t.Fatalf("expected subscribe from revision -1 without snapshot bootstrap, got %v", fromRevisions)
	}
}

func TestRuntimeExposesSportPartitionStatuses(t *testing.T) {
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

	if err := runtime.Start(context.Background()); err != nil {
		t.Fatalf("expected runtime start to succeed, got: %v", err)
	}
	waitCtx, waitCancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer waitCancel()
	if err := runtime.Wait(waitCtx); err != nil {
		t.Fatalf("expected runtime wait to succeed, got: %v", err)
	}

	partitions := runtime.PartitionSnapshot()
	if len(partitions) == 0 {
		t.Fatal("expected sport partitions to be populated")
	}

	var esportsSeen bool
	for _, partition := range partitions {
		if partition.SportKey == "esports" {
			esportsSeen = true
			if partition.Applied == 0 {
				t.Fatalf("expected esports partition to have applied events, got %+v", partition)
			}
		}
	}
	if !esportsSeen {
		t.Fatalf("expected esports partition in snapshot, got %+v", partitions)
	}
}

func TestRuntimeRoutesMarketEventsToFixtureSportPartition(t *testing.T) {
	adapterImpl := newFixtureMarketRoutingAdapter("routing-demo")
	registry, err := adapter.NewRegistry(adapterImpl)
	if err != nil {
		t.Fatalf("expected registry init to succeed, got: %v", err)
	}

	engine := replay.NewEngine(replay.NewMemoryStore())
	sink := NewMemorySink()
	runtime, err := NewRuntimeWithOptions(registry, engine, sink, RuntimeOptions{
		EnableSnapshotBootstrap: false,
		SnapshotAtRevision:      -1,
	})
	if err != nil {
		t.Fatalf("expected runtime init to succeed, got: %v", err)
	}

	if err := runtime.Start(context.Background()); err != nil {
		t.Fatalf("expected runtime start to succeed, got: %v", err)
	}
	waitCtx, waitCancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer waitCancel()
	if err := runtime.Wait(waitCtx); err != nil {
		t.Fatalf("expected runtime wait to succeed, got: %v", err)
	}

	partitions := runtime.PartitionSnapshot()
	if len(partitions) != 1 {
		t.Fatalf("expected one partition for routing adapter, got %d", len(partitions))
	}
	partition := partitions[0]
	if partition.SportKey != "mlb" {
		t.Fatalf("expected mlb partition, got %s", partition.SportKey)
	}
	if partition.Applied != 2 {
		t.Fatalf("expected applied=2 for fixture+market events, got %d", partition.Applied)
	}
}

func TestRuntimeFiltersEventsForDisabledSports(t *testing.T) {
	adapterImpl := newMixedSportFilterAdapter("filter-demo")
	registry, err := adapter.NewRegistry(adapterImpl)
	if err != nil {
		t.Fatalf("expected registry init to succeed, got: %v", err)
	}

	engine := replay.NewEngine(replay.NewMemoryStore())
	sink := NewMemorySink()
	runtime, err := NewRuntimeWithOptions(registry, engine, sink, RuntimeOptions{
		EnableSnapshotBootstrap: false,
		SnapshotAtRevision:      -1,
		EnabledSports:           []string{"mlb"},
	})
	if err != nil {
		t.Fatalf("expected runtime init to succeed, got: %v", err)
	}

	if err := runtime.Start(context.Background()); err != nil {
		t.Fatalf("expected runtime start to succeed, got: %v", err)
	}
	waitCtx, waitCancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer waitCancel()
	if err := runtime.Wait(waitCtx); err != nil {
		t.Fatalf("expected runtime wait to succeed, got: %v", err)
	}

	statuses := runtime.Snapshot()
	if len(statuses) != 1 {
		t.Fatalf("expected one stream status, got %d", len(statuses))
	}
	status := statuses[0]
	if status.Applied != 1 {
		t.Fatalf("expected one applied event for enabled sport, got %d", status.Applied)
	}
	if status.FilteredCount != 1 {
		t.Fatalf("expected one filtered event for disabled sport, got %d", status.FilteredCount)
	}
	if status.LastRevision != 2 {
		t.Fatalf("expected checkpoint to advance through filtered event (revision=2), got %d", status.LastRevision)
	}
	if status.RoutedCount != 2 {
		t.Fatalf("expected routedCount=2, got %d", status.RoutedCount)
	}
	if status.UnknownSports != 0 {
		t.Fatalf("expected unknownSports=0, got %d", status.UnknownSports)
	}

	appliedEvents := sink.Snapshot()
	if len(appliedEvents) != 1 {
		t.Fatalf("expected sink to receive only enabled-sport event, got %d events", len(appliedEvents))
	}
	if appliedEvents[0].Revision != 1 {
		t.Fatalf("expected sink to receive revision 1 event, got revision %d", appliedEvents[0].Revision)
	}

	partitions := runtime.PartitionSnapshot()
	if len(partitions) != 2 {
		t.Fatalf("expected 2 sport partitions (mlb + nba), got %d", len(partitions))
	}
	bySport := map[string]SportPartitionStatus{}
	for _, partition := range partitions {
		bySport[partition.SportKey] = partition
	}

	mlb, found := bySport["mlb"]
	if !found {
		t.Fatalf("expected mlb partition in %+v", partitions)
	}
	if mlb.Applied != 1 || mlb.FilteredCount != 0 {
		t.Fatalf("unexpected mlb partition counters: %+v", mlb)
	}

	nba, found := bySport["nba"]
	if !found {
		t.Fatalf("expected nba partition in %+v", partitions)
	}
	if nba.Applied != 0 || nba.FilteredCount != 1 {
		t.Fatalf("unexpected nba partition counters: %+v", nba)
	}
}

type snapshotTestAdapter struct {
	name              string
	mu                sync.Mutex
	snapshotCalls     int
	subscribeFromSeen []int64
}

func newSnapshotTestAdapter(name string) *snapshotTestAdapter {
	return &snapshotTestAdapter{name: name}
}

func (a *snapshotTestAdapter) Name() string { return a.name }

func (a *snapshotTestAdapter) CanonicalSchema() canonicalv1.SchemaInfo {
	return canonicalv1.CurrentSchema()
}

func (a *snapshotTestAdapter) SupportedStreams() []canonicalv1.StreamType {
	return []canonicalv1.StreamType{canonicalv1.StreamDelta}
}

func (a *snapshotTestAdapter) SubscribeStream(
	ctx context.Context,
	stream canonicalv1.StreamType,
	fromRevision int64,
) (<-chan canonicalv1.Envelope, <-chan error, error) {
	if stream != canonicalv1.StreamDelta {
		return nil, nil, fmt.Errorf("unsupported stream: %s", stream)
	}
	a.mu.Lock()
	a.subscribeFromSeen = append(a.subscribeFromSeen, fromRevision)
	a.mu.Unlock()

	events := make(chan canonicalv1.Envelope, 1)
	errs := make(chan error, 1)
	go func() {
		defer close(events)
		defer close(errs)
		event := mustTestEnvelope(a.name, canonicalv1.StreamDelta, 3, 1)
		if event.Revision <= fromRevision {
			return
		}
		select {
		case <-ctx.Done():
			return
		case events <- event:
		}
	}()
	return events, errs, nil
}

func (a *snapshotTestAdapter) FetchSnapshot(
	_ context.Context,
	stream canonicalv1.StreamType,
	_ int64,
) ([]canonicalv1.Envelope, error) {
	if stream != canonicalv1.StreamDelta {
		return nil, nil
	}
	a.mu.Lock()
	a.snapshotCalls++
	a.mu.Unlock()
	return []canonicalv1.Envelope{
		mustTestEnvelope(a.name, canonicalv1.StreamDelta, 1, 1),
		mustTestEnvelope(a.name, canonicalv1.StreamDelta, 2, 1),
	}, nil
}

func (a *snapshotTestAdapter) PlaceBet(context.Context, adapter.PlaceBetRequest) (adapter.PlaceBetResponse, error) {
	return adapter.PlaceBetResponse{}, nil
}

func (a *snapshotTestAdapter) CancelBet(context.Context, adapter.CancelBetRequest) (adapter.CancelBetResponse, error) {
	return adapter.CancelBetResponse{}, nil
}

func (a *snapshotTestAdapter) MaxStake(context.Context, adapter.MaxStakeRequest) (adapter.MaxStakeResponse, error) {
	return adapter.MaxStakeResponse{}, nil
}

func (a *snapshotTestAdapter) CashoutQuote(context.Context, adapter.CashoutQuoteRequest) (adapter.CashoutQuoteResponse, error) {
	return adapter.CashoutQuoteResponse{}, nil
}

func (a *snapshotTestAdapter) CashoutAccept(context.Context, adapter.CashoutAcceptRequest) (adapter.CashoutAcceptResponse, error) {
	return adapter.CashoutAcceptResponse{}, nil
}

func (a *snapshotTestAdapter) snapshotCallCount() int {
	a.mu.Lock()
	defer a.mu.Unlock()
	return a.snapshotCalls
}

func (a *snapshotTestAdapter) subscribeRevisions() []int64 {
	a.mu.Lock()
	defer a.mu.Unlock()
	out := make([]int64, len(a.subscribeFromSeen))
	copy(out, a.subscribeFromSeen)
	return out
}

func mustTestEnvelope(providerName string, stream canonicalv1.StreamType, revision int64, sequence int64) canonicalv1.Envelope {
	envelope, err := canonicalv1.NewEnvelope(
		canonicalv1.ProviderRef{Name: providerName, Feed: string(stream)},
		stream,
		revision,
		sequence,
		canonicalv1.EntityFixture,
		canonicalv1.ActionUpsert,
		time.Now().UTC(),
		canonicalv1.Fixture{
			FixtureID: fmt.Sprintf("fixture:%s:%d", providerName, revision),
			SportID:   "sport:test",
			Name:      "Snapshot Fixture",
			StartsAt:  time.Now().UTC().Add(1 * time.Hour),
			Status:    canonicalv1.FixtureStatusScheduled,
			UpdatedAt: time.Now().UTC(),
		},
	)
	if err != nil {
		panic(err)
	}
	return envelope
}

func TestRuntimeUsesCheckpointToSkipOldEvents(t *testing.T) {
	registry, err := adapter.NewRegistry(NewDemoMultiFeedAdapter("odds88-demo"))
	if err != nil {
		t.Fatalf("expected registry init to succeed, got: %v", err)
	}

	store := replay.NewMemoryStore()
	_ = store.Save(replay.Checkpoint{
		Adapter:   "odds88-demo",
		Stream:    canonicalv1.StreamDelta,
		Revision:  10,
		Sequence:  10,
		UpdatedAt: time.Now().UTC(),
	})
	engine := replay.NewEngine(store)
	sink := NewMemorySink()
	runtime, err := NewRuntime(registry, engine, sink)
	if err != nil {
		t.Fatalf("expected runtime init to succeed, got: %v", err)
	}

	if err := runtime.Start(context.Background()); err != nil {
		t.Fatalf("expected runtime start to succeed, got: %v", err)
	}

	waitCtx, waitCancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer waitCancel()
	if err := runtime.Wait(waitCtx); err != nil {
		t.Fatalf("expected runtime wait to succeed, got: %v", err)
	}

	statuses := runtime.Snapshot()
	var deltaSeen bool
	for _, status := range statuses {
		if status.Stream == canonicalv1.StreamDelta {
			deltaSeen = true
			if status.Applied != 0 {
				t.Fatalf("expected delta stream to apply 0 events due to checkpoint skip, got %d", status.Applied)
			}
			if status.LastRevision != 10 || status.LastSequence != 10 {
				t.Fatalf("expected checkpoint to remain at 10/10, got %d/%d", status.LastRevision, status.LastSequence)
			}
		}
	}
	if !deltaSeen {
		t.Fatal("expected delta status entry")
	}
}

func TestRuntimeCancelBetUsesCancelExecutor(t *testing.T) {
	registry, err := adapter.NewRegistry(newSnapshotTestAdapter("cancel-demo"))
	if err != nil {
		t.Fatalf("expected registry init to succeed, got: %v", err)
	}

	engine := replay.NewEngine(replay.NewMemoryStore())
	sink := NewMemorySink()
	runtime, err := NewRuntimeWithOptions(registry, engine, sink, RuntimeOptions{
		EnableSnapshotBootstrap: false,
		SnapshotAtRevision:      -1,
		CancelOptions: CancelOptions{
			MaxAttempts:    1,
			InitialBackoff: 0,
			MaxBackoff:     0,
		},
	})
	if err != nil {
		t.Fatalf("expected runtime init to succeed, got: %v", err)
	}

	result, err := runtime.CancelBet(context.Background(), "cancel-demo", adapter.CancelBetRequest{
		PlayerID:  "u-runtime-cancel",
		BetID:     "b-runtime-cancel",
		RequestID: "req-runtime-cancel",
		Reason:    "manual cancel",
	})
	if err != nil {
		t.Fatalf("expected cancel to succeed, got: %v", err)
	}
	if result.State != cancelStateCancelled {
		t.Fatalf("expected state %s, got %s", cancelStateCancelled, result.State)
	}
	if result.Adapter != "cancel-demo" {
		t.Fatalf("expected adapter cancel-demo, got %s", result.Adapter)
	}
}

type fixtureMarketRoutingAdapter struct {
	name string
}

func newFixtureMarketRoutingAdapter(name string) *fixtureMarketRoutingAdapter {
	return &fixtureMarketRoutingAdapter{name: name}
}

func (a *fixtureMarketRoutingAdapter) Name() string {
	return a.name
}

func (a *fixtureMarketRoutingAdapter) CanonicalSchema() canonicalv1.SchemaInfo {
	return canonicalv1.CurrentSchema()
}

func (a *fixtureMarketRoutingAdapter) SupportedStreams() []canonicalv1.StreamType {
	return []canonicalv1.StreamType{canonicalv1.StreamDelta}
}

func (a *fixtureMarketRoutingAdapter) SubscribeStream(
	ctx context.Context,
	stream canonicalv1.StreamType,
	fromRevision int64,
) (<-chan canonicalv1.Envelope, <-chan error, error) {
	events := make(chan canonicalv1.Envelope, 2)
	errs := make(chan error, 1)
	go func() {
		defer close(events)
		defer close(errs)
		streamEvents := []canonicalv1.Envelope{
			mustRoutingEnvelope(
				a.name,
				stream,
				1,
				1,
				canonicalv1.EntityFixture,
				canonicalv1.Fixture{
					FixtureID: "fixture:routing:1",
					SportID:   "sport:mlb",
					Name:      "Mets vs Yankees",
					StartsAt:  time.Now().UTC().Add(1 * time.Hour),
					Status:    canonicalv1.FixtureStatusScheduled,
					UpdatedAt: time.Now().UTC(),
				},
			),
			mustRoutingEnvelope(
				a.name,
				stream,
				2,
				1,
				canonicalv1.EntityMarket,
				canonicalv1.Market{
					MarketID:  "market:routing:1",
					FixtureID: "fixture:routing:1",
					Name:      "Moneyline",
					Status:    canonicalv1.MarketStatusOpen,
					Selections: []canonicalv1.Selection{
						{SelectionID: "home", Name: "Mets", OddsDecimal: 1.9, Active: true},
						{SelectionID: "away", Name: "Yankees", OddsDecimal: 2.0, Active: true},
					},
					UpdatedAt: time.Now().UTC(),
				},
			),
		}
		for _, event := range streamEvents {
			if event.Revision <= fromRevision {
				continue
			}
			select {
			case <-ctx.Done():
				return
			case events <- event:
			}
		}
	}()
	return events, errs, nil
}

func (a *fixtureMarketRoutingAdapter) FetchSnapshot(context.Context, canonicalv1.StreamType, int64) ([]canonicalv1.Envelope, error) {
	return nil, nil
}

func (a *fixtureMarketRoutingAdapter) PlaceBet(context.Context, adapter.PlaceBetRequest) (adapter.PlaceBetResponse, error) {
	return adapter.PlaceBetResponse{}, nil
}

func (a *fixtureMarketRoutingAdapter) CancelBet(context.Context, adapter.CancelBetRequest) (adapter.CancelBetResponse, error) {
	return adapter.CancelBetResponse{}, nil
}

func (a *fixtureMarketRoutingAdapter) MaxStake(context.Context, adapter.MaxStakeRequest) (adapter.MaxStakeResponse, error) {
	return adapter.MaxStakeResponse{}, nil
}

func (a *fixtureMarketRoutingAdapter) CashoutQuote(context.Context, adapter.CashoutQuoteRequest) (adapter.CashoutQuoteResponse, error) {
	return adapter.CashoutQuoteResponse{}, nil
}

func (a *fixtureMarketRoutingAdapter) CashoutAccept(context.Context, adapter.CashoutAcceptRequest) (adapter.CashoutAcceptResponse, error) {
	return adapter.CashoutAcceptResponse{}, nil
}

type mixedSportFilterAdapter struct {
	name string
}

func newMixedSportFilterAdapter(name string) *mixedSportFilterAdapter {
	return &mixedSportFilterAdapter{name: name}
}

func (a *mixedSportFilterAdapter) Name() string {
	return a.name
}

func (a *mixedSportFilterAdapter) CanonicalSchema() canonicalv1.SchemaInfo {
	return canonicalv1.CurrentSchema()
}

func (a *mixedSportFilterAdapter) SupportedStreams() []canonicalv1.StreamType {
	return []canonicalv1.StreamType{canonicalv1.StreamDelta}
}

func (a *mixedSportFilterAdapter) SubscribeStream(
	ctx context.Context,
	stream canonicalv1.StreamType,
	fromRevision int64,
) (<-chan canonicalv1.Envelope, <-chan error, error) {
	events := make(chan canonicalv1.Envelope, 2)
	errs := make(chan error, 1)
	go func() {
		defer close(events)
		defer close(errs)
		streamEvents := []canonicalv1.Envelope{
			mustRoutingEnvelope(
				a.name,
				stream,
				1,
				1,
				canonicalv1.EntityFixture,
				canonicalv1.Fixture{
					FixtureID: "fixture:filter:mlb",
					SportID:   "sport:mlb",
					Name:      "MLB Fixture",
					StartsAt:  time.Now().UTC().Add(1 * time.Hour),
					Status:    canonicalv1.FixtureStatusScheduled,
					UpdatedAt: time.Now().UTC(),
				},
			),
			mustRoutingEnvelope(
				a.name,
				stream,
				2,
				1,
				canonicalv1.EntityFixture,
				canonicalv1.Fixture{
					FixtureID: "fixture:filter:nba",
					SportID:   "sport:nba",
					Name:      "NBA Fixture",
					StartsAt:  time.Now().UTC().Add(1 * time.Hour),
					Status:    canonicalv1.FixtureStatusScheduled,
					UpdatedAt: time.Now().UTC(),
				},
			),
		}
		for _, event := range streamEvents {
			if event.Revision <= fromRevision {
				continue
			}
			select {
			case <-ctx.Done():
				return
			case events <- event:
			}
		}
	}()
	return events, errs, nil
}

func (a *mixedSportFilterAdapter) FetchSnapshot(context.Context, canonicalv1.StreamType, int64) ([]canonicalv1.Envelope, error) {
	return nil, nil
}

func (a *mixedSportFilterAdapter) PlaceBet(context.Context, adapter.PlaceBetRequest) (adapter.PlaceBetResponse, error) {
	return adapter.PlaceBetResponse{}, nil
}

func (a *mixedSportFilterAdapter) CancelBet(context.Context, adapter.CancelBetRequest) (adapter.CancelBetResponse, error) {
	return adapter.CancelBetResponse{}, nil
}

func (a *mixedSportFilterAdapter) MaxStake(context.Context, adapter.MaxStakeRequest) (adapter.MaxStakeResponse, error) {
	return adapter.MaxStakeResponse{}, nil
}

func (a *mixedSportFilterAdapter) CashoutQuote(context.Context, adapter.CashoutQuoteRequest) (adapter.CashoutQuoteResponse, error) {
	return adapter.CashoutQuoteResponse{}, nil
}

func (a *mixedSportFilterAdapter) CashoutAccept(context.Context, adapter.CashoutAcceptRequest) (adapter.CashoutAcceptResponse, error) {
	return adapter.CashoutAcceptResponse{}, nil
}

func mustRoutingEnvelope(
	providerName string,
	stream canonicalv1.StreamType,
	revision int64,
	sequence int64,
	entity canonicalv1.EntityType,
	payload any,
) canonicalv1.Envelope {
	envelope, err := canonicalv1.NewEnvelope(
		canonicalv1.ProviderRef{Name: providerName, Feed: string(stream)},
		stream,
		revision,
		sequence,
		entity,
		canonicalv1.ActionUpsert,
		time.Now().UTC(),
		payload,
	)
	if err != nil {
		panic(err)
	}
	return envelope
}
