package http

import (
	"context"
	"encoding/json"
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
	// GAP-99: reads a market's current price so the handler can compute
	// per-position unrealized (mark-to-market) P/L. *prediction.Service already
	// exports GetMarket — a call, not a protected-core edit.
	GetMarket(ctx context.Context, id string) (*prediction.Market, error)
}

// positionWithMark re-encodes a position through its own MarshalJSON (preserving
// the exact points-cents wire shape the office consumes) into a map so the
// handler can add the GAP-99 mark + unrealized fields without duplicating the
// marshaling logic.
func positionWithMark(p prediction.Position) (map[string]any, error) {
	b, err := json.Marshal(p)
	if err != nil {
		return nil, err
	}
	var m map[string]any
	if err := json.Unmarshal(b, &m); err != nil {
		return nil, err
	}
	return m, nil
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
		// GAP-99 (§16 / Scenario 9): enrich each position with the current mark
		// and per-position unrealized (mark-to-market) P/L. unrealized =
		// (currentSidePrice - avgPrice) * quantity, in points-cents (may be
		// negative). The mark is the market's current price for the position's
		// side. A market that can't be read (e.g. deleted) leaves mark 0 and
		// unrealized 0 rather than failing the whole read.
		data := make([]map[string]any, 0, len(positions))
		for _, p := range positions {
			row, mErr := positionWithMark(p)
			if mErr != nil {
				return httpx.Internal("failed to encode position", mErr)
			}
			mark := 0
			var unrealized int64 = 0
			if mk, gErr := svc.GetMarket(r.Context(), p.MarketID); gErr == nil && mk != nil {
				if p.Side == prediction.OrderSideNo {
					mark = mk.NoPriceCents
				} else {
					mark = mk.YesPriceCents
				}
				unrealized = int64(mark-p.AvgPriceCents) * int64(p.Quantity)
			}
			row["currentPricePointsCents"] = mark
			row["unrealizedPointsCents"] = unrealized
			data = append(data, row)
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"data": data})
	}
}
