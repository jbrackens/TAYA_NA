package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/phoenixbot/phoenix-support-notes/internal/middleware"
	"github.com/phoenixbot/phoenix-support-notes/internal/models"
	"github.com/phoenixbot/phoenix-support-notes/internal/service"
)

type Handlers struct {
	logger  *slog.Logger
	service service.Service
}

func NewHandlers(logger *slog.Logger, svc service.Service) *Handlers {
	return &Handlers{logger: logger, service: svc}
}

func (h *Handlers) HealthCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "healthy", "service": "phoenix-support-notes"})
}

func (h *Handlers) ReadinessCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "phoenix-support-notes"})
}

func (h *Handlers) ListNotes(w http.ResponseWriter, r *http.Request) {
	ownerUserID := userIDParam(r)
	response, err := h.service.ListNotes(r.Context(), derefClaims(middleware.GetClaims(r)), ownerUserID, intFromQuery(r, "page", 1), intFromQuery(r, "limit", 50))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ListTimeline(w http.ResponseWriter, r *http.Request) {
	ownerUserID := userIDParam(r)
	filters, ok := timelineFiltersFromRequest(w, r)
	if !ok {
		return
	}
	response, err := h.service.ListTimeline(r.Context(), derefClaims(middleware.GetClaims(r)), ownerUserID, intFromQuery(r, "page", 1), intFromQuery(r, "limit", 50), filters)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ExportTimeline(w http.ResponseWriter, r *http.Request) {
	ownerUserID := userIDParam(r)
	filters, ok := timelineFiltersFromRequest(w, r)
	if !ok {
		return
	}
	data, err := h.service.ExportTimelineCSV(r.Context(), derefClaims(middleware.GetClaims(r)), ownerUserID, filters)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeCSV(w, "support-timeline.csv", data)
}

func (h *Handlers) AddManualNote(w http.ResponseWriter, r *http.Request) {
	var request models.AddManualNoteRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.service.AddManualNote(r.Context(), derefClaims(middleware.GetClaims(r)), userIDParam(r), request.NoteText); err != nil {
		h.writeServiceError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrForbidden):
		_ = middleware.WriteError(w, http.StatusForbidden, "forbidden")
	case errors.Is(err, service.ErrNotFound):
		_ = middleware.WriteError(w, http.StatusNotFound, "user not found")
	case errors.Is(err, service.ErrInvalidInput):
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
	default:
		h.logger.Error("support notes request failed", slog.Any("error", err))
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

func userIDParam(r *http.Request) string {
	if value := chi.URLParam(r, "userID"); value != "" {
		return value
	}
	return chi.URLParam(r, "punterID")
}

func timelineFiltersFromRequest(w http.ResponseWriter, r *http.Request) (models.TimelineFilters, bool) {
	filters := models.TimelineFilters{EntryType: r.URL.Query().Get("type")}
	if value := r.URL.Query().Get("start_date"); value != "" {
		parsed, err := time.Parse(time.RFC3339, value)
		if err != nil {
			_ = middleware.WriteError(w, http.StatusBadRequest, "invalid start_date")
			return models.TimelineFilters{}, false
		}
		filters.StartDate = &parsed
	}
	if value := r.URL.Query().Get("end_date"); value != "" {
		parsed, err := time.Parse(time.RFC3339, value)
		if err != nil {
			_ = middleware.WriteError(w, http.StatusBadRequest, "invalid end_date")
			return models.TimelineFilters{}, false
		}
		filters.EndDate = &parsed
	}
	return filters, true
}

func writeCSV(w http.ResponseWriter, fileName string, body []byte) {
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename=\""+fileName+"\"")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(body)
}
