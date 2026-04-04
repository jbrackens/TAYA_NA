package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/phoenixbot/phoenix-betting-engine/internal/middleware"
	"github.com/phoenixbot/phoenix-betting-engine/internal/models"
	"github.com/phoenixbot/phoenix-betting-engine/internal/repository"
	"github.com/phoenixbot/phoenix-betting-engine/internal/service"
)

type Handlers struct {
	logger  *slog.Logger
	service service.BettingService
}

func NewHandlers(logger *slog.Logger, svc service.BettingService) *Handlers {
	return &Handlers{logger: logger, service: svc}
}

func (h *Handlers) HealthCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "healthy", "service": "phoenix-betting-engine"})
}

func (h *Handlers) ReadinessCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "phoenix-betting-engine"})
}

func (h *Handlers) PlaceBet(w http.ResponseWriter, r *http.Request) {
	var req models.PlaceBetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	ctx := middleware.WithGeolocationHeader(r.Context(), r.Header.Get("X-Geolocation"))
	bet, err := h.service.PlaceBet(ctx, r.Header.Get("Authorization"), middleware.GetAuthClaims(r), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, bet)
}

func (h *Handlers) PrecheckBets(w http.ResponseWriter, r *http.Request) {
	var req models.BetPrecheckRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.PrecheckBets(r.Context(), middleware.GetAuthClaims(r), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) QuoteBetBuilder(w http.ResponseWriter, r *http.Request) {
	var req models.BetBuilderQuoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.QuoteBetBuilder(r.Context(), middleware.GetAuthClaims(r), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, response)
}

func (h *Handlers) GetBetBuilderQuote(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.GetBetBuilderQuote(r.Context(), middleware.GetAuthClaims(r), chi.URLParam(r, "quoteID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) AcceptBetBuilderQuote(w http.ResponseWriter, r *http.Request) {
	var req models.BetBuilderAcceptRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	ctx := middleware.WithGeolocationHeader(r.Context(), r.Header.Get("X-Geolocation"))
	response, err := h.service.AcceptBetBuilderQuote(ctx, r.Header.Get("Authorization"), middleware.GetAuthClaims(r), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, response)
}

func (h *Handlers) QuoteFixedExotic(w http.ResponseWriter, r *http.Request) {
	var req models.FixedExoticQuoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.QuoteFixedExotic(r.Context(), middleware.GetAuthClaims(r), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, response)
}

func (h *Handlers) GetFixedExoticQuote(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.GetFixedExoticQuote(r.Context(), middleware.GetAuthClaims(r), chi.URLParam(r, "quoteID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) AcceptFixedExoticQuote(w http.ResponseWriter, r *http.Request) {
	var req models.FixedExoticAcceptRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	ctx := middleware.WithGeolocationHeader(r.Context(), r.Header.Get("X-Geolocation"))
	response, err := h.service.AcceptFixedExoticQuote(ctx, r.Header.Get("Authorization"), middleware.GetAuthClaims(r), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, response)
}

func (h *Handlers) GetPendingBetStatuses(w http.ResponseWriter, r *http.Request) {
	var req models.PendingBetStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.GetBetStatusUpdates(r.Context(), middleware.GetAuthClaims(r), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) PlaceParlay(w http.ResponseWriter, r *http.Request) {
	var req models.PlaceParlayRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	ctx := middleware.WithGeolocationHeader(r.Context(), r.Header.Get("X-Geolocation"))
	bet, err := h.service.PlaceParlay(ctx, r.Header.Get("Authorization"), middleware.GetAuthClaims(r), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, bet)
}

func (h *Handlers) ListAdminBets(w http.ResponseWriter, r *http.Request) {
	filters := models.BetFilters{
		UserID: r.URL.Query().Get("user_id"),
		Status: r.URL.Query().Get("status"),
		Page:   intFromQuery(r, "page", 1),
		Limit:  intFromQuery(r, "limit", 20),
	}
	if value := r.URL.Query().Get("start_date"); value != "" {
		if parsed, err := time.Parse(time.RFC3339, value); err == nil {
			filters.StartDate = &parsed
		}
	}
	if value := r.URL.Query().Get("end_date"); value != "" {
		if parsed, err := time.Parse(time.RFC3339, value); err == nil {
			filters.EndDate = &parsed
		}
	}
	response, err := h.service.ListAdminBets(r.Context(), middleware.GetAuthClaims(r), filters)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetAdminBet(w http.ResponseWriter, r *http.Request) {
	bet, err := h.service.GetAdminBet(r.Context(), middleware.GetAuthClaims(r), chi.URLParam(r, "betID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, bet)
}

func (h *Handlers) CancelAdminBet(w http.ResponseWriter, r *http.Request) {
	var req models.CancelBetRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	bet, err := h.service.CancelAdminBet(r.Context(), r.Header.Get("Authorization"), middleware.GetAuthClaims(r), chi.URLParam(r, "betID"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, bet)
}

func (h *Handlers) ApplyAdminBetLifecycleAction(w http.ResponseWriter, r *http.Request) {
	var req models.AdminBetLifecycleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	bet, err := h.service.ApplyAdminBetLifecycleAction(
		r.Context(),
		r.Header.Get("Authorization"),
		middleware.GetAuthClaims(r),
		chi.URLParam(r, "betID"),
		chi.URLParam(r, "action"),
		&req,
	)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, bet)
}

func (h *Handlers) ListAdminUserBets(w http.ResponseWriter, r *http.Request) {
	filters := models.BetFilters{
		Status: r.URL.Query().Get("status"),
		Page:   intFromQueryKeys(r, 1, "page", "pagination.currentPage"),
		Limit:  intFromQueryKeys(r, 20, "limit", "pagination.itemsPerPage"),
	}
	if value := firstQueryValue(r, "start_date", "filters.since"); value != "" {
		if parsed, err := time.Parse(time.RFC3339, value); err == nil {
			filters.StartDate = &parsed
		}
	}
	if value := firstQueryValue(r, "end_date", "filters.until"); value != "" {
		if parsed, err := time.Parse(time.RFC3339, value); err == nil {
			filters.EndDate = &parsed
		}
	}
	response, err := h.service.ListAdminUserBets(r.Context(), middleware.GetAuthClaims(r), chi.URLParam(r, "userID"), filters)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetBet(w http.ResponseWriter, r *http.Request) {
	bet, err := h.service.GetBet(r.Context(), middleware.GetAuthClaims(r), chi.URLParam(r, "betID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, bet)
}

func (h *Handlers) ListUserBets(w http.ResponseWriter, r *http.Request) {
	filters := models.BetFilters{
		Status: r.URL.Query().Get("status"),
		Page:   intFromQuery(r, "page", 1),
		Limit:  intFromQuery(r, "limit", 20),
	}
	if value := r.URL.Query().Get("start_date"); value != "" {
		if parsed, err := time.Parse(time.RFC3339, value); err == nil {
			filters.StartDate = &parsed
		}
	}
	if value := r.URL.Query().Get("end_date"); value != "" {
		if parsed, err := time.Parse(time.RFC3339, value); err == nil {
			filters.EndDate = &parsed
		}
	}
	response, err := h.service.ListUserBets(r.Context(), middleware.GetAuthClaims(r), chi.URLParam(r, "userID"), filters)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) CashoutBet(w http.ResponseWriter, r *http.Request) {
	var req models.CashoutRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.CashoutBet(r.Context(), r.Header.Get("Authorization"), middleware.GetAuthClaims(r), chi.URLParam(r, "betID"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, response)
}

func (h *Handlers) GetCashoutOffer(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.GetCashoutOffer(r.Context(), middleware.GetAuthClaims(r), chi.URLParam(r, "betID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, repository.ErrNotFound):
		_ = middleware.WriteError(w, http.StatusNotFound, "resource not found")
	case errors.Is(err, service.ErrForbidden):
		_ = middleware.WriteError(w, http.StatusForbidden, "forbidden")
	case errors.Is(err, service.ErrGeolocationHeaderNotFound):
		_ = middleware.WriteJSON(w, http.StatusBadRequest, map[string]any{
			"errors": []map[string]any{{"errorCode": "geolocationHeaderNotFound", "details": nil}},
		})
	case errors.Is(err, service.ErrGeolocationNotAllowed):
		_ = middleware.WriteJSON(w, http.StatusBadRequest, map[string]any{
			"errors": []map[string]any{{"errorCode": "geolocationNotAllowed", "details": nil}},
		})
	case errors.Is(err, service.ErrGeoLocationService):
		_ = middleware.WriteJSON(w, http.StatusInternalServerError, map[string]any{
			"errorCode": "geoLocationServiceError",
		})
	case errors.Is(err, service.ErrOddsChanged):
		_ = middleware.WriteError(w, http.StatusConflict, "odds changed")
	case errors.Is(err, service.ErrInvalidInput):
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
	default:
		h.logger.Error("betting request failed", slog.Any("error", err))
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
	}
}

func intFromQuery(r *http.Request, key string, fallback int) int {
	return intFromQueryKeys(r, fallback, key)
}

func intFromQueryKeys(r *http.Request, fallback int, keys ...string) int {
	for _, key := range keys {
		value := r.URL.Query().Get(key)
		if value == "" {
			continue
		}
		parsed, err := strconv.Atoi(value)
		if err == nil {
			return parsed
		}
	}
	return fallback
}

func firstQueryValue(r *http.Request, keys ...string) string {
	for _, key := range keys {
		if value := strings.TrimSpace(r.URL.Query().Get(key)); value != "" {
			return value
		}
	}
	return ""
}
