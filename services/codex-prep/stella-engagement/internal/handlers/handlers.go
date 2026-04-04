package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/gorilla/websocket"

	"github.com/phoenixbot/stella-engagement/internal/middleware"
	"github.com/phoenixbot/stella-engagement/internal/models"
	"github.com/phoenixbot/stella-engagement/internal/repository"
	"github.com/phoenixbot/stella-engagement/internal/service"
)

type Handlers struct { logger *slog.Logger; service service.Service }
var upgrader = websocket.Upgrader{CheckOrigin: func(r *http.Request) bool { return true }}

func NewHandlers(logger *slog.Logger, svc service.Service) *Handlers { return &Handlers{logger: logger, service: svc} }
func (h *Handlers) HealthCheck(w http.ResponseWriter, r *http.Request) { _ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "healthy", "service": "stella-engagement"}) }
func (h *Handlers) ReadinessCheck(w http.ResponseWriter, r *http.Request) { _ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "stella-engagement"}) }

func (h *Handlers) StreamAchievement(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	var req models.AchievementStreamRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { _ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body"); return }
	resp, err := h.service.RecordAchievement(r.Context(), viewer, &req)
	if err != nil { h.writeServiceError(w, err); return }
	_ = middleware.WriteJSON(w, http.StatusAccepted, resp)
}

func (h *Handlers) CalculatePoints(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	var req models.PointsCalculateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { _ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body"); return }
	resp, err := h.service.CalculatePoints(r.Context(), viewer, &req)
	if err != nil { h.writeServiceError(w, err); return }
	_ = middleware.WriteJSON(w, http.StatusAccepted, resp)
}

func (h *Handlers) ComputeAggregation(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	var req models.AggregationComputeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil { _ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body"); return }
	resp, err := h.service.ComputeAggregation(r.Context(), viewer, &req)
	if err != nil { h.writeServiceError(w, err); return }
	_ = middleware.WriteJSON(w, http.StatusAccepted, resp)
}

func (h *Handlers) GetEngagementScore(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	resp, err := h.service.GetEngagementScore(r.Context(), viewer, chi.URLParam(r, "userID"))
	if err != nil { h.writeServiceError(w, err); return }
	_ = middleware.WriteJSON(w, http.StatusOK, resp)
}

func (h *Handlers) AchievementStreamSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil { return }
	defer conn.Close()
	userID := chi.URLParam(r, "userID")
	messages, unsubscribe := h.service.Broadcaster().SubscribeAchievements(userID)
	defer unsubscribe()
	for {
		select {
		case message, ok := <-messages:
			if !ok { return }
			if err := conn.WriteMessage(websocket.TextMessage, message); err != nil { return }
		case <-time.After(30 * time.Second):
			if err := conn.WriteMessage(websocket.PingMessage, []byte("ping")); err != nil { return }
		}
	}
}

func (h *Handlers) LeaderboardStreamSocket(w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil { return }
	defer conn.Close()
	entries, _ := h.service.CurrentLeaderboard(r.Context(), intFromQuery(r, "limit", 10))
	_ = conn.WriteJSON(models.LeaderboardMessage{EventType: "leaderboard_update", LeaderboardType: "weekly_points", Entries: entries})
	messages, unsubscribe := h.service.Broadcaster().SubscribeLeaderboard()
	defer unsubscribe()
	for {
		select {
		case message, ok := <-messages:
			if !ok { return }
			if err := conn.WriteMessage(websocket.TextMessage, message); err != nil { return }
		case <-time.After(30 * time.Second):
			if err := conn.WriteMessage(websocket.PingMessage, []byte("ping")); err != nil { return }
		}
	}
}

func (h *Handlers) writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, repository.ErrNotFound):
		_ = middleware.WriteError(w, http.StatusNotFound, "resource not found")
	case errors.Is(err, service.ErrInvalidInput):
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
	default:
		h.logger.Error("engagement request failed", slog.Any("error", err))
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
	}
}

func derefClaims(claims *models.AuthClaims) models.AuthClaims { if claims == nil { return models.AuthClaims{} }; return *claims }
func intFromQuery(r *http.Request, key string, fallback int) int { value := r.URL.Query().Get(key); if value == "" { return fallback }; parsed, err := strconv.Atoi(value); if err != nil { return fallback }; return parsed }
