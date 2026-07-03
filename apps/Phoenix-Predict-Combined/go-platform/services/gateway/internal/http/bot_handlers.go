package http

import (
	"encoding/json"
	"log/slog"
	stdhttp "net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/compliance"
	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/platform/transport/httpx"
)

// botKeySelfServeEnabled gates player self-issuance of bot API keys. In
// production/staging it requires the explicit opt-in BOT_KEYS_SELF_SERVE=true
// (partner keys should be operator-issued — audit SEC-02/G); elsewhere it
// stays on so local dev and the demo box keep working out of the box.
func botKeySelfServeEnabled() bool {
	if v := strings.TrimSpace(os.Getenv("BOT_KEYS_SELF_SERVE")); v != "" {
		return v == "true" || v == "1"
	}
	env := strings.ToLower(strings.TrimSpace(os.Getenv("ENVIRONMENT")))
	// GAP-69: default-off in ANY deployed env (dev-allowlist), so a non-canonical
	// value like "prod"/"preprod" does not leave self-serve bot-key issuance on.
	return !compliance.IsDeployedEnvironment(env)
}

func normalizeBotKeyScopes(scopes []string) ([]string, error) {
	if len(scopes) == 0 {
		return []string{"read"}, nil
	}
	out := make([]string, 0, len(scopes))
	seen := map[string]struct{}{}
	for _, raw := range scopes {
		scope := strings.ToLower(strings.TrimSpace(raw))
		switch scope {
		case "read", "trade":
			if _, ok := seen[scope]; ok {
				continue
			}
			seen[scope] = struct{}{}
			out = append(out, scope)
		default:
			return nil, httpx.BadRequest("scope must be \"read\" or \"trade\"", map[string]any{"field": "scopes", "got": raw})
		}
	}
	if len(out) == 0 {
		return nil, httpx.BadRequest("scope must be \"read\" or \"trade\"", map[string]any{"field": "scopes"})
	}
	return out, nil
}

func apiKeyPayloads(keys []prediction.APIKey) []prediction.APIKey {
	if keys == nil {
		return nil
	}
	out := make([]prediction.APIKey, 0, len(keys))
	for _, key := range keys {
		key.Name = redactLaunchProhibitedUserText(key.Name)
		out = append(out, key)
	}
	return out
}

// defaultBotKeyTTL bounds self-issued keys; previously keys never expired.
const defaultBotKeyTTL = 90 * 24 * time.Hour

// botRateLimitPerMin / botRateLimitBurst configure the per-API-key token bucket
// for the bot/partner API (audit G: partner rate limits / SEC-02). Defaults are
// generous for legitimate automated trading; the cap throttles a single key's
// abuse or retry storms. Overridable via BOT_RATE_LIMIT_PER_MIN / _BURST.
//
// NOTE: this bucket is in-process, so it is authoritative per gateway instance —
// correct for the single-instance demo. A multi-replica deployment should move
// it to a shared Redis token bucket (the same primitive the auth service uses)
// so the limit is global; that is the P3-02 productization step, tracked
// separately. The per-key semantics + 429/Retry-After contract here are
// identical either way.
func botRateLimitPerMin() int {
	if v := strings.TrimSpace(os.Getenv("BOT_RATE_LIMIT_PER_MIN")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return 600
}

func botRateLimitBurst() int {
	if v := strings.TrimSpace(os.Getenv("BOT_RATE_LIMIT_BURST")); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 {
			return n
		}
	}
	return 120
}

// botRateLimitMiddleware throttles requests per authenticated API key. The key
// id comes from X-Bot-Key-ID, which botAuth.Wrap sets after authentication, so
// this is only meaningful chained INSIDE Wrap. A 429 + Retry-After is returned
// when the key's token bucket is empty; a request with no key id is passed
// through (auth already rejected unauthenticated callers upstream).
func botRateLimitMiddleware(limiter *userRateLimiter, next stdhttp.Handler) stdhttp.Handler {
	return stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
		if keyID := r.Header.Get("X-Bot-Key-ID"); keyID != "" && !limiter.Allow(keyID) {
			w.Header().Set("Retry-After", "1")
			stdhttp.Error(w, `{"error":{"code":"rate_limited","message":"API key rate limit exceeded; slow down"}}`, stdhttp.StatusTooManyRequests)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func registerBotRoutes(mux *stdhttp.ServeMux, svc *prediction.Service, repo prediction.Repository, notifier marketUpdateBroadcaster) {
	botAuth := prediction.NewBotAuthMiddleware(repo)

	// Per-API-key rate limiting (P3-02). botAuth.Wrap sets X-Bot-Key-ID after it
	// authenticates the key, so this MUST wrap the inner handler INSIDE Wrap —
	// botAuth.Wrap(botRateLimited(h), scope) — to see the key id. Keyed on the
	// stable key ID, not the user, so one partner's key can't exhaust another's.
	botLimiter := newUserRateLimiter(botRateLimitPerMin(), botRateLimitBurst())
	botRateLimited := func(next stdhttp.Handler) stdhttp.Handler {
		return botRateLimitMiddleware(botLimiter, next)
	}

	// Bot: Issue API key — cookie-auth route (player creates their own bot key)
	mux.Handle("/api/v1/bot/keys", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		userID := userIDFromRequest(r)
		if userID == "" {
			return httpx.Unauthorized("authentication required")
		}

		switch r.Method {
		case stdhttp.MethodGet:
			keys, err := repo.ListAPIKeys(r.Context(), userID)
			if err != nil {
				return httpx.Internal("failed to list API keys", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, apiKeyPayloads(keys))

		case stdhttp.MethodPost:
			if !botKeySelfServeEnabled() {
				return httpx.Forbidden("self-serve API key creation is disabled; contact the operator")
			}
			var req struct {
				Name   string   `json:"name"`
				Scopes []string `json:"scopes"`
			}
			if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
				return httpx.BadRequest("invalid request body", nil)
			}
			req.Name = strings.TrimSpace(req.Name)
			if req.Name == "" {
				return httpx.BadRequest("name is required", nil)
			}
			if err := validateLaunchFacingReason("name", req.Name); err != nil {
				return err
			}
			scopes, err := normalizeBotKeyScopes(req.Scopes)
			if err != nil {
				return err
			}

			fullKey, prefix, hash, err := prediction.GenerateAPIKey()
			if err != nil {
				return httpx.Internal("failed to generate API key", err)
			}

			expiresAt := time.Now().UTC().Add(defaultBotKeyTTL)
			key := &prediction.APIKey{
				UserID:    userID,
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

			// Return the full key only on creation — never stored, never shown again
			return httpx.WriteJSON(w, stdhttp.StatusCreated, map[string]interface{}{
				"id":     key.ID,
				"name":   key.Name,
				"prefix": key.KeyPrefix,
				"scopes": key.Scopes,
				"key":    fullKey,
				"note":   "Save this key — it will not be shown again",
			})

		default:
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet, stdhttp.MethodPost)
		}
	}))

	// Bot: Revoke API key — cookie-auth route, owner-scoped. Repo-level
	// DeactivateAPIKey existed since migration 019 but was never exposed
	// over HTTP, so leaked keys could not be revoked (audit SEC-02).
	mux.Handle("/api/v1/bot/keys/", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodDelete {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodDelete)
		}
		userID := userIDFromRequest(r)
		if userID == "" {
			return httpx.Unauthorized("authentication required")
		}
		keyID := strings.TrimSuffix(strings.TrimPrefix(r.URL.Path, "/api/v1/bot/keys/"), "/")
		if keyID == "" {
			return httpx.BadRequest("key id required", nil)
		}
		keys, err := repo.ListAPIKeys(r.Context(), userID)
		if err != nil {
			return httpx.Internal("failed to list API keys", err)
		}
		owns := false
		for _, k := range keys {
			if k.ID == keyID {
				owns = true
				break
			}
		}
		if !owns {
			// Same response for foreign and unknown ids — no existence oracle.
			return httpx.NotFound("API key not found")
		}
		if err := repo.DeactivateAPIKey(r.Context(), keyID); err != nil {
			return httpx.Internal("failed to revoke API key", err)
		}
		slog.Info("bot API key revoked", "user_id", userID, "key_id", keyID)
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]string{"status": "revoked"})
	}))

	// Bot: Place order (API key auth, requires 'trade' scope)
	mux.Handle("/api/v1/bot/orders",
		botAuth.Wrap(botRateLimited(stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
			if r.Method != stdhttp.MethodPost {
				stdhttp.Error(w, `{"error":{"code":"method_not_allowed"}}`, stdhttp.StatusMethodNotAllowed)
				return
			}

			userID := r.Header.Get("X-User-ID")

			// Jurisdiction + KYC gates apply to the bot surface exactly as
			// to the session order route — an API key is not a compliance
			// bypass (audit SEC-02). Same fail-closed semantics.
			if cerr := checkComplianceGates(r, userID, compliance.SurfaceTrade); cerr != nil {
				httpx.WriteError(w, r, cerr)
				return
			}

			req, err := decodePlaceOrderHTTPRequest(r.Body)
			if err != nil {
				httpx.WriteError(w, r, err)
				return
			}
			if err := validatePlaceOrderHTTPRequest(req); err != nil {
				httpx.WriteError(w, r, err)
				return
			}

			// Per-market jurisdiction overlay (P3-07): once the global gate has
			// passed, a market may further restrict by country. Fail closed if
			// the policy lookup errors.
			jpolicy, jerr := svc.GetMarketJurisdictionPolicy(r.Context(), req.MarketID)
			if jerr != nil {
				slog.Error("bot order: jurisdiction policy lookup failed", "market_id", req.MarketID, "error", jerr)
				httpx.WriteError(w, r, httpx.Forbidden("jurisdiction check unavailable"))
				return
			}
			if cerr := checkMarketJurisdiction(r, userID, req.MarketID, jpolicy); cerr != nil {
				httpx.WriteError(w, r, cerr)
				return
			}

			// GAP-20: per-market tag eligibility (same gate as the session order
			// route) — the bot API is not a compliance bypass.
			if eerr := checkMarketEligibility(r, userID, req.MarketID); eerr != nil {
				httpx.WriteError(w, r, eerr)
				return
			}

			order, trade, err := svc.PlaceOrder(r.Context(), req, userID)
			if err != nil {
				httpx.WriteError(w, r, orderPlacementError(err))
				return
			}

			// Broadcast post-trade market state on `market:<id>`. Bots
			// move prices same as users; subscribers (frontend, other
			// bots) need the update either way. Fire-and-forget.
			if notifier != nil {
				if updated, err := svc.GetMarket(r.Context(), req.MarketID); err == nil {
					notifier.NotifyPredictionMarketUpdate(req.MarketID, buildMarketUpdatePayload(updated))
				}
			}

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(stdhttp.StatusCreated)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"order": order,
				"trade": trade,
			})
		})), "trade"))

	// Bot: Get positions (API key auth, requires 'read' scope)
	mux.Handle("/api/v1/bot/positions",
		botAuth.Wrap(botRateLimited(stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
			if r.Method != stdhttp.MethodGet {
				stdhttp.Error(w, `{"error":{"code":"method_not_allowed"}}`, stdhttp.StatusMethodNotAllowed)
				return
			}

			userID := r.Header.Get("X-User-ID")
			positions, err := svc.ListPositions(r.Context(), userID)
			if err != nil {
				stdhttp.Error(w, `{"error":{"code":"internal","message":"failed to list positions"}}`, stdhttp.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(positions)
		})), "read"))

	// Bot: Get markets (API key auth, requires 'read' scope)
	mux.Handle("/api/v1/bot/markets",
		botAuth.Wrap(botRateLimited(stdhttp.HandlerFunc(func(w stdhttp.ResponseWriter, r *stdhttp.Request) {
			if r.Method != stdhttp.MethodGet {
				stdhttp.Error(w, `{"error":{"code":"method_not_allowed"}}`, stdhttp.StatusMethodNotAllowed)
				return
			}

			filter := prediction.MarketFilter{
				Page:     intQueryParam(r, "page", 1),
				PageSize: clampedQueryParam(r, "pageSize", 50, 200),
			}
			if status := r.URL.Query().Get("status"); status != "" {
				s := prediction.MarketStatus(status)
				filter.Status = &s
			}

			markets, total, err := svc.ListMarkets(r.Context(), filter)
			if err != nil {
				stdhttp.Error(w, `{"error":{"code":"internal","message":"failed to list markets"}}`, stdhttp.StatusInternalServerError)
				return
			}

			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"data": markets,
				"meta": prediction.PageMeta{
					Page:     filter.Page,
					PageSize: filter.PageSize,
					Total:    total,
					HasNext:  filter.Page*filter.PageSize < total,
				},
			})
		})), "read"))

	slog.Info("bot API routes registered")
}
