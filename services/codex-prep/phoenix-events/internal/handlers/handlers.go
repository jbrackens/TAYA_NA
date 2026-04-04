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

	"github.com/phoenixbot/phoenix-events/internal/middleware"
	"github.com/phoenixbot/phoenix-events/internal/models"
	"github.com/phoenixbot/phoenix-events/internal/repository"
	"github.com/phoenixbot/phoenix-events/internal/service"
)

type Handlers struct {
	logger  *slog.Logger
	service service.EventService
}

func NewHandlers(logger *slog.Logger, svc service.EventService) *Handlers {
	return &Handlers{logger: logger, service: svc}
}

func (h *Handlers) HealthCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "healthy", "service": "phoenix-events"})
}

func (h *Handlers) ReadinessCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "phoenix-events"})
}

func (h *Handlers) CreateEvent(w http.ResponseWriter, r *http.Request) {
	var request models.CreateEventRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	event, err := h.service.CreateEvent(r.Context(), &request, derefClaims(middleware.GetClaims(r)))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, event)
}

func (h *Handlers) UpsertProviderEvent(w http.ResponseWriter, r *http.Request) {
	var request models.CreateEventRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.UpsertProviderEvent(r.Context(), &request, derefClaims(middleware.GetClaims(r)))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	status := http.StatusOK
	if response.Created {
		status = http.StatusCreated
	}
	_ = middleware.WriteJSON(w, status, response)
}

func (h *Handlers) SyncMockDataEvents(w http.ResponseWriter, r *http.Request) {
	var request models.SyncMockDataEventsRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.SyncMockDataEvents(r.Context(), &request, derefClaims(middleware.GetClaims(r)))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) SyncOddinEvents(w http.ResponseWriter, r *http.Request) {
	var request models.SyncOddinEventsRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.SyncOddinEvents(r.Context(), &request, derefClaims(middleware.GetClaims(r)))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) SyncBetgeniusEvents(w http.ResponseWriter, r *http.Request) {
	var request models.SyncBetgeniusEventsRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.SyncBetgeniusEvents(r.Context(), &request, derefClaims(middleware.GetClaims(r)))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetEvent(w http.ResponseWriter, r *http.Request) {
	event, err := h.service.GetEvent(r.Context(), chi.URLParam(r, "eventID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, event)
}

func (h *Handlers) GetFixtureStats(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.GetFixtureStats(r.Context(), chi.URLParam(r, "fixtureID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetMatchTracker(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.GetMatchTracker(r.Context(), chi.URLParam(r, "fixtureID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ListEvents(w http.ResponseWriter, r *http.Request) {
	filters := models.EventFilters{Sport: r.URL.Query().Get("sport"), League: r.URL.Query().Get("league"), Status: r.URL.Query().Get("status"), ExternalID: r.URL.Query().Get("external_id"), Page: intFromQuery(r, "page", 1), Limit: intFromQuery(r, "limit", 100)}
	if value := strings.TrimSpace(r.URL.Query().Get("start_date")); value != "" {
		parsed, err := time.Parse(time.RFC3339, value)
		if err != nil {
			_ = middleware.WriteError(w, http.StatusBadRequest, "invalid start_date")
			return
		}
		filters.StartDate = &parsed
	}
	if value := strings.TrimSpace(r.URL.Query().Get("end_date")); value != "" {
		parsed, err := time.Parse(time.RFC3339, value)
		if err != nil {
			_ = middleware.WriteError(w, http.StatusBadRequest, "invalid end_date")
			return
		}
		filters.EndDate = &parsed
	}
	response, err := h.service.ListEvents(r.Context(), filters)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ListTournaments(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.ListTournaments(r.Context(), r.URL.Query().Get("sport"), derefClaims(middleware.GetClaims(r)))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) UpdateFixtureStatus(w http.ResponseWriter, r *http.Request) {
	var request models.UpdateFixtureStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	event, err := h.service.UpdateFixtureStatus(r.Context(), chi.URLParam(r, "fixtureID"), &request, derefClaims(middleware.GetClaims(r)))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, event)
}

func (h *Handlers) UpdateLiveScore(w http.ResponseWriter, r *http.Request) {
	var request models.UpdateLiveScoreRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	event, err := h.service.UpdateLiveScore(r.Context(), chi.URLParam(r, "eventID"), &request, derefClaims(middleware.GetClaims(r)))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, event)
}

func (h *Handlers) UpdateResult(w http.ResponseWriter, r *http.Request) {
	var request models.UpdateResultRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	event, err := h.service.UpdateResult(r.Context(), chi.URLParam(r, "eventID"), &request, derefClaims(middleware.GetClaims(r)))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, event)
}

func (h *Handlers) ListSports(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.ListSports(r.Context())
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ListLeagues(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.ListLeagues(r.Context(), chi.URLParam(r, "sport"))
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
	case errors.Is(err, repository.ErrConflict):
		_ = middleware.WriteError(w, http.StatusConflict, "resource conflict")
	case errors.Is(err, service.ErrInvalidInput):
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
	default:
		h.logger.Error("events request failed", slog.Any("error", err))
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
