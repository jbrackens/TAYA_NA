package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/phoenixbot/phoenix-notification/internal/middleware"
	"github.com/phoenixbot/phoenix-notification/internal/models"
	"github.com/phoenixbot/phoenix-notification/internal/repository"
	"github.com/phoenixbot/phoenix-notification/internal/service"
)

type Handlers struct {
	logger  *slog.Logger
	service service.Service
}

func NewHandlers(logger *slog.Logger, svc service.Service) *Handlers {
	return &Handlers{logger: logger, service: svc}
}

func (h *Handlers) HealthCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "healthy", "service": "phoenix-notification"})
}

func (h *Handlers) ReadinessCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "phoenix-notification"})
}

func (h *Handlers) CreateNotification(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	var request models.SendNotificationRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.CreateNotification(r.Context(), viewer, &request)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusAccepted, response)
}

func (h *Handlers) ListTemplates(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	response, err := h.service.ListTemplates(r.Context(), viewer)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) UpdateNotificationStatus(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	var request models.UpdateNotificationStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.UpdateNotificationStatus(r.Context(), viewer, chi.URLParam(r, "notificationID"), &request)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetPreferences(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	response, err := h.service.GetPreferences(r.Context(), viewer, chi.URLParam(r, "userID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) UpdatePreferences(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	var request models.UpdateNotificationPreferencesRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.UpdatePreferences(r.Context(), viewer, chi.URLParam(r, "userID"), &request)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetNotification(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	response, err := h.service.GetNotification(r.Context(), viewer, chi.URLParam(r, "notificationID"))
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
	case errors.Is(err, service.ErrInvalidInput):
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
	default:
		h.logger.Error("notification request failed", slog.Any("error", err))
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
	}
}

func derefClaims(claims *models.AuthClaims) models.AuthClaims {
	if claims == nil {
		return models.AuthClaims{}
	}
	return *claims
}
