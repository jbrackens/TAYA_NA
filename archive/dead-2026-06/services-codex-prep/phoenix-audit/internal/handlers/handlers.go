package handlers

import (
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/phoenixbot/phoenix-audit/internal/middleware"
	"github.com/phoenixbot/phoenix-audit/internal/models"
	"github.com/phoenixbot/phoenix-audit/internal/service"
)

type Handlers struct {
	logger  *slog.Logger
	service service.Service
}

func NewHandlers(logger *slog.Logger, svc service.Service) *Handlers {
	return &Handlers{logger: logger, service: svc}
}

func (h *Handlers) HealthCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "healthy", "service": "phoenix-audit"})
}

func (h *Handlers) ReadinessCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "phoenix-audit"})
}

func (h *Handlers) GetAuditLogs(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.GetAuditLogs(r.Context(), derefClaims(middleware.GetClaims(r)), auditFiltersFromRequest(r))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetUserAuditLogs(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.GetUserAuditLogs(r.Context(), derefClaims(middleware.GetClaims(r)), chi.URLParam(r, "userID"), auditFiltersFromRequest(r))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ExportAuditLogs(w http.ResponseWriter, r *http.Request) {
	data, err := h.service.ExportAuditLogsCSV(r.Context(), derefClaims(middleware.GetClaims(r)), auditFiltersFromRequest(r))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}

	filename := fmt.Sprintf("audit_logs_%s.csv", time.Now().UTC().Format("20060102_150405"))
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%q", filename))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

func auditFiltersFromRequest(r *http.Request) models.AuditLogFilters {
	return models.AuditLogFilters{
		Action:   strings.TrimSpace(r.URL.Query().Get("action")),
		ActorID:  strings.TrimSpace(r.URL.Query().Get("actor_id")),
		TargetID: strings.TrimSpace(r.URL.Query().Get("target_id")),
		Product:  strings.TrimSpace(r.URL.Query().Get("product")),
		SortBy:   strings.TrimSpace(r.URL.Query().Get("sort_by")),
		SortDir:  strings.TrimSpace(r.URL.Query().Get("sort_dir")),
		Page:     intFromQuery(r, "page", 1),
		Limit:    intFromQuery(r, "limit", 50),
	}
}

func (h *Handlers) writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrForbidden):
		_ = middleware.WriteError(w, http.StatusForbidden, "forbidden")
	case errors.Is(err, service.ErrInvalidInput):
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
	default:
		h.logger.Error("audit request failed", slog.Any("error", err))
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
