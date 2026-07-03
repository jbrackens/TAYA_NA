package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"phoenix-revival/gateway/internal/compliance"
	"phoenix-revival/platform/transport/httpx"
)

type stubRGReader struct {
	restrictions *compliance.PlayerRestrictions
	setUserID    string
	setFlagged   bool
	setReason    string
	setBy        string
	setCalled    bool
}

func (s *stubRGReader) GetPlayerRestrictions(_ context.Context, userID string) (*compliance.PlayerRestrictions, error) {
	if s.restrictions != nil {
		return s.restrictions, nil
	}
	return &compliance.PlayerRestrictions{UserID: userID}, nil
}

func (s *stubRGReader) SetProblemTradingFlag(_ context.Context, userID string, flagged bool, reason, flaggedBy string) error {
	s.setCalled = true
	s.setUserID, s.setFlagged, s.setReason, s.setBy = userID, flagged, reason, flaggedBy
	return nil
}

func newRGAdminHarness(rg rgAdminService) http.Handler {
	mux := http.NewServeMux()
	registerRGAdminRoutes(mux, rg)
	return httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
}

func TestRGAdminRestrictionsRejectsNonAdmin(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	handler := newRGAdminHarness(&stubRGReader{})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/rg/restrictions?userId=u-1", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "u-p", "player@test.local", "player"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusForbidden && res.Code != http.StatusUnauthorized {
		t.Fatalf("expected player rejection, got %d", res.Code)
	}
}

func TestRGAdminRestrictionsRequiresUserID(t *testing.T) {
	handler := newRGAdminHarness(&stubRGReader{})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/rg/restrictions", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@test.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for missing userId, got %d", res.Code)
	}
}

func TestRGAdminRestrictionsReturnsState(t *testing.T) {
	handler := newRGAdminHarness(&stubRGReader{
		restrictions: &compliance.PlayerRestrictions{
			UserID:        "u-7",
			IsExcluded:    true,
			ExclusionType: "permanent",
			BetLimits: []compliance.BetLimit{
				{UserID: "u-7", Period: "daily", LimitCents: 5000},
			},
		},
	})
	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/rg/restrictions?userId=u-7", nil)
	req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@test.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	var payload struct {
		Restrictions compliance.PlayerRestrictions `json:"restrictions"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if !payload.Restrictions.IsExcluded || payload.Restrictions.ExclusionType != "permanent" {
		t.Fatalf("exclusion state lost: %+v", payload.Restrictions)
	}
	if len(payload.Restrictions.BetLimits) != 1 {
		t.Fatalf("expected 1 bet limit, got %+v", payload.Restrictions.BetLimits)
	}
}

// TestRGAdminProblemTradingFlag (GAP-39) covers the reviewer marker route:
// compliance:write gated, requires a reason when flagging, and forwards to the
// service with the acting admin as flaggedBy.
func TestRGAdminProblemTradingFlag(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "") // exercise the real gate

	post := func(h http.Handler, role, body string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/rg/problem-trading", strings.NewReader(body))
		req = req.WithContext(httpx.WithTestUser(req.Context(), "uid-"+role, role+"@test.local", role))
		res := httptest.NewRecorder()
		h.ServeHTTP(res, req)
		return res
	}

	// A non-admin (player) is rejected.
	if res := post(newRGAdminHarness(&stubRGReader{}), "player", `{"userId":"u-1","flagged":true,"reason":"x"}`); res.Code != http.StatusForbidden && res.Code != http.StatusUnauthorized {
		t.Fatalf("player must be rejected, got %d", res.Code)
	}

	// Flagging without a reason is a 400.
	if res := post(newRGAdminHarness(&stubRGReader{}), "admin", `{"userId":"u-1","flagged":true}`); res.Code != http.StatusBadRequest {
		t.Fatalf("flag without reason must be 400, got %d", res.Code)
	}

	// A valid flag forwards to the service with the actor as flaggedBy.
	stub := &stubRGReader{}
	if res := post(newRGAdminHarness(stub), "admin", `{"userId":"u-9","flagged":true,"reason":"chasing losses"}`); res.Code != http.StatusOK {
		t.Fatalf("valid flag: want 200, got %d body=%s", res.Code, res.Body.String())
	}
	if !stub.setCalled || stub.setUserID != "u-9" || !stub.setFlagged || stub.setReason != "chasing losses" {
		t.Fatalf("service not called correctly: %+v", stub)
	}
	if stub.setBy == "" {
		t.Fatal("flaggedBy should identify the acting admin")
	}

	// Clearing does not require a reason.
	clr := &stubRGReader{}
	if res := post(newRGAdminHarness(clr), "admin", `{"userId":"u-9","flagged":false}`); res.Code != http.StatusOK {
		t.Fatalf("clear: want 200, got %d", res.Code)
	}
	if !clr.setCalled || clr.setFlagged {
		t.Fatalf("clear must forward flagged=false, got %+v", clr)
	}
}
