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
	ReserveFunds(ctx context.Context, authHeader, userID string, req *ReserveFundsRequest) (*ReserveFundsResponse, error)
	ReleaseReservedFunds(ctx context.Context, authHeader, userID string, req *ReleaseReserveRequest) (*ReleaseReserveResponse, error)
}

type ReserveFundsRequest struct {
	Amount        decimal.Decimal `json:"amount"`
	ReferenceID   string          `json:"reference_id"`
	ReferenceType string          `json:"reference_type"`
}

type ReserveFundsResponse struct {
	UserID           string          `json:"user_id"`
	ReservedAmount   decimal.Decimal `json:"reserved_amount"`
	AvailableBalance decimal.Decimal `json:"available_balance"`
	ReservationID    string          `json:"reservation_id"`
}

type ReleaseReserveRequest struct {
	ReservationID string          `json:"reservation_id"`
	Amount        decimal.Decimal `json:"amount"`
}

type ReleaseReserveResponse struct {
	UserID              string          `json:"user_id"`
	ReleasedAmount      decimal.Decimal `json:"released_amount"`
	NewAvailableBalance decimal.Decimal `json:"new_available_balance"`
}

type HTTPWalletClient struct {
	baseURL string
	client  *http.Client
}

func NewHTTPWalletClient(baseURL string, timeout time.Duration) *HTTPWalletClient {
	return &HTTPWalletClient{baseURL: strings.TrimRight(baseURL, "/"), client: &http.Client{Timeout: timeout}}
}

func (c *HTTPWalletClient) ReserveFunds(ctx context.Context, authHeader, userID string, req *ReserveFundsRequest) (*ReserveFundsResponse, error) {
	var response ReserveFundsResponse
	if err := c.doJSON(ctx, authHeader, http.MethodPost, fmt.Sprintf("%s/api/v1/wallets/%s/reserve", c.baseURL, userID), req, &response); err != nil {
		return nil, err
	}
	return &response, nil
}

func (c *HTTPWalletClient) ReleaseReservedFunds(ctx context.Context, authHeader, userID string, req *ReleaseReserveRequest) (*ReleaseReserveResponse, error) {
	var response ReleaseReserveResponse
	if err := c.doJSON(ctx, authHeader, http.MethodPost, fmt.Sprintf("%s/api/v1/wallets/%s/release-reserve", c.baseURL, userID), req, &response); err != nil {
		return nil, err
	}
	return &response, nil
}

func (c *HTTPWalletClient) doJSON(ctx context.Context, authHeader, method, url string, payload any, target any) error {
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	request, err := http.NewRequestWithContext(ctx, method, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	request.Header.Set("Content-Type", "application/json")
	if strings.TrimSpace(authHeader) != "" {
		request.Header.Set("Authorization", authHeader)
	}
	response, err := c.client.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()
	if response.StatusCode >= 300 {
		return fmt.Errorf("wallet service returned %d", response.StatusCode)
	}
	return json.NewDecoder(response.Body).Decode(target)
}
