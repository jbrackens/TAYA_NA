package livemarkets

import (
	"context"
	"crypto"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/x509"
	"encoding/base64"
	"encoding/json"
	"encoding/pem"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"

	"github.com/gorilla/websocket"
)

const defaultKalshiWSURL = "wss://external-api-ws.kalshi.com/trade-api/ws/v2"

type kalshiConfig struct {
	url           string
	keyID         string
	privateKeyPEM string
	channels      []string
	marketTickers []string
}

func kalshiConfigFromEnv() (*kalshiConfig, error) {
	keyID := strings.TrimSpace(os.Getenv("KALSHI_API_KEY_ID"))
	privateKeyPEM := strings.TrimSpace(os.Getenv("KALSHI_API_PRIVATE_KEY"))
	privateKeyPath := strings.TrimSpace(os.Getenv("KALSHI_API_PRIVATE_KEY_PATH"))
	if keyID == "" && privateKeyPEM == "" && privateKeyPath == "" {
		return nil, nil
	}
	if keyID == "" {
		return nil, errors.New("Authenticated market data API key id is missing")
	}
	if privateKeyPEM == "" && privateKeyPath == "" {
		return nil, errors.New("Authenticated market data private key is missing")
	}
	if privateKeyPEM == "" {
		data, err := os.ReadFile(privateKeyPath)
		if err != nil {
			return nil, fmt.Errorf("Authenticated market data private key file could not be read: %w", err)
		}
		privateKeyPEM = string(data)
	}
	privateKeyPEM = strings.ReplaceAll(privateKeyPEM, `\n`, "\n")

	wsURL := strings.TrimSpace(os.Getenv("KALSHI_WS_URL"))
	if wsURL == "" {
		wsURL = defaultKalshiWSURL
	}
	channels := csvEnv("KALSHI_WS_CHANNELS")
	if len(channels) == 0 {
		channels = []string{"ticker"}
	}

	return &kalshiConfig{
		url:           wsURL,
		keyID:         keyID,
		privateKeyPEM: privateKeyPEM,
		channels:      channels,
		marketTickers: csvEnv("KALSHI_WS_MARKET_TICKERS"),
	}, nil
}

func runKalshiMarketData(ctx context.Context, store *Store, cfg kalshiConfig) {
	privateKey, err := parseRSAPrivateKey(cfg.privateKeyPEM)
	if err != nil {
		store.SetProvider(ProviderStatus{
			Key:   kalshiMarketDataKey,
			Label: "Authenticated market data",
			State: "error",
			Error: "Authenticated market data private key could not be parsed",
		})
		slog.Warn("live markets: Kalshi private key parse failed", "err", err)
		return
	}

	backoff := time.Second
	for ctx.Err() == nil {
		store.SetProvider(ProviderStatus{
			Key:   kalshiMarketDataKey,
			Label: "Authenticated market data",
			State: "connecting",
		})

		headers, err := kalshiAuthHeaders(cfg, privateKey, time.Now)
		if err != nil {
			store.SetProvider(ProviderStatus{
				Key:   kalshiMarketDataKey,
				Label: "Authenticated market data",
				State: "error",
				Error: "Authenticated market data WebSocket auth headers could not be signed",
			})
			slog.Warn("live markets: Kalshi auth signing failed", "err", err)
			sleep(ctx, backoff)
			backoff = nextBackoff(backoff)
			continue
		}

		conn, _, err := websocket.DefaultDialer.DialContext(ctx, cfg.url, headers)
		if err != nil {
			store.SetProvider(ProviderStatus{
				Key:   kalshiMarketDataKey,
				Label: "Authenticated market data",
				State: "error",
				Error: "Authenticated market data socket connection failed",
			})
			slog.Warn("live markets: Kalshi socket connect failed", "err", err)
			sleep(ctx, backoff)
			backoff = nextBackoff(backoff)
			continue
		}

		connectedAt := time.Now().UTC()
		store.SetProvider(ProviderStatus{
			Key:             kalshiMarketDataKey,
			Label:           "Authenticated market data",
			State:           "connected",
			LastConnectedAt: &connectedAt,
		})
		backoff = time.Second

		if err := conn.WriteJSON(kalshiSubscribeMessage(cfg)); err != nil {
			_ = conn.Close()
			store.SetProvider(ProviderStatus{
				Key:             kalshiMarketDataKey,
				Label:           "Authenticated market data",
				State:           "error",
				LastConnectedAt: &connectedAt,
				Error:           "Authenticated market data subscription failed",
			})
			slog.Warn("live markets: Kalshi subscribe failed", "err", err)
			sleep(ctx, backoff)
			backoff = nextBackoff(backoff)
			continue
		}

		done := make(chan struct{})
		go func() {
			select {
			case <-ctx.Done():
				_ = conn.Close()
			case <-done:
			}
		}()

		for ctx.Err() == nil {
			_, data, err := conn.ReadMessage()
			if err != nil {
				close(done)
				_ = conn.Close()
				store.SetProvider(ProviderStatus{
					Key:             kalshiMarketDataKey,
					Label:           "Authenticated market data",
					State:           "stale",
					LastConnectedAt: &connectedAt,
					Error:           "Authenticated market data socket disconnected",
				})
				slog.Warn("live markets: Kalshi socket read failed", "err", err)
				break
			}

			events := parseKalshiEvents(data, time.Now().UTC())
			lastMessageAt := time.Now().UTC()
			store.SetProvider(ProviderStatus{
				Key:             kalshiMarketDataKey,
				Label:           "Authenticated market data",
				State:           "connected",
				LastConnectedAt: &connectedAt,
				LastMessageAt:   &lastMessageAt,
			})
			for _, event := range events {
				store.UpsertEvent(event)
			}
		}
		sleep(ctx, backoff)
		backoff = nextBackoff(backoff)
	}
}

func kalshiSubscribeMessage(cfg kalshiConfig) map[string]any {
	params := map[string]any{"channels": cfg.channels}
	if len(cfg.marketTickers) > 0 {
		params["market_tickers"] = cfg.marketTickers
	}
	return map[string]any{
		"id":     1,
		"cmd":    "subscribe",
		"params": params,
	}
}

func kalshiAuthHeaders(cfg kalshiConfig, privateKey *rsa.PrivateKey, now func() time.Time) (http.Header, error) {
	signingPath, err := kalshiSigningPath(cfg.url)
	if err != nil {
		return nil, err
	}
	timestamp := fmt.Sprintf("%d", now().UnixMilli())
	signature, err := signKalshiText(privateKey, timestamp+"GET"+signingPath)
	if err != nil {
		return nil, err
	}
	headers := http.Header{}
	headers.Set("KALSHI-ACCESS-KEY", cfg.keyID)
	headers.Set("KALSHI-ACCESS-SIGNATURE", signature)
	headers.Set("KALSHI-ACCESS-TIMESTAMP", timestamp)
	return headers, nil
}

func kalshiSigningPath(rawURL string) (string, error) {
	parsed, err := url.Parse(rawURL)
	if err != nil {
		return "", err
	}
	if parsed.Path == "" {
		return "/trade-api/ws/v2", nil
	}
	return parsed.Path, nil
}

func signKalshiText(privateKey *rsa.PrivateKey, text string) (string, error) {
	digest := sha256.Sum256([]byte(text))
	signature, err := rsa.SignPSS(rand.Reader, privateKey, crypto.SHA256, digest[:], &rsa.PSSOptions{
		SaltLength: rsa.PSSSaltLengthEqualsHash,
	})
	if err != nil {
		return "", err
	}
	return base64.StdEncoding.EncodeToString(signature), nil
}

func parseRSAPrivateKey(raw string) (*rsa.PrivateKey, error) {
	block, _ := pem.Decode([]byte(raw))
	if block == nil {
		return nil, errors.New("missing PEM block")
	}
	if key, err := x509.ParsePKCS1PrivateKey(block.Bytes); err == nil {
		return key, nil
	}
	key, err := x509.ParsePKCS8PrivateKey(block.Bytes)
	if err != nil {
		return nil, err
	}
	rsaKey, ok := key.(*rsa.PrivateKey)
	if !ok {
		return nil, errors.New("private key is not RSA")
	}
	return rsaKey, nil
}

func parseKalshiEvents(data []byte, fallbackTime time.Time) []Event {
	var raw map[string]any
	if err := json.Unmarshal(data, &raw); err != nil {
		return nil
	}
	if firstText(raw, "type") != "ticker" {
		return nil
	}
	msg, ok := raw["msg"].(map[string]any)
	if !ok {
		return nil
	}
	event, ok := normalizeKalshiTicker(msg, fallbackTime)
	if !ok {
		return nil
	}
	return []Event{event}
}

func normalizeKalshiTicker(raw map[string]any, fallbackTime time.Time) (Event, bool) {
	ticker := firstText(raw, "market_ticker", "marketTicker")
	if ticker == "" {
		return Event{}, false
	}
	score := kalshiTickerScore(raw)
	if score == "" {
		score = "Market data tick"
	}
	return Event{
		ID:        "auth:" + ticker,
		Source:    "market-data",
		Title:     ticker,
		Status:    "ticker",
		Score:     score,
		Detail:    kalshiTickerDetail(raw),
		Live:      true,
		UpdatedAt: firstTime(raw, fallbackTime, "time", "ts_ms", "ts"),
	}, true
}

func kalshiTickerScore(raw map[string]any) string {
	yesBid := firstText(raw, "yes_bid_dollars")
	yesAsk := firstText(raw, "yes_ask_dollars")
	if yesBid != "" && yesAsk != "" {
		return "YES " + yesBid + " / " + yesAsk
	}
	if price := firstText(raw, "price_dollars"); price != "" {
		return "Last " + price
	}
	return ""
}

func kalshiTickerDetail(raw map[string]any) string {
	parts := []string{}
	if volume := firstText(raw, "volume_fp", "dollar_volume"); volume != "" {
		parts = append(parts, "volume "+volume)
	}
	if interest := firstText(raw, "open_interest_fp", "dollar_open_interest"); interest != "" {
		parts = append(parts, "open interest "+interest)
	}
	return strings.Join(parts, " · ")
}

func csvEnv(key string) []string {
	raw := strings.TrimSpace(os.Getenv(key))
	if raw == "" {
		return nil
	}
	parts := strings.Split(raw, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		if trimmed := strings.TrimSpace(part); trimmed != "" {
			out = append(out, trimmed)
		}
	}
	return out
}
