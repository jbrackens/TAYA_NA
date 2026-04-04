package client

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/phoenixbot/phoenix-betting-engine/internal/models"
)

type WalletClient interface {
	ReserveFunds(ctx context.Context, authHeader, userID string, req *models.ReserveFundsRequest) (*models.ReserveFundsResponse, error)
	ReleaseReservedFunds(ctx context.Context, authHeader, userID string, req *models.ReleaseReserveRequest) (*models.ReleaseReserveResponse, error)
	CreateDeposit(ctx context.Context, authHeader, userID string, req *models.DepositRequest) (*models.DepositResponse, error)
	CreateWithdrawal(ctx context.Context, authHeader, userID string, req *models.WithdrawalRequest) (*models.WithdrawalResponse, error)
}

type HTTPWalletClient struct {
	baseURL string
	client  *http.Client
}

func NewHTTPWalletClient(baseURL string, timeout time.Duration) *HTTPWalletClient {
	return &HTTPWalletClient{baseURL: strings.TrimRight(baseURL, "/"), client: &http.Client{Timeout: timeout}}
}

func (c *HTTPWalletClient) ReserveFunds(ctx context.Context, authHeader, userID string, req *models.ReserveFundsRequest) (*models.ReserveFundsResponse, error) {
	var response models.ReserveFundsResponse
	if err := c.doJSON(ctx, authHeader, http.MethodPost, fmt.Sprintf("%s/api/v1/wallets/%s/reserve", c.baseURL, userID), req, &response); err != nil {
		return nil, err
	}
	return &response, nil
}

func (c *HTTPWalletClient) ReleaseReservedFunds(ctx context.Context, authHeader, userID string, req *models.ReleaseReserveRequest) (*models.ReleaseReserveResponse, error) {
	var response models.ReleaseReserveResponse
	if err := c.doJSON(ctx, authHeader, http.MethodPost, fmt.Sprintf("%s/api/v1/wallets/%s/release-reserve", c.baseURL, userID), req, &response); err != nil {
		return nil, err
	}
	return &response, nil
}

func (c *HTTPWalletClient) CreateDeposit(ctx context.Context, authHeader, userID string, req *models.DepositRequest) (*models.DepositResponse, error) {
	var response models.DepositResponse
	if err := c.doJSON(ctx, authHeader, http.MethodPost, fmt.Sprintf("%s/api/v1/wallets/%s/deposits", c.baseURL, userID), req, &response); err != nil {
		return nil, err
	}
	return &response, nil
}

func (c *HTTPWalletClient) CreateWithdrawal(ctx context.Context, authHeader, userID string, req *models.WithdrawalRequest) (*models.WithdrawalResponse, error) {
	var response models.WithdrawalResponse
	if err := c.doJSON(ctx, authHeader, http.MethodPost, fmt.Sprintf("%s/api/v1/wallets/%s/withdrawals", c.baseURL, userID), req, &response); err != nil {
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
