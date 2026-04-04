package client

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/phoenixbot/phoenix-betting-engine/internal/models"
)

type MarketClient interface {
	GetMarket(ctx context.Context, marketID string) (*models.ExternalMarket, error)
}

type HTTPMarketClient struct {
	baseURL string
	client  *http.Client
}

func NewHTTPMarketClient(baseURL string, timeout time.Duration) *HTTPMarketClient {
	return &HTTPMarketClient{baseURL: strings.TrimRight(baseURL, "/"), client: &http.Client{Timeout: timeout}}
}

func (c *HTTPMarketClient) GetMarket(ctx context.Context, marketID string) (*models.ExternalMarket, error) {
	request, err := http.NewRequestWithContext(ctx, http.MethodGet, fmt.Sprintf("%s/api/v1/markets/%s", c.baseURL, marketID), nil)
	if err != nil {
		return nil, err
	}
	response, err := c.client.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("market engine returned %d", response.StatusCode)
	}
	var market models.ExternalMarket
	if err := json.NewDecoder(response.Body).Decode(&market); err != nil {
		return nil, err
	}
	return &market, nil
}
