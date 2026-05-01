package http

import (
	"log/slog"
	stdhttp "net/http"

	"phoenix-revival/gateway/internal/risk"
	"phoenix-revival/platform/transport/httpx"
)

// registerRiskDashboardRoutes wires the prediction-platform operator
// risk dashboard. Single endpoint for now: GET /api/v1/admin/risk/dashboard.
//
// Auth: route is NOT in gatewayPublicPrefixes, so the Auth middleware
// requires a valid session. Per-role gating (admin only) is enforced via
// requireAdminRole — the role is derived from the auth-service session
// header injected by the Auth middleware.
//
// Partial-result semantics: the underlying service returns the dashboard
// payload even on a per-block query failure, so a single bad SQL doesn't
// hide all four metric blocks. The handler surfaces partial-failure
// errors via the X-Risk-Dashboard-Partial header so the UI can flag a
// degraded panel without losing the rest of the data.
func registerRiskDashboardRoutes(mux *stdhttp.ServeMux, svc *risk.Service) {
	if svc == nil {
		slog.Warn("risk dashboard: service nil; route not registered")
		return
	}
	mux.Handle("/api/v1/admin/risk/dashboard", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		if err := requireAdminRole(r); err != nil {
			return err
		}
		d, err := svc.Dashboard(r.Context())
		if err != nil {
			slog.Warn("risk dashboard: partial failure", "error", err)
			if d == nil {
				return httpx.Internal("risk dashboard query failed", err)
			}
			w.Header().Set("X-Risk-Dashboard-Partial", err.Error())
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, d)
	}))
	slog.Info("risk dashboard: route registered", "path", "/api/v1/admin/risk/dashboard")
}
