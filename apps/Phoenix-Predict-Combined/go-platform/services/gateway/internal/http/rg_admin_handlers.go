package http

import (
	"context"
	"log/slog"
	stdhttp "net/http"
	"strings"

	"phoenix-revival/gateway/internal/compliance"
	"phoenix-revival/platform/transport/httpx"
)

// rgAdminReader is the narrow slice of the responsible-gambling service the
// back-office read needs; *compliance.PostgresResponsibleGamblingService and
// the fail-closed/mock services all satisfy it.
type rgAdminReader interface {
	GetPlayerRestrictions(ctx context.Context, userID string) (*compliance.PlayerRestrictions, error)
}

// registerRGAdminRoutes wires the back-office read of a punter's
// responsible-gambling state for the Profile-360 Limits/self-exclusion tab:
//
//	GET /api/v1/admin/rg/restrictions?userId=  -> limits, cool-off, self-exclusion  (compliance:read)
//
// This is a distinct path from the /api/v1/admin/punters/ subtree (a prefix
// handler owned by the prediction admin routes). The user-facing RG routes at
// /api/v1/compliance/rg/* are session-bound (a user sees only their own
// state); this is the admin cross-user read, RBAC-gated instead.
func registerRGAdminRoutes(mux *stdhttp.ServeMux, rg rgAdminReader) {
	mux.Handle("/api/v1/admin/rg/restrictions", httpx.Handle(func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "compliance:read"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		userID := strings.TrimSpace(r.URL.Query().Get("userId"))
		if userID == "" {
			return httpx.BadRequest("userId is required", map[string]any{"field": "userId"})
		}
		restrictions, err := rg.GetPlayerRestrictions(r.Context(), userID)
		if err != nil {
			return serviceBadRequestError(err, nil)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"restrictions": restrictions,
		})
	}))
	slog.Info("admin responsible-gambling read route registered")
}
