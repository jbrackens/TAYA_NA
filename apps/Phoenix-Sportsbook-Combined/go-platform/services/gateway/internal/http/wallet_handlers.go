package http

import (
	"encoding/json"
	"errors"
	stdhttp "net/http"
	"strconv"
	"strings"

	"phoenix-revival/gateway/internal/wallet"
	"phoenix-revival/platform/transport/httpx"
)

type walletMutationRequest struct {
	UserID         string `json:"userId"`
	AmountCents    int64  `json:"amountCents"`
	IdempotencyKey string `json:"idempotencyKey"`
	Reason         string `json:"reason"`
}

func registerWalletRoutes(mux *stdhttp.ServeMux, service *wallet.Service) {
	mux.Handle("/api/v1/wallet/credit", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		request, err := decodeWalletMutationRequest(r)
		if err != nil {
			return err
		}

		entry, err := service.Credit(wallet.MutationRequest{
			UserID:         request.UserID,
			AmountCents:    request.AmountCents,
			IdempotencyKey: request.IdempotencyKey,
			Reason:         request.Reason,
		})
		if err != nil {
			return mapWalletError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"entry":        entry,
			"balanceCents": entry.BalanceCents,
		})
	}))

	mux.Handle("/api/v1/wallet/debit", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}

		request, err := decodeWalletMutationRequest(r)
		if err != nil {
			return err
		}

		entry, err := service.Debit(wallet.MutationRequest{
			UserID:         request.UserID,
			AmountCents:    request.AmountCents,
			IdempotencyKey: request.IdempotencyKey,
			Reason:         request.Reason,
		})
		if err != nil {
			return mapWalletError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"entry":        entry,
			"balanceCents": entry.BalanceCents,
		})
	}))

	mux.Handle("/api/v1/wallet/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		path := strings.TrimPrefix(r.URL.Path, "/api/v1/wallet/")
		if path == "" {
			return httpx.NotFound("wallet not found")
		}

		parts := strings.Split(path, "/")
		userID := parts[0]
		if userID == "" {
			return httpx.NotFound("wallet not found")
		}

		// Enforce auth context: players can only access their own wallet
		authUserID := httpx.UserIDFromContext(r.Context())
		if authUserID != "" && userID != authUserID && httpx.RoleFromContext(r.Context()) != "admin" {
			return httpx.Forbidden("cannot access another user's wallet")
		}

		if len(parts) == 2 && parts[1] == "breakdown" {
			breakdown := service.BalanceWithBreakdown(userID)
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"realMoneyCents":   breakdown.RealMoneyCents,
				"bonusFundCents":   breakdown.BonusFundCents,
				"totalCents":       breakdown.TotalCents,
				"currency":         "USD",
			})
		}

		if len(parts) == 2 && parts[1] == "ledger" {
			limit := 50
			if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
				parsed, err := strconv.Atoi(raw)
				if err != nil || parsed <= 0 {
					return httpx.BadRequest("limit must be a positive integer", map[string]any{"field": "limit", "value": raw})
				}
				limit = parsed
			}

			entries := service.Ledger(userID, limit)
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"userId": userID,
				"items":  entries,
				"total":  len(entries),
			})
		}

		if len(parts) == 1 {
			balance := service.Balance(userID)
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"userId":       userID,
				"balanceCents": balance,
			})
		}

		return httpx.NotFound("wallet resource not found")
	}))
}

func decodeWalletMutationRequest(r *stdhttp.Request) (walletMutationRequest, error) {
	var request walletMutationRequest
	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		return walletMutationRequest{}, httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
	}
	if request.UserID == "" {
		return walletMutationRequest{}, httpx.BadRequest("userId is required", map[string]any{"field": "userId"})
	}
	if request.AmountCents <= 0 {
		return walletMutationRequest{}, httpx.BadRequest("amountCents must be greater than zero", map[string]any{"field": "amountCents"})
	}
	if request.IdempotencyKey == "" {
		return walletMutationRequest{}, httpx.BadRequest("idempotencyKey is required", map[string]any{"field": "idempotencyKey"})
	}
	return request, nil
}

func mapWalletError(err error) error {
	if errors.Is(err, wallet.ErrInvalidMutationRequest) {
		return httpx.BadRequest("invalid wallet mutation request", nil)
	}
	if errors.Is(err, wallet.ErrIdempotencyConflict) {
		return httpx.Conflict("idempotency key conflict for this mutation request", nil)
	}
	if errors.Is(err, wallet.ErrInsufficientFunds) {
		return httpx.Forbidden("insufficient funds")
	}
	return httpx.Internal("wallet mutation failed", err)
}
