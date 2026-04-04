package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/phoenixbot/phoenix-config/internal/middleware"
	"github.com/phoenixbot/phoenix-config/internal/models"
	"github.com/phoenixbot/phoenix-config/internal/service"
)

type Handlers struct {
	logger  *slog.Logger
	service service.Service
}

func NewHandlers(logger *slog.Logger, svc service.Service) *Handlers {
	return &Handlers{logger: logger, service: svc}
}

func (h *Handlers) HealthCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "healthy", "service": "phoenix-config"})
}

func (h *Handlers) ReadinessCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "phoenix-config"})
}

func (h *Handlers) GetCurrentTermsPublic(w http.ResponseWriter, r *http.Request) {
	doc, err := h.service.GetCurrentTerms(r.Context(), nil)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, doc)
}

func (h *Handlers) GetCurrentTermsAdmin(w http.ResponseWriter, r *http.Request) {
	doc, err := h.service.GetCurrentTerms(r.Context(), middleware.GetClaims(r))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, doc)
}

func (h *Handlers) UploadTerms(w http.ResponseWriter, r *http.Request) {
	var request models.UpsertTermsRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.service.CreateTerms(r.Context(), derefClaims(middleware.GetClaims(r)), request); err != nil {
		h.writeServiceError(w, err)
		return
	}
	w.WriteHeader(http.StatusOK)
}

func (h *Handlers) writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrForbidden):
		_ = middleware.WriteError(w, http.StatusForbidden, "forbidden")
	case errors.Is(err, service.ErrInvalidInput):
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
	case errors.Is(err, service.ErrNotFound):
		_ = middleware.WriteError(w, http.StatusNotFound, err.Error())
	case errors.Is(err, service.ErrConflict):
		_ = middleware.WriteError(w, http.StatusConflict, err.Error())
	default:
		h.logger.Error("config request failed", slog.Any("error", err))
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
	}
}

func derefClaims(claims *models.AuthClaims) models.AuthClaims {
	if claims == nil {
		return models.AuthClaims{}
	}
	return *claims
}
