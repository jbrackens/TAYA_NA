package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/phoenixbot/phoenix-cms/internal/middleware"
	"github.com/phoenixbot/phoenix-cms/internal/models"
	"github.com/phoenixbot/phoenix-cms/internal/repository"
	"github.com/phoenixbot/phoenix-cms/internal/service"
)

type Handlers struct {
	logger  *slog.Logger
	service service.Service
}

func NewHandlers(logger *slog.Logger, svc service.Service) *Handlers { return &Handlers{logger: logger, service: svc} }

func (h *Handlers) HealthCheck(w http.ResponseWriter, r *http.Request) { _ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "healthy", "service": "phoenix-cms"}) }
func (h *Handlers) ReadinessCheck(w http.ResponseWriter, r *http.Request) { _ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "phoenix-cms"}) }

func (h *Handlers) CreatePage(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	var req models.CreatePageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { _ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body"); return }
	resp, err := h.service.CreatePage(r.Context(), viewer, &req)
	if err != nil { h.writeServiceError(w, err); return }
	_ = middleware.WriteJSON(w, http.StatusCreated, resp)
}

func (h *Handlers) GetPage(w http.ResponseWriter, r *http.Request) {
	resp, err := h.service.GetPage(r.Context(), chi.URLParam(r, "pageID"))
	if err != nil { h.writeServiceError(w, err); return }
	_ = middleware.WriteJSON(w, http.StatusOK, resp)
}

func (h *Handlers) ListPages(w http.ResponseWriter, r *http.Request) {
	resp, err := h.service.ListPages(r.Context(), intFromQuery(r, "page", 1), intFromQuery(r, "limit", 20))
	if err != nil { h.writeServiceError(w, err); return }
	_ = middleware.WriteJSON(w, http.StatusOK, resp)
}

func (h *Handlers) CreatePromotion(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	var req models.CreatePromotionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { _ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body"); return }
	resp, err := h.service.CreatePromotion(r.Context(), viewer, &req)
	if err != nil { h.writeServiceError(w, err); return }
	_ = middleware.WriteJSON(w, http.StatusCreated, resp)
}

func (h *Handlers) ListPromotions(w http.ResponseWriter, r *http.Request) {
	resp, err := h.service.ListPromotions(r.Context())
	if err != nil { h.writeServiceError(w, err); return }
	_ = middleware.WriteJSON(w, http.StatusOK, resp)
}

func (h *Handlers) CreateBanner(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	var req models.CreateBannerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { _ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body"); return }
	resp, err := h.service.CreateBanner(r.Context(), viewer, &req)
	if err != nil { h.writeServiceError(w, err); return }
	_ = middleware.WriteJSON(w, http.StatusCreated, resp)
}

func (h *Handlers) ListBanners(w http.ResponseWriter, r *http.Request) {
	resp, err := h.service.ListBanners(r.Context(), r.URL.Query().Get("position"))
	if err != nil { h.writeServiceError(w, err); return }
	_ = middleware.WriteJSON(w, http.StatusOK, resp)
}

func (h *Handlers) writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, repository.ErrNotFound):
		_ = middleware.WriteError(w, http.StatusNotFound, "resource not found")
	case errors.Is(err, service.ErrInvalidInput):
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
	default:
		h.logger.Error("cms request failed", slog.Any("error", err))
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
	}
}

func derefClaims(claims *models.AuthClaims) models.AuthClaims {
	if claims == nil { return models.AuthClaims{} }
	return *claims
}

func intFromQuery(r *http.Request, key string, fallback int) int {
	value := r.URL.Query().Get(key)
	if value == "" { return fallback }
	parsed, err := strconv.Atoi(value)
	if err != nil { return fallback }
	return parsed
}
