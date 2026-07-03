package http

import (
	"context"
	stdhttp "net/http"
	"strings"
	"time"

	"phoenix-revival/gateway/internal/wallet"
	"phoenix-revival/platform/transport/httpx"
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
		// Registered directly (not via get) so a malformed ?from=/?to= is a 400,
		// not the 500 the get wrapper turns every fn error into (GAP-72, §23).
		mux.Handle(base+"/wallet/reconciliation", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
			if r.Method != stdhttp.MethodGet {
				return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
			}
			if err := requireAdminRole(r); err != nil {
				return err
			}
			from, to, err := parseOptionalDateRange(r)
			if err != nil {
				return err
			}
			payload, err := pointWalletReconciliationReport(r.Context(), walletSvc, from, to)
			if err != nil {
				return httpx.Internal("failed to build report", err)
			}
			return httpx.WriteJSON(w, stdhttp.StatusOK, payload)
		}))

		// Point-campaign usage has no active aggregate yet. Return honest zeros
		// without preserving sportsbook promo metric names.
		get(base+"/promotions/usage", func(_ *stdhttp.Request) (any, error) {
			return map[string]any{
				"summary": map[string]any{
					"unit":                   "PTS",
					"pointRewardCampaigns":   0,
					"usersWithPointRewards":  0,
					"totalRewardPointsCents": 0,
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
	From                   string `json:"from,omitempty"`
	To                     string `json:"to,omitempty"`
	TotalCreditPointsCents int64  `json:"totalCreditPointsCents"`
	TotalDebitPointsCents  int64  `json:"totalDebitPointsCents"`
	NetMovementPointsCents int64  `json:"netMovementPointsCents"`
	EntryCount             int64  `json:"entryCount"`
	DistinctUserCount      int64  `json:"distinctUserCount"`
	Unit                   string `json:"unit"`
}

// parseOptionalDateRange reads optional ?from= & ?to= (YYYY-MM-DD) query params
// into an inclusive [from, to] window for wallet.ReconciliationSummary (which
// filters transaction_time >= from AND <= to). 'to' is expanded to the last
// instant of that day so the whole 'to' day is included — matching the
// inclusive-'to' semantics of the ledger CSV export and daily-balance report. A
// malformed date is a client error (400), never a silent full-range fallback.
func parseOptionalDateRange(r *stdhttp.Request) (*time.Time, *time.Time, error) {
	var from, to *time.Time
	if s := strings.TrimSpace(r.URL.Query().Get("from")); s != "" {
		t, err := time.Parse("2006-01-02", s)
		if err != nil {
			return nil, nil, httpx.BadRequest("invalid 'from' date; expected YYYY-MM-DD", nil)
		}
		from = &t
	}
	if s := strings.TrimSpace(r.URL.Query().Get("to")); s != "" {
		t, err := time.Parse("2006-01-02", s)
		if err != nil {
			return nil, nil, httpx.BadRequest("invalid 'to' date; expected YYYY-MM-DD", nil)
		}
		end := t.AddDate(0, 0, 1).Add(-time.Nanosecond)
		to = &end
	}
	return from, to, nil
}

func pointWalletReconciliationReport(ctx context.Context, walletSvc *wallet.Service, from, to *time.Time) (walletReconciliationReport, error) {
	if walletSvc == nil {
		return walletReconciliationReport{Unit: "PTS"}, nil
	}
	summary, err := walletSvc.ReconciliationSummary(ctx, from, to)
	if err != nil {
		return walletReconciliationReport{}, err
	}
	return walletReconciliationReport{
		From:                   summary.From,
		To:                     summary.To,
		TotalCreditPointsCents: summary.TotalCredits,
		TotalDebitPointsCents:  summary.TotalDebits,
		NetMovementPointsCents: summary.NetMovement,
		EntryCount:             summary.EntryCount,
		DistinctUserCount:      summary.DistinctUserIDs,
		Unit:                   "PTS",
	}, nil
}
