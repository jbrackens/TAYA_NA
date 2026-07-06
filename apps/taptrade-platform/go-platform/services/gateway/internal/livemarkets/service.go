package livemarkets

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"
)

const (
	polymarketSportsKey = "sports-live"
	kalshiMarketDataKey = "authenticated-market-data"
)

type Service struct {
	store  *Store
	kalshi *kalshiConfig
}

func NewServiceFromEnv() *Service {
	store := NewStore(envInt("LIVE_MARKETS_MAX_EVENTS", 100))
	svc := &Service{store: store}

	store.SetProvider(ProviderStatus{
		Key:   polymarketSportsKey,
		Label: "Sports live moments",
		State: "starting",
	})

	if !authenticatedMarketDataEnabled() {
		return svc
	}

	kalshi, err := kalshiConfigFromEnv()
	kalshiState := "not_configured"
	kalshiError := "Authenticated realtime market data requires API credentials before the gateway can subscribe."
	if err != nil {
		kalshiState = "error"
		kalshiError = err.Error()
	} else if kalshi != nil {
		svc.kalshi = kalshi
		kalshiState = "configured"
		kalshiError = ""
	}
	store.SetProvider(ProviderStatus{
		Key:   kalshiMarketDataKey,
		Label: "Authenticated market data",
		State: kalshiState,
		Error: kalshiError,
	})

	return svc
}

func authenticatedMarketDataEnabled() bool {
	return strings.EqualFold(strings.TrimSpace(os.Getenv("AUTHENTICATED_MARKET_DATA_ENABLED")), "true")
}

func (s *Service) Start(ctx context.Context) {
	if s == nil || s.store == nil {
		return
	}
	if strings.EqualFold(strings.TrimSpace(os.Getenv("LIVE_MARKETS_ENABLED")), "false") {
		s.store.SetProvider(ProviderStatus{
			Key:   polymarketSportsKey,
			Label: "Sports live moments",
			State: "disabled",
		})
		if s.kalshi != nil {
			s.store.SetProvider(ProviderStatus{
				Key:   kalshiMarketDataKey,
				Label: "Authenticated market data",
				State: "disabled",
			})
		}
		slog.Info("live markets disabled", "env", "LIVE_MARKETS_ENABLED=false")
		return
	}

	url := strings.TrimSpace(os.Getenv("POLYMARKET_SPORTS_WS_URL"))
	if url == "" {
		url = "wss://sports-api.polymarket.com/ws"
	}
	go runPolymarketSports(ctx, s.store, url)
	if s.kalshi != nil {
		go runKalshiMarketData(ctx, s.store, *s.kalshi)
	}
}

func (s *Service) Snapshot() Snapshot {
	if s == nil || s.store == nil {
		return Snapshot{Events: []Event{}, Providers: []ProviderStatus{}, Generated: time.Now().UTC()}
	}
	return s.store.Snapshot()
}

func envInt(key string, fallback int) int {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return fallback
	}
	var parsed int
	if _, err := fmt.Sscanf(raw, "%d", &parsed); err == nil && parsed > 0 {
		return parsed
	}
	return fallback
}
