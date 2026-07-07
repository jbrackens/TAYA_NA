package http

import (
	"context"
	stdhttp "net/http"

	"taptrade/gateway/internal/wallet"
	"taptrade/platform/transport/httpx"
)

// registerReportsRoutes wires the four aggregate endpoints the office /reports
// page fetches (alongside /admin/leaderboards, handled elsewhere). Legacy promo
// metrics have no prediction-domain equivalent, so the promotion usage report
// returns honest point-campaign zeros rather than fabricated activity.
//
//	GET /api/v1/admin/wallet/reconciliation  → real ledger aggregate
//	GET /api/v1/admin/promotions/usage       → zeros (point campaign placeholder)
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
			return pointWalletReconciliationReport(r.Context(), walletSvc)
		})

		// Point-campaign usage has no active aggregate yet. Return honest zeros
		// without preserving sportsbook promo metric names.
		get(base+"/promotions/usage", func(_ *stdhttp.Request) (any, error) {
			return map[string]any{
				"summary": map[string]any{
					"unit":                  "PTS",
					"pointRewardCampaigns":  0,
					"usersWithPointRewards": 0,
					"totalRewardPoints":     0,
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

type walletReconciliationReport struct {
	From              string `json:"from,omitempty"`
	To                string `json:"to,omitempty"`
	TotalCreditPoints int64  `json:"totalCreditPoints"`
	TotalDebitPoints  int64  `json:"totalDebitPoints"`
	NetMovementPoints int64  `json:"netMovementPoints"`
	EntryCount        int64  `json:"entryCount"`
	DistinctUserCount int64  `json:"distinctUserCount"`
	Unit              string `json:"unit"`
}

func pointWalletReconciliationReport(ctx context.Context, walletSvc *wallet.Service) (walletReconciliationReport, error) {
	if walletSvc == nil {
		return walletReconciliationReport{Unit: "PTS"}, nil
	}
	summary, err := walletSvc.ReconciliationSummary(ctx, nil, nil)
	if err != nil {
		return walletReconciliationReport{}, err
	}
	return walletReconciliationReport{
		From:              summary.From,
		To:                summary.To,
		TotalCreditPoints: summary.TotalCredits,
		TotalDebitPoints:  summary.TotalDebits,
		NetMovementPoints: summary.NetMovement,
		EntryCount:        summary.EntryCount,
		DistinctUserCount: summary.DistinctUserIDs,
		Unit:              "PTS",
	}, nil
}
