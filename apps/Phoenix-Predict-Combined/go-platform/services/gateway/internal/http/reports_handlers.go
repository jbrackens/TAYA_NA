package http

import (
	stdhttp "net/http"

	"phoenix-revival/gateway/internal/wallet"
	"phoenix-revival/platform/transport/httpx"
)

// registerReportsRoutes wires the four aggregate endpoints the office /reports
// page fetches (alongside /admin/leaderboards, handled elsewhere). The page was
// authored against the sportsbook backend and reads bets / freebet / odds-boost
// metrics that have no prediction-domain equivalent — those are reported as
// honest zeros rather than fabricated (CLAUDE.md rule #7). The wallet
// reconciliation summary IS real (aggregated from ledger_entries).
//
//	GET /api/v1/admin/wallet/reconciliation  → real ledger aggregate
//	GET /api/v1/admin/promotions/usage       → zeros (sportsbook promos N/A)
//	GET /api/v1/admin/feed-health            → minimal health (gateway up)
//	GET /api/v1/admin/config                 → minimal platform config
func registerReportsRoutes(mux *stdhttp.ServeMux, walletSvc *wallet.Service) {
	get := func(path string, fn func(*stdhttp.Request) (any, error)) {
		mux.Handle(path, httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
			if r.Method != stdhttp.MethodGet {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
			}
			if err := requireAdminRole(r); err != nil {
				return err
			}
			payload, err := fn(r)
			if err != nil {
				return httpx.Internal("failed to build report", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, payload)
		}))
	}

	for _, base := range []string{"/api/v1/admin", "/admin"} {
		get(base+"/wallet/reconciliation", func(r *stdhttp.Request) (any, error) {
			if walletSvc == nil {
				return map[string]any{"netMovementCents": 0, "entryCount": 0, "distinctUserCount": 0}, nil
			}
			summary, err := walletSvc.ReconciliationSummary(r.Context(), nil, nil)
			if err != nil {
				return nil, err
			}
			return summary, nil
		})

		// Sportsbook promo metrics (bets / freebet / odds-boost) don't exist in
		// the prediction domain — honest zeros so the page renders without
		// fabricating activity.
		get(base+"/promotions/usage", func(_ *stdhttp.Request) (any, error) {
			return map[string]any{
				"summary": map[string]any{
					"totalBets":        0,
					"uniqueUsers":      0,
					"totalStakeCents":  0,
					"betsWithFreebet":  0,
					"betsWithOddsBoost": 0,
				},
			}, nil
		})

		get(base+"/feed-health", func(_ *stdhttp.Request) (any, error) {
			// No per-feed health monitor is built yet; report gateway liveness
			// with an empty feed list rather than inventing per-feed status.
			return map[string]any{"status": "ok", "feeds": []any{}}, nil
		})

		get(base+"/config", func(_ *stdhttp.Request) (any, error) {
			return map[string]any{"platform": "prediction"}, nil
		})
	}
}
