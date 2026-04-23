package http

import (
	stdhttp "net/http"
	"strconv"
	"strings"

	"phoenix-revival/gateway/internal/loyalty"
	"phoenix-revival/platform/transport/httpx"
)

// registerPredictLoyaltyRoutes wires the Predict-native loyalty HTTP surface.
// Routes replace the sportsbook handlers when a DB is available — see
// handlers.go wiring. Frontend shape lives in apps/.../api/loyalty-client.ts.
func registerPredictLoyaltyRoutes(mux *stdhttp.ServeMux, service *loyalty.PredictService) {
	if service == nil {
		return
	}

	accountPath := "/api/v1/loyalty"
	mux.Handle(accountPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.URL.Path != accountPath {
			return httpx.NotFound("loyalty account not found")
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		userID, err := resolveSelfUserID(r)
		if err != nil {
			return err
		}
		standing, err := service.Standing(r.Context(), userID)
		if err != nil {
			return httpx.Internal("loyalty standing lookup failed", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, predictStandingPayload(standing))
	}))

	// /standing is a convenience alias — same payload, distinct route so the
	// frontend can call it from surfaces where "/" feels ambiguous. See plan
	// Codex Finding 4.
	mux.Handle("/api/v1/loyalty/standing", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		userID, err := resolveSelfUserID(r)
		if err != nil {
			return err
		}
		standing, err := service.Standing(r.Context(), userID)
		if err != nil {
			return httpx.Internal("loyalty standing lookup failed", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, predictStandingPayload(standing))
	}))

	mux.Handle("/api/v1/loyalty/ledger", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		userID, err := resolveSelfUserID(r)
		if err != nil {
			return err
		}
		limit := 50
		if raw := strings.TrimSpace(r.URL.Query().Get("limit")); raw != "" {
			parsed, err := strconv.Atoi(raw)
			if err != nil || parsed <= 0 {
				return httpx.BadRequest("limit must be a positive integer", map[string]any{"field": "limit", "value": raw})
			}
			limit = parsed
		}
		entries, err := service.Ledger(r.Context(), userID, limit)
		if err != nil {
			return httpx.Internal("loyalty ledger lookup failed", err)
		}
		items := make([]map[string]any, 0, len(entries))
		for _, e := range entries {
			items = append(items, predictLedgerEntryPayload(e))
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"userId": userID,
			"items":  items,
			"total":  len(items),
		})
	}))

	// Tiers is a static table — public. Frontend caches it.
	mux.Handle("/api/v1/loyalty/tiers", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		tiers := service.Tiers()
		items := make([]map[string]any, 0, len(tiers))
		for _, t := range tiers {
			items = append(items, map[string]any{
				"tier":            int(t.Tier),
				"name":            t.Name,
				"pointsThreshold": t.PointsThreshold,
				"benefits":        t.Benefits,
			})
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"items":      items,
			"totalCount": len(items),
		})
	}))
}

// resolveSelfUserID enforces "session user only" on private loyalty endpoints
// per PLAN-loyalty-leaderboards.md §8 auth hardening. If a userId param is
// present it must match the session; otherwise the session user is used.
func resolveSelfUserID(r *stdhttp.Request) (string, error) {
	sessionID := strings.TrimSpace(userIDFromRequest(r))
	if sessionID == "" {
		return "", httpx.Unauthorized("authentication required")
	}
	claimed := strings.TrimSpace(r.URL.Query().Get("userId"))
	if claimed == "" {
		return sessionID, nil
	}
	if claimed != sessionID {
		return "", httpx.Forbidden("cannot access another user's loyalty data")
	}
	return sessionID, nil
}

func predictStandingPayload(s loyalty.PredictStanding) map[string]any {
	out := map[string]any{
		"userId":           s.UserID,
		"pointsBalance":    s.PointsBalance,
		"tier":             int(s.Tier),
		"tierName":         s.TierName,
		"nextTier":         int(s.NextTier),
		"nextTierName":     s.NextTierName,
		"pointsToNextTier": s.PointsToNextTier,
	}
	if s.LastActivity != nil {
		out["lastActivity"] = s.LastActivity.UTC()
	}
	return out
}

func predictLedgerEntryPayload(e loyalty.PredictLedgerEntry) map[string]any {
	out := map[string]any{
		"id":             e.ID,
		"userId":         e.UserID,
		"eventType":      e.EventType,
		"deltaPoints":    e.DeltaPoints,
		"balanceAfter":   e.BalanceAfter,
		"reason":         e.Reason,
		"idempotencyKey": e.IdempotencyKey,
		"createdAt":      e.CreatedAt.UTC(),
	}
	if e.MarketID != nil {
		out["marketId"] = *e.MarketID
	}
	if e.TradeID != nil {
		out["tradeId"] = *e.TradeID
	}
	return out
}
