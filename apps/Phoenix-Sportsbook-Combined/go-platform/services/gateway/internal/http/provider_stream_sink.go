package http

import (
	"context"
	"encoding/json"
	"fmt"
	"strings"

	"phoenix-revival/gateway/internal/bets"
	"phoenix-revival/gateway/internal/matchtracker"
	"phoenix-revival/gateway/internal/provider"
	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

type providerEventSink struct {
	fallback            *provider.MemorySink
	betService          *bets.Service
	matchTrackerService *matchtracker.Service
}

func newProviderEventSink(
	betService *bets.Service,
	matchTrackerService *matchtracker.Service,
) provider.EventSink {
	return &providerEventSink{
		fallback:            provider.NewMemorySink(),
		betService:          betService,
		matchTrackerService: matchTrackerService,
	}
}

func (s *providerEventSink) Apply(ctx context.Context, event canonicalv1.Envelope) error {
	if s.fallback != nil {
		if err := s.fallback.Apply(ctx, event); err != nil {
			return err
		}
	}

	switch event.Entity {
	case canonicalv1.EntityCashoutQuote:
		s.applyCashoutQuoteEvent(event)
	case canonicalv1.EntityMatchTracker:
		s.applyMatchTrackerEvent(event)
	}
	return nil
}

func (s *providerEventSink) applyMatchTrackerEvent(event canonicalv1.Envelope) {
	if s.matchTrackerService == nil {
		return
	}

	var shape map[string]json.RawMessage
	if err := json.Unmarshal(event.Payload, &shape); err == nil {
		if isMatchTrackerTimelinePayload(shape) {
			s.applyMatchTrackerTimeline(event)
			return
		}
		if isMatchTrackerIncidentPayload(shape) {
			s.applyMatchTrackerIncident(event)
			return
		}
	}

	// Fallback decode attempt keeps compatibility if providers send atypical payload fields.
	if s.applyMatchTrackerTimeline(event) {
		return
	}
	s.applyMatchTrackerIncident(event)
}

func (s *providerEventSink) applyMatchTrackerTimeline(event canonicalv1.Envelope) bool {
	var timeline canonicalv1.MatchTimeline
	if err := event.DecodePayload(&timeline); err != nil {
		return false
	}
	if strings.TrimSpace(timeline.FixtureID) == "" {
		return false
	}
	if timeline.UpdatedAt.IsZero() {
		timeline.UpdatedAt = event.OccurredAt
	}
	if event.Action == canonicalv1.ActionDelete {
		s.matchTrackerService.DeleteTimeline(timeline.FixtureID)
		return true
	}
	s.matchTrackerService.UpsertTimeline(timeline)
	return true
}

func (s *providerEventSink) applyMatchTrackerIncident(event canonicalv1.Envelope) bool {
	var incident canonicalv1.MatchIncident
	if err := event.DecodePayload(&incident); err != nil {
		return false
	}
	if strings.TrimSpace(incident.FixtureID) == "" {
		return false
	}
	if event.Action == canonicalv1.ActionDelete {
		s.matchTrackerService.DeleteTimeline(incident.FixtureID)
		return true
	}
	s.matchTrackerService.ApplyIncident(incident, event.OccurredAt)
	return true
}

func isMatchTrackerTimelinePayload(shape map[string]json.RawMessage) bool {
	if len(shape) == 0 {
		return false
	}
	_, hasIncidents := shape["incidents"]
	_, hasStatus := shape["status"]
	_, hasUpdatedAt := shape["updatedAt"]
	return hasIncidents || hasStatus || hasUpdatedAt
}

func isMatchTrackerIncidentPayload(shape map[string]json.RawMessage) bool {
	if len(shape) == 0 {
		return false
	}
	_, hasType := shape["type"]
	_, hasIncidentID := shape["incidentId"]
	_, hasOccurredAt := shape["occurredAt"]
	return hasType || hasIncidentID || hasOccurredAt
}

func (s *providerEventSink) applyCashoutQuoteEvent(event canonicalv1.Envelope) {
	if s.betService == nil {
		return
	}

	var update canonicalv1.CashoutQuoteUpdate
	if err := event.DecodePayload(&update); err != nil {
		return
	}

	betID := strings.TrimSpace(update.BetID)
	userID := strings.TrimSpace(update.PlayerID)
	if betID == "" || userID == "" || update.Amount.AmountCents <= 0 {
		return
	}

	requestID := strings.TrimSpace(update.RequestID)
	if requestID == "" {
		requestID = strings.TrimSpace(event.CorrelationID)
	}
	if requestID == "" {
		requestID = fmt.Sprintf("stream-cashout:%s:%s:%d", event.Provider.Name, event.Stream, event.Revision)
	}

	revision := update.ProviderRevision
	if revision <= 0 {
		revision = event.Revision
	}

	source := strings.TrimSpace(update.ProviderSource)
	if source == "" {
		source = strings.TrimSpace(event.Provider.Name)
	}

	_, err := s.betService.QuoteCashout(bets.CashoutQuoteRequest{
		BetID:               betID,
		UserID:              userID,
		RequestID:           requestID,
		ProviderAmountCents: update.Amount.AmountCents,
		ProviderRevision:    revision,
		ProviderSource:      source,
		ProviderExpiresAt:   update.ExpiresAt,
	})
	if err != nil {
		return
	}
}
