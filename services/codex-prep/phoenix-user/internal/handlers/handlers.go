package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/phoenixbot/phoenix-user/internal/middleware"
	"github.com/phoenixbot/phoenix-user/internal/models"
	"github.com/phoenixbot/phoenix-user/internal/repository"
	"github.com/phoenixbot/phoenix-user/internal/service"
)

type Handlers struct {
	logger  *slog.Logger
	service service.UserService
}

func NewHandlers(logger *slog.Logger, service service.UserService) *Handlers {
	return &Handlers{logger: logger, service: service}
}

func (h *Handlers) HealthCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "healthy", "service": "phoenix-user"})
}

func (h *Handlers) ReadinessCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "phoenix-user"})
}

func (h *Handlers) Register(w http.ResponseWriter, r *http.Request) {
	var req models.RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.RegisterUser(r.Context(), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, response)
}

func (h *Handlers) Login(w http.ResponseWriter, r *http.Request) {
	var req models.LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.IPAddress = clientIP(r)
	req.UserAgent = r.UserAgent()
	response, err := h.service.AuthenticateUser(r.Context(), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) LoginWithVerification(w http.ResponseWriter, r *http.Request) {
	var req models.LoginWithVerificationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	req.IPAddress = clientIP(r)
	req.UserAgent = r.UserAgent()
	response, err := h.service.AuthenticateUserWithVerification(r.Context(), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) RefreshToken(w http.ResponseWriter, r *http.Request) {
	var req models.RefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.RefreshToken(r.Context(), req.RefreshToken)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) Logout(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.LogoutRequest
	if r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}
	}
	if err := h.service.Logout(r.Context(), actor, &req); err != nil {
		h.writeServiceError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	var req models.VerifyEmailRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.VerifyEmail(r.Context(), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ActivateAccount(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.ActivateAccount(r.Context(), chi.URLParam(r, "token"))
	if err != nil {
		if errors.Is(err, repository.ErrTokenNotFound) {
			_ = middleware.WriteJSON(w, http.StatusBadRequest, map[string]any{"errorCode": "invalidVerificationCode"})
			return
		}
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) RequestVerification(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.VerificationRequest
	if r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}
	}
	response, err := h.service.RequestVerification(r.Context(), actor, &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) RequestVerificationByPhone(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.VerificationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.RequestVerificationByPhone(r.Context(), actor, &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) RequestVerificationByVerificationCode(w http.ResponseWriter, r *http.Request) {
	response, err := h.service.RequestVerificationByVerificationCode(r.Context(), chi.URLParam(r, "verificationCode"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) CheckVerification(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.VerificationCheckRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.CheckVerification(r.Context(), actor, &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) AnswerKBAQuestions(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.AnswerKBAQuestionsRequest
	if err := decodeKBARequest(r, &req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.AnswerKBAQuestions(r.Context(), actor, &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) CheckIDPVStatus(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.IDPVStatusRequest
	if r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}
	}
	response, err := h.service.CheckIDPVStatus(r.Context(), actor, &req)
	if err != nil {
		if errors.Is(err, service.ErrPhotoVerificationNotCompleted) {
			_ = middleware.WriteJSON(w, http.StatusBadRequest, map[string]any{
				"errors": []map[string]any{{"errorCode": "photoVerificationNotCompleted", "details": nil}},
			})
			return
		}
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) StartIDPV(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.IDPVStartRequest
	if r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}
	}
	response, err := h.service.StartIDPV(r.Context(), actor, &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ChangePassword(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.ChangePasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.ChangePassword(r.Context(), actor, &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	var req models.ForgotPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.ForgotPassword(r.Context(), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusAccepted, response)
}

func (h *Handlers) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req models.ResetPasswordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.ResetPassword(r.Context(), chi.URLParam(r, "token"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) DeleteCurrentUser(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	response, err := h.service.DeleteCurrentUser(r.Context(), actor)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ListAdminUsers(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	q := r.URL.Query()
	filters := models.UserFilters{
		Query:  q.Get("q"),
		Role:   q.Get("role"),
		Status: q.Get("status"),
		Page:   intFromQuery(r, "page", 1),
		Limit:  intFromQuery(r, "limit", 25),
	}

	// Talon nested params: qs.stringify({filter: {...}, pagination: {...}}, {allowDots: true})
	// produces filter.* and pagination.* (NOT query.filter.*)
	if v := q.Get("filter.punterId"); v != "" {
		filters.UserID = v
	}
	if v := q.Get("filter.username"); v != "" {
		filters.Username = v
	}
	if v := q.Get("filter.firstName"); v != "" {
		filters.FirstName = v
	}
	if v := q.Get("filter.lastName"); v != "" {
		filters.LastName = v
	}
	if v := q.Get("filter.dateOfBirth"); v != "" {
		filters.DateOfBirth = v
	}
	if p := intFromQueryKeys(r, 0, "pagination.currentPage"); p > 0 {
		filters.Page = p
	}
	if l := intFromQueryKeys(r, 0, "pagination.itemsPerPage"); l > 0 {
		filters.Limit = l
	}

	response, err := h.service.ListAdminUsers(r.Context(), actor, filters)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetAdminUser(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	response, err := h.service.GetAdminUser(r.Context(), actor, chi.URLParam(r, "userID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ApplyAdminUserLifecycle(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.AdminUserLifecycleRequest
	if r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}
	}
	response, err := h.service.ApplyAdminUserLifecycle(
		r.Context(),
		actor,
		chi.URLParam(r, "userID"),
		chi.URLParam(r, "action"),
		&req,
	)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ListAdminUserSessions(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	response, err := h.service.ListAdminUserSessions(
		r.Context(),
		actor,
		chi.URLParam(r, "userID"),
		intFromQueryKeys(r, 1, "page", "pagination.currentPage"),
		intFromQueryKeys(r, 20, "limit", "pagination.itemsPerPage"),
	)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ListAdminVerificationSessions(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	response, err := h.service.ListVerificationSessions(r.Context(), actor, chi.URLParam(r, "userID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetAdminVerificationSession(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	response, err := h.service.GetVerificationSession(r.Context(), actor, chi.URLParam(r, "sessionID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetAdminVerificationSessionByProviderReference(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	response, err := h.service.GetVerificationSessionByProviderReference(r.Context(), actor, chi.URLParam(r, "providerReference"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetAdminVerificationSessionByProviderCaseID(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	response, err := h.service.GetVerificationSessionByProviderCaseID(r.Context(), actor, chi.URLParam(r, "providerCaseID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ListVerificationReviewQueue(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	response, err := h.service.ListVerificationReviewQueue(
		r.Context(),
		actor,
		r.URL.Query().Get("provider"),
		r.URL.Query().Get("assigned_to"),
		r.URL.Query().Get("flow_type"),
		r.URL.Query().Get("status"),
	)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ExportVerificationReviewQueue(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	data, err := h.service.ExportVerificationReviewQueueCSV(
		r.Context(),
		actor,
		r.URL.Query().Get("provider"),
		r.URL.Query().Get("assigned_to"),
		r.URL.Query().Get("flow_type"),
		r.URL.Query().Get("status"),
	)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeCSV(w, "verification-review-queue.csv", data)
}

func (h *Handlers) ListVerificationProviderEvents(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	response, err := h.service.ListVerificationProviderEvents(r.Context(), actor, chi.URLParam(r, "sessionID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) AssignVerificationSession(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.VerificationAssignmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.AssignVerificationSession(r.Context(), actor, chi.URLParam(r, "sessionID"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) AddVerificationSessionNote(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.VerificationNoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.AddVerificationSessionNote(r.Context(), actor, chi.URLParam(r, "sessionID"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ApplyAdminVerificationDecision(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.VerificationDecisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.ApplyAdminVerificationDecision(r.Context(), actor, chi.URLParam(r, "sessionID"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ApplyProviderVerificationDecision(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.VerificationDecisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.ApplyProviderVerificationDecision(r.Context(), actor, chi.URLParam(r, "sessionID"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ApplyProviderVerificationDecisionByReference(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.VerificationDecisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.ApplyProviderVerificationDecisionByReference(r.Context(), actor, chi.URLParam(r, "providerReference"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ApplyProviderVerificationDecisionByCaseID(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.VerificationDecisionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.ApplyProviderVerificationDecisionByCaseID(r.Context(), actor, chi.URLParam(r, "providerCaseID"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ApplyProviderVerificationUpdate(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.ProviderVerificationStatusUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.ApplyProviderVerificationUpdate(r.Context(), actor, chi.URLParam(r, "sessionID"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ApplyProviderVerificationUpdateByReference(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.ProviderVerificationStatusByReferenceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.ApplyProviderVerificationUpdateByReference(r.Context(), actor, &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ApplyProviderVerificationUpdateByCaseID(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.ProviderVerificationStatusUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.ApplyProviderVerificationUpdateByCaseID(r.Context(), actor, chi.URLParam(r, "providerCaseID"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ApplyProviderVerificationWebhookUpdate(w http.ResponseWriter, r *http.Request) {
	actor := models.AuthClaims{UserID: "idcomply-provider", Role: "data-provider"}
	var req models.ProviderVerificationStatusUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.ApplyProviderVerificationUpdate(r.Context(), actor, chi.URLParam(r, "sessionID"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ApplyProviderVerificationWebhookUpdateByCaseID(w http.ResponseWriter, r *http.Request) {
	actor := models.AuthClaims{UserID: "idcomply-provider", Role: "data-provider"}
	var req models.ProviderVerificationStatusUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.ApplyProviderVerificationUpdateByCaseID(r.Context(), actor, chi.URLParam(r, "providerCaseID"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ApplyProviderVerificationWebhookUpdateByReference(w http.ResponseWriter, r *http.Request) {
	actor := models.AuthClaims{UserID: "idcomply-provider", Role: "data-provider"}
	var req models.ProviderVerificationStatusByReferenceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.ApplyProviderVerificationUpdateByReference(r.Context(), actor, &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetUser(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	response, err := h.service.GetUser(r.Context(), actor, chi.URLParam(r, "userID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) UpdateUser(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.UpdateUser(r.Context(), actor, chi.URLParam(r, "userID"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) SubmitKYC(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.KYCSubmitRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.SubmitKYC(r.Context(), actor, &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusAccepted, response)
}

func (h *Handlers) GetRoles(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	response, err := h.service.GetRoles(r.Context(), actor, chi.URLParam(r, "userID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) AssignRole(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.AssignRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.AssignRole(r.Context(), actor, chi.URLParam(r, "userID"), req.RoleName)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, response)
}

func (h *Handlers) GetPermissions(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	response, err := h.service.GetPermissions(r.Context(), actor, chi.URLParam(r, "userID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetCurrentSession(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	response, err := h.service.GetCurrentSession(r.Context(), actor)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) AcceptTerms(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.AcceptTermsRequest
	if r.ContentLength > 0 {
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
			return
		}
	}
	response, err := h.service.AcceptTerms(r.Context(), actor, &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetCurrentProfile(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	response, err := h.service.GetUser(r.Context(), actor, actor.UserID)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) UpdateCurrentProfile(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.UpdateUser(r.Context(), actor, actor.UserID, &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) UpdateCurrentEmail(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.UpdateUser(r.Context(), actor, actor.UserID, &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) UpdatePreferences(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.UpdatePreferencesRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.UpdatePreferences(r.Context(), actor, &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) UpdateMFA(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.UpdateMFAEnabledStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if err := h.service.UpdateMFA(r.Context(), actor, &req); err != nil {
		h.writeServiceError(w, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

func (h *Handlers) writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrInvalidCredentials):
		_ = middleware.WriteError(w, http.StatusUnauthorized, "invalid credentials")
	case errors.Is(err, repository.ErrTokenNotFound):
		_ = middleware.WriteError(w, http.StatusUnauthorized, "invalid or expired token")
	case errors.Is(err, service.ErrForbidden):
		_ = middleware.WriteError(w, http.StatusForbidden, "forbidden")
	case errors.Is(err, repository.ErrNotFound):
		_ = middleware.WriteError(w, http.StatusNotFound, "resource not found")
	default:
		h.logger.Error("request failed", slog.Any("error", err))
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
	}
}

func intFromQuery(r *http.Request, key string, fallback int) int {
	return intFromQueryKeys(r, fallback, key)
}

func intFromQueryKeys(r *http.Request, fallback int, keys ...string) int {
	for _, key := range keys {
		raw := r.URL.Query().Get(key)
		if raw == "" {
			continue
		}
		var value int
		if _, err := fmt.Sscanf(raw, "%d", &value); err == nil {
			return value
		}
	}
	return fallback
}

func clientIP(r *http.Request) string {
	if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
		return forwarded
	}
	if realIP := r.Header.Get("X-Real-Ip"); realIP != "" {
		return realIP
	}
	return r.RemoteAddr
}

func writeCSV(w http.ResponseWriter, fileName string, body []byte) {
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", fmt.Sprintf(`attachment; filename="%s"`, fileName))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(body)
}

func decodeKBARequest(r *http.Request, req *models.AnswerKBAQuestionsRequest) error {
	raw, err := io.ReadAll(r.Body)
	if err != nil {
		return err
	}
	if len(raw) == 0 {
		return nil
	}
	var answers []models.KBAAnswer
	if err := json.Unmarshal(raw, &answers); err == nil {
		req.Answers = answers
		return nil
	}
	return json.Unmarshal(raw, req)
}
