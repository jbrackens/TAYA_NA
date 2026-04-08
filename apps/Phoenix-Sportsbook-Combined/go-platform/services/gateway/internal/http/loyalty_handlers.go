package http

import (
	"encoding/json"
	"errors"
	stdhttp "net/http"
	"strconv"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/loyalty"
	canonicalv1 "phoenix-revival/platform/canonical/v1"
	"phoenix-revival/platform/transport/httpx"
)

type loyaltyAdjustmentRequest struct {
	PlayerID       string `json:"playerId"`
	PointsDelta    int64  `json:"pointsDelta"`
	IdempotencyKey string `json:"idempotencyKey"`
	Reason         string `json:"reason"`
	CreatedBy      string `json:"createdBy,omitempty"`
	EntrySubtype   string `json:"entrySubtype,omitempty"`
}

type loyaltyReferralRequest struct {
	ReferrerPlayerID string `json:"referrerPlayerId"`
	ReferredPlayerID string `json:"referredPlayerId"`
}

func registerLoyaltyRoutes(mux *stdhttp.ServeMux, service *loyalty.Service) {
	if service == nil {
		return
	}

	listPath := "/api/v1/loyalty"
	mux.Handle(listPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.URL.Path != listPath {
			return httpx.NotFound("loyalty account not found")
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		playerID := strings.TrimSpace(r.URL.Query().Get("userId"))
		if playerID == "" {
			playerID = strings.TrimSpace(r.URL.Query().Get("playerId"))
		}
		if playerID == "" {
			return httpx.BadRequest("userId is required", map[string]any{"field": "userId"})
		}

		account, ok := service.GetAccount(playerID)
		if !ok {
			return httpx.NotFound("loyalty account not found")
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, account)
	}))

	mux.Handle("/api/v1/loyalty/ledger", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		playerID := strings.TrimSpace(r.URL.Query().Get("userId"))
		if playerID == "" {
			playerID = strings.TrimSpace(r.URL.Query().Get("playerId"))
		}
		if playerID == "" {
			return httpx.BadRequest("userId is required", map[string]any{"field": "userId"})
		}

		limit := 50
		if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
			parsed, err := strconv.Atoi(raw)
			if err != nil || parsed <= 0 {
				return httpx.BadRequest("limit must be a positive integer", map[string]any{"field": "limit", "value": raw})
			}
			limit = parsed
		}

		if _, ok := service.GetAccount(playerID); !ok {
			return httpx.NotFound("loyalty account not found")
		}

		items := service.Ledger(playerID, limit)
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"playerId": playerID,
			"items":    items,
			"total":    len(items),
		})
	}))

	mux.Handle("/api/v1/loyalty/tiers", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		items := service.ListTiers()
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"items":      items,
			"totalCount": len(items),
		})
	}))

	mux.Handle("/api/v1/referrals", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}

		playerID := strings.TrimSpace(r.URL.Query().Get("userId"))
		if playerID == "" {
			playerID = strings.TrimSpace(r.URL.Query().Get("playerId"))
		}
		if playerID == "" {
			return httpx.BadRequest("userId is required", map[string]any{"field": "userId"})
		}

		items := service.ListReferralsByReferrer(playerID)
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"playerId": playerID,
			"items":    items,
			"total":    len(items),
		})
	}))

	adminListPath := "/api/v1/admin/loyalty/accounts"
	mux.Handle(adminListPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}

		accounts := service.ListAccounts(loyalty.AccountFilter{
			PlayerID: strings.TrimSpace(r.URL.Query().Get("playerId")),
			TierCode: strings.TrimSpace(r.URL.Query().Get("tierCode")),
			Search:   strings.TrimSpace(r.URL.Query().Get("search")),
		})
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"items":      accounts,
			"totalCount": len(accounts),
		})
	}))

	adminDetailPrefix := "/api/v1/admin/loyalty/accounts/"
	mux.Handle(adminDetailPrefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}

		playerID := strings.TrimSpace(strings.TrimPrefix(r.URL.Path, adminDetailPrefix))
		if playerID == "" {
			return httpx.NotFound("loyalty account not found")
		}
		account, ok := service.GetAccount(playerID)
		if !ok {
			return httpx.NotFound("loyalty account not found")
		}

		limit := 20
		if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
			parsed, err := strconv.Atoi(raw)
			if err != nil || parsed <= 0 {
				return httpx.BadRequest("limit must be a positive integer", map[string]any{"field": "limit", "value": raw})
			}
			limit = parsed
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"account": account,
			"ledger":  service.Ledger(playerID, limit),
			"tiers":   service.ListTiers(),
		})
	}))

	mux.Handle("/api/v1/admin/loyalty/adjustments", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}

		var request loyaltyAdjustmentRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}

		entry, account, err := service.Adjust(loyalty.AdjustmentRequest{
			PlayerID:       strings.TrimSpace(request.PlayerID),
			PointsDelta:    request.PointsDelta,
			IdempotencyKey: strings.TrimSpace(request.IdempotencyKey),
			Reason:         strings.TrimSpace(request.Reason),
			CreatedBy:      strings.TrimSpace(request.CreatedBy),
			EntrySubtype:   strings.TrimSpace(request.EntrySubtype),
		})
		if err != nil {
			return mapLoyaltyError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"entry":   toLoyaltyLedgerEntryResponse(entry),
			"account": toLoyaltyAccountResponse(account),
		})
	}))

	mux.Handle("/api/v1/admin/loyalty/referrals", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}

		var request loyaltyReferralRequest
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			return httpx.BadRequest("invalid JSON payload", map[string]any{"field": "body"})
		}

		referral, err := service.RegisterReferral(loyalty.ReferralCreateRequest{
			ReferrerPlayerID: strings.TrimSpace(request.ReferrerPlayerID),
			ReferredPlayerID: strings.TrimSpace(request.ReferredPlayerID),
		})
		if err != nil {
			return mapLoyaltyError(err)
		}

		return httpx.WriteJSON(w, stdhttp.StatusOK, referral)
	}))
}

func toLoyaltyAccountResponse(account canonicalv1.LoyaltyAccount) canonicalv1.LoyaltyAccount {
	out := account
	if account.CurrentTierAssignedAt != nil {
		t := account.CurrentTierAssignedAt.UTC().Truncate(time.Second)
		out.CurrentTierAssignedAt = &t
	}
	if account.LastAccrualAt != nil {
		t := account.LastAccrualAt.UTC().Truncate(time.Second)
		out.LastAccrualAt = &t
	}
	out.CreatedAt = account.CreatedAt.UTC().Truncate(time.Second)
	out.UpdatedAt = account.UpdatedAt.UTC().Truncate(time.Second)
	return out
}

func toLoyaltyLedgerEntryResponse(entry canonicalv1.LoyaltyLedgerEntry) canonicalv1.LoyaltyLedgerEntry {
	out := entry
	out.CreatedAt = entry.CreatedAt.UTC().Truncate(time.Second)
	return out
}

func mapLoyaltyError(err error) error {
	switch {
	case errors.Is(err, loyalty.ErrInvalidRequest):
		return httpx.BadRequest("invalid loyalty request", nil)
	case errors.Is(err, loyalty.ErrAccountNotFound):
		return httpx.NotFound("loyalty account not found")
	case errors.Is(err, loyalty.ErrAdjustmentConflict), errors.Is(err, loyalty.ErrAccrualConflict):
		return httpx.Conflict("loyalty idempotency conflict", nil)
	case errors.Is(err, loyalty.ErrReferralConflict):
		return httpx.Conflict("referral already belongs to a different referrer", nil)
	default:
		return httpx.Internal("loyalty operation failed", err)
	}
}
