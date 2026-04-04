package http

import (
	stdhttp "net/http"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/freebets"
	canonicalv1 "phoenix-revival/platform/canonical/v1"
	"phoenix-revival/platform/transport/httpx"
)

type freebetResponse struct {
	FreebetID              string   `json:"freebetId"`
	PlayerID               string   `json:"playerId"`
	CampaignID             string   `json:"campaignId,omitempty"`
	Currency               string   `json:"currency"`
	TotalAmountCents       int64    `json:"totalAmountCents"`
	RemainingAmountCents   int64    `json:"remainingAmountCents"`
	MinOddsDecimal         float64  `json:"minOddsDecimal,omitempty"`
	AppliesToSportIDs      []string `json:"appliesToSportIds,omitempty"`
	AppliesToTournamentIDs []string `json:"appliesToTournamentIds,omitempty"`
	ExpiresAt              string   `json:"expiresAt"`
	Status                 string   `json:"status"`
	CreatedAt              string   `json:"createdAt"`
	UpdatedAt              string   `json:"updatedAt"`
}

func registerFreebetRoutes(mux *stdhttp.ServeMux, service *freebets.Service) {
	if service == nil {
		return
	}

	listPath := "/api/v1/freebets"
	mux.Handle(listPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.URL.Path != listPath {
			return httpx.NotFound("freebet not found")
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		userID := strings.TrimSpace(r.URL.Query().Get("userId"))
		if userID == "" {
			return httpx.BadRequest("userId is required", nil)
		}
		status := strings.TrimSpace(r.URL.Query().Get("status"))
		items := service.ListByUser(userID, status)
		responseItems := make([]freebetResponse, 0, len(items))
		for _, item := range items {
			responseItems = append(responseItems, toFreebetResponse(item))
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"items":      responseItems,
			"totalCount": len(responseItems),
		})
	}))

	detailPrefix := "/api/v1/freebets/"
	mux.Handle(detailPrefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		freebetID := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, detailPrefix))
		if freebetID == "" {
			return httpx.NotFound("freebet not found")
		}
		item, exists := service.GetByID(freebetID)
		if !exists {
			return httpx.NotFound("freebet not found")
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, toFreebetResponse(item))
	}))
}

func toFreebetResponse(item canonicalv1.Freebet) freebetResponse {
	return freebetResponse{
		FreebetID:              item.FreebetID,
		PlayerID:               item.PlayerID,
		CampaignID:             item.CampaignID,
		Currency:               item.Currency,
		TotalAmountCents:       item.TotalAmountCents,
		RemainingAmountCents:   item.RemainingAmountCents,
		MinOddsDecimal:         item.MinOddsDecimal,
		AppliesToSportIDs:      append([]string(nil), item.AppliesToSportIDs...),
		AppliesToTournamentIDs: append([]string(nil), item.AppliesToTournamentIDs...),
		ExpiresAt:              item.ExpiresAt.UTC().Format(time.RFC3339),
		Status:                 string(item.Status),
		CreatedAt:              item.CreatedAt.UTC().Format(time.RFC3339),
		UpdatedAt:              item.UpdatedAt.UTC().Format(time.RFC3339),
	}
}
