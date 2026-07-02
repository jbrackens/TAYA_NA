package http

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"phoenix-revival/gateway/internal/compliance"
	"phoenix-revival/platform/transport/httpx"
)

type stubRGReader struct {
	restrictions *compliance.PlayerRestrictions
}

func (s *stubRGReader) GetPlayerRestrictions(_ context.Context, userID string) (*compliance.PlayerRestrictions, error) {
	if s.restrictions != nil {
		return s.restrictions, nil
	}
	return &compliance.PlayerRestrictions{UserID: userID}, nil
}

func newRGAdminHarness(rg rgAdminReader) http.Handler {
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
