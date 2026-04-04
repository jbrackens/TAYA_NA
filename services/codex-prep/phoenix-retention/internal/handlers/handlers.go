package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/phoenixbot/phoenix-retention/internal/middleware"
	"github.com/phoenixbot/phoenix-retention/internal/models"
	"github.com/phoenixbot/phoenix-retention/internal/repository"
	"github.com/phoenixbot/phoenix-retention/internal/service"
)

type Handlers struct {
	logger  *slog.Logger
	service service.Service
}

func NewHandlers(logger *slog.Logger, svc service.Service) *Handlers {
	return &Handlers{logger: logger, service: svc}
}

func (h *Handlers) HealthCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "healthy", "service": "phoenix-retention"})
}

func (h *Handlers) ReadinessCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "phoenix-retention"})
}

func (h *Handlers) UnlockAchievement(w http.ResponseWriter, r *http.Request) {
	var req models.UnlockAchievementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	resp, err := h.service.UnlockAchievement(r.Context(), chi.URLParam(r, "userID"), req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, resp)
}

func (h *Handlers) GetUserAchievements(w http.ResponseWriter, r *http.Request) {
	resp, err := h.service.GetUserAchievements(r.Context(), authClaims(r), chi.URLParam(r, "userID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, resp)
}

func (h *Handlers) ListLeaderboards(w http.ResponseWriter, r *http.Request) {
	filters := models.LeaderboardFilters{
		Period: r.URL.Query().Get("type"),
		Metric: r.URL.Query().Get("metric"),
		Limit:  intFromQuery(r, "limit", 20),
		Offset: intFromQuery(r, "offset", 0),
	}
	resp, err := h.service.ListLeaderboards(r.Context(), filters)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, resp)
}

func (h *Handlers) CreateCampaign(w http.ResponseWriter, r *http.Request) {
	var req models.CreateCampaignRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	resp, err := h.service.CreateCampaign(r.Context(), authClaims(r), req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, resp)
}

func (h *Handlers) GetLoyaltyPoints(w http.ResponseWriter, r *http.Request) {
	resp, err := h.service.GetLoyaltyPoints(r.Context(), authClaims(r), chi.URLParam(r, "userID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, resp)
}

func (h *Handlers) RedeemLoyaltyPoints(w http.ResponseWriter, r *http.Request) {
	var req models.RedeemPointsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	resp, err := h.service.RedeemLoyaltyPoints(r.Context(), authClaims(r), strings.TrimSpace(r.Header.Get("Authorization")), chi.URLParam(r, "userID"), req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, resp)
}

func (h *Handlers) ListFreebets(w http.ResponseWriter, r *http.Request) {
	resp, err := h.service.ListFreebets(r.Context(), authClaims(r), strings.TrimSpace(r.URL.Query().Get("userId")), strings.TrimSpace(r.URL.Query().Get("status")))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, resp)
}

func (h *Handlers) GetFreebet(w http.ResponseWriter, r *http.Request) {
	resp, err := h.service.GetFreebet(r.Context(), authClaims(r), chi.URLParam(r, "freebetID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, resp)
}

func (h *Handlers) ListOddsBoosts(w http.ResponseWriter, r *http.Request) {
	resp, err := h.service.ListOddsBoosts(r.Context(), authClaims(r), strings.TrimSpace(r.URL.Query().Get("userId")), strings.TrimSpace(r.URL.Query().Get("status")))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, resp)
}

func (h *Handlers) GetOddsBoost(w http.ResponseWriter, r *http.Request) {
	resp, err := h.service.GetOddsBoost(r.Context(), authClaims(r), chi.URLParam(r, "oddsBoostID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, resp)
}

func (h *Handlers) AcceptOddsBoost(w http.ResponseWriter, r *http.Request) {
	var req models.OddsBoostAcceptRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	resp, err := h.service.AcceptOddsBoost(r.Context(), authClaims(r), chi.URLParam(r, "oddsBoostID"), req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, resp)
}

func (h *Handlers) writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, repository.ErrNotFound):
		_ = middleware.WriteError(w, http.StatusNotFound, "resource not found")
	case errors.Is(err, repository.ErrConflict):
		_ = middleware.WriteError(w, http.StatusConflict, "resource state conflict")
	case errors.Is(err, service.ErrForbidden):
		_ = middleware.WriteError(w, http.StatusForbidden, "insufficient permissions")
	case errors.Is(err, service.ErrInvalidInput):
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request")
	default:
		h.logger.Error("retention request failed", slog.Any("error", err))
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
	}
}

func authClaims(r *http.Request) *models.AuthClaims {
	claims := middleware.GetClaims(r)
	if claims == nil {
		return nil
	}
	return &models.AuthClaims{UserID: claims.UserID, Role: claims.Role}
}

func intFromQuery(r *http.Request, key string, fallback int) int {
	value := r.URL.Query().Get(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}
