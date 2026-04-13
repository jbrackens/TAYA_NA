package http

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
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
	case canonicalv1.EntitySettlement:
		s.applySettlementEvent(event)
	}
	return nil
}

// applySettlementEvent processes a settlement event from the feed provider.
// It extracts the winning selection(s) and settles all bets on the market.
func (s *providerEventSink) applySettlementEvent(event canonicalv1.Envelope) {
	if s.betService == nil {
		return
	}

	var settlement canonicalv1.Settlement
	if err := event.DecodePayload(&settlement); err != nil {
		slog.Error("feed settlement decode failed", "error", err)
		return
	}

	if settlement.BetID == "" {
		slog.Warn("feed settlement skipped: empty betId", "revision", event.Revision)
		return
	}

	winningSelections := strings.Join(settlement.WinningSelectionIDs, ",")
	if winningSelections == "" && settlement.Outcome == canonicalv1.SettlementOutcomeVoid {
		actor := fmt.Sprintf("feed:%s", event.Provider.Name)
		// Void settlement — try Cancel first (for placed bets), fall back to Refund (for settled bets)
		_, err := s.betService.Cancel(bets.LifecycleBetRequest{
			BetID:   settlement.BetID,
			Reason:  settlement.Reason,
			ActorID: actor,
		})
		if err != nil {
			// If bet was already settled (won/lost), use Refund which handles
			// reversal of prior payout before refunding stake.
			_, refundErr := s.betService.Refund(bets.LifecycleBetRequest{
				BetID:   settlement.BetID,
				Reason:  settlement.Reason,
				ActorID: actor,
			})
			if refundErr != nil {
				slog.Error("feed settlement void failed", "bet_id", settlement.BetID, "cancel_err", err, "refund_err", refundErr)
			} else {
				slog.Info("feed settlement voided (via refund)", "bet_id", settlement.BetID, "reason", settlement.Reason)
			}
		} else {
			slog.Info("feed settlement voided", "bet_id", settlement.BetID, "reason", settlement.Reason)
		}
		return
	}

	if winningSelections == "" {
		slog.Warn("feed settlement skipped: no winning selections", "bet_id", settlement.BetID)
		return
	}

	var deadHeatFactor *float64
	if settlement.DeadHeatFactor != nil {
		deadHeatFactor = settlement.DeadHeatFactor
	}

	req := bets.SettleBetRequest{
		BetID:                settlement.BetID,
		WinningSelectionID:   winningSelections,
		WinningSelectionName: "",
		ResultSource:         fmt.Sprintf("feed:%s", event.Provider.Name),
		DeadHeatFactor:       deadHeatFactor,
		Reason:               settlement.Reason,
		ActorID:              fmt.Sprintf("feed:%s", event.Provider.Name),
	}
	_, err := s.betService.Settle(req)
	if err != nil {
		slog.Error("feed settlement failed", "bet_id", settlement.BetID, "selections", winningSelections, "error", err)
		s.betService.RecordSettlementFailure(req, err)
	} else {
		slog.Info("feed settlement completed", "bet_id", settlement.BetID, "winning", winningSelections, "source", event.Provider.Name)
	}
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
