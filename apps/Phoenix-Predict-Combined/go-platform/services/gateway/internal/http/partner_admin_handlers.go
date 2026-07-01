package http

import (
	"context"
	"encoding/json"
	"log/slog"
	stdhttp "net/http"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/gateway/internal/rbac"
	"phoenix-revival/platform/transport/httpx"
)

// partnerKeyDefaultTTLDays bounds operator-issued partner keys when the caller
// doesn't specify an expiry. Same 90-day default as the self-serve path.
const partnerKeyDefaultTTLDays = 90

// partnerKeyStore is the narrow slice of prediction.Repository the partner-admin
// routes need — kept small so the handler is unit-testable with a fake.
// *prediction.SQLRepository (the wired repo) satisfies it.
type partnerKeyStore interface {
	CreateAPIKey(ctx context.Context, k *prediction.APIKey) error
	ListAPIKeys(ctx context.Context, userID string) ([]prediction.APIKey, error)
}

// registerPartnerAdminRoutes exposes operator-issued partner API keys (P3-02).
//
// Unlike the player self-serve POST /api/v1/bot/keys (which a logged-in user
// runs for their OWN account, gated by BOT_KEYS_SELF_SERVE), this lets a
// back-office operator issue a key FOR a partner — any target userId — gated by
// the granular RBAC permission partners:write (migration 038). That is the
// "onboard a partner without code changes" path: an operator with the
// permission provisions keys through the admin API / office, no deploy needed.
// Listing a partner's keys requires partners:read. The full secret is returned
// once, on creation, and never stored or shown again.
func registerPartnerAdminRoutes(mux *stdhttp.ServeMux, rbacSvc *rbac.Service, repo partnerKeyStore) {
	mux.Handle("/api/v1/admin/partner-keys", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		switch r.Method {
		case stdhttp.MethodPost:
			if err := requireRBACPermission(r, rbacSvc, "partners:write"); err != nil {
				return err
			}
			var req struct {
				UserID        string   `json:"userId"`
				Name          string   `json:"name"`
				Scopes        []string `json:"scopes"`
				ExpiresInDays int      `json:"expiresInDays"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			req.UserID = strings.TrimSpace(req.UserID)
			req.Name = strings.TrimSpace(req.Name)
			if req.UserID == "" {
				return httpx.BadRequest("userId is required (the partner the key is issued for)", map[string]any{"field": "userId"})
			}
			if req.Name == "" {
				return httpx.BadRequest("name is required", map[string]any{"field": "name"})
			}
			if err := validateLaunchFacingReason("name", req.Name); err != nil {
				return err
			}
			// Default to read-only; an operator must explicitly opt a partner
			// into trade, and no launch key issuance path can mint wildcard scopes.
			scopes, err := normalizeBotKeyScopes(req.Scopes)
			if err != nil {
				return err
			}

			fullKey, prefix, hash, err := prediction.GenerateAPIKey()
			if err != nil {
				return httpx.Internal("failed to generate API key", err)
			}
			ttlDays := req.ExpiresInDays
			if ttlDays <= 0 {
				ttlDays = partnerKeyDefaultTTLDays
			}
			expiresAt := time.Now().UTC().Add(time.Duration(ttlDays) * 24 * time.Hour)
			key := &prediction.APIKey{
				UserID:    req.UserID,
				Name:      req.Name,
				KeyHash:   hash,
				KeyPrefix: prefix,
				Scopes:    scopes,
				Active:    true,
				ExpiresAt: &expiresAt,
			}
			if err := repo.CreateAPIKey(r.Context(), key); err != nil {
				return httpx.Internal("failed to create API key", err)
			}

			// Audit the issuance (append-only, migration 036) — who issued a key
			// for which partner, with what scopes.
			recordProviderOpsAuditAction(rbacActor(r), "partner.key.issued", req.UserID, map[string]any{
				"keyId":  key.ID,
				"prefix": key.KeyPrefix,
				"scopes": key.Scopes,
			})
			slog.Info("partner API key issued", "actor", rbacActor(r), "partner_user_id", req.UserID, "key_id", key.ID)

			return httpx.WriteJSON(w, stdhttp.StatusCreated, map[string]any{
				"id":        key.ID,
				"userId":    key.UserID,
				"name":      key.Name,
				"prefix":    key.KeyPrefix,
				"scopes":    key.Scopes,
				"expiresAt": key.ExpiresAt,
				"key":       fullKey,
				"note":      "Save this key — it will not be shown again",
			})

		case stdhttp.MethodGet:
			if err := requireRBACPermission(r, rbacSvc, "partners:read"); err != nil {
				return err
			}
			userID := strings.TrimSpace(r.URL.Query().Get("userId"))
			if userID == "" {
				return httpx.BadRequest("userId query parameter is required", map[string]any{"field": "userId"})
			}
			keys, err := repo.ListAPIKeys(r.Context(), userID)
			if err != nil {
				return httpx.Internal("failed to list API keys", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"userId": userID, "keys": apiKeyPayloads(keys)})

		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}
	}))

	slog.Info("partner admin API routes registered (issue/list partner keys; partners:write/read)")
}
