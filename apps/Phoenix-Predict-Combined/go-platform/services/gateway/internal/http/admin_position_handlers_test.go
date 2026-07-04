package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/platform/transport/httpx"
)

type fakeAdminPositionSvc struct {
	positions   []prediction.Position
	lastUserID  string
	listCallCnt int
}

func (f *fakeAdminPositionSvc) ListPositions(_ context.Context, userID string) ([]prediction.Position, error) {
	f.lastUserID = userID
	f.listCallCnt++
	return f.positions, nil
}

func newAdminPositionHarness(svc adminPositionService) http.Handler {
	mux := http.NewServeMux()
	registerAdminPositionRoutes(mux, svc)
	return httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
}

func adminPositionReq(h http.Handler, actor, role, method, path string) *httptest.ResponseRecorder {
	r := httptest.NewRequest(method, path, nil)
	r = r.WithContext(httpx.WithTestUser(r.Context(), actor, actor+"@test.local", role))
	res := httptest.NewRecorder()
	h.ServeHTTP(res, r)
	return res
}

// GAP-89: the admin positions view lists the QUERIED user's positions, never the
// caller's — the operator surface over the already-user-parameterized
// Service.ListPositions, no protected-core edit.
func TestAdminPositionsListScopesToQueriedUser(t *testing.T) {
	svc := &fakeAdminPositionSvc{
		positions: []prediction.Position{
			{ID: "pos-1", UserID: "cust-1", MarketID: "mkt-7", Side: prediction.OrderSide("yes"), Quantity: 10, TotalCostCents: 550},
		},
	}
	h := newAdminPositionHarness(svc)

	res := adminPositionReq(h, "admin-A", "admin", http.MethodGet, "/api/v1/admin/positions?userId=cust-1")
	if res.Code != http.StatusOK {
		t.Fatalf("list: expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	if svc.lastUserID != "cust-1" {
		t.Fatalf("list must scope to the queried user, got %q", svc.lastUserID)
	}
	var body struct {
		Data []struct {
			ID     string `json:"id"`
			UserID string `json:"userId"`
		} `json:"data"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(body.Data) != 1 || body.Data[0].ID != "pos-1" || body.Data[0].UserID != "cust-1" {
		t.Fatalf("expected the queried user's one position, got %+v", body.Data)
	}
}

// userId is required — an unscoped positions read is a bad request, not an
// accidental cross-customer dump.
func TestAdminPositionsRequireUserID(t *testing.T) {
	svc := &fakeAdminPositionSvc{}
	h := newAdminPositionHarness(svc)

	res := adminPositionReq(h, "admin-A", "admin", http.MethodGet, "/api/v1/admin/positions")
	if res.Code != http.StatusBadRequest {
		t.Fatalf("missing userId: expected 400, got %d", res.Code)
	}
	if svc.listCallCnt != 0 {
		t.Fatal("a missing userId must not reach ListPositions")
	}
}

// The route is RBAC-gated: a non-admin caller is refused (markets:read).
func TestAdminPositionsRejectNonAdmin(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "") // TestMain enables the bypass; require real gating here
	h := newAdminPositionHarness(&fakeAdminPositionSvc{})

	if res := adminPositionReq(h, "mallory", "player", http.MethodGet, "/api/v1/admin/positions?userId=cust-1"); res.Code != http.StatusForbidden {
		t.Fatalf("non-admin: expected 403, got %d", res.Code)
	}
}
