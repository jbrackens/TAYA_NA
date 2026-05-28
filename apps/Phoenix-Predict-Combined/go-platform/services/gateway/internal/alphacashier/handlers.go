package alphacashier

import (
	"encoding/json"
	"errors"
	stdhttp "net/http"
	"strings"

	"phoenix-revival/gateway/internal/wallet"
	"phoenix-revival/platform/transport/httpx"
)

func RegisterRoutes(mux *stdhttp.ServeMux, svc *Service) {
	mux.Handle("/api/v1/cashier/alpha/config", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		cfg := svc.Config()
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"alphaCashier": cfg})
	}))

	mux.Handle("/api/v1/cashier/alpha/wallet/challenge", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		userID := httpx.UserIDFromContext(r.Context())
		if userID == "" {
			return httpx.Forbidden("authentication required")
		}
		var body struct {
			WalletAddress string `json:"walletAddress"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}
		challenge, err := svc.CreateWalletChallenge(r.Context(), userID, body.WalletAddress)
		if err != nil {
			return mapAlphaError(err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusCreated, map[string]any{"challenge": challenge})
	}))

	mux.Handle("/api/v1/cashier/alpha/wallet/connect", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		userID := httpx.UserIDFromContext(r.Context())
		if userID == "" {
			return httpx.Forbidden("authentication required")
		}
		var body struct {
			Nonce     string `json:"nonce"`
			Signature string `json:"signature"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}
		conn, err := svc.ConnectWallet(r.Context(), userID, body.Nonce, body.Signature)
		if err != nil {
			return mapAlphaError(err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"wallet": conn})
	}))

	mux.Handle("/api/v1/cashier/alpha/wallets", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		userID := httpx.UserIDFromContext(r.Context())
		if userID == "" {
			return httpx.Forbidden("authentication required")
		}
		wallets, err := svc.ListWalletConnections(r.Context(), userID)
		if err != nil {
			return mapAlphaError(err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"wallets": wallets})
	}))

	mux.Handle("/api/v1/cashier/alpha/deposit-intents", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		userID := httpx.UserIDFromContext(r.Context())
		if userID == "" {
			return httpx.Forbidden("authentication required")
		}
		switch r.Method {
		case stdhttp.MethodGet:
			intents, err := svc.ListDepositIntents(r.Context(), userID)
			if err != nil {
				return mapAlphaError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"depositIntents": intents})
		case stdhttp.MethodPost:
			idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
			var body struct {
				WalletAddress string `json:"walletAddress"`
				AmountCents   int64  `json:"amountCents"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
			}
			intent, err := svc.CreateDepositIntent(r.Context(), userID, body.WalletAddress, body.AmountCents, idempotencyKey)
			if err != nil {
				return mapAlphaError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusCreated, map[string]any{"depositIntent": intent})
		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}
	}))

	mux.Handle("/api/v1/cashier/alpha/deposit-intents/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		userID := httpx.UserIDFromContext(r.Context())
		if userID == "" {
			return httpx.Forbidden("authentication required")
		}
		rest := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/v1/cashier/alpha/deposit-intents/"), "/")
		if rest == "" {
			return httpx.NotFound("deposit intent not found")
		}
		parts := strings.Split(rest, "/")
		id := parts[0]
		if len(parts) == 1 {
			if r.Method != stdhttp.MethodGet {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
			}
			intent, err := svc.GetDepositIntent(r.Context(), userID, id)
			if err != nil {
				return mapAlphaError(err)
			}
			if intent == nil {
				return httpx.NotFound("deposit intent not found")
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"depositIntent": intent})
		}
		if len(parts) == 2 && parts[1] == "submit-tx" {
			if r.Method != stdhttp.MethodPost {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
			}
			if strings.TrimSpace(r.Header.Get("Idempotency-Key")) == "" {
				return httpx.BadRequest("Idempotency-Key header is required", map[string]any{"field": "Idempotency-Key"})
			}
			var body struct {
				TxHash string `json:"txHash"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
			}
			intent, err := svc.SubmitDepositTx(r.Context(), userID, id, body.TxHash)
			if err != nil {
				if errors.Is(err, ErrTxConfirming) || errors.Is(err, ErrTxNotFound) {
					return httpx.WriteJSON(w, stdhttp.StatusAccepted, map[string]any{"status": "confirming"})
				}
				return mapAlphaError(err)
			}
			if intent == nil {
				return httpx.NotFound("deposit intent not found")
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"depositIntent": intent})
		}
		return httpx.NotFound("deposit intent not found")
	}))

	mux.Handle("/api/v1/cashier/alpha/withdrawal-requests", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		userID := httpx.UserIDFromContext(r.Context())
		if userID == "" {
			return httpx.Forbidden("authentication required")
		}
		switch r.Method {
		case stdhttp.MethodGet:
			requests, err := svc.ListWithdrawalRequests(r.Context(), userID)
			if err != nil {
				return mapAlphaError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"withdrawalRequests": requests})
		case stdhttp.MethodPost:
			idempotencyKey := strings.TrimSpace(r.Header.Get("Idempotency-Key"))
			var body struct {
				DestinationAddress string `json:"destinationAddress"`
				AmountCents        int64  `json:"amountCents"`
			}
			if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
				return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
			}
			req, err := svc.CreateWithdrawalRequest(r.Context(), userID, body.DestinationAddress, body.AmountCents, idempotencyKey)
			if err != nil {
				return mapAlphaError(err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusCreated, map[string]any{"withdrawalRequest": req})
		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}
	}))

	mux.Handle("/api/v1/cashier/alpha/withdrawal-requests/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		userID := httpx.UserIDFromContext(r.Context())
		if userID == "" {
			return httpx.Forbidden("authentication required")
		}
		id := strings.Trim(strings.TrimPrefix(r.URL.Path, "/api/v1/cashier/alpha/withdrawal-requests/"), "/")
		if id == "" || strings.Contains(id, "/") {
			return httpx.NotFound("withdrawal request not found")
		}
		req, err := svc.GetWithdrawalRequest(r.Context(), userID, id)
		if err != nil {
			return mapAlphaError(err)
		}
		if req == nil {
			return httpx.NotFound("withdrawal request not found")
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"withdrawalRequest": req})
	}))
}

func mapAlphaError(err error) error {
	switch {
	case errors.Is(err, ErrDisabled):
		return httpx.Forbidden("alpha cashier is disabled")
	case errors.Is(err, ErrWithdrawalsDisabled):
		return httpx.Forbidden("alpha withdrawals are disabled")
	case errors.Is(err, ErrInvalidAddress):
		return httpx.BadRequest("walletAddress must be a valid EVM address", map[string]any{"field": "walletAddress"})
	case errors.Is(err, ErrInvalidAmount):
		return httpx.BadRequest("amount is outside alpha cashier limits", map[string]any{"field": "amountCents"})
	case errors.Is(err, ErrInvalidIdempotencyKey):
		return httpx.BadRequest("Idempotency-Key header is required", map[string]any{"field": "Idempotency-Key"})
	case errors.Is(err, ErrChallengeNotFound), errors.Is(err, ErrWalletNotConnected):
		return httpx.NotFound("wallet connection not found")
	case errors.Is(err, ErrChallengeExpired):
		return httpx.BadRequest("wallet challenge expired", map[string]any{"field": "nonce"})
	case errors.Is(err, ErrChallengeConsumed):
		return httpx.Conflict("wallet challenge already consumed", nil)
	case errors.Is(err, ErrSignatureInvalid):
		return httpx.Forbidden("wallet signature invalid")
	case errors.Is(err, ErrTxVerificationMissing):
		return httpx.Internal("transaction verifier unavailable", err)
	case errors.Is(err, ErrWalletLedgerMissing):
		return httpx.Internal("wallet ledger unavailable", err)
	case errors.Is(err, ErrTxHashInvalid):
		return httpx.BadRequest("txHash must be a valid EVM transaction hash for this intent", map[string]any{"field": "txHash"})
	case errors.Is(err, ErrTxFailed):
		return httpx.BadRequest("transaction failed on-chain", map[string]any{"field": "txHash"})
	case errors.Is(err, ErrTransferMismatch):
		return httpx.BadRequest("transaction does not match deposit intent", map[string]any{"field": "txHash"})
	case errors.Is(err, ErrDepositExpired):
		return httpx.BadRequest("deposit intent expired", nil)
	case errors.Is(err, ErrWithdrawalNotFound):
		return httpx.NotFound("withdrawal request not found")
	case errors.Is(err, ErrInvalidStatus):
		return httpx.Conflict("withdrawal request is not in a valid status for this action", nil)
	case errors.Is(err, ErrReviewNoteRequired):
		return httpx.BadRequest("review note is required", map[string]any{"field": "reviewNote"})
	case errors.Is(err, wallet.ErrInsufficientFunds):
		return httpx.BadRequest("insufficient wallet balance", map[string]any{"field": "amountCents"})
	default:
		return httpx.Internal("alpha cashier operation failed", err)
	}
}
