package http

import (
	"encoding/json"
	"errors"
	stdhttp "net/http"
	"os"
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
	// Money movement happens through the in-process WalletAdapter used by the
	// order and settlement paths; admin balance adjustments go through the
	// admin-gated /api/v1/admin/wallet/{credit,debit} routes. There is
	// deliberately no public credit/debit endpoint — a session alone must
	// never be able to move funds.
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

		// Enforce auth context: players can only access their own wallet. Deny on
		// an empty session identity rather than skipping the check (fail closed,
		// not open — SECURITY-REVIEW #14).
		authUserID := httpx.UserIDFromContext(r.Context())
		if authUserID == "" {
			return httpx.Unauthorized("authentication required")
		}
		if userID != authUserID && httpx.RoleFromContext(r.Context()) != "admin" {
			return httpx.Forbidden("cannot access another user's wallet")
		}

		if len(parts) == 2 && parts[1] == "breakdown" {
			breakdown := service.BalanceWithBreakdown(r.Context(), userID)
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"realMoneyCents": breakdown.RealMoneyCents,
				"bonusFundCents": breakdown.BonusFundCents,
				"totalCents":     breakdown.TotalCents,
				"currency":       "USD",
			})
		}

		if len(parts) == 2 && parts[1] == "ledger" {
			limit := 50
			if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
				parsed, err := strconv.Atoi(raw)
				if err != nil || parsed <= 0 {
					return httpx.BadRequest("limit must be a positive integer", map[string]any{"field": "limit", "value": raw})
				}
				// Ceiling: the ledger is the busiest append-only table and the
				// query is unindexed before migration 032; an unclamped limit
				// is the worst per-request scan a logged-in user can trigger
				// (audit PERF-01).
				if parsed > 500 {
					parsed = 500
				}
				limit = parsed
			}

			entries := service.Ledger(r.Context(), userID, limit)
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"userId": userID,
				"items":  entries,
				"total":  len(entries),
			})
		}

		if len(parts) == 1 {
			balance := service.Balance(r.Context(), userID)
			// Available = balance - held reservations. A pending
			// withdrawal places a hold, not a raw-balance debit, so
			// returning only balanceCents made withdrawals invisible to
			// the client and the BAL pill never moved (F-3).
			// AvailableBalance already exists on the service; expose it
			// plus the reserved delta. balanceCents kept for back-compat.
			available := service.AvailableBalance(r.Context(), userID)
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"userId":         userID,
				"balanceCents":   balance,
				"availableCents": available,
				"reservedCents":  balance - available,
			})
		}

		return httpx.NotFound("wallet resource not found")
	}))

	// Play-money starter grant (faucet). OFF by default — active only when
	// STARTER_GRANT_CENTS > 0, which a real-value deployment leaves at 0. This
	// is the one deliberate, bounded exception to "a session never moves funds"
	// above: it credits ONLY the session user, the amount is operator-configured
	// (not user-supplied), and it is idempotent (one grant per user via the key
	// starter_grant:<uid>). It makes a freshly-registered player immediately
	// tradeable on a play-money beta. A real-money deploy MUST keep
	// STARTER_GRANT_CENTS=0 (the default), where this endpoint never credits.
	mux.Handle("/api/v1/wallet/starter-grant", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		userID := httpx.UserIDFromContext(r.Context())
		if userID == "" {
			return httpx.Forbidden("authentication required")
		}
		grant := starterGrantCents()
		if grant <= 0 {
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
				"enabled":      false,
				"balanceCents": service.Balance(r.Context(), userID),
			})
		}
		_, err := service.Credit(r.Context(), wallet.MutationRequest{
			UserID:         userID,
			AmountCents:    grant,
			IdempotencyKey: "starter_grant:" + userID,
			Reason:         "play-money starter grant",
		})
		// An idempotency conflict means the user already claimed their grant
		// (same key, since-changed amount). That is success, not an error —
		// they keep their original grant.
		if err != nil && !errors.Is(err, wallet.ErrIdempotencyConflict) {
			return mapWalletError(err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"enabled":      true,
			"grantCents":   grant,
			"balanceCents": service.Balance(r.Context(), userID),
		})
	}))
}

// starterGrantCents reads the play-money starter-grant amount from the
// environment. 0 (the default, and any non-numeric/negative value) disables the
// faucet — which is the required posture for a real-value deployment.
func starterGrantCents() int64 {
	raw := strings.TrimSpace(os.Getenv("STARTER_GRANT_CENTS"))
	if raw == "" {
		return 0
	}
	n, err := strconv.ParseInt(raw, 10, 64)
	if err != nil || n < 0 {
		return 0
	}
	return n
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
