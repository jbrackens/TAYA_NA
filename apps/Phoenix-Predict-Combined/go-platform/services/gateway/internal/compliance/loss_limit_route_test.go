package compliance

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"phoenix-revival/platform/transport/httpx"
)

// GAP-11 (§13 Responsible Gaming): the loss-limit self-service route is
// session-bound like the bet/deposit routes — a player can set/read only their
// own caps — and loss limits surface on the restrictions endpoint.
func TestLossLimitRoute(t *testing.T) {
	mux := http.NewServeMux()
	registerResponsibleGamblingRoutes(mux, NewMockResponsibleGamblingService())

	post := func(path, body, sessionUID string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		req = req.WithContext(httpx.WithTestUser(context.Background(), sessionUID, sessionUID, "player"))
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		return rec
	}
	get := func(path, sessionUID string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodGet, path, nil)
		req = req.WithContext(httpx.WithTestUser(context.Background(), sessionUID, sessionUID, "player"))
		rec := httptest.NewRecorder()
		mux.ServeHTTP(rec, req)
		return rec
	}

	// Cross-user set is forbidden (session u-a sets for u-b).
	if rec := post("/api/v1/compliance/rg/loss-limit", `{"userId":"u-b","period":"daily","amountPointsCents":5000}`, "u-a"); rec.Code != http.StatusForbidden {
		t.Fatalf("cross-user set must be 403, got %d (%s)", rec.Code, rec.Body.String())
	}

	// Own set succeeds.
	if rec := post("/api/v1/compliance/rg/loss-limit", `{"userId":"u-self","period":"daily","amountPointsCents":5000}`, "u-self"); rec.Code != http.StatusOK {
		t.Fatalf("own set: expected 200, got %d (%s)", rec.Code, rec.Body.String())
	}

	// List returns it.
	rec := get("/api/v1/compliance/rg/loss-limits?userId=u-self", "u-self")
	if rec.Code != http.StatusOK {
		t.Fatalf("list: expected 200, got %d", rec.Code)
	}
	var listed struct {
		Limits []LossLimit `json:"limits"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &listed); err != nil {
		t.Fatalf("decode list: %v", err)
	}
	if len(listed.Limits) != 1 || listed.Limits[0].Period != "daily" || listed.Limits[0].LimitCents != 5000 {
		t.Fatalf("unexpected loss limits: %+v", listed.Limits)
	}

	// Missing amount → 400.
	if rec := post("/api/v1/compliance/rg/loss-limit", `{"userId":"u-self","period":"daily"}`, "u-self"); rec.Code != http.StatusBadRequest {
		t.Fatalf("missing amount: expected 400, got %d", rec.Code)
	}

	// The restrictions endpoint surfaces lossLimits.
	rr := get("/api/v1/compliance/rg/restrictions?userId=u-self", "u-self")
	if rr.Code != http.StatusOK {
		t.Fatalf("restrictions: expected 200, got %d", rr.Code)
	}
	var restr struct {
		Restrictions struct {
			LossLimits []LossLimit `json:"lossLimits"`
		} `json:"restrictions"`
	}
	if err := json.Unmarshal(rr.Body.Bytes(), &restr); err != nil {
		t.Fatalf("decode restrictions: %v", err)
	}
	if len(restr.Restrictions.LossLimits) != 1 {
		t.Fatalf("restrictions should include the loss limit, got %+v", restr.Restrictions.LossLimits)
	}
}
