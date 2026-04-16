package payments

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	stdhttp "net/http"
	"os"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/compliance"
	"phoenix-revival/platform/transport/httpx"
)

// DepositComplianceChecker is an optional interface for deposit limit checks.
// If set, deposits are validated against responsible gaming limits before processing.
var DepositComplianceChecker compliance.ResponsibleGamblingService

// RegisterPaymentRoutes registers all payment-related HTTP handlers
func RegisterPaymentRoutes(mux *stdhttp.ServeMux, service PaymentService) {
	mux.Handle("/api/v1/payments/deposit", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		var req InitiateDepositRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}

		if req.UserID == "" {
			return httpx.BadRequest("userId is required", map[string]any{"field": "userId"})
		}
		if req.Amount <= 0 {
			return httpx.BadRequest("amountCents must be greater than zero", map[string]any{"field": "amountCents"})
		}
		if req.PaymentMethod == "" {
			return httpx.BadRequest("paymentMethod is required", map[string]any{"field": "paymentMethod"})
		}

		// Check deposit limits before processing
		if DepositComplianceChecker != nil {
			ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
			defer cancel()
			allowed, reason, err := DepositComplianceChecker.CheckDepositAllowed(ctx, req.UserID, req.Amount)
			if err != nil {
				env := strings.ToLower(strings.TrimSpace(os.Getenv("ENVIRONMENT")))
				if env == "production" || env == "staging" {
					slog.Error("deposit compliance check failed", "user_id", req.UserID, "env", env, "error", err)
					return httpx.Forbidden("deposit compliance check unavailable")
				}
				slog.Warn("deposit compliance check failed, allowing deposit in dev mode", "user_id", req.UserID, "error", err)
			} else if !allowed {
				return httpx.Forbidden("deposit not allowed: " + reason)
			}
		}

		result, err := service.InitiateDeposit(r.Context(), req.UserID, req.Amount, req.PaymentMethod)
		if err != nil {
			return mapPaymentError(err)
		}

		// Record deposit for limit tracking
		if DepositComplianceChecker != nil {
			ctx2, cancel2 := context.WithTimeout(r.Context(), 2*time.Second)
			defer cancel2()
			if err := DepositComplianceChecker.RecordDeposit(ctx2, req.UserID, req.Amount); err != nil {
				slog.Warn("failed to record deposit for compliance tracking", "user_id", req.UserID, "error", err)
			}
		}

		return httpx.WriteJSON(w, stdhttp.StatusCreated, map[string]any{
			"transaction": result,
		})
	}))

	mux.Handle("/api/v1/payments/withdraw", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		var req InitiateWithdrawalRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}

		if req.UserID == "" {
			return httpx.BadRequest("userId is required", map[string]any{"field": "userId"})
		}
		if req.Amount <= 0 {
			return httpx.BadRequest("amountCents must be greater than zero", map[string]any{"field": "amountCents"})
		}
		if req.PaymentMethod == "" {
			return httpx.BadRequest("paymentMethod is required", map[string]any{"field": "paymentMethod"})
		}

		result, err := service.InitiateWithdrawal(r.Context(), req.UserID, req.Amount, req.PaymentMethod)
		if err != nil {
			return mapPaymentError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusCreated, map[string]any{
			"transaction": result,
		})
	}))

	mux.Handle("/api/v1/payments/methods", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		userID := r.URL.Query().Get("userId")
		if userID == "" {
			return httpx.BadRequest("userId query parameter is required", map[string]any{"field": "userId"})
		}

		methods, err := service.GetPaymentMethods(r.Context(), userID)
		if err != nil {
			return mapPaymentError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"userId":  userID,
			"methods": methods,
			"total":   len(methods),
		})
	}))

	mux.Handle("/api/v1/payments/status", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		txnID := r.URL.Query().Get("transactionId")
		if txnID == "" {
			return httpx.BadRequest("transactionId query parameter is required", map[string]any{"field": "transactionId"})
		}

		status, err := service.GetTransactionStatus(r.Context(), txnID)
		if err != nil {
			return mapPaymentError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"transaction": status,
		})
	}))

	mux.Handle("/api/v1/payments/webhook", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		var payload WebhookPayload
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}

		if err := service.HandleWebhook(r.Context(), payload); err != nil {
			return mapPaymentError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"transactionId": payload.TransactionID,
			"status":        "processed",
		})
	}))
}

func mapPaymentError(err error) error {
	if errors.Is(err, ErrInvalidUserID) {
		return httpx.BadRequest("invalid user id", map[string]any{"field": "userId"})
	}
	if errors.Is(err, ErrInvalidAmount) {
		return httpx.BadRequest("invalid amount", map[string]any{"field": "amountCents"})
	}
	if errors.Is(err, ErrInvalidPaymentMethod) {
		return httpx.BadRequest("invalid payment method", map[string]any{"field": "paymentMethod"})
	}
	if errors.Is(err, ErrTransactionNotFound) {
		return httpx.NotFound("transaction not found")
	}
	if errors.Is(err, ErrInsufficientFunds) {
		return httpx.Forbidden("insufficient funds for withdrawal")
	}
	if errors.Is(err, ErrWithdrawalFailed) {
		return httpx.Internal("withdrawal failed", err)
	}
	if errors.Is(err, ErrDepositFailed) {
		return httpx.Internal("deposit failed", err)
	}
	return httpx.Internal("payment operation failed", err)
}
