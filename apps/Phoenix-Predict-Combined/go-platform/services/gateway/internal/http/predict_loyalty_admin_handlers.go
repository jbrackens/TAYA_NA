package http

import (
	"encoding/json"
	stdhttp "net/http"
	"strconv"
	"strings"

	"phoenix-revival/gateway/internal/loyalty"
	"phoenix-revival/platform/transport/httpx"
)

// registerPredictLoyaltyAdminRoutes wires the office loyalty admin pages to the
// Predict-native loyalty service:
//
//	GET  /api/v1/admin/loyalty/accounts?search=&tierCode=&page=&pageSize=  (list)
//	GET  /api/v1/admin/loyalty/accounts/{playerId}?limit=                  (detail + ledger + tiers)
//	POST /api/v1/admin/loyalty/adjustments                                 (manual points adjust)
//	GET  /api/v1/admin/loyalty/config                                      (DB-backed tier config)
//	PUT  /api/v1/admin/loyalty/tiers/{tierCode}                            (edit one tier)
//
// The sportsbook equivalents in loyalty_handlers.go's registerLoyaltyRoutes are
// only wired in the no-DB fallback branch (handlers.go), so on a real (DB)
// deployment these were 404. Mirrors the GW-1 prediction-native pattern.
//
// Tier config is DB-backed as of migration 021_loyalty_tier_config.sql: the
// GET serves the persisted tier table and the PUT edits a tier in place so the
// office /loyalty/settings save control is no longer inert. The `rules` array
// stays empty (the Predict points formula has no DB-backed accrual-rule model —
// it's the hardcoded loyalty/tiers.go formula); the accrual-rule editor on the
// settings page remains a no-op surface.
func registerPredictLoyaltyAdminRoutes(mux *stdhttp.ServeMux, service *loyalty.PredictService) {
	if service == nil {
		return
	}
	for _, base := range []string{"/api/v1/admin/loyalty", "/admin/loyalty"} {
		registerLoyaltyAdminAccounts(mux, base, service)
		registerLoyaltyAdminAdjustments(mux, base, service)
		registerLoyaltyAdminConfig(mux, base, service)
		registerLoyaltyAdminTiers(mux, base, service)
	}
}

func registerLoyaltyAdminAccounts(mux *stdhttp.ServeMux, base string, service *loyalty.PredictService) {
	listPath := base + "/accounts"
	detailPrefix := listPath + "/"

	// Exact /accounts → list.
	mux.Handle(listPath, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}
		page, pageSize := parseAdminPaging(r)
		items, total, err := service.ListAdminAccounts(
			r.Context(),
			strings.TrimSpace(r.URL.Query().Get("search")),
			strings.TrimSpace(r.URL.Query().Get("tierCode")),
			page, pageSize,
		)
		if err != nil {
			return httpx.Internal("failed to list loyalty accounts", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"items": items,
			"pagination": map[string]any{
				"page":     page,
				"pageSize": pageSize,
				"total":    total,
				"hasNext":  (page-1)*pageSize+len(items) < total,
			},
		})
	}))

	// /accounts/{playerId} → detail.
	mux.Handle(detailPrefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}
		playerID := strings.Trim(strings.TrimPrefix(r.URL.Path, detailPrefix), "/")
		if playerID == "" || strings.Contains(playerID, "/") {
			return httpx.NotFound("loyalty account not found")
		}
		limit := 20
		if v := strings.TrimSpace(r.URL.Query().Get("limit")); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n > 0 {
				limit = n
			}
		}
		account, ledger, err := service.AdminAccountDetail(r.Context(), playerID, limit)
		if err != nil {
			return httpx.Internal("failed to load loyalty account", err)
		}
		if account == nil {
			return httpx.NotFound("loyalty account not found")
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"account": account,
			"ledger":  loyaltyLedgerPayload(ledger),
			"tiers":   service.AdminTiers(),
		})
	}))
}

func registerLoyaltyAdminAdjustments(mux *stdhttp.ServeMux, base string, service *loyalty.PredictService) {
	mux.Handle(base+"/adjustments", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		if err := requireAdminPermission(r, "finances:write"); err != nil {
			return err
		}
		var body struct {
			PlayerID       string `json:"playerId"`
			PointsDelta    int64  `json:"pointsDelta"`
			Reason         string `json:"reason"`
			IdempotencyKey string `json:"idempotencyKey"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			return httpx.BadRequest("invalid request body", nil)
		}
		if strings.TrimSpace(body.PlayerID) == "" {
			return httpx.BadRequest("playerId is required", map[string]any{"field": "playerId"})
		}
		if body.PointsDelta == 0 {
			return httpx.BadRequest("pointsDelta must be non-zero", map[string]any{"field": "pointsDelta"})
		}
		if strings.TrimSpace(body.Reason) == "" {
			return httpx.BadRequest("reason is required for auditability", map[string]any{"field": "reason"})
		}
		result, err := service.Adjust(r.Context(), loyalty.PredictAdjustment{
			UserID:         body.PlayerID,
			DeltaPoints:    body.PointsDelta,
			Reason:         body.Reason,
			IdempotencyKey: body.IdempotencyKey,
			EventType:      "adjustment",
		})
		if err != nil {
			return httpx.BadRequest(err.Error(), nil)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"pointsBalance": result.Account.PointsBalance,
			"idempotent":    result.Idempotent,
		})
	}))
}

func registerLoyaltyAdminConfig(mux *stdhttp.ServeMux, base string, service *loyalty.PredictService) {
	mux.Handle(base+"/config", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}
		// DB-backed tier config (migration 021). Falls back to the tiers.go
		// constants when the table is empty. `rules` is empty (no DB-backed
		// accrual-rule model — the points formula is hardcoded in
		// loyalty/tiers.go) and referralBonusPoints is 0.
		tiers, err := service.EditableTiers(r.Context())
		if err != nil {
			return httpx.Internal("failed to load loyalty config", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"tiers":               tiers,
			"rules":               []any{},
			"referralBonusPoints": 0,
		})
	}))
}

// registerLoyaltyAdminTiers wires the per-tier editor:
//
//	PUT /admin/loyalty/tiers/{tierCode}   (body = office LoyaltyTier shape)
//
// On success it returns { "tiers": [...] } — the full updated tier list — which
// is what the office saveTier reads (data.tiers). Mirrors the GW-1
// UpdatePunterStatus handler's "mutate then return refreshed view" shape.
func registerLoyaltyAdminTiers(mux *stdhttp.ServeMux, base string, service *loyalty.PredictService) {
	prefix := base + "/tiers/"
	mux.Handle(prefix, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodPut {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPut)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}
		tierCode := strings.Trim(strings.TrimPrefix(r.URL.Path, prefix), "/")
		if tierCode == "" || strings.Contains(tierCode, "/") {
			return httpx.NotFound("tier not found")
		}

		var body loyalty.EditableTier
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			return httpx.BadRequest("invalid request body", nil)
		}
		if strings.TrimSpace(body.DisplayName) == "" {
			return httpx.BadRequest("displayName is required", map[string]any{"field": "displayName"})
		}
		if body.MinLifetimePoints < 0 {
			return httpx.BadRequest("minLifetimePoints must be non-negative", map[string]any{"field": "minLifetimePoints"})
		}
		if body.MinRolling30dPoints < 0 {
			return httpx.BadRequest("minRolling30dPoints must be non-negative", map[string]any{"field": "minRolling30dPoints"})
		}

		tiers, err := service.UpdateTier(r.Context(), tierCode, body)
		switch {
		case err == loyalty.ErrTierConfigNotFound:
			return httpx.NotFound("unknown tier code: " + tierCode)
		case err == loyalty.ErrTierConfigUnsupported:
			return httpx.NewError(stdhttp.StatusNotImplemented, "not_implemented",
				"loyalty tier config is not editable on this deployment", nil, nil)
		case err != nil:
			return httpx.Internal("failed to update tier", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"tiers": tiers,
		})
	}))
}

// loyaltyLedgerPayload maps internal ledger entries to the office's
// LoyaltyLedgerEntry shape.
func loyaltyLedgerPayload(entries []loyalty.PredictLedgerEntry) []map[string]any {
	out := make([]map[string]any, 0, len(entries))
	for _, e := range entries {
		sourceType := "manual"
		sourceID := ""
		if e.MarketID != nil && *e.MarketID != "" {
			sourceType = "market"
			sourceID = *e.MarketID
		} else if e.TradeID != nil && *e.TradeID != "" {
			sourceType = "trade"
			sourceID = *e.TradeID
		}
		out = append(out, map[string]any{
			"entryId":      strconv.FormatInt(e.ID, 10),
			"entryType":    e.EventType,
			"sourceType":   sourceType,
			"sourceId":     sourceID,
			"pointsDelta":  e.DeltaPoints,
			"balanceAfter": e.BalanceAfter,
			"createdAt":    e.CreatedAt.UTC().Format("2006-01-02T15:04:05Z07:00"),
			"metadata":     map[string]string{"reason": e.Reason},
		})
	}
	return out
}
