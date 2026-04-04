package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/shopspring/decimal"
)

type WalletClient interface {
	CreditReward(ctx context.Context, authHeader, userID, rewardID string, amount decimal.Decimal) error
}

type HTTPWalletClient struct {
	baseURL string
	client  *http.Client
}

func NewHTTPWalletClient(baseURL string, timeout time.Duration) *HTTPWalletClient {
	return &HTTPWalletClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		client:  &http.Client{Timeout: timeout},
	}
}

func (c *HTTPWalletClient) CreditReward(ctx context.Context, authHeader, userID, rewardID string, amount decimal.Decimal) error {
	payload := map[string]any{
		"amount":         amount,
		"currency":       "USD",
		"payment_method": "loyalty_reward",
		"payment_token":  rewardID,
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	url := fmt.Sprintf("%s/api/v1/wallets/%s/deposits", c.baseURL, userID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	if authHeader != "" {
		req.Header.Set("Authorization", authHeader)
	}
	resp, err := c.client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	if resp.StatusCode >= http.StatusBadRequest {
		return fmt.Errorf("wallet credit failed with status %d", resp.StatusCode)
	}
	return nil
}
