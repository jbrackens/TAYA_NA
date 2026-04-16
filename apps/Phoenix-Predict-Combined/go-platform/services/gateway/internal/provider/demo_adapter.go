package provider

import (
	"context"
	"fmt"
	"strings"
	"time"

	"phoenix-revival/platform/canonical/adapter"
	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

type DemoMultiFeedAdapter struct {
	name string
}

func NewDemoMultiFeedAdapter(name string) *DemoMultiFeedAdapter {
	value := strings.TrimSpace(name)
	if value == "" {
		value = "demo-provider"
	}
	return &DemoMultiFeedAdapter{name: value}
}

func (d *DemoMultiFeedAdapter) Name() string {
	return d.name
}

func (d *DemoMultiFeedAdapter) CanonicalSchema() canonicalv1.SchemaInfo {
	return canonicalv1.CurrentSchema()
}

func (d *DemoMultiFeedAdapter) SupportedStreams() []canonicalv1.StreamType {
	return []canonicalv1.StreamType{
		canonicalv1.StreamDelta,
		canonicalv1.StreamSettlement,
		canonicalv1.StreamMetadata,
		canonicalv1.StreamTranslation,
	}
}

func (d *DemoMultiFeedAdapter) SubscribeStream(
	ctx context.Context,
	stream canonicalv1.StreamType,
	fromRevision int64,
) (<-chan canonicalv1.Envelope, <-chan error, error) {
	events := make(chan canonicalv1.Envelope)
	errs := make(chan error, 1)

	go func() {
		defer close(events)
		defer close(errs)

		for _, event := range d.sampleEvents(stream) {
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

func (d *DemoMultiFeedAdapter) FetchSnapshot(
	_ context.Context,
	stream canonicalv1.StreamType,
	atRevision int64,
) ([]canonicalv1.Envelope, error) {
	var out []canonicalv1.Envelope
	for _, event := range d.sampleEvents(stream) {
		if atRevision >= 0 && event.Revision > atRevision {
			continue
		}
		out = append(out, event)
	}
	return out, nil
}

func (d *DemoMultiFeedAdapter) PlaceBet(_ context.Context, request adapter.PlaceBetRequest) (adapter.PlaceBetResponse, error) {
	now := time.Now().UTC()
	bet := canonicalv1.Bet{
		BetID:     fmt.Sprintf("%s-bet-%s", d.name, request.RequestID),
		PlayerID:  request.PlayerID,
		RequestID: request.RequestID,
		Status:    canonicalv1.BetStatusAccepted,
		Stake:     request.Stake,
		PlacedAt:  now,
		Legs:      []canonicalv1.BetLeg{},
	}

	for _, item := range request.Items {
		bet.Legs = append(bet.Legs, canonicalv1.BetLeg{
			FixtureID:      item.FixtureID,
			MarketID:       item.MarketID,
			SelectionID:    item.SelectionID,
			OddsDecimal:    item.OddsDecimal,
			StakeCents:     item.StakeCents,
			IsInPlay:       item.IsInPlay,
			AppliedLTDMsec: 0,
		})
	}

	return adapter.PlaceBetResponse{
		Bet:              bet,
		ProviderBetID:    bet.BetID,
		ProviderRevision: 1,
	}, nil
}

func (d *DemoMultiFeedAdapter) CancelBet(_ context.Context, request adapter.CancelBetRequest) (adapter.CancelBetResponse, error) {
	now := time.Now().UTC()
	return adapter.CancelBetResponse{
		Bet: canonicalv1.Bet{
			BetID:     request.BetID,
			PlayerID:  request.PlayerID,
			RequestID: request.RequestID,
			Status:    canonicalv1.BetStatusCancelled,
			SettledAt: &now,
		},
		ProviderRevision: 1,
	}, nil
}

func (d *DemoMultiFeedAdapter) MaxStake(_ context.Context, request adapter.MaxStakeRequest) (adapter.MaxStakeResponse, error) {
	allowed := request.OddsDecimal >= 1.01 && request.OddsDecimal <= 1000.0
	maxStake := int64(100000)
	reason := ""
	if !allowed {
		maxStake = 0
		reason = "odds_out_of_range"
	}
	return adapter.MaxStakeResponse{
		Allowed:       allowed,
		MaxStakeCents: maxStake,
		Reason:        reason,
	}, nil
}

func (d *DemoMultiFeedAdapter) CashoutQuote(_ context.Context, request adapter.CashoutQuoteRequest) (adapter.CashoutQuoteResponse, error) {
	expires := time.Now().UTC().Add(10 * time.Second)
	return adapter.CashoutQuoteResponse{
		BetID: request.BetID,
		Quote: canonicalv1.Money{
			Currency:    "USD",
			AmountCents: 4200,
		},
		QuoteID:          fmt.Sprintf("%s-quote-%d", d.name, time.Now().UTC().UnixNano()),
		ExpiresAtUTC:     expires.Format(time.RFC3339),
		ProviderRevision: 2,
	}, nil
}

func (d *DemoMultiFeedAdapter) CashoutAccept(_ context.Context, request adapter.CashoutAcceptRequest) (adapter.CashoutAcceptResponse, error) {
	now := time.Now().UTC()
	return adapter.CashoutAcceptResponse{
		Bet: canonicalv1.Bet{
			BetID:     request.BetID,
			PlayerID:  request.PlayerID,
			RequestID: request.QuoteID,
			Status:    canonicalv1.BetStatusCashedOut,
			SettledAt: &now,
		},
		ProviderRevision: 3,
	}, nil
}

func (d *DemoMultiFeedAdapter) sampleEvents(stream canonicalv1.StreamType) []canonicalv1.Envelope {
	now := time.Date(2026, 3, 4, 12, 0, 0, 0, time.UTC)
	switch stream {
	case canonicalv1.StreamDelta:
		return []canonicalv1.Envelope{
			d.mustEnvelope(stream, 1, 1, canonicalv1.EntityFixture, canonicalv1.ActionUpsert, canonicalv1.Fixture{
				FixtureID: "fixture:demo:1",
				SportID:   "sport:esports",
				Name:      "Team A vs Team B",
				StartsAt:  now.Add(2 * time.Hour),
				Status:    canonicalv1.FixtureStatusScheduled,
				UpdatedAt: now,
			}),
			d.mustEnvelope(stream, 2, 1, canonicalv1.EntityMarket, canonicalv1.ActionUpsert, canonicalv1.Market{
				MarketID:  "market:demo:1",
				FixtureID: "fixture:demo:1",
				Name:      "Match Winner",
				Status:    canonicalv1.MarketStatusOpen,
				Selections: []canonicalv1.Selection{
					{SelectionID: "selection:home", Name: "Team A", OddsDecimal: 1.8, Active: true},
					{SelectionID: "selection:away", Name: "Team B", OddsDecimal: 2.1, Active: true},
				},
				UpdatedAt: now.Add(1 * time.Minute),
			}),
		}
	case canonicalv1.StreamSettlement:
		return []canonicalv1.Envelope{
			d.mustEnvelope(stream, 3, 1, canonicalv1.EntitySettlement, canonicalv1.ActionUpsert, canonicalv1.Settlement{
				BetID:               "bet:demo:1",
				Outcome:             canonicalv1.SettlementOutcomeWin,
				WinningSelectionIDs: []string{"selection:home"},
				ResultSource:        "demo_feed",
				SettledAt:           now.Add(3 * time.Hour),
			}),
		}
	case canonicalv1.StreamMetadata:
		return []canonicalv1.Envelope{
			d.mustEnvelope(stream, 4, 1, canonicalv1.EntityMarket, canonicalv1.ActionPatch, canonicalv1.Market{
				MarketID:   "market:demo:1",
				FixtureID:  "fixture:demo:1",
				Name:       "Match Winner",
				Status:     canonicalv1.MarketStatusOpen,
				Specifiers: map[string]string{"period": "full_time"},
				UpdatedAt:  now.Add(2 * time.Minute),
			}),
			d.mustEnvelope(stream, 5, 1, canonicalv1.EntityCashoutQuote, canonicalv1.ActionUpsert, canonicalv1.CashoutQuoteUpdate{
				BetID:     "bet:demo:1",
				PlayerID:  "player:demo:1",
				RequestID: "stream-cashout-1",
				QuoteID:   "stream-quote-1",
				Amount: canonicalv1.Money{
					Currency:    "USD",
					AmountCents: 3900,
				},
				ExpiresAt:        now.Add(4 * time.Minute),
				ProviderRevision: 5,
				ProviderSource:   d.name,
			}),
			d.mustEnvelope(stream, 6, 1, canonicalv1.EntityMatchTracker, canonicalv1.ActionUpsert, canonicalv1.MatchIncident{
				IncidentID:   "inc:f-local-001:kickoff",
				FixtureID:    "f:local:001",
				Type:         canonicalv1.MatchIncidentKickoff,
				Period:       "1H",
				ClockSeconds: 0,
				Score: canonicalv1.MatchScore{
					Home: 0,
					Away: 0,
				},
				OccurredAt: now.Add(5 * time.Minute),
			}),
			d.mustEnvelope(stream, 7, 1, canonicalv1.EntityMatchTracker, canonicalv1.ActionUpsert, canonicalv1.MatchIncident{
				IncidentID:   "inc:f-local-001:goal:1",
				FixtureID:    "f:local:001",
				Type:         canonicalv1.MatchIncidentGoal,
				Period:       "1H",
				ClockSeconds: 840,
				Score: canonicalv1.MatchScore{
					Home: 1,
					Away: 0,
				},
				OccurredAt: now.Add(19 * time.Minute),
			}),
		}
	case canonicalv1.StreamTranslation:
		return []canonicalv1.Envelope{
			d.mustEnvelope(stream, 5, 1, canonicalv1.EntityTranslation, canonicalv1.ActionUpsert, canonicalv1.Translation{
				Locale:     "en",
				EntityType: canonicalv1.EntityMarket,
				EntityID:   "market:demo:1",
				Fields:     map[string]string{"name": "Match Winner"},
				UpdatedAt:  now.Add(3 * time.Minute),
			}),
		}
	default:
		return nil
	}
}

func (d *DemoMultiFeedAdapter) mustEnvelope(
	stream canonicalv1.StreamType,
	revision int64,
	sequence int64,
	entity canonicalv1.EntityType,
	action canonicalv1.ChangeAction,
	payload any,
) canonicalv1.Envelope {
	event, err := canonicalv1.NewEnvelope(
		canonicalv1.ProviderRef{Name: d.name, Feed: string(stream)},
		stream,
		revision,
		sequence,
		entity,
		action,
		time.Now().UTC(),
		payload,
	)
	if err != nil {
		panic(err)
	}
	return event
}
