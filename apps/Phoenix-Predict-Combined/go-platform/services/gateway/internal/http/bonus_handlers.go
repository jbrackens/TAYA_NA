package http

import (
	"encoding/json"
	"fmt"
	stdhttp "net/http"
	"strconv"
	"strings"

	"phoenix-revival/gateway/internal/bonus"
	"phoenix-revival/platform/transport/httpx"
)

func registerBonusRoutes(mux *stdhttp.ServeMux, svc *bonus.Service) {
	// Player-facing
	mux.Handle("/api/v1/bonuses/active", httpx.Handle(playerActiveBonusesHandler(svc)))
	mux.Handle("/api/v1/bonuses/claim", httpx.Handle(claimBonusHandler(svc)))
	mux.Handle("/api/v1/bonuses/", httpx.Handle(playerBonusDetailHandler(svc)))

	// Admin
	mux.Handle("/api/v1/admin/campaigns", httpx.Handle(adminCampaignsHandler(svc)))
	mux.Handle("/api/v1/admin/campaigns/", httpx.Handle(adminCampaignDetailHandler(svc)))
	mux.Handle("/api/v1/admin/bonuses", httpx.Handle(adminBonusesListHandler(svc)))
	mux.Handle("/api/v1/admin/bonuses/grant", httpx.Handle(adminGrantBonusHandler(svc)))
	mux.Handle("/api/v1/admin/bonuses/", httpx.Handle(adminBonusDetailHandler(svc)))
}

// --- Player Endpoints ---

func playerActiveBonusesHandler(svc *bonus.Service) func(stdhttp.ResponseWriter, *stdhttp.Request) error {
	return func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		userID := httpx.UserIDFromContext(r.Context())
		if userID == "" {
			return httpx.Unauthorized("authentication required")
		}

		bonuses, err := svc.ListActiveBonuses(r.Context(), userID)
		if err != nil {
			return httpx.Internal("failed to list bonuses", err)
		}

		type bonusResponse struct {
			BonusID               int64   `json:"bonus_id"`
			CampaignName          string  `json:"campaign_name"`
			BonusType             string  `json:"bonus_type"`
			Status                string  `json:"status"`
			GrantedAmountCents    int64   `json:"granted_amount_cents"`
			RemainingAmountCents  int64   `json:"remaining_amount_cents"`
			WageringRequiredCents int64   `json:"wagering_required_cents"`
			WageringCompletedCents int64  `json:"wagering_completed_cents"`
			WageringProgressPct   float64 `json:"wagering_progress_pct"`
			ExpiresAt             string  `json:"expires_at"`
			GrantedAt             string  `json:"granted_at"`
		}

		items := make([]bonusResponse, 0, len(bonuses))
		for _, b := range bonuses {
			name := ""
			if b.Metadata != nil {
				var meta map[string]any
				if err := json.Unmarshal(b.Metadata, &meta); err == nil {
					if n, ok := meta["campaign_name"].(string); ok {
						name = n
					}
				}
			}
			items = append(items, bonusResponse{
				BonusID:               b.ID,
				CampaignName:          name,
				BonusType:             b.BonusType,
				Status:                b.Status,
				GrantedAmountCents:    b.GrantedAmountCents,
				RemainingAmountCents:  b.RemainingAmountCents,
				WageringRequiredCents: b.WageringRequiredCents,
				WageringCompletedCents: b.WageringCompletedCents,
				WageringProgressPct:   b.WageringProgressPct(),
				ExpiresAt:             b.ExpiresAt.Format("2006-01-02T15:04:05Z07:00"),
				GrantedAt:             b.GrantedAt.Format("2006-01-02T15:04:05Z07:00"),
			})
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"bonuses": items})
	}
}

func claimBonusHandler(svc *bonus.Service) func(stdhttp.ResponseWriter, *stdhttp.Request) error {
	return func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		userID := httpx.UserIDFromContext(r.Context())
		if userID == "" {
			return httpx.Unauthorized("authentication required")
		}

		var req bonus.ClaimBonusRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			return httpx.BadRequest("invalid request body", nil)
		}
		req.UserID = userID

		pb, err := svc.ClaimBonus(r.Context(), req)
		if err != nil {
			errMsg := err.Error()
			if strings.Contains(errMsg, "already claimed") {
				return httpx.WriteJSON(w, stdhttp.StatusConflict, map[string]string{"error": errMsg})
			}
			if strings.Contains(errMsg, "not active") || strings.Contains(errMsg, "not eligible") ||
				strings.Contains(errMsg, "not within") || strings.Contains(errMsg, "maximum claims") {
				return httpx.WriteJSON(w, stdhttp.StatusForbidden, map[string]string{"error": errMsg})
			}
			return httpx.Internal("internal error", err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusCreated, pb)
	}
}

func playerBonusDetailHandler(svc *bonus.Service) func(stdhttp.ResponseWriter, *stdhttp.Request) error {
	return func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		// Parse /api/v1/bonuses/{id} or /api/v1/bonuses/{id}/progress
		path := strings.TrimPrefix(r.URL.Path, "/api/v1/bonuses/")
		parts := strings.SplitN(path, "/", 2)
		id, err := strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			return httpx.BadRequest("invalid bonus id", nil)
		}

		pb, err := svc.GetPlayerBonus(r.Context(), id)
		if err != nil {
			return httpx.NotFound(fmt.Sprintf("bonus %d not found", id))
		}

		// Verify the requesting user owns this bonus
		userID := httpx.UserIDFromContext(r.Context())
		if pb.UserID != userID {
			return httpx.Forbidden("access denied")
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, pb)
	}
}

// --- Admin Endpoints ---

func adminCampaignsHandler(svc *bonus.Service) func(stdhttp.ResponseWriter, *stdhttp.Request) error {
	return func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		role := httpx.RoleFromContext(r.Context())
		if role != "admin" {
			return httpx.Forbidden("admin role required")
		}

		switch r.Method {
		case stdhttp.MethodGet:
			status := r.URL.Query().Get("status")
			campaigns, err := svc.ListCampaigns(r.Context(), status, 100)
			if err != nil {
				return httpx.Internal("internal error", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"campaigns": campaigns})

		case stdhttp.MethodPost:
			var req bonus.CreateCampaignRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			req.CreatedBy = httpx.UserIDFromContext(r.Context())

			c, err := svc.CreateCampaign(r.Context(), req)
			if err != nil {
				return httpx.BadRequest(err.Error(), nil)
			}
			return httpx.WriteJSON(w, stdhttp.StatusCreated, c)

		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}
	}
}

func adminCampaignDetailHandler(svc *bonus.Service) func(stdhttp.ResponseWriter, *stdhttp.Request) error {
	return func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		role := httpx.RoleFromContext(r.Context())
		if role != "admin" {
			return httpx.Forbidden("admin role required")
		}

		// Parse /api/v1/admin/campaigns/{id}[/action]
		path := strings.TrimPrefix(r.URL.Path, "/api/v1/admin/campaigns/")
		parts := strings.SplitN(path, "/", 2)
		id, err := strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			return httpx.BadRequest("invalid campaign id", nil)
		}

		// Lifecycle actions
		if len(parts) == 2 && r.Method == stdhttp.MethodPost {
			switch parts[1] {
			case "activate":
				if err := svc.ActivateCampaign(r.Context(), id); err != nil {
					return httpx.BadRequest(err.Error(), nil)
				}
				return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]string{"status": "active"})
			case "pause":
				if err := svc.PauseCampaign(r.Context(), id); err != nil {
					return httpx.BadRequest(err.Error(), nil)
				}
				return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]string{"status": "paused"})
			case "close":
				if err := svc.CloseCampaign(r.Context(), id); err != nil {
					return httpx.BadRequest(err.Error(), nil)
				}
				return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]string{"status": "closed"})
			default:
				return httpx.BadRequest("unknown action: "+parts[1], nil)
			}
		}

		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}

		c, rules, err := svc.GetCampaignWithRules(r.Context(), id)
		if err != nil {
			return httpx.NotFound(err.Error())
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"campaign": c, "rules": rules})
	}
}

func adminBonusesListHandler(svc *bonus.Service) func(stdhttp.ResponseWriter, *stdhttp.Request) error {
	return func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		role := httpx.RoleFromContext(r.Context())
		if role != "admin" {
			return httpx.Forbidden("admin role required")
		}

		userID := r.URL.Query().Get("user_id")
		status := r.URL.Query().Get("status")
		bonuses, err := svc.ListPlayerBonuses(r.Context(), userID, status, 100)
		if err != nil {
			return httpx.Internal("internal error", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"bonuses": bonuses})
	}
}

func adminGrantBonusHandler(svc *bonus.Service) func(stdhttp.ResponseWriter, *stdhttp.Request) error {
	return func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		role := httpx.RoleFromContext(r.Context())
		if role != "admin" {
			return httpx.Forbidden("admin role required")
		}

		var req bonus.GrantBonusRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			return httpx.BadRequest("invalid request body", nil)
		}
		req.GrantedBy = httpx.UserIDFromContext(r.Context())

		pb, err := svc.GrantBonus(r.Context(), req)
		if err != nil {
			return httpx.BadRequest(err.Error(), nil)
		}
		return httpx.WriteJSON(w, stdhttp.StatusCreated, pb)
	}
}

func adminBonusDetailHandler(svc *bonus.Service) func(stdhttp.ResponseWriter, *stdhttp.Request) error {
	return func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		role := httpx.RoleFromContext(r.Context())
		if role != "admin" {
			return httpx.Forbidden("admin role required")
		}

		// Parse /api/v1/admin/bonuses/{id}[/forfeit]
		path := strings.TrimPrefix(r.URL.Path, "/api/v1/admin/bonuses/")
		parts := strings.SplitN(path, "/", 2)
		id, err := strconv.ParseInt(parts[0], 10, 64)
		if err != nil {
			return httpx.BadRequest("invalid bonus id", nil)
		}

		if len(parts) == 2 && parts[1] == "forfeit" && r.Method == stdhttp.MethodPost {
			var req bonus.ForfeitBonusRequest
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			req.ForfeitedBy = httpx.UserIDFromContext(r.Context())

			if err := svc.ForfeitPlayerBonus(r.Context(), id, req); err != nil {
				return httpx.BadRequest(err.Error(), nil)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]string{"status": "forfeited"})
		}

		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}

		pb, err := svc.GetPlayerBonus(r.Context(), id)
		if err != nil {
			return httpx.NotFound(err.Error())
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, pb)
	}
}
