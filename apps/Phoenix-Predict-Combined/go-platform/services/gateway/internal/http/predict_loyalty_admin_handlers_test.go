package http

import (
	"context"
	"database/sql"
	"encoding/json"
	stdhttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"phoenix-revival/gateway/internal/loyalty"
	"phoenix-revival/platform/transport/httpx"
)

// fakeAdminLoyaltyRepo implements loyalty.PredictRepo PLUS the admin-reader
// capability (ListAdminAccounts / CountAdminAccounts) so a real PredictService
// wired over it exercises the admin handlers end to end.
type fakeAdminLoyaltyRepo struct {
	accounts []loyalty.PredictAdminAccountRow
	ledger   []loyalty.PredictLedgerEntry
	balance  int64
}

func (f *fakeAdminLoyaltyRepo) GetAccount(_ context.Context, _ string) (*loyalty.PredictAccount, error) {
	return nil, loyalty.ErrPredictAccountNotFound
}
func (f *fakeAdminLoyaltyRepo) ListLedger(_ context.Context, _ string, _ int) ([]loyalty.PredictLedgerEntry, error) {
	return f.ledger, nil
}
func (f *fakeAdminLoyaltyRepo) Accrue(_ context.Context, in loyalty.PredictAccrualInput) (*loyalty.PredictAccrualResult, error) {
	f.balance += in.DeltaPoints
	return &loyalty.PredictAccrualResult{
		Account: loyalty.PredictAccount{UserID: in.UserID, PointsBalance: f.balance},
	}, nil
}
func (f *fakeAdminLoyaltyRepo) AccrueWithTx(_ context.Context, _ *sql.Tx, _ loyalty.PredictAccrualInput) (*loyalty.PredictAccrualResult, error) {
	return nil, nil
}
func (f *fakeAdminLoyaltyRepo) ListAdminAccounts(_ context.Context, filter loyalty.PredictAdminAccountFilter, _, _ int) ([]loyalty.PredictAdminAccountRow, error) {
	if filter.ExactUserID != "" {
		for _, a := range f.accounts {
			if a.UserID == filter.ExactUserID {
				return []loyalty.PredictAdminAccountRow{a}, nil
			}
		}
		return nil, nil
	}
	return f.accounts, nil
}
func (f *fakeAdminLoyaltyRepo) CountAdminAccounts(_ context.Context, _ loyalty.PredictAdminAccountFilter) (int, error) {
	return len(f.accounts), nil
}

func buildLoyaltyAdminHandler(repo loyalty.PredictRepo) stdhttp.Handler {
	svc := loyalty.NewPredictService(repo)
	mux := stdhttp.NewServeMux()
	registerPredictLoyaltyAdminRoutes(mux, svc)
	return httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
}

func adminReq(method, path, body string) *stdhttp.Request {
	var r *stdhttp.Request
	if body == "" {
		r = httptest.NewRequest(method, path, nil)
	} else {
		r = httptest.NewRequest(method, path, strings.NewReader(body))
	}
	return r.WithContext(httpx.WithTestUser(r.Context(), "admin-1", "admin@phoenix.local", "admin"))
}

func TestLoyaltyAdminAccountsList(t *testing.T) {
	repo := &fakeAdminLoyaltyRepo{
		accounts: []loyalty.PredictAdminAccountRow{
			{UserID: "u-1", PointsBalance: 5175, EarnedLifetime: 5175, Earned30D: 5175, CreatedAt: time.Now(), UpdatedAt: time.Now()},
		},
	}
	h := buildLoyaltyAdminHandler(repo)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, adminReq(stdhttp.MethodGet, "/api/v1/admin/loyalty/accounts?pageSize=10", ""))

	if res.Code != stdhttp.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	var payload struct {
		Items []loyalty.AdminAccountSummary `json:"items"`
		Pagination struct {
			Total int `json:"total"`
		} `json:"pagination"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(payload.Items) != 1 || payload.Items[0].PlayerID != "u-1" {
		t.Fatalf("unexpected items: %+v", payload.Items)
	}
	// 5175 points → Sharp tier, next is Whale (10000 - 5175 = 4825 to next).
	if payload.Items[0].CurrentTier != "Sharp" || payload.Items[0].PointsToNextTier != 4825 {
		t.Fatalf("tier math wrong: %+v", payload.Items[0])
	}
	if payload.Pagination.Total != 1 {
		t.Fatalf("expected total 1, got %d", payload.Pagination.Total)
	}
}

func TestLoyaltyAdminAccountDetail(t *testing.T) {
	repo := &fakeAdminLoyaltyRepo{
		accounts: []loyalty.PredictAdminAccountRow{
			{UserID: "u-1", PointsBalance: 600, EarnedLifetime: 600},
		},
		ledger: []loyalty.PredictLedgerEntry{
			{ID: 1, EventType: "accrual", DeltaPoints: 600, BalanceAfter: 600, Reason: "settled trade", CreatedAt: time.Now()},
		},
	}
	h := buildLoyaltyAdminHandler(repo)

	res := httptest.NewRecorder()
	h.ServeHTTP(res, adminReq(stdhttp.MethodGet, "/api/v1/admin/loyalty/accounts/u-1?limit=5", ""))
	if res.Code != stdhttp.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	var payload struct {
		Account *loyalty.AdminAccountSummary `json:"account"`
		Ledger  []map[string]any             `json:"ledger"`
		Tiers   []loyalty.AdminTierView      `json:"tiers"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if payload.Account == nil || payload.Account.PlayerID != "u-1" || payload.Account.CurrentTier != "Trader" {
		t.Fatalf("unexpected account: %+v", payload.Account)
	}
	if len(payload.Ledger) != 1 || payload.Ledger[0]["entryType"] != "accrual" {
		t.Fatalf("unexpected ledger: %+v", payload.Ledger)
	}
	if len(payload.Tiers) != 5 {
		t.Fatalf("expected 5 tiers (Newcomer..Legend), got %d", len(payload.Tiers))
	}
}

func TestLoyaltyAdminAccountDetail_404ForUnknown(t *testing.T) {
	h := buildLoyaltyAdminHandler(&fakeAdminLoyaltyRepo{})
	res := httptest.NewRecorder()
	h.ServeHTTP(res, adminReq(stdhttp.MethodGet, "/api/v1/admin/loyalty/accounts/nobody", ""))
	if res.Code != stdhttp.StatusNotFound {
		t.Fatalf("expected 404 for unknown account, got %d", res.Code)
	}
}

func TestLoyaltyAdminAdjustment(t *testing.T) {
	repo := &fakeAdminLoyaltyRepo{balance: 600}
	h := buildLoyaltyAdminHandler(repo)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, adminReq(stdhttp.MethodPost, "/api/v1/admin/loyalty/adjustments",
		`{"playerId":"u-1","pointsDelta":10,"reason":"goodwill","idempotencyKey":"k1"}`))
	if res.Code != stdhttp.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	var payload struct {
		PointsBalance int64 `json:"pointsBalance"`
	}
	_ = json.Unmarshal(res.Body.Bytes(), &payload)
	if payload.PointsBalance != 610 {
		t.Fatalf("expected balance 610 after +10, got %d", payload.PointsBalance)
	}
}

func TestLoyaltyAdminAdjustment_RequiresReason(t *testing.T) {
	h := buildLoyaltyAdminHandler(&fakeAdminLoyaltyRepo{})
	res := httptest.NewRecorder()
	h.ServeHTTP(res, adminReq(stdhttp.MethodPost, "/api/v1/admin/loyalty/adjustments",
		`{"playerId":"u-1","pointsDelta":10}`))
	if res.Code != stdhttp.StatusBadRequest {
		t.Fatalf("expected 400 for missing reason, got %d", res.Code)
	}
}

func TestLoyaltyAdminConfig(t *testing.T) {
	h := buildLoyaltyAdminHandler(&fakeAdminLoyaltyRepo{})
	res := httptest.NewRecorder()
	h.ServeHTTP(res, adminReq(stdhttp.MethodGet, "/api/v1/admin/loyalty/config", ""))
	if res.Code != stdhttp.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	var payload struct {
		Tiers               []loyalty.AdminTierView `json:"tiers"`
		ReferralBonusPoints int                     `json:"referralBonusPoints"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(payload.Tiers) != 5 {
		t.Fatalf("expected 5 tiers, got %d", len(payload.Tiers))
	}
}

func TestLoyaltyAdminRequiresAdminRole(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	h := buildLoyaltyAdminHandler(&fakeAdminLoyaltyRepo{})
	res := httptest.NewRecorder()
	// No admin role in context → 403.
	req := httptest.NewRequest(stdhttp.MethodGet, "/api/v1/admin/loyalty/accounts", nil)
	h.ServeHTTP(res, req)
	if res.Code != stdhttp.StatusForbidden {
		t.Fatalf("expected 403 without admin role, got %d", res.Code)
	}
}
