package http

import (
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"phoenix-revival/gateway/internal/makerchecker"
	"phoenix-revival/gateway/internal/wallet"
	"phoenix-revival/platform/transport/httpx"
)

// fakeAdjustExecutor records the wallet mutation the maker-checker path drives.
// failCreditsRemaining>0 makes the next N Credit calls fail (simulating a wallet
// outage after approval) before succeeding — for the GAP-61 retry test.
type fakeAdjustExecutor struct {
	credits, debits      int
	lastKey              string
	lastAmount           int64
	failCreditsRemaining int
}

func (f *fakeAdjustExecutor) Credit(_ context.Context, req wallet.MutationRequest) (wallet.LedgerEntry, error) {
	if f.failCreditsRemaining > 0 {
		f.failCreditsRemaining--
		return wallet.LedgerEntry{}, errors.New("wallet temporarily unavailable")
	}
	f.credits++
	f.lastKey = req.IdempotencyKey
	f.lastAmount = req.AmountCents
	return wallet.LedgerEntry{BalanceCents: 12345}, nil
}
func (f *fakeAdjustExecutor) Debit(_ context.Context, req wallet.MutationRequest) (wallet.LedgerEntry, error) {
	f.debits++
	f.lastKey = req.IdempotencyKey
	f.lastAmount = req.AmountCents
	return wallet.LedgerEntry{BalanceCents: 6789}, nil
}

// stubMCStore is an in-memory maker-checker store for the route tests.
type stubMCStore struct {
	actions    map[int64]*makerchecker.Action
	nextID     int64
	approveErr error
}

func newStubMCStore() *stubMCStore {
	return &stubMCStore{actions: map[int64]*makerchecker.Action{}, nextID: 1}
}
func (s *stubMCStore) CreatePending(_ context.Context, a makerchecker.Action) (*makerchecker.Action, error) {
	a.ID = s.nextID
	s.nextID++
	a.Status = "pending"
	cp := a
	s.actions[a.ID] = &cp
	return &cp, nil
}
func (s *stubMCStore) ListByStatus(_ context.Context, status string, _, _ int) ([]makerchecker.Action, error) {
	out := []makerchecker.Action{}
	for _, a := range s.actions {
		if status == "" || a.Status == status {
			out = append(out, *a)
		}
	}
	return out, nil
}
func (s *stubMCStore) GetAction(_ context.Context, id int64) (*makerchecker.Action, error) {
	a, ok := s.actions[id]
	if !ok {
		return nil, makerchecker.ErrNotFound
	}
	return a, nil
}
func (s *stubMCStore) Approve(_ context.Context, id int64, checker string) (*makerchecker.Action, error) {
	if s.approveErr != nil {
		return nil, s.approveErr
	}
	a, ok := s.actions[id]
	if !ok {
		return nil, makerchecker.ErrNotFound
	}
	if a.Status != "pending" {
		return nil, makerchecker.ErrNotPending
	}
	if a.MakerID == checker {
		return nil, makerchecker.ErrSameActor
	}
	a.Status = "approved"
	a.CheckerID = checker
	return a, nil
}
func (s *stubMCStore) MarkExecuted(_ context.Context, id int64) (bool, error) {
	a, ok := s.actions[id]
	if !ok || a.Status != "approved" || a.ExecutedAt != "" {
		return false, nil
	}
	a.ExecutedAt = "2026-07-03T00:00:00Z"
	return true, nil
}
func (s *stubMCStore) Reject(_ context.Context, id int64, checker, reason string) (*makerchecker.Action, error) {
	a, ok := s.actions[id]
	if !ok {
		return nil, makerchecker.ErrNotFound
	}
	if a.MakerID == checker {
		return nil, makerchecker.ErrSameActor
	}
	if reason == "" {
		return nil, makerchecker.ErrReasonEmpty
	}
	a.Status = "rejected"
	return a, nil
}

func newMCHarness(store makerCheckerStore, exec adjustmentExecutor) http.Handler {
	mux := http.NewServeMux()
	registerMakerCheckerRoutes(mux, store, exec)
	return httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
}

func mcReq(handler http.Handler, actor, method, path, body string) *httptest.ResponseRecorder {
	var r *http.Request
	if body != "" {
		r = httptest.NewRequest(method, path, strings.NewReader(body))
	} else {
		r = httptest.NewRequest(method, path, nil)
	}
	r = r.WithContext(httpx.WithTestUser(r.Context(), actor, actor+"@test.local", "admin"))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, r)
	return res
}

// Below-threshold adjustments execute directly.
func TestMCBelowThresholdExecutes(t *testing.T) {
	exec := &fakeAdjustExecutor{}
	handler := newMCHarness(newStubMCStore(), exec)
	res := mcReq(handler, "admin-A", http.MethodPost, "/api/v1/admin/finance/adjustments",
		`{"userId":"u-1","direction":"credit","amountPointsCents":9999,"reason":"small fix","idempotencyKey":"k1"}`)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200 direct-execute, got %d body=%s", res.Code, res.Body.String())
	}
	if exec.credits != 1 {
		t.Fatalf("below-threshold credit should execute once, got %d", exec.credits)
	}
	assertAMLAudit(t, "finance.adjustment_executed", "u-1")
}

// At/above threshold queues for a second approver — nothing executes yet.
func TestMCAtThresholdQueues(t *testing.T) {
	exec := &fakeAdjustExecutor{}
	handler := newMCHarness(newStubMCStore(), exec)
	res := mcReq(handler, "admin-A", http.MethodPost, "/api/v1/admin/finance/adjustments",
		`{"userId":"u-1","direction":"credit","amountPointsCents":10000,"reason":"big fix","idempotencyKey":"k2"}`)
	if res.Code != http.StatusAccepted {
		t.Fatalf("expected 202 queued, got %d body=%s", res.Code, res.Body.String())
	}
	if exec.credits != 0 {
		t.Fatalf("queued adjustment must not execute yet, got %d credits", exec.credits)
	}
	assertAMLAudit(t, "finance.adjustment_proposed", "u-1")
}

// A different admin approves → executes with the stored idempotency key.
func TestMCApproveExecutes(t *testing.T) {
	store := newStubMCStore()
	exec := &fakeAdjustExecutor{}
	store.CreatePending(context.Background(), makerchecker.Action{
		ID: 0, SubjectID: "u-1", Direction: "debit", AmountCents: 20000, Reason: "clawback",
		IdempotencyKey: "k3", MakerID: "admin-A",
	})
	handler := newMCHarness(store, exec)

	// Maker cannot approve their own.
	self := mcReq(handler, "admin-A", http.MethodPost, "/api/v1/admin/finance/adjustments/pending/1/approve", "")
	if self.Code != http.StatusForbidden {
		t.Fatalf("self-approve: expected 403, got %d", self.Code)
	}
	if exec.debits != 0 {
		t.Fatal("self-approve must not execute")
	}
	// A different admin can.
	ok := mcReq(handler, "admin-B", http.MethodPost, "/api/v1/admin/finance/adjustments/pending/1/approve", "")
	if ok.Code != http.StatusOK {
		t.Fatalf("approve: expected 200, got %d body=%s", ok.Code, ok.Body.String())
	}
	if exec.debits != 1 || exec.lastKey != "k3" || exec.lastAmount != 20000 {
		t.Fatalf("approve should debit once with the stored key: debits=%d key=%s amt=%d", exec.debits, exec.lastKey, exec.lastAmount)
	}
	assertAMLAudit(t, "finance.adjustment_approved", "u-1")
}

func TestMCRejectAudited(t *testing.T) {
	store := newStubMCStore()
	store.CreatePending(context.Background(), makerchecker.Action{
		SubjectID: "u-1", Direction: "credit", AmountCents: 30000, Reason: "x", IdempotencyKey: "k4", MakerID: "admin-A",
	})
	handler := newMCHarness(store, &fakeAdjustExecutor{})
	res := mcReq(handler, "admin-B", http.MethodPost, "/api/v1/admin/finance/adjustments/pending/1/reject",
		`{"reason":"insufficient justification"}`)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	assertAMLAudit(t, "finance.adjustment_rejected", "u-1")
}

func TestMCRoutesRejectNonAdmin(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	handler := newMCHarness(newStubMCStore(), &fakeAdjustExecutor{})
	for _, tc := range []struct{ method, path string }{
		{http.MethodPost, "/api/v1/admin/finance/adjustments"},
		{http.MethodGet, "/api/v1/admin/finance/adjustments/pending"},
		{http.MethodPost, "/api/v1/admin/finance/adjustments/pending/1/approve"},
	} {
		r := httptest.NewRequest(tc.method, tc.path, strings.NewReader("{}"))
		r = r.WithContext(httpx.WithTestUser(r.Context(), "u-p", "player@test.local", "player"))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, r)
		if res.Code != http.StatusForbidden && res.Code != http.StatusUnauthorized {
			t.Fatalf("%s %s: expected rejection, got %d", tc.method, tc.path, res.Code)
		}
	}
}

// The direct credit/debit routes refuse amounts at/above the threshold.
func TestRequireDualApprovalThreshold(t *testing.T) {
	if err := requireDualApproval(9999); err != nil {
		t.Fatalf("below threshold must pass, got %v", err)
	}
	if err := requireDualApproval(10000); err == nil {
		t.Fatal("at threshold must be refused")
	}
	if err := requireDualApproval(50000); err == nil {
		t.Fatal("above threshold must be refused")
	}
}

// TestMCApprovedButUnexecutedCanBeRetried proves GAP-61: when the wallet move
// fails AFTER approval, the action is stuck approved-but-unexecuted, and the
// idempotency-keyed /execute retry settles it — without double-moving money.
func TestMCApprovedButUnexecutedCanBeRetried(t *testing.T) {
	store := newStubMCStore()
	exec := &fakeAdjustExecutor{failCreditsRemaining: 1} // the approve-time execute fails once
	handler := newMCHarness(store, exec)

	// Submit an at-threshold adjustment (queues for a second approver).
	if res := mcReq(handler, "admin-A", http.MethodPost, "/api/v1/admin/finance/adjustments",
		`{"userId":"u-9","direction":"credit","amountPointsCents":10000,"reason":"big fix","idempotencyKey":"kx"}`); res.Code != http.StatusAccepted {
		t.Fatalf("submit: expected 202, got %d body=%s", res.Code, res.Body.String())
	}

	// A second approver approves, but the wallet move fails → stuck approved.
	res := mcReq(handler, "admin-B", http.MethodPost, "/api/v1/admin/finance/adjustments/pending/1/approve", "")
	if res.Code == http.StatusOK {
		t.Fatalf("approve should surface the wallet failure, got 200 body=%s", res.Body.String())
	}
	assertAMLAudit(t, "finance.adjustment_approve_failed", "u-9")
	if got := store.actions[1]; got.Status != "approved" || got.ExecutedAt != "" {
		t.Fatalf("want approved-but-unexecuted, got status=%q executedAt=%q", got.Status, got.ExecutedAt)
	}
	if exec.credits != 0 {
		t.Fatalf("no successful credit yet, got %d", exec.credits)
	}

	// Retry via /execute: the wallet move now succeeds and the action settles.
	res = mcReq(handler, "admin-B", http.MethodPost, "/api/v1/admin/finance/adjustments/pending/1/execute", "")
	if res.Code != http.StatusOK {
		t.Fatalf("execute retry: expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	if exec.credits != 1 {
		t.Fatalf("retry should execute the credit exactly once, got %d", exec.credits)
	}
	assertAMLAudit(t, "finance.adjustment_executed", "u-9")
	if got := store.actions[1]; got.ExecutedAt == "" {
		t.Fatal("action should be marked executed after the retry")
	}

	// Re-executing an already-executed action is refused (no double-move).
	res = mcReq(handler, "admin-B", http.MethodPost, "/api/v1/admin/finance/adjustments/pending/1/execute", "")
	if res.Code != http.StatusConflict {
		t.Fatalf("second execute: expected 409, got %d body=%s", res.Code, res.Body.String())
	}
	if exec.credits != 1 {
		t.Fatalf("no double credit on repeat execute, got %d", exec.credits)
	}
}

// TestMCExecuteRejectsIneligible guards the /execute path: unknown id → 404,
// a still-pending (unapproved) action → 409.
func TestMCExecuteRejectsIneligible(t *testing.T) {
	store := newStubMCStore()
	handler := newMCHarness(store, &fakeAdjustExecutor{})

	if res := mcReq(handler, "admin-B", http.MethodPost, "/api/v1/admin/finance/adjustments/pending/999/execute", ""); res.Code != http.StatusNotFound {
		t.Fatalf("execute unknown id: expected 404, got %d", res.Code)
	}
	if res := mcReq(handler, "admin-A", http.MethodPost, "/api/v1/admin/finance/adjustments",
		`{"userId":"u-2","direction":"debit","amountPointsCents":10000,"reason":"x","idempotencyKey":"kp"}`); res.Code != http.StatusAccepted {
		t.Fatalf("submit: expected 202, got %d", res.Code)
	}
	if res := mcReq(handler, "admin-B", http.MethodPost, "/api/v1/admin/finance/adjustments/pending/1/execute", ""); res.Code != http.StatusConflict {
		t.Fatalf("execute a pending (unapproved) action: expected 409, got %d", res.Code)
	}
}
