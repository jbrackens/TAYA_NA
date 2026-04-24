package http

import (
	"context"
	"database/sql"
	"encoding/json"
	stdhttp "net/http"
	"net/http/httptest"
	"testing"
	"time"

	"phoenix-revival/gateway/internal/loyalty"
	"phoenix-revival/platform/transport/httpx"
)

// fakeLoyaltyRepo is a deterministic in-memory PredictRepo for HTTP tests.
type fakeLoyaltyRepo struct {
	account *loyalty.PredictAccount
	ledger  []loyalty.PredictLedgerEntry
	acctErr error
}

func (f *fakeLoyaltyRepo) GetAccount(_ context.Context, _ string) (*loyalty.PredictAccount, error) {
	if f.acctErr != nil {
		return nil, f.acctErr
	}
	return f.account, nil
}

func (f *fakeLoyaltyRepo) ListLedger(_ context.Context, _ string, _ int) ([]loyalty.PredictLedgerEntry, error) {
	return f.ledger, nil
}

func (f *fakeLoyaltyRepo) Accrue(_ context.Context, _ loyalty.PredictAccrualInput) (*loyalty.PredictAccrualResult, error) {
	return nil, nil
}

func (f *fakeLoyaltyRepo) AccrueWithTx(_ context.Context, _ *sql.Tx, _ loyalty.PredictAccrualInput) (*loyalty.PredictAccrualResult, error) {
	return nil, nil
}

func buildPredictLoyaltyHandler(t *testing.T, repo loyalty.PredictRepo) stdhttp.Handler {
	t.Helper()
	svc := loyalty.NewPredictService(repo)
	mux := stdhttp.NewServeMux()
	registerPredictLoyaltyRoutes(mux, svc)
	return httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
}

func TestPredictLoyaltyStanding_ReturnsZeroStateForUnknownUser(t *testing.T) {
	h := buildPredictLoyaltyHandler(t, &fakeLoyaltyRepo{acctErr: loyalty.ErrPredictAccountNotFound})

	req := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/loyalty", nil)
	req.Header.Set("X-User-ID", "u-fresh")
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	var payload map[string]any
	_ = json.Unmarshal(res.Body.Bytes(), &payload)
	if payload["userId"] != "u-fresh" {
		t.Errorf("userId: want u-fresh, got %v", payload["userId"])
	}
	if tier, _ := payload["tier"].(float64); int(tier) != int(loyalty.PredictTierHidden) {
		t.Errorf("expected Hidden tier for never-accrued user, got %v", payload["tier"])
	}
	if bal, _ := payload["pointsBalance"].(float64); bal != 0 {
		t.Errorf("expected 0 balance, got %v", payload["pointsBalance"])
	}
}

func TestPredictLoyaltyStanding_RequiresAuth(t *testing.T) {
	h := buildPredictLoyaltyHandler(t, &fakeLoyaltyRepo{})

	req := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/loyalty", nil) // no X-User-ID
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusUnauthorized {
		t.Fatalf("expected 401 without session, got %d body=%s", res.Code, res.Body.String())
	}
}

func TestPredictLoyaltyStanding_BlocksCrossUserAccess(t *testing.T) {
	h := buildPredictLoyaltyHandler(t, &fakeLoyaltyRepo{})

	// Session user is u-alice, but query asks for u-bob's data.
	req := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/loyalty?userId=u-bob", nil)
	req.Header.Set("X-User-ID", "u-alice")
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusForbidden {
		t.Fatalf("cross-user access must return 403, got %d body=%s", res.Code, res.Body.String())
	}
}

func TestPredictLoyaltyStanding_AllowsSelfUserIDParam(t *testing.T) {
	repo := &fakeLoyaltyRepo{account: &loyalty.PredictAccount{
		UserID: "u-alice", PointsBalance: 5175, Tier: loyalty.PredictTierSharp,
		LastActivity: time.Date(2026, 4, 23, 15, 0, 0, 0, time.UTC),
	}}
	h := buildPredictLoyaltyHandler(t, repo)

	req := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/loyalty?userId=u-alice", nil)
	req.Header.Set("X-User-ID", "u-alice")
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusOK {
		t.Fatalf("self-userId param must succeed, got %d", res.Code)
	}
	var p map[string]any
	_ = json.Unmarshal(res.Body.Bytes(), &p)
	if bal, _ := p["pointsBalance"].(float64); bal != 5175 {
		t.Errorf("pointsBalance: want 5175, got %v", p["pointsBalance"])
	}
}

func TestPredictLoyaltyStanding_AliasRouteSameShape(t *testing.T) {
	repo := &fakeLoyaltyRepo{account: &loyalty.PredictAccount{UserID: "u-1", PointsBalance: 100, Tier: loyalty.PredictTierNewcomer}}
	h := buildPredictLoyaltyHandler(t, repo)

	// /standing is a convenience alias — payload must match /api/v1/loyalty.
	req := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/loyalty/standing", nil)
	req.Header.Set("X-User-ID", "u-1")
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusOK {
		t.Fatalf("/standing alias: want 200, got %d", res.Code)
	}
	var p map[string]any
	_ = json.Unmarshal(res.Body.Bytes(), &p)
	if p["userId"] != "u-1" {
		t.Errorf("alias payload userId: want u-1, got %v", p["userId"])
	}
}

func TestPredictLoyaltyLedger_RequiresAuth(t *testing.T) {
	h := buildPredictLoyaltyHandler(t, &fakeLoyaltyRepo{})

	req := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/loyalty/ledger", nil)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusUnauthorized {
		t.Fatalf("ledger without session: want 401, got %d", res.Code)
	}
}

func TestPredictLoyaltyLedger_ReturnsEntriesForSelf(t *testing.T) {
	marketID := "mkt-btc"
	repo := &fakeLoyaltyRepo{ledger: []loyalty.PredictLedgerEntry{
		{
			ID: 1, UserID: "u-alice", EventType: "accrual",
			DeltaPoints: 800, BalanceAfter: 800, Reason: "settled trade (won)",
			MarketID: &marketID, IdempotencyKey: "accrual:mkt-btc:pos-1",
			CreatedAt: time.Date(2026, 4, 23, 14, 58, 0, 0, time.UTC),
		},
	}}
	h := buildPredictLoyaltyHandler(t, repo)

	req := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/loyalty/ledger?limit=10", nil)
	req.Header.Set("X-User-ID", "u-alice")
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusOK {
		t.Fatalf("ledger: want 200, got %d body=%s", res.Code, res.Body.String())
	}
	var p struct {
		UserID string           `json:"userId"`
		Items  []map[string]any `json:"items"`
		Total  int              `json:"total"`
	}
	_ = json.Unmarshal(res.Body.Bytes(), &p)
	if p.UserID != "u-alice" || p.Total != 1 || len(p.Items) != 1 {
		t.Fatalf("ledger payload: userId=%q total=%d items=%d", p.UserID, p.Total, len(p.Items))
	}
	if p.Items[0]["marketId"] != marketID {
		t.Errorf("marketId not surfaced: %v", p.Items[0]["marketId"])
	}
}

func TestPredictLoyaltyLedger_RejectsInvalidLimit(t *testing.T) {
	h := buildPredictLoyaltyHandler(t, &fakeLoyaltyRepo{})

	req := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/loyalty/ledger?limit=-5", nil)
	req.Header.Set("X-User-ID", "u-1")
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusBadRequest {
		t.Errorf("negative limit must 400, got %d", res.Code)
	}
}

func TestPredictLoyaltyTiers_IsPublicAndStable(t *testing.T) {
	h := buildPredictLoyaltyHandler(t, &fakeLoyaltyRepo{})

	// No X-User-ID — tiers is a public endpoint per plan §8.
	req := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/loyalty/tiers", nil)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)

	if res.Code != stdhttp.StatusOK {
		t.Fatalf("tiers: want 200 (public), got %d", res.Code)
	}
	var p struct {
		Items      []map[string]any `json:"items"`
		TotalCount int              `json:"totalCount"`
	}
	_ = json.Unmarshal(res.Body.Bytes(), &p)
	if p.TotalCount == 0 || len(p.Items) != p.TotalCount {
		t.Errorf("tier count mismatch: total=%d, items=%d", p.TotalCount, len(p.Items))
	}
	// First tier should be Hidden (tier 0).
	if tier, _ := p.Items[0]["tier"].(float64); int(tier) != int(loyalty.PredictTierHidden) {
		t.Errorf("first tier: expected Hidden (0), got %v", p.Items[0]["tier"])
	}
}

func TestPredictLoyaltyRoutes_RejectNonGET(t *testing.T) {
	h := buildPredictLoyaltyHandler(t, &fakeLoyaltyRepo{})

	routes := []string{
		"/api/v1/loyalty",
		"/api/v1/loyalty/standing",
		"/api/v1/loyalty/ledger",
		"/api/v1/loyalty/tiers",
	}
	for _, path := range routes {
		t.Run(path, func(t *testing.T) {
			req := httptest.NewRequest(stdhttp.MethodPost, path, nil)
			req.Header.Set("X-User-ID", "u-1")
			res := httptest.NewRecorder()
			h.ServeHTTP(res, req)
			if res.Code != stdhttp.StatusMethodNotAllowed {
				t.Errorf("POST %s: want 405, got %d", path, res.Code)
			}
		})
	}
}
