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
		Items      []map[string]any `json:"items"`
		Pagination struct {
			Total int `json:"total"`
		} `json:"pagination"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(payload.Items) != 1 || payload.Items[0]["playerId"] != "u-1" {
		t.Fatalf("unexpected items: %+v", payload.Items)
	}
	// 5175 points -> Sharp rank, next is Whale (10000 - 5175 = 4825 to next).
	if payload.Items[0]["rankName"] != "Sharp" || int64(payload.Items[0]["xpToNextRank"].(float64)) != 4825 {
		t.Fatalf("rank math wrong: %+v", payload.Items[0])
	}
	if payload.Items[0]["unit"] != "PTS" {
		t.Fatalf("expected PTS unit, got %+v", payload.Items[0]["unit"])
	}
	for _, retired := range []string{"currentTier", "nextTier", "pointsToNextTier"} {
		if _, ok := payload.Items[0][retired]; ok {
			t.Fatalf("admin loyalty account list should not emit retired alias %q in %+v", retired, payload.Items[0])
		}
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
		Account map[string]any          `json:"account"`
		Ledger  []map[string]any        `json:"ledger"`
		Tiers   []loyalty.AdminTierView `json:"tiers"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if payload.Account == nil || payload.Account["playerId"] != "u-1" || payload.Account["rankName"] != "Trader" {
		t.Fatalf("unexpected account: %+v", payload.Account)
	}
	if payload.Account["unit"] != "PTS" {
		t.Fatalf("expected PTS unit, got %+v", payload.Account["unit"])
	}
	for _, retired := range []string{"currentTier", "nextTier", "pointsToNextTier"} {
		if _, ok := payload.Account[retired]; ok {
			t.Fatalf("admin loyalty account detail should not emit retired alias %q in %+v", retired, payload.Account)
		}
	}
	if len(payload.Ledger) != 1 || payload.Ledger[0]["entryType"] != "accrual" {
		t.Fatalf("unexpected ledger: %+v", payload.Ledger)
	}
	if len(payload.Tiers) != 5 {
		t.Fatalf("expected 5 tiers (Newcomer..Legend), got %d", len(payload.Tiers))
	}
}

func TestLoyaltyAdminAccountDetailRedactsLegacyUnsafeLedgerReason(t *testing.T) {
	entry := loyalty.PredictLedgerEntry{
		ID: 1, UserID: "u-legacy-loyalty", EventType: "adjustment",
		DeltaPoints: 250, BalanceAfter: 250, Reason: "cash payout loyalty bonus",
		CreatedAt: time.Now(),
	}
	repo := &fakeAdminLoyaltyRepo{
		accounts: []loyalty.PredictAdminAccountRow{
			{UserID: "u-legacy-loyalty", PointsBalance: 250, EarnedLifetime: 250},
		},
		ledger: []loyalty.PredictLedgerEntry{entry},
	}
	h := buildLoyaltyAdminHandler(repo)

	res := httptest.NewRecorder()
	h.ServeHTTP(res, adminReq(stdhttp.MethodGet, "/api/v1/admin/loyalty/accounts/u-legacy-loyalty?limit=5", ""))
	if res.Code != stdhttp.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	var payload struct {
		Ledger []map[string]any `json:"ledger"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if len(payload.Ledger) != 1 {
		t.Fatalf("expected one ledger entry, got %+v", payload.Ledger)
	}
	metadata, ok := payload.Ledger[0]["metadata"].(map[string]any)
	if !ok {
		t.Fatalf("expected metadata object, got %+v", payload.Ledger[0]["metadata"])
	}
	if metadata["reason"] != launchRedactedUserText {
		t.Fatalf("unsafe admin ledger reason should be redacted, got %#v", metadata["reason"])
	}
	if repo.ledger[0].Reason != entry.Reason {
		t.Fatalf("raw ledger reason should remain available for review, got %q", repo.ledger[0].Reason)
	}
	if strings.Contains(res.Body.String(), "cash payout") {
		t.Fatalf("unsafe loyalty reason should not be echoed: %s", res.Body.String())
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

func TestLoyaltyAdminAdjustmentRejectsMoneyWording(t *testing.T) {
	repo := &fakeAdminLoyaltyRepo{balance: 600}
	h := buildLoyaltyAdminHandler(repo)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, adminReq(stdhttp.MethodPost, "/api/v1/admin/loyalty/adjustments",
		`{"playerId":"u-1","pointsDelta":10,"reason":"cash prize adjustment","idempotencyKey":"unsafe-loyalty-reason"}`))
	if res.Code != stdhttp.StatusBadRequest {
		t.Fatalf("expected 400 for unsafe reason, got %d body=%s", res.Code, res.Body.String())
	}
	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode unsafe-reason error: %v", err)
	}
	details, ok := envelope.Error.Details.(map[string]any)
	if !ok || details["field"] != "reason" {
		t.Fatalf("expected reason error field, got %+v", envelope.Error.Details)
	}
	if strings.Contains(res.Body.String(), "cash prize") {
		t.Fatalf("unsafe loyalty reason should not be echoed: %s", res.Body.String())
	}
	if repo.balance != 600 {
		t.Fatalf("unsafe loyalty reason should not adjust balance, got %d", repo.balance)
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

func TestPredictLoyaltyAdminTierRejectsMoneyWordingBenefits(t *testing.T) {
	h := buildLoyaltyAdminHandler(&fakeAdminLoyaltyRepo{})
	res := httptest.NewRecorder()
	h.ServeHTTP(res, adminReq(stdhttp.MethodPut, "/api/v1/admin/loyalty/tiers/trader",
		`{"displayName":"Trader","rank":2,"minLifetimePoints":500,"minRolling30dPoints":0,"benefits":{"statusBoost":"cash prize priority"},"active":true}`))

	if res.Code != stdhttp.StatusBadRequest {
		t.Fatalf("expected unsafe tier benefit status 400, got %d body=%s", res.Code, res.Body.String())
	}
	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode unsafe-benefit error: %v", err)
	}
	details, ok := envelope.Error.Details.(map[string]any)
	if !ok || details["field"] != "benefits" {
		t.Fatalf("expected benefits error field, got %+v", envelope.Error.Details)
	}
	if strings.Contains(res.Body.String(), "cash prize") {
		t.Fatalf("unsafe tier benefit should not be echoed: %s", res.Body.String())
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
