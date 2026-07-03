package http

import (
	"context"
	"database/sql"
	"net/http"
	"net/http/httptest"
	"testing"

	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/platform/transport/httpx"
)

type fakeAdminOrderSvc struct {
	orders        []prediction.Order
	total         int
	cancelErr     error
	cancelledID   string
	cancelledUser string
	lastFilter    prediction.OrderFilter
}

func (f *fakeAdminOrderSvc) ListOrders(_ context.Context, filter prediction.OrderFilter) ([]prediction.Order, int, error) {
	f.lastFilter = filter
	return f.orders, f.total, nil
}
func (f *fakeAdminOrderSvc) CancelOrder(_ context.Context, orderID, userID string) error {
	if f.cancelErr != nil {
		return f.cancelErr
	}
	f.cancelledID = orderID
	f.cancelledUser = userID
	return nil
}

type fakeAdminOrderReader struct {
	order *prediction.Order
	err   error
}

func (f *fakeAdminOrderReader) GetOrder(_ context.Context, _ string) (*prediction.Order, error) {
	return f.order, f.err
}

func newAdminOrderHarness(svc adminOrderService, reader adminOrderReader) http.Handler {
	mux := http.NewServeMux()
	registerAdminOrderRoutes(mux, svc, reader)
	return httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
}

func adminOrderReq(h http.Handler, actor, role, method, path string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, path, nil)
	r = r.WithContext(httpx.WithTestUser(r.Context(), actor, actor+"@test.local", role))
	res := httptest.NewRecorder()
	h.ServeHTTP(res, r)
	return res
}

// GAP-21: the admin cancel resolves the order's OWNER and delegates to
// Service.CancelOrder with it (not the admin), then audits the action.
func TestAdminOrderCancelLooksUpOwnerAndAudits(t *testing.T) {
	svc := &fakeAdminOrderSvc{}
	reader := &fakeAdminOrderReader{order: &prediction.Order{ID: "ord-1", UserID: "owner-9", MarketID: "mkt-7"}}
	h := newAdminOrderHarness(svc, reader)

	res := adminOrderReq(h, "admin-A", "admin", http.MethodPost, "/api/v1/admin/orders/ord-1/cancel")
	if res.Code != http.StatusOK {
		t.Fatalf("cancel: expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	if svc.cancelledID != "ord-1" || svc.cancelledUser != "owner-9" {
		t.Fatalf("must cancel the order for its real owner, got id=%q user=%q", svc.cancelledID, svc.cancelledUser)
	}
	assertAMLAudit(t, "order.admin_cancelled", "ord-1")
}

func TestAdminOrderCancelNotFound(t *testing.T) {
	svc := &fakeAdminOrderSvc{}
	reader := &fakeAdminOrderReader{err: sql.ErrNoRows}
	h := newAdminOrderHarness(svc, reader)

	res := adminOrderReq(h, "admin-A", "admin", http.MethodPost, "/api/v1/admin/orders/nope/cancel")
	if res.Code != http.StatusNotFound {
		t.Fatalf("unknown order: expected 404, got %d", res.Code)
	}
	if svc.cancelledID != "" {
		t.Fatal("a missing order must not reach CancelOrder")
	}
}

func TestAdminOrderRoutesRejectNonAdmin(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "") // TestMain enables the bypass; require real gating here
	h := newAdminOrderHarness(&fakeAdminOrderSvc{}, &fakeAdminOrderReader{order: &prediction.Order{ID: "ord-1", UserID: "u"}})
	for _, path := range []string{"/api/v1/admin/orders", "/api/v1/admin/orders/ord-1/cancel"} {
		method := http.MethodGet
		if path != "/api/v1/admin/orders" {
			method = http.MethodPost
		}
		if res := adminOrderReq(h, "mallory", "player", method, path); res.Code != http.StatusForbidden {
			t.Fatalf("%s as non-admin: expected 403, got %d", path, res.Code)
		}
	}
}

// The admin view lists the QUERIED user's orders, not the caller's.
func TestAdminOrderListScopesToQueriedUser(t *testing.T) {
	svc := &fakeAdminOrderSvc{orders: []prediction.Order{{ID: "o1", UserID: "cust-1"}}, total: 1}
	h := newAdminOrderHarness(svc, &fakeAdminOrderReader{})

	res := adminOrderReq(h, "admin-A", "admin", http.MethodGet, "/api/v1/admin/orders?userId=cust-1&status=open")
	if res.Code != http.StatusOK {
		t.Fatalf("list: expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	if svc.lastFilter.UserID != "cust-1" {
		t.Fatalf("list must scope to the queried user, got filter.UserID=%q", svc.lastFilter.UserID)
	}
	if svc.lastFilter.Status == nil || *svc.lastFilter.Status != prediction.OrderStatus("open") {
		t.Fatalf("status filter not applied: %+v", svc.lastFilter.Status)
	}
}
