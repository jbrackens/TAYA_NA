package handlers

import (
	"context"
	"encoding/json"
	"encoding/xml"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/phoenixbot/phoenix-wallet/internal/middleware"
	"github.com/phoenixbot/phoenix-wallet/internal/models"
	"github.com/phoenixbot/phoenix-wallet/internal/repository"
	"github.com/phoenixbot/phoenix-wallet/internal/service"
)

type Handlers struct {
	logger  *slog.Logger
	service service.WalletService
}

func NewHandlers(logger *slog.Logger, service service.WalletService) *Handlers {
	return &Handlers{logger: logger, service: service}
}

func (h *Handlers) HealthCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "healthy", "service": "phoenix-wallet"})
}

func (h *Handlers) ReadinessCheck(w http.ResponseWriter, r *http.Request) {
	_ = middleware.WriteJSON(w, http.StatusOK, map[string]string{"status": "ready", "service": "phoenix-wallet"})
}

func (h *Handlers) GetWalletSummary(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	response, err := h.service.GetWalletSummary(r.Context(), actor, chi.URLParam(r, "userID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetFinancialSummary(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	response, err := h.service.GetFinancialSummary(r.Context(), actor, chi.URLParam(r, "userID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) CreateWallet(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req struct {
		Currency string `json:"currency"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.CreateWallet(r.Context(), actor, chi.URLParam(r, "userID"), req.Currency)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, response)
}

func (h *Handlers) CreateDeposit(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.DepositRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.CreateDeposit(r.Context(), actor, chi.URLParam(r, "userID"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusAccepted, response)
}

func (h *Handlers) HandlePaymentStateChangedNotification(w http.ResponseWriter, r *http.Request) {
	var req models.PaymentStateChangedNotification
	if err := xml.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid xml body", http.StatusBadRequest)
		return
	}
	response, err := h.service.HandlePaymentStateChanged(r.Context(), &req)
	if err != nil {
		h.logger.Error("payment state changed notification failed", slog.Any("error", err))
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeXML(w, http.StatusOK, response)
}

func (h *Handlers) VerifyCashDeposit(w http.ResponseWriter, r *http.Request) {
	var req models.CashDepositVerificationRequest
	if err := xml.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "invalid xml body", http.StatusBadRequest)
		return
	}
	response, err := h.service.VerifyCashDeposit(r.Context(), &req)
	if err != nil {
		h.logger.Error("cash deposit verification failed", slog.Any("error", err))
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	writeXML(w, http.StatusOK, response)
}

func (h *Handlers) CreateWithdrawal(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.WithdrawalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.CreateWithdrawal(r.Context(), actor, chi.URLParam(r, "userID"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusAccepted, response)
}

func (h *Handlers) CreateAdminFundsCredit(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.AdminFundsMutationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.CreateAdminFundsCredit(r.Context(), actor, chi.URLParam(r, "userID"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, response)
}

func (h *Handlers) CreateAdminFundsDebit(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.AdminFundsMutationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.CreateAdminFundsDebit(r.Context(), actor, chi.URLParam(r, "userID"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, response)
}

func (h *Handlers) CreateLegacyDeposit(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.DepositRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.CreateDeposit(r.Context(), actor, actor.UserID, &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusAccepted, response)
}

func (h *Handlers) CreateLegacyCashWithdrawal(w http.ResponseWriter, r *http.Request) {
	h.createLegacyTypedWithdrawal(w, r, "cash")
}

func (h *Handlers) CreateLegacyChequeWithdrawal(w http.ResponseWriter, r *http.Request) {
	h.createLegacyTypedWithdrawal(w, r, "cheque")
}

func (h *Handlers) GetLegacyTransactionDetails(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	response, err := h.service.GetTransactionDetails(r.Context(), actor, actor.UserID, chi.URLParam(r, "transactionID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ListAdminPaymentTransactions(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	page := intFromQuery(r, "page", 1)
	limit := intFromQuery(r, "limit", 20)
	response, err := h.service.ListAdminPaymentTransactions(
		r.Context(),
		actor,
		r.URL.Query().Get("user_id"),
		r.URL.Query().Get("type"),
		r.URL.Query().Get("status"),
		r.URL.Query().Get("provider"),
		r.URL.Query().Get("assigned_to"),
		page,
		limit,
	)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ExportAdminPaymentTransactions(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	data, err := h.service.ExportAdminPaymentTransactionsCSV(
		r.Context(),
		actor,
		r.URL.Query().Get("user_id"),
		r.URL.Query().Get("type"),
		r.URL.Query().Get("status"),
		r.URL.Query().Get("provider"),
		r.URL.Query().Get("assigned_to"),
	)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeCSV(w, "payment-transactions.csv", data)
}

func (h *Handlers) ListAdminPaymentSummary(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	response, err := h.service.ListAdminPaymentSummary(
		r.Context(),
		actor,
		r.URL.Query().Get("user_id"),
		r.URL.Query().Get("provider"),
		r.URL.Query().Get("assigned_to"),
	)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ListAdminReconciliationQueue(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	page := intFromQuery(r, "page", 1)
	limit := intFromQuery(r, "limit", 20)
	response, err := h.service.ListAdminReconciliationQueue(
		r.Context(),
		actor,
		r.URL.Query().Get("user_id"),
		r.URL.Query().Get("provider"),
		r.URL.Query().Get("assigned_to"),
		page,
		limit,
	)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ExportAdminReconciliationQueue(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	data, err := h.service.ExportAdminReconciliationQueueCSV(
		r.Context(),
		actor,
		r.URL.Query().Get("user_id"),
		r.URL.Query().Get("provider"),
		r.URL.Query().Get("assigned_to"),
	)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	writeCSV(w, "payment-reconciliation-queue.csv", data)
}

func (h *Handlers) GetAdminPaymentTransactionDetails(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	response, err := h.service.GetAdminPaymentTransactionDetails(r.Context(), actor, chi.URLParam(r, "transactionID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) GetAdminPaymentTransactionDetailsByProviderReference(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	response, err := h.service.GetAdminPaymentTransactionDetailsByProviderReference(r.Context(), actor, chi.URLParam(r, "providerReference"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ListAdminPaymentTransactionEvents(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	response, err := h.service.ListAdminPaymentTransactionEvents(r.Context(), actor, chi.URLParam(r, "transactionID"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ListAdminPaymentTransactionEventsByProviderReference(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	response, err := h.service.ListAdminPaymentTransactionEventsByProviderReference(r.Context(), actor, chi.URLParam(r, "providerReference"))
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) CancelProviderRequest(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.ProviderCancelRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.CancelProviderRequest(r.Context(), actor, &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) AssignAdminPaymentTransaction(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.PaymentTransactionAssignmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.AssignAdminPaymentTransaction(r.Context(), actor, chi.URLParam(r, "transactionID"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) AssignAdminPaymentTransactionByProviderReference(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.PaymentTransactionAssignmentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.AssignAdminPaymentTransactionByProviderReference(r.Context(), actor, chi.URLParam(r, "providerReference"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) AddAdminPaymentTransactionNote(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.PaymentTransactionActionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.AddAdminPaymentTransactionNote(r.Context(), actor, chi.URLParam(r, "transactionID"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) AddAdminPaymentTransactionNoteByProviderReference(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.PaymentTransactionActionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.AddAdminPaymentTransactionNoteByProviderReference(r.Context(), actor, chi.URLParam(r, "providerReference"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) RefundAdminPaymentTransaction(w http.ResponseWriter, r *http.Request) {
	h.handleAdminPaymentAction(w, r, h.service.RefundAdminPaymentTransaction)
}

func (h *Handlers) RefundAdminPaymentTransactionByProviderReference(w http.ResponseWriter, r *http.Request) {
	h.handleAdminPaymentActionByProviderReference(w, r, h.service.RefundAdminPaymentTransactionByProviderReference)
}

func (h *Handlers) ReverseAdminPaymentTransaction(w http.ResponseWriter, r *http.Request) {
	h.handleAdminPaymentAction(w, r, h.service.ReverseAdminPaymentTransaction)
}

func (h *Handlers) ReverseAdminPaymentTransactionByProviderReference(w http.ResponseWriter, r *http.Request) {
	h.handleAdminPaymentActionByProviderReference(w, r, h.service.ReverseAdminPaymentTransactionByProviderReference)
}

func (h *Handlers) ChargebackAdminPaymentTransaction(w http.ResponseWriter, r *http.Request) {
	h.handleAdminPaymentAction(w, r, h.service.ChargebackAdminPaymentTransaction)
}

func (h *Handlers) ChargebackAdminPaymentTransactionByProviderReference(w http.ResponseWriter, r *http.Request) {
	h.handleAdminPaymentActionByProviderReference(w, r, h.service.ChargebackAdminPaymentTransactionByProviderReference)
}

func (h *Handlers) RetryAdminPaymentTransaction(w http.ResponseWriter, r *http.Request) {
	h.handleAdminPaymentAction(w, r, h.service.RetryAdminPaymentTransaction)
}

func (h *Handlers) RetryAdminPaymentTransactionByProviderReference(w http.ResponseWriter, r *http.Request) {
	h.handleAdminPaymentActionByProviderReference(w, r, h.service.RetryAdminPaymentTransactionByProviderReference)
}

func (h *Handlers) ApproveAdminPaymentTransaction(w http.ResponseWriter, r *http.Request) {
	h.handleAdminPaymentAction(w, r, h.service.ApproveAdminPaymentTransaction)
}

func (h *Handlers) ApproveAdminPaymentTransactionByProviderReference(w http.ResponseWriter, r *http.Request) {
	h.handleAdminPaymentActionByProviderReference(w, r, h.service.ApproveAdminPaymentTransactionByProviderReference)
}

func (h *Handlers) DeclineAdminPaymentTransaction(w http.ResponseWriter, r *http.Request) {
	h.handleAdminPaymentAction(w, r, h.service.DeclineAdminPaymentTransaction)
}

func (h *Handlers) DeclineAdminPaymentTransactionByProviderReference(w http.ResponseWriter, r *http.Request) {
	h.handleAdminPaymentActionByProviderReference(w, r, h.service.DeclineAdminPaymentTransactionByProviderReference)
}

func (h *Handlers) SettleAdminPaymentTransaction(w http.ResponseWriter, r *http.Request) {
	h.handleAdminPaymentAction(w, r, h.service.SettleAdminPaymentTransaction)
}

func (h *Handlers) SettleAdminPaymentTransactionByProviderReference(w http.ResponseWriter, r *http.Request) {
	h.handleAdminPaymentActionByProviderReference(w, r, h.service.SettleAdminPaymentTransactionByProviderReference)
}

func (h *Handlers) UpdateAdminPaymentTransactionStatus(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.PaymentTransactionStatusUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.UpdateAdminPaymentTransactionStatus(r.Context(), actor, chi.URLParam(r, "transactionID"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) UpdateAdminPaymentTransactionStatusByProviderReference(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.PaymentTransactionStatusUpdateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.UpdateAdminPaymentTransactionStatusByProviderReference(r.Context(), actor, chi.URLParam(r, "providerReference"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ReconcileAdminPaymentTransaction(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.AdminPaymentReconciliationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.ReconcileAdminPaymentTransaction(r.Context(), actor, &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) PreviewAdminPaymentReconciliation(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.AdminPaymentReconciliationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.PreviewAdminPaymentReconciliation(r.Context(), actor, &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ListTransactions(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	page, limit, txType, product, startDate, endDate := parseWalletTransactionQuery(r)
	response, err := h.service.ListTransactions(r.Context(), actor, chi.URLParam(r, "userID"), txType, product, page, limit, startDate, endDate)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ListAdminUserTransactions(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	page, limit, txType, product, startDate, endDate := parseWalletTransactionQuery(r)
	response, err := h.service.ListAdminUserTransactions(r.Context(), actor, chi.URLParam(r, "userID"), txType, product, page, limit, startDate, endDate)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) ApplyReferralReward(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.ApplyReferralRewardRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.ApplyReferralReward(r.Context(), actor, chi.URLParam(r, "userID"), req.ReferralCode)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, response)
}

func (h *Handlers) ReserveFunds(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.ReserveFundsRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.ReserveFunds(r.Context(), actor, chi.URLParam(r, "userID"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, response)
}

func (h *Handlers) ReleaseReservedFunds(w http.ResponseWriter, r *http.Request) {
	actor := middleware.GetAuthClaims(r)
	var req models.ReleaseReserveRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := h.service.ReleaseReservedFunds(r.Context(), actor, chi.URLParam(r, "userID"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusCreated, response)
}

func (h *Handlers) writeServiceError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, service.ErrForbidden):
		_ = middleware.WriteError(w, http.StatusForbidden, "forbidden")
	case errors.Is(err, repository.ErrNotFound):
		_ = middleware.WriteError(w, http.StatusNotFound, "resource not found")
	default:
		h.logger.Error("wallet request failed", slog.Any("error", err))
		_ = middleware.WriteError(w, http.StatusBadRequest, err.Error())
	}
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

func parseWalletTransactionQuery(r *http.Request) (page, limit int, txType, product string, startDate, endDate *time.Time) {
	page = intFromQuery(r, "page", intFromQuery(r, "pagination.currentPage", 1))
	limit = intFromQuery(r, "limit", intFromQuery(r, "pagination.itemsPerPage", 20))
	txType = firstQueryValue(r, "type", "filters.category")
	product = firstQueryValue(r, "product", "filters.product")
	startDate = parseRFC3339Query(r, "start_date", "filters.since")
	endDate = parseRFC3339Query(r, "end_date", "filters.until")
	return
}

func firstQueryValue(r *http.Request, keys ...string) string {
	for _, key := range keys {
		if value := r.URL.Query().Get(key); value != "" {
			return value
		}
	}
	return ""
}

func parseRFC3339Query(r *http.Request, keys ...string) *time.Time {
	for _, key := range keys {
		if value := r.URL.Query().Get(key); value != "" {
			if parsed, err := time.Parse(time.RFC3339, value); err == nil {
				return &parsed
			}
		}
	}
	return nil
}

func (h *Handlers) createLegacyTypedWithdrawal(w http.ResponseWriter, r *http.Request, withdrawalType string) {
	actor := middleware.GetAuthClaims(r)
	var req models.WithdrawalRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.BankAccountID == "" {
		req.BankAccountID = withdrawalType
	}
	response, err := h.service.CreateWithdrawal(r.Context(), actor, actor.UserID, &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusAccepted, response)
}

func (h *Handlers) handleAdminPaymentAction(
	w http.ResponseWriter,
	r *http.Request,
	action func(context.Context, models.AuthClaims, string, *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error),
) {
	actor := middleware.GetAuthClaims(r)
	var req models.PaymentTransactionActionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && !errors.Is(err, io.EOF) {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := action(r.Context(), actor, chi.URLParam(r, "transactionID"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func (h *Handlers) handleAdminPaymentActionByProviderReference(
	w http.ResponseWriter,
	r *http.Request,
	action func(context.Context, models.AuthClaims, string, *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error),
) {
	actor := middleware.GetAuthClaims(r)
	var req models.PaymentTransactionActionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil && !errors.Is(err, io.EOF) {
		_ = middleware.WriteError(w, http.StatusBadRequest, "invalid request body")
		return
	}
	response, err := action(r.Context(), actor, chi.URLParam(r, "providerReference"), &req)
	if err != nil {
		h.writeServiceError(w, err)
		return
	}
	_ = middleware.WriteJSON(w, http.StatusOK, response)
}

func writeXML(w http.ResponseWriter, statusCode int, data any) {
	w.Header().Set("Content-Type", "application/xml")
	w.WriteHeader(statusCode)
	_, _ = w.Write([]byte(xml.Header))
	_ = xml.NewEncoder(w).Encode(data)
}

func writeCSV(w http.ResponseWriter, fileName string, body []byte) {
	w.Header().Set("Content-Type", "text/csv; charset=utf-8")
	w.Header().Set("Content-Disposition", "attachment; filename=\""+fileName+"\"")
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(body)
}
