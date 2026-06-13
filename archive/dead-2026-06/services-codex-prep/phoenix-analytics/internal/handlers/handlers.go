package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/phoenixbot/phoenix-analytics/internal/middleware"
	"github.com/phoenixbot/phoenix-analytics/internal/models"
	"github.com/phoenixbot/phoenix-analytics/internal/repository"
	"github.com/phoenixbot/phoenix-analytics/internal/service"
)

type Handlers struct {
	logger  *slog.Logger
	service service.Service
}

func NewHandlers(logger *slog.Logger, svc service.Service) *Handlers {
	return &Handlers{logger: logger, service: svc}
}

func (h *Handlers) HealthCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "healthy", "service": "phoenix-analytics"})
}

func (h *Handlers) ReadinessCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "phoenix-analytics"})
}

func (h *Handlers) TrackEvent(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	var request models.TrackEventRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.TrackEvent(r.Context(), viewer, &request)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusAccepted, response)
}

func (h *Handlers) GetUserReport(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	startDate, endDate, ok := parseDateRange(w, r)
	if !ok {
		return
	}
	response, err := h.service.GetUserReport(r.Context(), viewer, chi.URLParam(r, "userID"), startDate, endDate)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetPlatformDashboard(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	var date *time.Time
	if value := r.URL.Query().Get("date"); value != "" {
		parsed, err := time.Parse(time.RFC3339, value)
		if err != nil {
			_ = middleware.WriteError(w, http.StatusBadRequest, "invalid date")
			return
		}
		date = &parsed
	}
	response, err := h.service.GetPlatformDashboard(r.Context(), viewer, date)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetMarketReport(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	startDate, endDate, ok := parseDateRange(w, r)
	if !ok {
		return
	}
	limit := intFromQuery(r, "limit", 50)
	response, err := h.service.GetMarketReport(r.Context(), viewer, startDate, endDate, limit)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetCohorts(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	startDate, endDate, ok := parseDateRange(w, r)
	if !ok {
		return
	}
	response, err := h.service.GetCohorts(r.Context(), viewer, r.URL.Query().Get("cohort_type"), startDate, endDate)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ExportUserTransactions(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	startDate, endDate, ok := parseDateRange(w, r)
	if !ok {
		return
	}
	data, err := h.service.ExportUserTransactionsCSV(
		r.Context(),
		viewer,
		chi.URLParam(r, "userID"),
		r.URL.Query().Get("filters.category"),
		r.URL.Query().Get("filters.product"),
		startDate,
		endDate,
	)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeCSV(w, "punter-transactions.csv", data)
}

func (h *Handlers) ExportExcludedPunters(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	data, err := h.service.ExportExcludedPuntersCSV(r.Context(), viewer)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeCSV(w, "excluded-punters.csv", data)
}

func (h *Handlers) GenerateDailyReports(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	response, err := h.service.GenerateDailyReports(r.Context(), viewer, nil)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) RepeatDailyReports(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	value := r.URL.Query().Get("on")
	if value == "" {
		_ = middleware.WriteError(w, http.StatusBadRequest, "missing on")
		return
	}
	parsed, err := time.Parse("2006-01-02", value)
	if err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid on")
		return
	}
	response, err := h.service.GenerateDailyReports(r.Context(), viewer, &parsed)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetWalletCorrectionTasks(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	response, err := h.service.ListWalletCorrectionTasks(
		r.Context(),
		viewer,
		r.URL.Query().Get("userId"),
		r.URL.Query().Get("status"),
		intFromQuery(r, "limit", 50),
	)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetPromoUsageSummary(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	breakdownLimit := intFromQuery(r, "breakdownLimit", 20)
	var from *time.Time
	if value := r.URL.Query().Get("from"); value != "" {
		parsed, err := time.Parse(time.RFC3339, value)
		if err != nil {
			_ = middleware.WriteError(w, http.StatusBadRequest, "invalid from")
			return
		}
		from = &parsed
	}
	var to *time.Time
	if value := r.URL.Query().Get("to"); value != "" {
		parsed, err := time.Parse(time.RFC3339, value)
		if err != nil {
			_ = middleware.WriteError(w, http.StatusBadRequest, "invalid to")
			return
		}
		to = &parsed
	}
	response, err := h.service.GetPromoUsageSummary(r.Context(), viewer, models.PromoUsageFilters{
		UserID:         r.URL.Query().Get("userId"),
		FreebetID:      r.URL.Query().Get("freebetId"),
		OddsBoostID:    r.URL.Query().Get("oddsBoostId"),
		BreakdownLimit: breakdownLimit,
		From:           from,
		To:             to,
	})
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetRiskPlayerScore(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	response, err := h.service.GetRiskPlayerScore(r.Context(), viewer, r.URL.Query().Get("userId"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetRiskSegments(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	response, err := h.service.GetRiskSegments(
		r.Context(),
		viewer,
		r.URL.Query().Get("userId"),
		intFromQuery(r, "limit", 20),
	)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetProviderFeedHealth(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	response, err := h.service.GetProviderFeedHealth(r.Context(), viewer)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ListProviderStreamAcknowledgements(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	response, err := h.service.ListProviderStreamAcknowledgements(r.Context(), viewer)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) UpsertProviderStreamAcknowledgement(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	var req models.ProviderStreamAcknowledgementRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.UpsertProviderStreamAcknowledgement(r.Context(), viewer, &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetProviderAcknowledgementSLASettings(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	response, err := h.service.GetProviderAcknowledgementSLASettings(r.Context(), viewer)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) UpsertProviderAcknowledgementSLASetting(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	var req models.ProviderAcknowledgementSLAUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.UpsertProviderAcknowledgementSLASetting(r.Context(), viewer, &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func parseDateRange(w http.ResponseWriter, r *http.Request) (*time.Time, *time.Time, bool) {
	var startDate *time.Time
	var endDate *time.Time
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
		h.logger.Error("analytics request failed", slog.Any("error", err))
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

func writeCSV(w http.ResponseWriter, fileName string, body []byte) {
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename=\""+fileName+"\"")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(body)
}
