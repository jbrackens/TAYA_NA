package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strconv"
	"strings"

	"github.com/go-chi/chi/v5"

	"github.com/phoenixbot/phoenix-compliance/internal/middleware"
	"github.com/phoenixbot/phoenix-compliance/internal/models"
	"github.com/phoenixbot/phoenix-compliance/internal/repository"
	"github.com/phoenixbot/phoenix-compliance/internal/service"
)

type Handlers struct {
	logger  *slog.Logger
	service service.Service
}

func NewHandlers(logger *slog.Logger, svc service.Service) *Handlers {
	return &Handlers{logger: logger, service: svc}
}

func (h *Handlers) HealthCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "healthy", "service": "phoenix-compliance"})
}

func (h *Handlers) ReadinessCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "phoenix-compliance"})
}

func (h *Handlers) GetGeoComplyLicense(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.GetGeoComplyLicense(r.Context())
	if err != nil {
		switch {
		case errors.Is(err, service.ErrGeoComplyLicenseKeysNotFound):
			_ = middleware.WriteJSON(w, http.StatusNotFound, map[string]any{"errorCode": "geoComplyLicenseKeysNotFound"})
		default:
			h.logger.Error("geocomply license request failed", slog.Any("error", err))
			_ = middleware.WriteJSON(w, http.StatusInternalServerError, map[string]any{"errorCode": "geoLocationServiceError"})
		}
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) EvaluateGeoPacket(w http.ResponseWriter, r *http.Request) {
	var request models.GeoComplyPacketRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteJSON(w, http.StatusBadRequest, map[string]any{"errorCode": "failedToParseGeoPacket"})
		return
	}
	response, err := h.service.EvaluateGeoPacket(r.Context(), &request)
	if err != nil {
		switch {
		case errors.Is(err, service.ErrFailedToDecryptGeoPacket):
			_ = middleware.WriteJSON(w, http.StatusBadRequest, map[string]any{"errorCode": "failedToDecryptGeoPacket"})
		case errors.Is(err, service.ErrFailedToParseGeoPacket):
			_ = middleware.WriteJSON(w, http.StatusBadRequest, map[string]any{"errorCode": "failedToParseGeoPacket"})
		default:
			h.logger.Error("geocomply packet request failed", slog.Any("error", err))
			_ = middleware.WriteJSON(w, http.StatusInternalServerError, map[string]any{"errorCode": "geoLocationServiceError"})
		}
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) SetLimit(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	var request models.SetLimitRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.SetLimit(r.Context(), viewer, chi.URLParam(r, "userID"), &request)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, response)
}

func (h *Handlers) GetLimits(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	response, err := h.service.GetLimits(r.Context(), viewer, chi.URLParam(r, "userID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetLimitHistory(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	page, itemsPerPage := paginationParams(r)
	response, err := h.service.GetLimitHistory(r.Context(), viewer, chi.URLParam(r, "userID"), page, itemsPerPage)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) CreateSelfExclusion(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	var request models.SelfExcludeRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.CreateSelfExclusion(r.Context(), viewer, chi.URLParam(r, "userID"), &request)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, response)
}

func (h *Handlers) GetCoolOffHistory(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	page, itemsPerPage := paginationParams(r)
	response, err := h.service.GetCoolOffHistory(r.Context(), viewer, chi.URLParam(r, "userID"), page, itemsPerPage)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetAdminLimitHistory(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	page, itemsPerPage := paginationParams(r)
	response, err := h.service.GetAdminLimitHistory(r.Context(), viewer, chi.URLParam(r, "userID"), page, itemsPerPage)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetAdminCoolOffHistory(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	page, itemsPerPage := paginationParams(r)
	response, err := h.service.GetAdminCoolOffHistory(r.Context(), viewer, chi.URLParam(r, "userID"), page, itemsPerPage)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) SetAdminCoolOff(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	var request models.AdminLifecycleRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.CreateAdminCoolOff(r.Context(), viewer, chi.URLParam(r, "userID"), &request)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, response)
}

func (h *Handlers) SetAdminDepositLimit(w http.ResponseWriter, r *http.Request) {
	h.setAdminLegacyLimit(w, r, "deposit")
}

func (h *Handlers) SetAdminStakeLimit(w http.ResponseWriter, r *http.Request) {
	h.setAdminLegacyLimit(w, r, "stake")
}

func (h *Handlers) SetAdminSessionLimit(w http.ResponseWriter, r *http.Request) {
	h.setAdminLegacyLimit(w, r, "session")
}

func (h *Handlers) SetLegacyDepositLimit(w http.ResponseWriter, r *http.Request) {
	h.setLegacyLimit(w, r, "deposit")
}

func (h *Handlers) SetLegacyStakeLimit(w http.ResponseWriter, r *http.Request) {
	h.setLegacyLimit(w, r, "stake")
}

func (h *Handlers) SetLegacySessionLimit(w http.ResponseWriter, r *http.Request) {
	h.setLegacyLimit(w, r, "session")
}

func (h *Handlers) CreateLegacySelfExclude(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	var payload struct {
		Duration         string `json:"duration"`
		VerificationID   string `json:"verificationId"`
		VerificationCode string `json:"verificationCode"`
	}
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	request := models.SelfExcludeRequest{
		ExclusionType: "permanent",
		Reason:        "player_request",
	}
	switch strings.TrimSpace(payload.Duration) {
	case "ONE_YEAR":
		days := 365
		request.DurationDays = &days
	case "FIVE_YEARS":
		days := 365 * 5
		request.DurationDays = &days
	default:
		_ = middleware.WriteJSON(w, http.StatusBadRequest, map[string]any{"errorCode": "invalidSelfExclusionDuration"})
		return
	}
	response, err := h.service.CreateSelfExclusion(r.Context(), viewer, viewer.UserID, &request)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) CreateLegacyCoolOff(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	var request models.SelfExcludeRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	request.ExclusionType = "temporary"
	if request.Reason == "" {
		request.Reason = "player_request"
	}
	response, err := h.service.CreateSelfExclusion(r.Context(), viewer, viewer.UserID, &request)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, response)
}

func (h *Handlers) GetLegacyLimitHistory(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	page, itemsPerPage := paginationParams(r)
	response, err := h.service.GetLimitHistory(r.Context(), viewer, viewer.UserID, page, itemsPerPage)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetLegacyCoolOffHistory(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	page, itemsPerPage := paginationParams(r)
	response, err := h.service.GetCoolOffHistory(r.Context(), viewer, viewer.UserID, page, itemsPerPage)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) AcceptLegacyResponsibilityCheck(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	response, err := h.service.AcceptResponsibilityCheck(r.Context(), viewer, viewer.UserID)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetRestrictions(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	response, err := h.service.GetRestrictions(r.Context(), viewer, chi.URLParam(r, "userID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) CreateAMLCheck(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	var request models.AMLCheckRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.CreateAMLCheck(r.Context(), viewer, &request)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusAccepted, response)
}

func (h *Handlers) GetAMLCheck(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	response, err := h.service.GetAMLCheck(r.Context(), viewer, chi.URLParam(r, "checkID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) CreateAlert(w http.ResponseWriter, r *http.Request) {
	viewer := derefClaims(middleware.GetClaims(r))
	var request models.ComplianceAlertRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.CreateComplianceAlert(r.Context(), viewer, &request)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, response)
}

func (h *Handlers) writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, repository.ErrNotFound):
		_ = middleware.WriteError(w, http.StatusNotFound, "resource not found")
	case errors.Is(err, service.ErrInvalidInput):
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
	default:
		h.logger.Error("compliance request failed", slog.Any("error", err))
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
	}
}

func derefClaims(claims *models.AuthClaims) models.AuthClaims {
	if claims == nil {
		return models.AuthClaims{}
	}
	return *claims
}

func (h *Handlers) setLegacyLimit(w http.ResponseWriter, r *http.Request, limitType string) {
	viewer := derefClaims(middleware.GetClaims(r))
	var request models.LegacySetLimitsRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.SetLegacyLimits(r.Context(), viewer, viewer.UserID, limitType, &request)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) setAdminLegacyLimit(w http.ResponseWriter, r *http.Request, limitType string) {
	viewer := derefClaims(middleware.GetClaims(r))
	var request models.LegacySetLimitsRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.SetAdminLegacyLimit(r.Context(), viewer, chi.URLParam(r, "userID"), limitType, &request)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func paginationParams(r *http.Request) (int, int) {
	page := 1
	itemsPerPage := 10
	if raw := firstQueryValue(r, "page", "pagination.currentPage"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			page = parsed
		}
	}
	if raw := firstQueryValue(r, "limit", "pagination.itemsPerPage"); raw != "" {
		if parsed, err := strconv.Atoi(raw); err == nil && parsed > 0 {
			itemsPerPage = parsed
		}
	}
	return page, itemsPerPage
}

func firstQueryValue(r *http.Request, keys ...string) string {
	for _, key := range keys {
		if value := strings.TrimSpace(r.URL.Query().Get(key)); value != "" {
			return value
		}
	}
	return ""
}
