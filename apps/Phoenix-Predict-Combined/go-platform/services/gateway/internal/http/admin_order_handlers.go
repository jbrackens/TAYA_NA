package http

import (
	"context"
	"database/sql"
	"errors"
	"log/slog"
	stdhttp "net/http"
	"strings"

	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/platform/transport/httpx"
)

// GAP-21 (PAM spec §16 Prediction Market Operations): operators need to VIEW any
// user's orders and CANCEL an order on a customer's behalf (e.g. to unwind a
// mispriced or stuck order), as an audited admin action. Only a player-scoped
// self-cancel existed (POST /api/v1/orders/{id}/cancel). These admin routes add
// the operator surface WITHOUT touching the protected prediction core: the
// cancel looks up the order's real owner and delegates to the existing
// Service.CancelOrder (which releases the wallet reservation in a tx), so the
// money path is unchanged — the route only adds RBAC + an append-only audit
// entry + the owner lookup.

// adminOrderService is the prediction capability these routes consume.
// *prediction.Service satisfies it.
type adminOrderService interface {
	ListOrders(ctx context.Context, filter prediction.OrderFilter) ([]prediction.Order, int, error)
	CancelOrder(ctx context.Context, orderID, userID string) error
}

// adminOrderReader resolves a single order so the cancel path can pass the
// order's real owner to CancelOrder. *prediction.SQLRepository satisfies it.
type adminOrderReader interface {
	GetOrder(ctx context.Context, id string) (*prediction.Order, error)
}

func registerAdminOrderRoutes(mux *stdhttp.ServeMux, svc adminOrderService, reader adminOrderReader) {
	list := adminOrdersListHandler(svc)
	cancel := adminOrderCancelHandler(svc, reader)
	for _, base := range []string{"/api/v1/admin/orders", "/admin/orders"} {
		mux.Handle(base, httpx.Handle(list))
		mux.Handle(base+"/", httpx.Handle(cancel))
	}
	slog.Info("prediction: admin order routes registered (view, cancel)")
}

// adminOrdersListHandler: GET /api/v1/admin/orders?userId=&marketId=&status=&page=&pageSize=
// Lists any user's orders (markets:read). userId scopes to one customer; omit it
// to page across everyone (still admin-gated).
func adminOrdersListHandler(svc adminOrderService) func(stdhttp.ResponseWriter, *stdhttp.Request) error {
	return func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "markets:read"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodGet {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodGet)
		}
		filter := prediction.OrderFilter{
			UserID:   strings.TrimSpace(r.URL.Query().Get("userId")),
			Page:     clampedQueryParam(r, "page", 1, 100000),
			PageSize: clampedQueryParam(r, "pageSize", 50, 200),
		}
		if mid := strings.TrimSpace(r.URL.Query().Get("marketId")); mid != "" {
			filter.MarketID = &mid
		}
		if status := strings.TrimSpace(r.URL.Query().Get("status")); status != "" {
			s := prediction.OrderStatus(status)
			filter.Status = &s
		}
		orders, total, err := svc.ListOrders(r.Context(), filter)
		if err != nil {
			return httpx.Internal("failed to list orders", err)
		}
		if orders == nil {
			orders = []prediction.Order{}
		}
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{
			"data": orders,
			"meta": prediction.PageMeta{
				Page: filter.Page, PageSize: filter.PageSize, Total: total,
				HasNext: filter.Page*filter.PageSize < total,
			},
		})
	}
}

// adminOrderCancelHandler: POST /api/v1/admin/orders/{id}/cancel (markets:edit).
func adminOrderCancelHandler(svc adminOrderService, reader adminOrderReader) func(stdhttp.ResponseWriter, *stdhttp.Request) error {
	return func(w stdhttp.ResponseWriter, r *stdhttp.Request) error {
		if err := requireAdminPermission(r, "markets:edit"); err != nil {
			return err
		}
		if r.Method != stdhttp.MethodPost {
			return httpx.MethodNotAllowed(r.Method, stdhttp.MethodPost)
		}
		if !strings.HasSuffix(r.URL.Path, "/cancel") {
			return httpx.NotFound("unknown admin orders subpath")
		}
		trimmed := strings.TrimSuffix(r.URL.Path, "/cancel")
		orderID := trimmed[strings.LastIndex(trimmed, "/")+1:]
		if orderID == "" {
			return httpx.BadRequest("invalid order id", nil)
		}
		order, err := reader.GetOrder(r.Context(), orderID)
		if err != nil {
			if errors.Is(err, sql.ErrNoRows) {
				return httpx.NotFound("order not found")
			}
			return httpx.Internal("failed to load order", err)
		}
		if order == nil {
			return httpx.NotFound("order not found")
		}
		// Delegate to the existing owner-scoped cancel with the order's real
		// owner — the protected reservation-release path is reused unchanged.
		if err := svc.CancelOrder(r.Context(), orderID, order.UserID); err != nil {
			msg := err.Error()
			if strings.Contains(msg, "not found") {
				return httpx.NotFound(msg)
			}
			// state-transition (already cancelled/filled) etc.
			return httpx.BadRequest(msg, nil)
		}
		recordProviderOpsAuditAction(userIDFromRequest(r), "order.admin_cancelled", orderID, map[string]any{
			"ownerUserId": order.UserID, "marketId": order.MarketID,
		})
		return httpx.WriteJSON(w, stdhttp.StatusOK, map[string]any{"cancelled": true, "orderId": orderID})
	}
}
