package feed

import (
	"context"
	"crypto/sha256"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strconv"
	"time"
)

// CryptoFeedAdapter resolves markets based on cryptocurrency price data.
// Supports rules: "price_above", "price_below"
// Params: {"asset": "bitcoin", "threshold": 100000}
type CryptoFeedAdapter struct {
	client  *http.Client
	baseURL string // CoinGecko API base
}

// NewCryptoFeedAdapter creates a new crypto price feed adapter.
func NewCryptoFeedAdapter() *CryptoFeedAdapter {
	return &CryptoFeedAdapter{
		client:  &http.Client{Timeout: 10 * time.Second},
		baseURL: "https://api.coingecko.com/api/v3",
	}
}

func (a *CryptoFeedAdapter) Name() string { return "api-feed-crypto" }

func (a *CryptoFeedAdapter) CanSettle(rule string, params json.RawMessage) bool {
	return rule == "price_above" || rule == "price_below"
}

type cryptoParams struct {
	Asset     string  `json:"asset"`     // CoinGecko ID: "bitcoin", "ethereum"
	Threshold float64 `json:"threshold"` // price threshold in USD
}

func (a *CryptoFeedAdapter) ValidateParams(rule string, params json.RawMessage) error {
	if rule != "price_above" && rule != "price_below" {
		return fmt.Errorf("unsupported rule: %s (expected price_above or price_below)", rule)
	}
	var p cryptoParams
	if err := json.Unmarshal(params, &p); err != nil {
		return fmt.Errorf("invalid params: %w", err)
	}
	if p.Asset == "" {
		return fmt.Errorf("asset is required")
	}
	if p.Threshold <= 0 {
		return fmt.Errorf("threshold must be positive")
	}
	return nil
}

func (a *CryptoFeedAdapter) FetchResult(ctx context.Context, rule string, params json.RawMessage) (*Result, error) {
	var p cryptoParams
	if err := json.Unmarshal(params, &p); err != nil {
		return nil, fmt.Errorf("invalid params: %w", err)
	}

	// Fetch current price from CoinGecko
	url := fmt.Sprintf("%s/simple/price?ids=%s&vs_currencies=usd", a.baseURL, p.Asset)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}

	resp, err := a.client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("fetch price failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("CoinGecko API returned status %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, err
	}

	// Parse response: {"bitcoin": {"usd": 97500.0}}
	var data map[string]map[string]float64
	if err := json.Unmarshal(body, &data); err != nil {
		return nil, fmt.Errorf("parse price response: %w", err)
	}

	assetData, ok := data[p.Asset]
	if !ok {
		return nil, fmt.Errorf("asset %s not found in response", p.Asset)
	}

	price, ok := assetData["usd"]
	if !ok {
		return nil, fmt.Errorf("USD price not found for %s", p.Asset)
	}

	// Determine outcome
	var outcome string
	switch rule {
	case "price_above":
		if price >= p.Threshold {
			outcome = "yes"
		} else {
			outcome = "no"
		}
	case "price_below":
		if price < p.Threshold {
			outcome = "yes"
		} else {
			outcome = "no"
		}
	}

	// Build attestation
	sourceData, _ := json.Marshal(map[string]interface{}{
		"asset":     p.Asset,
		"price_usd": price,
		"threshold": p.Threshold,
		"rule":      rule,
		"source":    "coingecko",
		"fetched_at": time.Now().UTC().Format(time.RFC3339),
	})

	digest := fmt.Sprintf("%x", sha256.Sum256(sourceData))

	return &Result{
		Outcome:    outcome,
		Confidence: 1.0, // price feeds are deterministic
		SourceData: sourceData,
		Digest:     digest,
		FetchedAt:  time.Now().UTC(),
	}, nil
}

// SetBaseURL allows overriding the API base URL for testing.
func (a *CryptoFeedAdapter) SetBaseURL(url string) {
	a.baseURL = url
}

// FormatPrice returns a human-readable price string.
func FormatPrice(price float64) string {
	return "$" + strconv.FormatFloat(price, 'f', 2, 64)
}
