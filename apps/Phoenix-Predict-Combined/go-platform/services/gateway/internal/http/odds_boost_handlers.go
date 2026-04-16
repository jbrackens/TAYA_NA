package http

import (
	"encoding/json"
	"errors"
	stdhttp "net/http"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/oddsboosts"
	canonicalv1 "phoenix-revival/platform/canonical/v1"
	"phoenix-revival/platform/transport/httpx"
)

type oddsBoostResponse struct {
	OddsBoostID     string  `json:"oddsBoostId"`
	PlayerID        string  `json:"playerId"`
	CampaignID      string  `json:"campaignId,omitempty"`
	MarketID        string  `json:"marketId"`
	SelectionID     string  `json:"selectionId"`
	Currency        string  `json:"currency"`
	OriginalOdds    float64 `json:"originalOdds"`
	BoostedOdds     float64 `json:"boostedOdds"`
	MaxStakeCents   int64   `json:"maxStakeCents,omitempty"`
	MinOddsDecimal  float64 `json:"minOddsDecimal,omitempty"`
	Status          string  `json:"status"`
	ExpiresAt       string  `json:"expiresAt"`
	AcceptedAt      string  `json:"acceptedAt,omitempty"`
	AcceptRequestID string  `json:"acceptRequestId,omitempty"`
	AcceptReason    string  `json:"acceptReason,omitempty"`
	CreatedAt       string  `json:"createdAt"`
	UpdatedAt       string  `json:"updatedAt"`
}

type oddsBoostAcceptRequest struct {
	UserID    string `json:"userId"`
	RequestID string `json:"requestId"`
	Reason    string `json:"reason,omitempty"`
}

func registerOddsBoostRoutes(mux *stdhttp.ServeMux, service *oddsboosts.Service) {
	if service == nil {
		return
	}

	listPath := "/api/v1/odds-boosts"
	mux.Handle(listPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.URL.Path != listPath {
			return httpx.NotFound("odds boost not found")
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		userID := strings.TrimSpace(r.URL.Query().Get("userId"))
		if userID == "" {
			return httpx.BadRequest("userId is required", map[string]any{"field": "userId"})
		}
		status := strings.TrimSpace(r.URL.Query().Get("status"))

		items := service.ListByUser(userID, status)
		responseItems := make([]oddsBoostResponse, 0, len(items))
		for _, item := range items {
			responseItems = append(responseItems, toOddsBoostResponse(item))
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"items":      responseItems,
			"totalCount": len(responseItems),
		})
	}))

	detailPrefix := "/api/v1/odds-boosts/"
	mux.Handle(detailPrefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		path := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, detailPrefix))
		if path == "" {
			return httpx.NotFound("odds boost not found")
		}
		parts := strings.Split(path, "/")
		boostID := strings.TrimSpace(parts[0])
		if boostID == "" {
			return httpx.NotFound("odds boost not found")
		}

		if len(parts) == 1 {
			if r.Method != stdhttp.MethodGet {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
			}
			item, exists := service.GetByID(boostID)
			if !exists {
				return httpx.NotFound("odds boost not found")
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, toOddsBoostResponse(item))
		}

		if len(parts) == 2 && parts[1] == "accept" {
			if r.Method != stdhttp.MethodPost {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
			}
			var request oddsBoostAcceptRequest
			if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
				return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
			}
			item, err := service.Accept(oddsboosts.AcceptRequest{
				OddsBoostID: boostID,
				UserID:      request.UserID,
				RequestID:   request.RequestID,
				Reason:      request.Reason,
			})
			if err != nil {
				return mapOddsBoostError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, toOddsBoostResponse(item))
		}

		return httpx.NotFound("odds boost resource not found")
	}))
}

func toOddsBoostResponse(item canonicalv1.OddsBoost) oddsBoostResponse {
	acceptedAt := ""
	if item.AcceptedAt != nil {
		acceptedAt = item.AcceptedAt.UTC().Format(time.RFC3339)
	}
	return oddsBoostResponse{
		OddsBoostID:     item.OddsBoostID,
		PlayerID:        item.PlayerID,
		CampaignID:      item.CampaignID,
		MarketID:        item.MarketID,
		SelectionID:     item.SelectionID,
		Currency:        item.Currency,
		OriginalOdds:    item.OriginalOdds,
		BoostedOdds:     item.BoostedOdds,
		MaxStakeCents:   item.MaxStakeCents,
		MinOddsDecimal:  item.MinOddsDecimal,
		Status:          string(item.Status),
		ExpiresAt:       item.ExpiresAt.UTC().Format(time.RFC3339),
		AcceptedAt:      acceptedAt,
		AcceptRequestID: item.AcceptRequestID,
		AcceptReason:    item.AcceptReason,
		CreatedAt:       item.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:       item.UpdatedAt.UTC().Format(time.RFC3339),
	}
}

func mapOddsBoostError(err error) error {
	switch {
	case errors.Is(err, oddsboosts.ErrOddsBoostInvalidRequest):
		return httpx.BadRequest("invalid odds boost accept request", nil)
	case errors.Is(err, oddsboosts.ErrOddsBoostNotFound):
		return httpx.NotFound("odds boost not found")
	case errors.Is(err, oddsboosts.ErrOddsBoostForbidden):
		return httpx.Forbidden("odds boost does not belong to user")
	case errors.Is(err, oddsboosts.ErrOddsBoostNotAcceptable):
		return httpx.Conflict("odds boost is not in an acceptable state", nil)
	case errors.Is(err, oddsboosts.ErrOddsBoostIdempotency):
		return httpx.Conflict("idempotency key conflict for odds boost accept request", nil)
	default:
		return httpx.Internal("odds boost operation failed", err)
	}
}
