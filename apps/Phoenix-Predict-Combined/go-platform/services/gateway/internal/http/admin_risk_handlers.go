package http

import (
	"log/slog"
	stdhttp "net/http"

	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/platform/transport/httpx"
)

// registerPredictionRiskRoutes wires the prediction-native operator risk
// dashboard data source (replaces the sportsbook /risk-management subtree):
//
//	GET /api/v1/admin/prediction/risk -> RiskSnapshot
//
// Admin-only. Read-only aggregates over the prediction tables — settlement
// aging, cost-basis concentration, and platform money invariants. Registered
// only when the SQL repository is live (the snapshot is DB-backed).
func registerPredictionRiskRoutes(mux *stdhttp.ServeMux, repo *prediction.SQLRepository) {
	mux.Handle("/api/v1/admin/prediction/risk", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminRole(r); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		snapshot, err := repo.RiskSnapshot(r.Context())
		if err != nil {
			return httpx.Internal("failed to compute risk snapshot", err)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, snapshot)
	}))
	slog.Info("prediction: admin risk dashboard route registered")
}
