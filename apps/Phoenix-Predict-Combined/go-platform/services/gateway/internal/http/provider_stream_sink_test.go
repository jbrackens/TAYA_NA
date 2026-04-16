package http

import (
	"context"
	"testing"
	"time"

	"phoenix-revival/gateway/internal/bets"
	"phoenix-revival/gateway/internal/domain"
	"phoenix-revival/gateway/internal/matchtracker"
	"phoenix-revival/gateway/internal/wallet"
	"phoenix-revival/platform/canonical/replay"
	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

func TestProviderEventSinkAppliesCashoutQuoteUpdate(t *testing.T) {
	repository := domain.NewInMemoryReadRepository()
	walletService := wallet.NewService()
	_, _ = walletService.Credit(wallet.MutationRequest{UserID: "u-stream-cashout-1", AmountCents: 5000, IdempotencyKey: "seed"})
	betService := bets.NewService(repository, walletService)

	placed, err := betService.Place(bets.PlaceBetRequest{
		UserID:         "u-stream-cashout-1",
		RequestID:      "stream-place-1",
		MarketID:       "m:local:001",
		SelectionID:    "home",
		StakeCents:     1000,
		Odds:           2.0,
		IdempotencyKey: "stream-place-1",
	})
	if err != nil {
		t.Fatalf("place bet: %v", err)
	}

	sink := newProviderEventSink(betService, nil)
	providerExpiry := time.Date(2026, 3, 4, 13, 15, 0, 0, time.UTC)
	event, err := canonicalv1.NewEnvelope(
		canonicalv1.ProviderRef{Name: "odds88-demo", Feed: "metadata"},
		canonicalv1.StreamMetadata,
		99,
		1,
		canonicalv1.EntityCashoutQuote,
		canonicalv1.ActionUpsert,
		time.Date(2026, 3, 4, 13, 0, 0, 0, time.UTC),
		canonicalv1.CashoutQuoteUpdate{
			BetID:     placed.BetID,
			PlayerID:  placed.UserID,
			RequestID: "stream-cashout-quote-1",
			QuoteID:   "provider-quote-1",
			Amount: canonicalv1.Money{
				Currency:    "USD",
				AmountCents: 3600,
			},
			ExpiresAt:        providerExpiry,
			ProviderRevision: 99,
			ProviderSource:   "odds88-stream",
		},
	)
	if err != nil {
		t.Fatalf("new envelope: %v", err)
	}

	if err := sink.Apply(context.Background(), event); err != nil {
		t.Fatalf("apply provider event: %v", err)
	}

	quote, err := betService.QuoteCashout(bets.CashoutQuoteRequest{
		BetID:     placed.BetID,
		UserID:    placed.UserID,
		RequestID: "stream-cashout-quote-1",
	})
	if err != nil {
		t.Fatalf("quote cashout after stream update: %v", err)
	}
	if quote.AmountCents != 3600 {
		t.Fatalf("expected provider stream amount 3600, got %d", quote.AmountCents)
	}
	if quote.Revision != 99 {
		t.Fatalf("expected provider revision 99, got %d", quote.Revision)
	}
	if quote.Source != "odds88-stream" {
		t.Fatalf("expected provider source odds88-stream, got %s", quote.Source)
	}
	if quote.ExpiresAt != providerExpiry.Format(time.RFC3339) {
		t.Fatalf("expected provider expiry %s, got %s", providerExpiry.Format(time.RFC3339), quote.ExpiresAt)
	}
}

func TestProviderEventSinkAppliesMatchTrackerIncidentUpdate(t *testing.T) {
	timelineService := matchtracker.NewService()
	sink := newProviderEventSink(nil, timelineService)
	occurredAt := time.Date(2026, 3, 4, 14, 5, 0, 0, time.UTC)
	event, err := canonicalv1.NewEnvelope(
		canonicalv1.ProviderRef{Name: "odds88-demo", Feed: "metadata"},
		canonicalv1.StreamMetadata,
		11,
		1,
		canonicalv1.EntityMatchTracker,
		canonicalv1.ActionUpsert,
		occurredAt,
		canonicalv1.MatchIncident{
			IncidentID:   "inc:f-local-001:goal:1",
			FixtureID:    "f:local:001",
			Type:         canonicalv1.MatchIncidentGoal,
			Period:       "1H",
			ClockSeconds: 605,
			Score: canonicalv1.MatchScore{
				Home: 1,
				Away: 0,
			},
			OccurredAt: occurredAt,
		},
	)
	if err != nil {
		t.Fatalf("new envelope: %v", err)
	}

	if err := sink.Apply(context.Background(), event); err != nil {
		t.Fatalf("apply provider event: %v", err)
	}

	timeline, exists := timelineService.GetTimeline("f:local:001")
	if !exists {
		t.Fatal("expected match-tracker timeline to exist")
	}
	if timeline.Score.Home != 1 || timeline.Score.Away != 0 {
		t.Fatalf("expected score 1-0, got %d-%d", timeline.Score.Home, timeline.Score.Away)
	}
	if len(timeline.Incidents) != 1 {
		t.Fatalf("expected one incident, got %d", len(timeline.Incidents))
	}
	if timeline.Incidents[0].Type != canonicalv1.MatchIncidentGoal {
		t.Fatalf("expected goal incident type, got %s", timeline.Incidents[0].Type)
	}
}

func TestProviderEventSinkMatchTrackerReplayDeterministic(t *testing.T) {
	timelineService := matchtracker.NewService()
	sink := newProviderEventSink(nil, timelineService)
	engine := replay.NewEngine(replay.NewMemoryStore())

	base := time.Date(2026, 3, 4, 14, 0, 0, 0, time.UTC)
	events := []canonicalv1.Envelope{
		mustMatchTrackerIncidentEnvelope(
			t,
			"odds88-demo",
			canonicalv1.StreamMetadata,
			3,
			1,
			base.Add(3*time.Minute),
			canonicalv1.MatchIncident{
				IncidentID:   "inc:f-local-001:goal:2",
				FixtureID:    "f:local:001",
				Type:         canonicalv1.MatchIncidentGoal,
				Period:       "1H",
				ClockSeconds: 1250,
				Score:        canonicalv1.MatchScore{Home: 2, Away: 0},
				OccurredAt:   base.Add(3 * time.Minute),
			},
		),
		mustMatchTrackerIncidentEnvelope(
			t,
			"odds88-demo",
			canonicalv1.StreamMetadata,
			1,
			1,
			base,
			canonicalv1.MatchIncident{
				IncidentID:   "inc:f-local-001:kickoff",
				FixtureID:    "f:local:001",
				Type:         canonicalv1.MatchIncidentKickoff,
				Period:       "1H",
				ClockSeconds: 0,
				Score:        canonicalv1.MatchScore{Home: 0, Away: 0},
				OccurredAt:   base,
			},
		),
		mustMatchTrackerIncidentEnvelope(
			t,
			"odds88-demo",
			canonicalv1.StreamMetadata,
			2,
			1,
			base.Add(90*time.Second),
			canonicalv1.MatchIncident{
				IncidentID:   "inc:f-local-001:goal:1",
				FixtureID:    "f:local:001",
				Type:         canonicalv1.MatchIncidentGoal,
				Period:       "1H",
				ClockSeconds: 780,
				Score:        canonicalv1.MatchScore{Home: 1, Away: 0},
				OccurredAt:   base.Add(90 * time.Second),
			},
		),
		// Duplicate event by revision/sequence should be skipped by replay checkpoint semantics.
		mustMatchTrackerIncidentEnvelope(
			t,
			"odds88-demo",
			canonicalv1.StreamMetadata,
			2,
			1,
			base.Add(90*time.Second),
			canonicalv1.MatchIncident{
				IncidentID:   "inc:f-local-001:goal:1",
				FixtureID:    "f:local:001",
				Type:         canonicalv1.MatchIncidentGoal,
				Period:       "1H",
				ClockSeconds: 780,
				Score:        canonicalv1.MatchScore{Home: 1, Away: 0},
				OccurredAt:   base.Add(90 * time.Second),
			},
		),
	}

	result, err := engine.Replay(
		context.Background(),
		"odds88-demo",
		canonicalv1.StreamMetadata,
		events,
		sink.Apply,
	)
	if err != nil {
		t.Fatalf("replay should succeed: %v", err)
	}
	if result.Applied != 3 {
		t.Fatalf("expected 3 applied events, got %d", result.Applied)
	}
	if result.Skipped != 1 {
		t.Fatalf("expected 1 skipped event, got %d", result.Skipped)
	}
	if result.LastCheckpoint.Revision != 3 || result.LastCheckpoint.Sequence != 1 {
		t.Fatalf(
			"expected last checkpoint 3/1, got %d/%d",
			result.LastCheckpoint.Revision,
			result.LastCheckpoint.Sequence,
		)
	}

	timeline, exists := timelineService.GetTimeline("f:local:001")
	if !exists {
		t.Fatal("expected match-tracker timeline to exist after replay")
	}
	if len(timeline.Incidents) != 3 {
		t.Fatalf("expected 3 incidents, got %d", len(timeline.Incidents))
	}
	if timeline.Score.Home != 2 || timeline.Score.Away != 0 {
		t.Fatalf("expected final score 2-0, got %d-%d", timeline.Score.Home, timeline.Score.Away)
	}
	if timeline.Incidents[0].IncidentID != "inc:f-local-001:kickoff" {
		t.Fatalf("unexpected first incident ordering: %s", timeline.Incidents[0].IncidentID)
	}
	if timeline.Incidents[2].IncidentID != "inc:f-local-001:goal:2" {
		t.Fatalf("unexpected last incident ordering: %s", timeline.Incidents[2].IncidentID)
	}
}

func mustMatchTrackerIncidentEnvelope(
	t *testing.T,
	providerName string,
	stream canonicalv1.StreamType,
	revision int64,
	sequence int64,
	occurredAt time.Time,
	incident canonicalv1.MatchIncident,
) canonicalv1.Envelope {
	t.Helper()
	event, err := canonicalv1.NewEnvelope(
		canonicalv1.ProviderRef{Name: providerName, Feed: string(stream)},
		stream,
		revision,
		sequence,
		canonicalv1.EntityMatchTracker,
		canonicalv1.ActionUpsert,
		occurredAt,
		incident,
	)
	if err != nil {
		t.Fatalf("new envelope: %v", err)
	}
	return event
}
