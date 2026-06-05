package livemarkets

import (
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"encoding/base64"
	"testing"
	"time"
)

func TestKalshiAuthHeadersSignsWebSocketPath(t *testing.T) {
	key, err := rsa.GenerateKey(rand.Reader, 2048)
	if err != nil {
		t.Fatal(err)
	}
	now := time.Date(2026, 6, 2, 12, 30, 0, 123000000, time.UTC)
	headers, err := kalshiAuthHeaders(kalshiConfig{
		url:   "wss://external-api-ws.kalshi.com/trade-api/ws/v2?ignored=true",
		keyID: "key-id",
	}, key, func() time.Time { return now })
	if err != nil {
		t.Fatal(err)
	}

	if got := headers.Get("KALSHI-ACCESS-KEY"); got != "key-id" {
		t.Fatalf("key header = %q, want key-id", got)
	}
	if got := headers.Get("KALSHI-ACCESS-TIMESTAMP"); got != "1780403400123" {
		t.Fatalf("timestamp header = %q", got)
	}
	signature, err := base64.StdEncoding.DecodeString(headers.Get("KALSHI-ACCESS-SIGNATURE"))
	if err != nil {
		t.Fatal(err)
	}
	digest := sha256.Sum256([]byte("1780403400123GET/trade-api/ws/v2"))
	if err := rsa.VerifyPSS(&key.PublicKey, crypto.SHA256, digest[:], signature, &rsa.PSSOptions{
		SaltLength: rsa.PSSSaltLengthEqualsHash,
	}); err != nil {
		t.Fatalf("signature did not verify: %v", err)
	}
}

func TestParseKalshiTicker(t *testing.T) {
	now := time.Date(2026, 6, 2, 12, 0, 0, 0, time.UTC)
	events := parseKalshiEvents([]byte(`{
		"type":"ticker",
		"sid":11,
		"msg":{
			"market_ticker":"FED-23DEC-T3.00",
			"price_dollars":"0.480",
			"yes_bid_dollars":"0.450",
			"yes_ask_dollars":"0.530",
			"volume_fp":"33896.00",
			"open_interest_fp":"20422.00",
			"ts_ms":1780401599000
		}
	}`), now)

	if len(events) != 1 {
		t.Fatalf("events = %d, want 1", len(events))
	}
	event := events[0]
	if event.ID != "auth:FED-23DEC-T3.00" || event.Title != "FED-23DEC-T3.00" {
		t.Fatalf("unexpected event identity: %+v", event)
	}
	if event.Source != "market-data" || event.Score != "YES 0.450 / 0.530" || !event.Live {
		t.Fatalf("unexpected event state: %+v", event)
	}
	if event.Detail != "volume 33896.00 · open interest 20422.00" {
		t.Fatalf("detail = %q", event.Detail)
	}
	if event.UpdatedAt.Format(time.RFC3339) != "2026-06-02T11:59:59Z" {
		t.Fatalf("updatedAt = %s", event.UpdatedAt.Format(time.RFC3339))
	}
}

func TestKalshiConfigFromEnv(t *testing.T) {
	t.Setenv("KALSHI_API_KEY_ID", "key-id")
	t.Setenv("KALSHI_API_PRIVATE_KEY", "pem")
	t.Setenv("KALSHI_WS_CHANNELS", "ticker, trade")
	t.Setenv("KALSHI_WS_MARKET_TICKERS", "ONE,TWO")

	cfg, err := kalshiConfigFromEnv()
	if err != nil {
		t.Fatal(err)
	}
	if cfg == nil || cfg.url != defaultKalshiWSURL {
		t.Fatalf("unexpected cfg: %+v", cfg)
	}
	if len(cfg.channels) != 2 || cfg.channels[0] != "ticker" || cfg.channels[1] != "trade" {
		t.Fatalf("channels = %#v", cfg.channels)
	}
	if len(cfg.marketTickers) != 2 || cfg.marketTickers[0] != "ONE" || cfg.marketTickers[1] != "TWO" {
		t.Fatalf("marketTickers = %#v", cfg.marketTickers)
	}
}

func TestAuthenticatedMarketDataHiddenByDefault(t *testing.T) {
	t.Setenv("KALSHI_API_KEY_ID", "key-id")
	t.Setenv("KALSHI_API_PRIVATE_KEY", "pem")

	svc := NewServiceFromEnv()
	for _, provider := range svc.Snapshot().Providers {
		if provider.Key == kalshiMarketDataKey {
			t.Fatalf("authenticated market data provider should be hidden by default: %+v", provider)
		}
	}
}

func TestAuthenticatedMarketDataRequiresOptIn(t *testing.T) {
	t.Setenv("AUTHENTICATED_MARKET_DATA_ENABLED", "true")
	t.Setenv("KALSHI_API_KEY_ID", "key-id")
	t.Setenv("KALSHI_API_PRIVATE_KEY", "pem")

	svc := NewServiceFromEnv()
	var found *ProviderStatus
	for _, provider := range svc.Snapshot().Providers {
		if provider.Key == kalshiMarketDataKey {
			copy := provider
			found = &copy
			break
		}
	}
	if found == nil {
		t.Fatal("authenticated market data provider missing after opt-in")
	}
	if found.State != "configured" || found.Label != "Authenticated market data" {
		t.Fatalf("unexpected provider: %+v", *found)
	}
}
