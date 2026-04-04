package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/phoenixbot/phoenix-prediction/internal/middleware"
	"github.com/phoenixbot/phoenix-prediction/internal/models"
	"github.com/phoenixbot/phoenix-prediction/internal/repository"
	"github.com/phoenixbot/phoenix-prediction/internal/service"
)

type Handlers struct {
	logger  *slog.Logger
	service service.PredictionService
}

func NewHandlers(logger *slog.Logger, svc service.PredictionService) *Handlers {
	return &Handlers{logger: logger, service: svc}
}

func (h *Handlers) HealthCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "healthy", "service": "phoenix-prediction"})
}

func (h *Handlers) ReadinessCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "phoenix-prediction"})
}

func (h *Handlers) GetOverview(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.GetOverview(r.Context())
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ListCategories(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.ListCategories(r.Context())
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ListMarkets(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.ListMarkets(r.Context(), marketFiltersFromRequest(r))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetMarketDetail(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.GetMarketDetail(r.Context(), chi.URLParam(r, "marketID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) PreviewTicket(w http.ResponseWriter, r *http.Request) {
	var req models.PredictionTicketPreviewRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.PreviewTicket(r.Context(), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) PlaceOrder(w http.ResponseWriter, r *http.Request) {
	var req models.PredictionPlaceOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.PlaceOrder(r.Context(), r.Header.Get("Authorization"), middleware.GetAuthClaims(r), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, response)
}

func (h *Handlers) ListOrders(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.ListOrders(r.Context(), middleware.GetAuthClaims(r), r.URL.Query().Get("status"), r.URL.Query().Get("category"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetOrder(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.GetOrder(r.Context(), middleware.GetAuthClaims(r), chi.URLParam(r, "orderID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) CancelOrder(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.CancelOrder(r.Context(), r.Header.Get("Authorization"), middleware.GetAuthClaims(r), chi.URLParam(r, "orderID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetAdminSummary(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.GetAdminSummary(r.Context(), middleware.GetAuthClaims(r))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ListAdminMarkets(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.ListAdminMarkets(r.Context(), middleware.GetAuthClaims(r), marketFiltersFromRequest(r))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetAdminMarket(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.GetAdminMarket(r.Context(), middleware.GetAuthClaims(r), chi.URLParam(r, "marketID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ListAdminOrders(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.ListAdminOrders(r.Context(), middleware.GetAuthClaims(r), models.AdminOrderFilters{
		UserID:   strings.TrimSpace(r.URL.Query().Get("user_id")),
		MarketID: strings.TrimSpace(r.URL.Query().Get("market_id")),
		Status:   strings.TrimSpace(r.URL.Query().Get("status")),
		Category: strings.TrimSpace(r.URL.Query().Get("category")),
	})
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetAdminOrder(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.GetAdminOrder(r.Context(), middleware.GetAuthClaims(r), chi.URLParam(r, "orderID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetLifecycleHistory(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.GetLifecycleHistory(r.Context(), middleware.GetAuthClaims(r), chi.URLParam(r, "marketID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) SuspendMarket(w http.ResponseWriter, r *http.Request) {
	h.executeLifecycle(w, r, "suspend", false)
}

func (h *Handlers) OpenMarket(w http.ResponseWriter, r *http.Request) {
	h.executeLifecycle(w, r, "open", false)
}

func (h *Handlers) CancelMarket(w http.ResponseWriter, r *http.Request) {
	h.executeLifecycle(w, r, "cancel", false)
}

func (h *Handlers) ResolveMarket(w http.ResponseWriter, r *http.Request) {
	h.executeLifecycle(w, r, "resolve", true)
}

func (h *Handlers) ResettleMarket(w http.ResponseWriter, r *http.Request) {
	h.executeLifecycle(w, r, "resettle", true)
}

func (h *Handlers) IssueBotAPIKey(w http.ResponseWriter, r *http.Request) {
	var req models.IssuePredictionBotAPIKeyRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.IssueBotAPIKey(r.Context(), middleware.GetAuthClaims(r), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, response)
}

func (h *Handlers) executeLifecycle(w http.ResponseWriter, r *http.Request, action string, requireOutcome bool) {
	var payload struct {
		Reason    string `json:"reason"`
		OutcomeID string `json:"outcome_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if requireOutcome && strings.TrimSpace(payload.OutcomeID) == "" {
		_ = middleware.WriteError(w, http.StatusBadRequest, "outcome_id is required")
		return
	}
	response, err := h.service.ExecuteLifecycle(r.Context(), middleware.GetAuthClaims(r), repository.LifecycleCommand{
		Action:    action,
		MarketID:  chi.URLParam(r, "marketID"),
		OutcomeID: payload.OutcomeID,
		Reason:    payload.Reason,
	})
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
	case errors.Is(err, service.ErrInvalidInput):
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
	default:
		h.logger.Error("prediction request failed", slog.Any("error", err))
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
	}
}

func marketFiltersFromRequest(r *http.Request) models.PredictionMarketFilters {
	filters := models.PredictionMarketFilters{
		Category: strings.TrimSpace(r.URL.Query().Get("category")),
		Status:   strings.TrimSpace(r.URL.Query().Get("status")),
	}
	if value, ok := boolPointerFromQuery(r, "featured"); ok {
		filters.Featured = value
	}
	if value, ok := boolPointerFromQuery(r, "live"); ok {
		filters.Live = value
	}
	return filters
}

func boolPointerFromQuery(r *http.Request, key string) (*bool, bool) {
	value := strings.TrimSpace(r.URL.Query().Get(key))
	if value == "" {
		return nil, false
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return nil, false
	}
	return &parsed, true
}
