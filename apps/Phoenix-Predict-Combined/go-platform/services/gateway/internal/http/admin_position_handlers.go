package http

import (
	"context"
	stdhttp "net/http"
	"strings"

	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/platform/transport/httpx"
)

// GAP-89 (PAM spec §16 Prediction Market Operations / §10 Player Trading &
// Positions): operators need to VIEW any player's open positions and exposure
// from the console (Profile-360), alongside their orders (GAP-21). This adds the
// read-only operator surface WITHOUT touching the protected prediction core: the
// existing exported Service.ListPositions(ctx, userID) is already
// user-parameterized — the self-scoping to the caller happens only at the
// player handler layer (prediction_handlers.go passes the session user), so a
// new admin handler can pass an arbitrary target user id. markets:read gated,
// consistent with the admin orders list; read-only, so no audit / no ledger.

// adminPositionService is the prediction capability this route consumes.
// *prediction.Service satisfies it.
type adminPositionService interface {
	ListPositions(ctx context.Context, userID string) ([]prediction.Position, error)
}

func registerAdminPositionRoutes(mux *stdhttp.ServeMux, svc adminPositionService) {
	list := adminPositionsListHandler(svc)
	for _, base := range []string{"/api/v1/admin/positions", "/admin/positions"} {
		mux.Handle(base, httpx.Handle(list))
	}
}

// adminPositionsListHandler: GET /api/v1/admin/positions?userId= — lists a
// player's current positions (markets:read). userId is required; the view is
// scoped to the QUERIED customer, never the calling admin.
func adminPositionsListHandler(svc adminPositionService) func(stdhttp.ResponseWriter, *stdhttp.Request) error {
	return func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "markets:read"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		userID := strings.TrimSpace(r.URL.Query().Get("userId"))
		if userID == "" {
			return httpx.BadRequest("userId is required", nil)
		}
		positions, err := svc.ListPositions(r.Context(), userID)
		if err != nil {
			return httpx.Internal("failed to list positions", err)
		}
		if positions == nil {
			positions = []prediction.Position{}
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"data": positions})
	}
}
