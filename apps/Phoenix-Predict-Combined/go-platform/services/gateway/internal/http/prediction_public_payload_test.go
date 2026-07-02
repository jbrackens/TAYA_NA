package http

import (
	"encoding/json"
	"strings"
	"testing"

	"phoenix-revival/gateway/internal/prediction"
)

func TestPredictionPublicCatalogPayloadsRedactUnsafeCopyWithoutMutatingSource(t *testing.T) {
	fallback := "crypto-feed"
	source := prediction.Event{
		ID:          "evt-unsafe-copy",
		Title:       "Cash payout event",
		Description: "Crypto prize pool",
		Metadata:    json.RawMessage(`{"hero":"USD payout","safe":"forecast"}`),
		Markets: []prediction.Market{{
			ID:                  "mkt-unsafe-copy",
			CategoryName:        "Cash prizes",
			Title:               "Will BTC cash out?",
			Description:         "Fiat payout copy",
			Translations:        json.RawMessage(`{"en":{"title":"USD payout market"}}`),
			SettlementSourceKey: "crypto-feed",
			SettlementRule:      "cash payout rule",
			SettlementParams:    json.RawMessage(`{"source":"USDC payout"}`),
			FallbackSourceKey:   &fallback,
		}},
	}

	payload := predictionEventPayload(source)
	encoded, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal payload: %v", err)
	}
	body := string(encoded)
	for _, unsafe := range []string{
		"Cash payout event",
		"Crypto prize pool",
		"USD payout",
		"Cash prizes",
		"Will BTC cash out?",
		"Fiat payout copy",
		"USDC payout",
		"crypto-feed",
		"cash payout rule",
	} {
		if strings.Contains(body, unsafe) {
			t.Fatalf("public catalog payload leaked unsafe copy %q: %s", unsafe, body)
		}
	}
	if !strings.Contains(body, launchRedactedUserText) {
		t.Fatalf("expected redaction marker in payload: %s", body)
	}

	if source.Title != "Cash payout event" ||
		source.Description != "Crypto prize pool" ||
		string(source.Metadata) != `{"hero":"USD payout","safe":"forecast"}` ||
		source.Markets[0].Title != "Will BTC cash out?" ||
		source.Markets[0].Description != "Fiat payout copy" ||
		string(source.Markets[0].Translations) != `{"en":{"title":"USD payout market"}}` ||
		source.Markets[0].SettlementSourceKey != "crypto-feed" ||
		source.Markets[0].FallbackSourceKey == nil ||
		*source.Markets[0].FallbackSourceKey != "crypto-feed" {
		t.Fatalf("source event/market was mutated: %+v", source)
	}
}

func TestPredictionSeriesPayloadRedactsUnsafeTagsWithoutMutatingSource(t *testing.T) {
	source := prediction.Series{
		ID:          "ser-unsafe-copy",
		Title:       "Cash prize series",
		Description: "Crypto payout schedule",
		Tags:        []string{"safe forecast", "USD payout"},
	}

	payload := predictionSeriesPayload(source)
	if payload.Title != launchRedactedUserText ||
		payload.Description != launchRedactedUserText ||
		len(payload.Tags) != 2 ||
		payload.Tags[0] != "safe forecast" ||
		payload.Tags[1] != launchRedactedUserText {
		t.Fatalf("expected unsafe series copy redacted, got %+v", payload)
	}
	if source.Title != "Cash prize series" ||
		source.Description != "Crypto payout schedule" ||
		source.Tags[1] != "USD payout" {
		t.Fatalf("source series was mutated: %+v", source)
	}
}
