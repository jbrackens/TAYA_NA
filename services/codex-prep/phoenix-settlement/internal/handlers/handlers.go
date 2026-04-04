package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/phoenixbot/phoenix-settlement/internal/middleware"
	"github.com/phoenixbot/phoenix-settlement/internal/models"
	"github.com/phoenixbot/phoenix-settlement/internal/repository"
	"github.com/phoenixbot/phoenix-settlement/internal/service"
)

type Handlers struct {
	logger  *slog.Logger
	service service.Service
}

func NewHandlers(logger *slog.Logger, svc service.Service) *Handlers {
	return &Handlers{logger: logger, service: svc}
}

func (h *Handlers) HealthCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "healthy", "service": "phoenix-settlement"})
}
func (h *Handlers) ReadinessCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "phoenix-settlement"})
}

func (h *Handlers) CreateSettlementBatch(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	var request models.CreateSettlementBatchRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.CreateSettlementBatch(r.Context(), viewer, &request)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusAccepted, response)
}

func (h *Handlers) GetSettlementBatch(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	response, err := h.service.GetSettlementBatch(r.Context(), viewer, chi.URLParam(r, "batchID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ListSettlementBatches(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	page := intFromQuery(r, "page", 1)
	limit := intFromQuery(r, "limit", 50)
	startDate, endDate, ok := parseDateRange(w, r)
	if !ok {
		return
	}
	response, err := h.service.ListSettlementBatches(r.Context(), viewer, r.URL.Query().Get("status"), startDate, endDate, page, limit)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) CreateManualPayout(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	var request models.ManualPayoutRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.CreateManualPayout(r.Context(), viewer, &request)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, response)
}

func (h *Handlers) CreateReconciliation(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	var request models.CreateReconciliationRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.CreateReconciliation(r.Context(), viewer, &request)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusAccepted, response)
}

func (h *Handlers) GetReconciliation(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	response, err := h.service.GetReconciliation(r.Context(), viewer, chi.URLParam(r, "reconciliationID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func parseDateRange(w http.ResponseWriter, r *http.Request) (*time.Time, *time.Time, bool) {
	var startDate, endDate *time.Time
	if value := r.URL.Query().Get("start_date"); value != "" {
		parsed, err := time.Parse(time.RFC3339, value)
		if err != nil {
			_ = middleware.WriteError(w, http.StatusBadRequest, "invalid start_date")
			return nil, nil, false
		}
		startDate = &parsed
	}
	if value := r.URL.Query().Get("end_date"); value != "" {
		parsed, err := time.Parse(time.RFC3339, value)
		if err != nil {
			_ = middleware.WriteError(w, http.StatusBadRequest, "invalid end_date")
			return nil, nil, false
		}
		endDate = &parsed
	}
	return startDate, endDate, true
}

func (h *Handlers) writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, repository.ErrNotFound):
		_ = middleware.WriteError(w, http.StatusNotFound, "resource not found")
	case errors.Is(err, service.ErrInvalidInput):
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
	default:
		h.logger.Error("settlement request failed", slog.Any("error", err))
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
	}
}

func derefClaims(claims *models.AuthClaims) models.AuthClaims {
	if claims == nil {
		return models.AuthClaims{}
	}
	return *claims
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
