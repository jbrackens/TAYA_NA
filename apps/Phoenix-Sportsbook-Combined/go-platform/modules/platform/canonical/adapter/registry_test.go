package adapter

import (
	"context"
	"errors"
	"testing"
	"time"

	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

type stubAdapter struct {
	name    string
	version string
}

func (s stubAdapter) Name() string {
	return s.name
}

func (s stubAdapter) CanonicalSchema() canonicalv1.SchemaInfo {
	schema := canonicalv1.CurrentSchema()
	schema.Version = s.version
	return schema
}

func (s stubAdapter) SupportedStreams() []canonicalv1.StreamType {
	return []canonicalv1.StreamType{canonicalv1.StreamDelta, canonicalv1.StreamSettlement}
}

func (s stubAdapter) SubscribeStream(context.Context, canonicalv1.StreamType, int64) (<-chan canonicalv1.Envelope, <-chan error, error) {
	events := make(chan canonicalv1.Envelope)
	errs := make(chan error)
	close(events)
	close(errs)
	return events, errs, nil
}

func (s stubAdapter) FetchSnapshot(context.Context, canonicalv1.StreamType, int64) ([]canonicalv1.Envelope, error) {
	event, err := canonicalv1.NewEnvelope(
		canonicalv1.ProviderRef{Name: s.name},
		canonicalv1.StreamSnapshot,
		1,
		1,
		canonicalv1.EntityFixture,
		canonicalv1.ActionUpsert,
		time.Now().UTC(),
		canonicalv1.Fixture{
			FixtureID: "fixture-1",
			SportID:   "sport-1",
			Name:      "fixture",
			StartsAt:  time.Now().UTC(),
			Status:    canonicalv1.FixtureStatusScheduled,
			UpdatedAt: time.Now().UTC(),
		},
	)
	if err != nil {
		return nil, err
	}
	return []canonicalv1.Envelope{event}, nil
}

func (s stubAdapter) PlaceBet(context.Context, PlaceBetRequest) (PlaceBetResponse, error) {
	return PlaceBetResponse{}, nil
}

func (s stubAdapter) CancelBet(context.Context, CancelBetRequest) (CancelBetResponse, error) {
	return CancelBetResponse{}, nil
}

func (s stubAdapter) MaxStake(context.Context, MaxStakeRequest) (MaxStakeResponse, error) {
	return MaxStakeResponse{Allowed: true, MaxStakeCents: 1000}, nil
}

func (s stubAdapter) CashoutQuote(context.Context, CashoutQuoteRequest) (CashoutQuoteResponse, error) {
	return CashoutQuoteResponse{}, nil
}

func (s stubAdapter) CashoutAccept(context.Context, CashoutAcceptRequest) (CashoutAcceptResponse, error) {
	return CashoutAcceptResponse{}, nil
}

func TestRegistryRegisterAndGet(t *testing.T) {
	registry, err := NewRegistry()
	if err != nil {
		t.Fatalf("expected registry initialization to succeed, got: %v", err)
	}

	err = registry.Register(stubAdapter{name: "Odds88", version: "1.0.0"})
	if err != nil {
		t.Fatalf("expected register to succeed, got: %v", err)
	}

	got, err := registry.Get("odds88")
	if err != nil {
		t.Fatalf("expected adapter lookup to succeed, got: %v", err)
	}
	if got.Name() != "Odds88" {
		t.Fatalf("expected adapter name Odds88, got %s", got.Name())
	}
}

func TestRegistryRejectsDuplicate(t *testing.T) {
	registry, err := NewRegistry(stubAdapter{name: "odds88", version: "1.0.0"})
	if err != nil {
		t.Fatalf("expected NewRegistry to succeed, got: %v", err)
	}

	err = registry.Register(stubAdapter{name: "odds88", version: "1.0.0"})
	if err == nil {
		t.Fatal("expected duplicate registration to fail")
	}
	if !errors.Is(err, ErrAdapterExists) {
		t.Fatalf("expected ErrAdapterExists, got: %v", err)
	}
}

func TestRegistryRejectsIncompatibleSchema(t *testing.T) {
	registry, err := NewRegistry()
	if err != nil {
		t.Fatalf("expected NewRegistry to succeed, got: %v", err)
	}

	err = registry.Register(stubAdapter{name: "legacy-provider", version: "2.0.0"})
	if err == nil {
		t.Fatal("expected incompatible schema registration to fail")
	}
	if !errors.Is(err, ErrIncompatibleSchema) {
		t.Fatalf("expected ErrIncompatibleSchema, got: %v", err)
	}
}

func TestRegistryNamesSorted(t *testing.T) {
	registry, err := NewRegistry(
		stubAdapter{name: "betby", version: "1.1.0"},
		stubAdapter{name: "odds88", version: "1.0.0"},
	)
	if err != nil {
		t.Fatalf("expected NewRegistry to succeed, got: %v", err)
	}

	names := registry.Names()
	if len(names) != 2 {
		t.Fatalf("expected 2 names, got %d", len(names))
	}
	if names[0] != "betby" || names[1] != "odds88" {
		t.Fatalf("expected sorted names [betby odds88], got %v", names)
	}
}
