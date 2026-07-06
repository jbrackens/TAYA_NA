package http

import (
	"context"
	"database/sql"
	"encoding/json"
	stdhttp "net/http"
	"net/http/httptest"
	"testing"

	"taptrade/gateway/internal/loyalty"
	"taptrade/platform/transport/httpx"
)

// fakeTierConfigRepo implements loyalty.PredictRepo PLUS the tier-config store
// capability (GetLoyaltyTierConfig / UpdateLoyaltyTierConfig) so a real
// PredictService wired over it exercises the GET /config + PUT /tiers/{code}
// handlers end to end — mirrors fakeAdminLoyaltyRepo in the GW-1 handler tests.
type fakeTierConfigRepo struct {
	rows []loyalty.PredictTierConfigRow
}

func (f *fakeTierConfigRepo) GetAccount(_ context.Context, _ string) (*loyalty.PredictAccount, error) {
	return nil, loyalty.ErrPredictAccountNotFound
}
func (f *fakeTierConfigRepo) ListLedger(_ context.Context, _ string, _ int) ([]loyalty.PredictLedgerEntry, error) {
	return nil, nil
}
func (f *fakeTierConfigRepo) Accrue(_ context.Context, _ loyalty.PredictAccrualInput) (*loyalty.PredictAccrualResult, error) {
	return nil, nil
}
func (f *fakeTierConfigRepo) AccrueWithTx(_ context.Context, _ *sql.Tx, _ loyalty.PredictAccrualInput) (*loyalty.PredictAccrualResult, error) {
	return nil, nil
}

func (f *fakeTierConfigRepo) GetLoyaltyTierConfig(_ context.Context) ([]loyalty.PredictTierConfigRow, error) {
	return f.rows, nil
}

func (f *fakeTierConfigRepo) UpdateLoyaltyTierConfig(_ context.Context, in loyalty.PredictTierConfigRow) (*loyalty.PredictTierConfigRow, error) {
	for i, r := range f.rows {
		if r.Tier == in.Tier {
			f.rows[i] = in
			return &in, nil
		}
	}
	f.rows = append(f.rows, in)
	return &in, nil
}

func buildTierConfigHandler(repo loyalty.PredictRepo) stdhttp.Handler {
	svc := loyalty.NewPredictService(repo)
	mux := stdhttp.NewServeMux()
	registerPredictLoyaltyAdminRoutes(mux, svc)
	return httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
}

func seededTierRows() []loyalty.PredictTierConfigRow {
	return []loyalty.PredictTierConfigRow{
		{Tier: 0, TierCode: "hidden", DisplayName: "", PointsThreshold: 0, PointsMultiplier: 1, Benefits: json.RawMessage(`[]`), Active: true},
		{Tier: 1, TierCode: "newcomer", DisplayName: "Newcomer", PointsThreshold: 1, PointsMultiplier: 1, Benefits: json.RawMessage(`["Tier pill visible in header"]`), Active: true},
		{Tier: 2, TierCode: "trader", DisplayName: "Trader", PointsThreshold: 500, PointsMultiplier: 1, Benefits: json.RawMessage(`{}`), Active: true},
	}
}

// GET /config now serves the DB-backed editable tier list, filtering Hidden.
func TestLoyaltyConfigServesDBTiers(t *testing.T) {
	repo := &fakeTierConfigRepo{rows: seededTierRows()}
	h := buildTierConfigHandler(repo)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, adminReq(stdhttp.MethodGet, "/api/v1/admin/loyalty/config", ""))

	if res.Code != stdhttp.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	var payload struct {
		Tiers []loyalty.EditableTier `json:"tiers"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	// Hidden (tier 0) filtered out → 2 editable tiers.
	if len(payload.Tiers) != 2 {
		t.Fatalf("expected 2 editable tiers, got %d: %+v", len(payload.Tiers), payload.Tiers)
	}
	got := payload.Tiers[0]
	if got.TierCode != "newcomer" || got.DisplayName != "Newcomer" || got.Rank != 1 || got.MinLifetimePoints != 1 {
		t.Fatalf("unexpected first tier: %+v", got)
	}
	if !got.Active {
		t.Fatalf("expected newcomer active")
	}
	// Array-shaped benefits get normalized into a key→value object.
	if got.Benefits["benefit_1"] != "Tier pill visible in header" {
		t.Fatalf("benefits not normalized: %+v", got.Benefits)
	}
}

// Empty table → fall back to the tiers.go constants so the office still renders.
func TestLoyaltyConfigFallsBackToConstants(t *testing.T) {
	repo := &fakeTierConfigRepo{rows: nil}
	h := buildTierConfigHandler(repo)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, adminReq(stdhttp.MethodGet, "/api/v1/admin/loyalty/config", ""))
	if res.Code != stdhttp.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	var payload struct {
		Tiers []loyalty.EditableTier `json:"tiers"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	// 5 visible tiers from the constants (Newcomer..Legend).
	if len(payload.Tiers) != 5 {
		t.Fatalf("expected 5 constant tiers, got %d", len(payload.Tiers))
	}
}

// PUT /tiers/{code} persists the edit and returns the refreshed tier list.
func TestLoyaltyTierUpdateRoundTrips(t *testing.T) {
	repo := &fakeTierConfigRepo{rows: seededTierRows()}
	h := buildTierConfigHandler(repo)
	res := httptest.NewRecorder()
	body := `{"tierCode":"trader","displayName":"Trader Pro","rank":2,"minLifetimePoints":750,"minRolling30dPoints":50,"benefits":{"perk":"early access"},"active":false}`
	h.ServeHTTP(res, adminReq(stdhttp.MethodPut, "/api/v1/admin/loyalty/tiers/trader", body))

	if res.Code != stdhttp.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	var payload struct {
		Tiers []loyalty.EditableTier `json:"tiers"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	var trader *loyalty.EditableTier
	for i := range payload.Tiers {
		if payload.Tiers[i].TierCode == "trader" {
			trader = &payload.Tiers[i]
		}
	}
	if trader == nil {
		t.Fatalf("trader not in response: %+v", payload.Tiers)
	}
	if trader.DisplayName != "Trader Pro" || trader.MinLifetimePoints != 750 || trader.MinRolling30dPoints != 50 {
		t.Fatalf("edit not persisted: %+v", trader)
	}
	if trader.Active {
		t.Fatalf("expected trader inactive after edit")
	}
	if trader.Benefits["perk"] != "early access" {
		t.Fatalf("benefits not persisted: %+v", trader.Benefits)
	}
}

// Unknown tier code → 404 (mirrors the GW-1 unknown-id behavior).
func TestLoyaltyTierUpdateUnknownCode(t *testing.T) {
	repo := &fakeTierConfigRepo{rows: seededTierRows()}
	h := buildTierConfigHandler(repo)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, adminReq(stdhttp.MethodPut, "/api/v1/admin/loyalty/tiers/platinum",
		`{"tierCode":"platinum","displayName":"Platinum","rank":9,"minLifetimePoints":1,"active":true}`))
	if res.Code != stdhttp.StatusNotFound {
		t.Fatalf("expected 404 for unknown tier code, got %d body=%s", res.Code, res.Body.String())
	}
}

// Missing displayName → 400.
func TestLoyaltyTierUpdateRequiresDisplayName(t *testing.T) {
	repo := &fakeTierConfigRepo{rows: seededTierRows()}
	h := buildTierConfigHandler(repo)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, adminReq(stdhttp.MethodPut, "/api/v1/admin/loyalty/tiers/trader",
		`{"tierCode":"trader","displayName":"","rank":2,"minLifetimePoints":500,"active":true}`))
	if res.Code != stdhttp.StatusBadRequest {
		t.Fatalf("expected 400 for missing displayName, got %d", res.Code)
	}
}

// PUT requires admin role.
func TestLoyaltyTierUpdateRequiresAdmin(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	repo := &fakeTierConfigRepo{rows: seededTierRows()}
	h := buildTierConfigHandler(repo)
	res := httptest.NewRecorder()
	req := httptest.NewRequest(stdhttp.MethodPut, "/api/v1/admin/loyalty/tiers/trader", nil)
	h.ServeHTTP(res, req)
	if res.Code != stdhttp.StatusForbidden {
		t.Fatalf("expected 403 without admin role, got %d", res.Code)
	}
}

// GET-only methods rejected on the tiers PUT route.
func TestLoyaltyTierWrongMethod(t *testing.T) {
	repo := &fakeTierConfigRepo{rows: seededTierRows()}
	h := buildTierConfigHandler(repo)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, adminReq(stdhttp.MethodGet, "/api/v1/admin/loyalty/tiers/trader", ""))
	if res.Code != stdhttp.StatusMethodNotAllowed {
		t.Fatalf("expected 405 for GET on tiers PUT route, got %d", res.Code)
	}
}
