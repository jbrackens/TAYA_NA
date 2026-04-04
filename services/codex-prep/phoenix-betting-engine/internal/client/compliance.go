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

type ComplianceClient interface {
	EvaluateGeoPacket(ctx context.Context, packet string) (*models.GeoComplyPacketResponse, error)
}

type HTTPComplianceClient struct {
	baseURL string
	client  *http.Client
}

func NewHTTPComplianceClient(baseURL string, timeout time.Duration) *HTTPComplianceClient {
	return &HTTPComplianceClient{
		baseURL: strings.TrimRight(baseURL, "/"),
		client:  &http.Client{Timeout: timeout},
	}
}

func (c *HTTPComplianceClient) EvaluateGeoPacket(
	ctx context.Context,
	packet string,
) (*models.GeoComplyPacketResponse, error) {
	payload, err := json.Marshal(&models.GeoComplyPacketRequest{EncryptedString: packet})
	if err != nil {
		return nil, err
	}
	request, err := http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		fmt.Sprintf("%s/geo-comply/geo-packet", c.baseURL),
		bytes.NewReader(payload),
	)
	if err != nil {
		return nil, err
	}
	request.Header.Set("Content-Type", "application/json")

	response, err := c.client.Do(request)
	if err != nil {
		return nil, err
	}
	defer response.Body.Close()
	if response.StatusCode >= 300 {
		return nil, fmt.Errorf("compliance service returned %d", response.StatusCode)
	}

	var result models.GeoComplyPacketResponse
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		return nil, err
	}
	return &result, nil
}
