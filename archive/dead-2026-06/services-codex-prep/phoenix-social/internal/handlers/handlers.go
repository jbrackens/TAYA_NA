package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/phoenixbot/phoenix-social/internal/middleware"
	"github.com/phoenixbot/phoenix-social/internal/models"
	"github.com/phoenixbot/phoenix-social/internal/repository"
	"github.com/phoenixbot/phoenix-social/internal/service"
)

type Handlers struct {
	logger  *slog.Logger
	service service.Service
}

func NewHandlers(logger *slog.Logger, svc service.Service) *Handlers {
	return &Handlers{logger: logger, service: svc}
}

func (h *Handlers) HealthCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "healthy", "service": "phoenix-social"})
}

func (h *Handlers) ReadinessCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "phoenix-social"})
}

func (h *Handlers) GetProfile(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	profile, err := h.service.GetProfile(r.Context(), viewer, chi.URLParam(r, "userID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, profile)
}

func (h *Handlers) FollowUser(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	follow, err := h.service.FollowUser(r.Context(), viewer, chi.URLParam(r, "userID"), chi.URLParam(r, "targetUserID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, follow)
}

func (h *Handlers) ListFollowers(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.ListFollowers(r.Context(), chi.URLParam(r, "userID"), intFromQuery(r, "page", 1), intFromQuery(r, "limit", 20))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ListFeed(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	response, err := h.service.ListFeed(r.Context(), viewer, r.URL.Query().Get("feed_type"), intFromQuery(r, "page", 1), intFromQuery(r, "limit", 20))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) CreateMessage(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	var request models.SendMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	message, err := h.service.CreateMessage(r.Context(), viewer, &request)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, message)
}

func (h *Handlers) GetConversation(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	conversation, err := h.service.GetConversation(r.Context(), viewer, chi.URLParam(r, "conversationID"), intFromQuery(r, "page", 1), intFromQuery(r, "limit", 50))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, conversation)
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
		h.logger.Error("social request failed", slog.Any("error", err))
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
