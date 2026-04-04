package provider

import (
	"context"
	"fmt"
	"slices"
	"strings"
	"testing"
	"time"

	"phoenix-revival/platform/canonical/adapter"
	canonicalv1 "phoenix-revival/platform/canonical/v1"
)

func TestProviderAdapterConformanceProfile(t *testing.T) {
	candidates := []adapter.ProviderAdapter{
		NewDemoMultiFeedAdapter("odds88-demo"),
		NewDemoMultiFeedAdapter("betby-demo"),
	}

	for _, candidate := range candidates {
		candidate := candidate
		t.Run(candidate.Name(), func(t *testing.T) {
			assertProviderConformanceProfile(t, candidate)
		})
	}
}

func assertProviderConformanceProfile(t *testing.T, candidate adapter.ProviderAdapter) {
	t.Helper()

	name := strings.TrimSpace(candidate.Name())
	if name == "" {
		t.Fatal("adapter name must not be empty")
	}

	schema := candidate.CanonicalSchema()
	if !canonicalv1.IsCompatible(schema.Version) {
		t.Fatalf("schema version %q is not compatible with canonical v1", schema.Version)
	}

	streams := candidate.SupportedStreams()
	if len(streams) == 0 {
		t.Fatal("supported streams must not be empty")
	}

	seen := map[canonicalv1.StreamType]struct{}{}
	for _, stream := range streams {
		if _, exists := seen[stream]; exists {
			t.Fatalf("duplicate stream %s in SupportedStreams()", stream)
		}
		seen[stream] = struct{}{}
	}

	requiredStreams := []canonicalv1.StreamType{
		canonicalv1.StreamDelta,
		canonicalv1.StreamSettlement,
		canonicalv1.StreamMetadata,
		canonicalv1.StreamTranslation,
	}
	for _, required := range requiredStreams {
		if !slices.Contains(streams, required) {
			t.Fatalf("required stream %s is missing from SupportedStreams()", required)
		}
	}

	for _, stream := range streams {
		events, err := candidate.FetchSnapshot(context.Background(), stream, -1)
		if err != nil {
			t.Fatalf("FetchSnapshot(%s): %v", stream, err)
		}
		if len(events) == 0 {
			t.Fatalf("FetchSnapshot(%s) returned no events", stream)
		}
		assertEnvelopeSeries(t, name, stream, events)
		assertSnapshotMonotonic(t, stream, events)
		assertSubscribeStream(t, candidate, name, stream)
	}

	assertAdapterCommandContract(t, candidate)
}

func assertEnvelopeSeries(t *testing.T, adapterName string, stream canonicalv1.StreamType, events []canonicalv1.Envelope) {
	t.Helper()

	for idx, event := range events {
		if err := event.Validate(); err != nil {
			t.Fatalf("event[%d] failed validation: %v", idx, err)
		}
		if event.Stream != stream {
			t.Fatalf("event[%d] stream mismatch: got=%s want=%s", idx, event.Stream, stream)
		}
		if !strings.EqualFold(strings.TrimSpace(event.Provider.Name), strings.TrimSpace(adapterName)) {
			t.Fatalf("event[%d] provider mismatch: got=%s want=%s", idx, event.Provider.Name, adapterName)
		}
	}
}

func assertSnapshotMonotonic(t *testing.T, stream canonicalv1.StreamType, events []canonicalv1.Envelope) {
	t.Helper()

	var lastRevision int64 = -1
	var lastSequence int64 = -1
	for idx, event := range events {
		if event.Revision < lastRevision {
			t.Fatalf("snapshot event[%d] for %s has decreasing revision %d < %d", idx, stream, event.Revision, lastRevision)
		}
		if event.Revision == lastRevision && event.Sequence < lastSequence {
			t.Fatalf("snapshot event[%d] for %s has decreasing sequence %d < %d", idx, stream, event.Sequence, lastSequence)
		}
		lastRevision = event.Revision
		lastSequence = event.Sequence
	}
}

func assertSubscribeStream(t *testing.T, candidate adapter.ProviderAdapter, adapterName string, stream canonicalv1.StreamType) {
	t.Helper()

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	eventsCh, errsCh, err := candidate.SubscribeStream(ctx, stream, -1)
	if err != nil {
		t.Fatalf("SubscribeStream(%s): %v", stream, err)
	}

	var observed []canonicalv1.Envelope
	for eventsCh != nil || errsCh != nil {
		select {
		case <-ctx.Done():
			t.Fatalf("SubscribeStream(%s) timed out waiting for stream close", stream)
		case event, ok := <-eventsCh:
			if !ok {
				eventsCh = nil
				continue
			}
			observed = append(observed, event)
		case streamErr, ok := <-errsCh:
			if !ok {
				errsCh = nil
				continue
			}
			if streamErr != nil {
				t.Fatalf("SubscribeStream(%s) emitted error: %v", stream, streamErr)
			}
		}
	}

	if len(observed) == 0 {
		t.Fatalf("SubscribeStream(%s) produced no events", stream)
	}
	assertEnvelopeSeries(t, adapterName, stream, observed)
}

func assertAdapterCommandContract(t *testing.T, candidate adapter.ProviderAdapter) {
	t.Helper()

	placeRequest := adapter.PlaceBetRequest{
		PlayerID:      "u-provider-conformance",
		RequestID:     fmt.Sprintf("req-%s", strings.ToLower(strings.ReplaceAll(candidate.Name(), " ", "-"))),
		AcceptAnyOdds: true,
		Stake: canonicalv1.Money{
			Currency:    "USD",
			AmountCents: 1000,
		},
		Items: []adapter.PlaceBetItem{
			{
				FixtureID:   "fixture:demo:1",
				MarketID:    "market:demo:1",
				SelectionID: "selection:home",
				OddsDecimal: 1.91,
				StakeCents:  1000,
			},
		},
	}

	placeResponse, err := candidate.PlaceBet(context.Background(), placeRequest)
	if err != nil {
		t.Fatalf("PlaceBet failed: %v", err)
	}
	if placeResponse.Bet.BetID == "" {
		t.Fatal("PlaceBet must return a non-empty BetID")
	}
	if placeResponse.Bet.Status != canonicalv1.BetStatusAccepted {
		t.Fatalf("PlaceBet status mismatch: got=%s want=%s", placeResponse.Bet.Status, canonicalv1.BetStatusAccepted)
	}
	if placeResponse.ProviderRevision <= 0 {
		t.Fatalf("PlaceBet provider revision must be positive, got %d", placeResponse.ProviderRevision)
	}

	cancelResponse, err := candidate.CancelBet(context.Background(), adapter.CancelBetRequest{
		PlayerID:  placeRequest.PlayerID,
		BetID:     placeResponse.Bet.BetID,
		RequestID: placeRequest.RequestID + "-cancel",
		Reason:    "conformance",
	})
	if err != nil {
		t.Fatalf("CancelBet failed: %v", err)
	}
	if cancelResponse.Bet.Status != canonicalv1.BetStatusCancelled {
		t.Fatalf("CancelBet status mismatch: got=%s want=%s", cancelResponse.Bet.Status, canonicalv1.BetStatusCancelled)
	}

	maxStakeAllowed, err := candidate.MaxStake(context.Background(), adapter.MaxStakeRequest{
		PlayerID:    placeRequest.PlayerID,
		FixtureID:   "fixture:demo:1",
		MarketID:    "market:demo:1",
		SelectionID: "selection:home",
		OddsDecimal: 1.91,
	})
	if err != nil {
		t.Fatalf("MaxStake (allowed case) failed: %v", err)
	}
	if !maxStakeAllowed.Allowed || maxStakeAllowed.MaxStakeCents <= 0 {
		t.Fatalf("MaxStake allowed case mismatch: %+v", maxStakeAllowed)
	}

	maxStakeRejected, err := candidate.MaxStake(context.Background(), adapter.MaxStakeRequest{
		PlayerID:    placeRequest.PlayerID,
		FixtureID:   "fixture:demo:1",
		MarketID:    "market:demo:1",
		SelectionID: "selection:home",
		OddsDecimal: 5000,
	})
	if err != nil {
		t.Fatalf("MaxStake (rejected case) failed: %v", err)
	}
	if maxStakeRejected.Allowed {
		t.Fatalf("MaxStake rejected case must not allow stake: %+v", maxStakeRejected)
	}
	if strings.TrimSpace(maxStakeRejected.Reason) == "" {
		t.Fatal("MaxStake rejected case must include reason")
	}

	quoteResponse, err := candidate.CashoutQuote(context.Background(), adapter.CashoutQuoteRequest{
		PlayerID: placeRequest.PlayerID,
		BetID:    placeResponse.Bet.BetID,
	})
	if err != nil {
		t.Fatalf("CashoutQuote failed: %v", err)
	}
	if quoteResponse.BetID != placeResponse.Bet.BetID {
		t.Fatalf("CashoutQuote bet mismatch: got=%s want=%s", quoteResponse.BetID, placeResponse.Bet.BetID)
	}
	if quoteResponse.QuoteID == "" {
		t.Fatal("CashoutQuote must return non-empty QuoteID")
	}
	if quoteResponse.Quote.AmountCents <= 0 {
		t.Fatalf("CashoutQuote amount must be positive, got %d", quoteResponse.Quote.AmountCents)
	}
	if _, parseErr := time.Parse(time.RFC3339, quoteResponse.ExpiresAtUTC); parseErr != nil {
		t.Fatalf("CashoutQuote expiry must be RFC3339, got=%q err=%v", quoteResponse.ExpiresAtUTC, parseErr)
	}

	acceptResponse, err := candidate.CashoutAccept(context.Background(), adapter.CashoutAcceptRequest{
		PlayerID: placeRequest.PlayerID,
		BetID:    placeResponse.Bet.BetID,
		QuoteID:  quoteResponse.QuoteID,
	})
	if err != nil {
		t.Fatalf("CashoutAccept failed: %v", err)
	}
	if acceptResponse.Bet.Status != canonicalv1.BetStatusCashedOut {
		t.Fatalf("CashoutAccept status mismatch: got=%s want=%s", acceptResponse.Bet.Status, canonicalv1.BetStatusCashedOut)
	}
}
