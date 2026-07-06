package http

import (
	"context"
	"database/sql"
	"encoding/json"
	stdhttp "net/http"
	"net/http/httptest"
	"testing"
	"time"

	"taptrade/gateway/internal/loyalty"
	"taptrade/platform/transport/httpx"
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
	if rank, _ := payload["rank"].(float64); int(rank) != int(loyalty.PredictTierHidden) {
		t.Errorf("expected Hidden rank for never-accrued user, got %v", payload["rank"])
	}
	if bal, _ := payload["pointsBalance"].(float64); bal != 0 {
		t.Errorf("expected 0 balance, got %v", payload["pointsBalance"])
	}
	for _, retired := range []string{"tier", "tierName", "nextTier", "nextTierName", "pointsToNextTier"} {
		if _, ok := payload[retired]; ok {
			t.Errorf("zero-state standing response must not emit retired alias %q", retired)
		}
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
	if p["unit"] != "PTS" {
		t.Errorf("unit: want PTS, got %v", p["unit"])
	}
	if xp, _ := p["xp"].(float64); xp != 5175 {
		t.Errorf("xp: want 5175, got %v", p["xp"])
	}
	if xp, _ := p["xpPoints"].(float64); xp != 5175 {
		t.Errorf("xpPoints: want 5175, got %v", p["xpPoints"])
	}
	if rank, _ := p["rank"].(float64); int(rank) != int(loyalty.PredictTierSharp) {
		t.Errorf("rank: want Sharp, got %v", p["rank"])
	}
	if p["rankName"] != "Sharp" {
		t.Errorf("rankName: want Sharp, got %v", p["rankName"])
	}
	if nextRank, _ := p["nextRank"].(float64); int(nextRank) != int(loyalty.PredictTierWhale) {
		t.Errorf("nextRank: want Whale, got %v", p["nextRank"])
	}
	if p["nextRankName"] != "Whale" {
		t.Errorf("nextRankName: want Whale, got %v", p["nextRankName"])
	}
	if xpToNext, _ := p["xpToNextRank"].(float64); xpToNext <= 0 {
		t.Errorf("xpToNextRank should be positive, got %v", p["xpToNextRank"])
	}
	for _, retired := range []string{"tier", "tierName", "nextTier", "nextTierName", "pointsToNextTier"} {
		if _, ok := p[retired]; ok {
			t.Errorf("standing response must not emit retired alias %q", retired)
		}
	}
}

func TestPredictLoyaltyStanding_RedactsLegacyUnsafeRankNames(t *testing.T) {
	standing := loyalty.PredictStanding{
		UserID:           "u-legacy-rank",
		PointsBalance:    1000,
		Tier:             loyalty.PredictTierNewcomer,
		TierName:         "Cash prize newcomer",
		NextTier:         loyalty.PredictTierSharp,
		NextTierName:     "Crypto payout sharp",
		PointsToNextTier: 4000,
	}
	payload := predictStandingPayload(standing)

	if payload["rankName"] != launchRedactedUserText {
		t.Fatalf("rankName should be redacted, got %#v", payload["rankName"])
	}
	if payload["nextRankName"] != launchRedactedUserText {
		t.Fatalf("nextRankName should be redacted, got %#v", payload["nextRankName"])
	}
	if payload["unit"] != "PTS" {
		t.Fatalf("unit should remain PTS, got %#v", payload["unit"])
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

func TestPredictLoyaltyLedger_RedactsLegacyUnsafeReason(t *testing.T) {
	entry := loyalty.PredictLedgerEntry{
		ID: 1, UserID: "u-legacy-ledger", EventType: "adjustment",
		DeltaPoints: 100, BalanceAfter: 100, Reason: "cash payout loyalty bonus",
		IdempotencyKey: "legacy-unsafe-reason",
		CreatedAt:      time.Date(2026, 4, 23, 14, 58, 0, 0, time.UTC),
	}
	payload := predictLedgerEntryPayload(entry)

	if payload["reason"] != launchRedactedUserText {
		t.Fatalf("unsafe reason should be redacted, got %#v", payload["reason"])
	}
	if payload["eventType"] != "adjustment" || payload["deltaPoints"] != int64(100) {
		t.Fatalf("stable ledger fields should remain intact, got %+v", payload)
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
	// First rank should be Hidden (rank 0).
	if rank, _ := p.Items[0]["rank"].(float64); int(rank) != int(loyalty.PredictTierHidden) {
		t.Errorf("first rank: expected Hidden (0), got %v", p.Items[0]["rank"])
	}
	if p.Items[0]["unit"] != "PTS" {
		t.Errorf("first rank unit: want PTS, got %v", p.Items[0]["unit"])
	}
	if p.Items[0]["rankName"] != "" {
		t.Errorf("first rankName: want empty hidden rank label, got %v", p.Items[0]["rankName"])
	}
	if minXP, _ := p.Items[0]["minXpPoints"].(float64); minXP != 0 {
		t.Errorf("first minXpPoints: want 0, got %v", p.Items[0]["minXpPoints"])
	}
	for _, retired := range []string{"tier", "name", "pointsThreshold"} {
		if _, ok := p.Items[0][retired]; ok {
			t.Errorf("tier response must not emit retired alias %q", retired)
		}
	}
}

func TestPredictTierPayloadRedactsLegacyUnsafeBenefits(t *testing.T) {
	payload := predictTierPayload(loyalty.PredictTierDefinition{
		Tier:            loyalty.PredictTierSharp,
		Name:            "Cash prize elite",
		PointsThreshold: 10_000,
		Benefits: []string{
			"early market access",
			"crypto payout priority",
		},
	})

	if payload["rankName"] != launchRedactedUserText {
		t.Fatalf("expected unsafe rankName redaction, got %+v", payload)
	}
	benefits, ok := payload["benefits"].([]string)
	if !ok || len(benefits) != 2 {
		t.Fatalf("expected benefit slice, got %#v", payload["benefits"])
	}
	if benefits[0] != "early market access" {
		t.Fatalf("safe benefit should be preserved, got %+v", benefits)
	}
	if benefits[1] != launchRedactedUserText {
		t.Fatalf("unsafe benefit should be redacted, got %+v", benefits)
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
