package http

import (
	"bytes"
	"encoding/json"
	stdhttp "net/http"
	"net/http/httptest"
	"testing"
	"time"

	"phoenix-revival/gateway/internal/alphacashier"
	"phoenix-revival/gateway/internal/rbac"
	"phoenix-revival/gateway/internal/wallet"
	"phoenix-revival/platform/transport/httpx"
)

func TestAlphaCashierAdminRoutesExposeDepositsAndAudit(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	repo := alphacashier.NewMemoryRepository()
	svc := alphacashier.NewService(alphaCashierHTTPTestConfig(), repo)
	now := time.Date(2026, 5, 28, 3, 0, 0, 0, time.UTC)
	if _, err := repo.SaveDepositIntent(t.Context(), alphacashier.DepositIntent{
		UserID:          "u-alpha",
		ChainID:         8453,
		ChainName:       "base",
		TokenSymbol:     "USDC",
		TokenAddress:    "0x0000000000000000000000000000000000000001",
		TokenDecimals:   6,
		TreasuryAddress: "0x0000000000000000000000000000000000000002",
		FromAddress:     "0x0000000000000000000000000000000000000003",
		AmountCents:     2500,
		AmountUnits:     "25000000",
		Status:          "created",
		IdempotencyKey:  "dep-1",
		ExpiresAt:       now.Add(time.Hour),
		CreatedAt:       now,
		UpdatedAt:       now,
	}); err != nil {
		t.Fatalf("SaveDepositIntent: %v", err)
	}
	if err := repo.RecordAudit(t.Context(), alphacashier.AuditEvent{
		SubjectType:  "deposit_intent",
		SubjectID:    "adi:mem:1",
		EventType:    "alpha_cashier.deposit_intent.created",
		ActorType:    "user",
		ActorID:      "u-alpha",
		EventPayload: `{"amountCents":2500}`,
		CreatedAt:    now,
	}); err != nil {
		t.Fatalf("RecordAudit: %v", err)
	}

	mux := stdhttp.NewServeMux()
	registerAlphaCashierAdminRoutes(mux, svc, nil)

	depositReq := adminAlphaReq(stdhttp.MethodGet, "/api/v1/admin/cashier/alpha/deposits?status=created", "")
	depositRec := httptest.NewRecorder()
	mux.ServeHTTP(depositRec, depositReq)
	if depositRec.Code != stdhttp.StatusOK {
		t.Fatalf("deposits status=%d body=%s", depositRec.Code, depositRec.Body.String())
	}
	var depositPayload struct {
		DepositIntents []alphacashier.DepositIntent `json:"depositIntents"`
	}
	if err := json.Unmarshal(depositRec.Body.Bytes(), &depositPayload); err != nil {
		t.Fatalf("decode deposits: %v", err)
	}
	if len(depositPayload.DepositIntents) != 1 || depositPayload.DepositIntents[0].UserID != "u-alpha" {
		t.Fatalf("unexpected deposits payload: %+v", depositPayload)
	}

	auditReq := adminAlphaReq(stdhttp.MethodGet, "/api/v1/admin/cashier/alpha/audit-events?eventType=alpha_cashier.deposit_intent.created", "")
	auditRec := httptest.NewRecorder()
	mux.ServeHTTP(auditRec, auditReq)
	if auditRec.Code != stdhttp.StatusOK {
		t.Fatalf("audit status=%d body=%s", auditRec.Code, auditRec.Body.String())
	}
	var auditPayload struct {
		AuditEvents []alphacashier.AuditEvent `json:"auditEvents"`
	}
	if err := json.Unmarshal(auditRec.Body.Bytes(), &auditPayload); err != nil {
		t.Fatalf("decode audit: %v", err)
	}
	if len(auditPayload.AuditEvents) != 1 || auditPayload.AuditEvents[0].EventType != "alpha_cashier.deposit_intent.created" {
		t.Fatalf("unexpected audit payload: %+v", auditPayload)
	}
}

func TestAlphaCashierAdminPreflightRoute(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	mux := stdhttp.NewServeMux()
	svc := alphacashier.NewService(alphaCashierHTTPTestConfig(), alphacashier.NewMemoryRepository())
	svc.SetWalletLedger(&alphaHTTPFakeLedger{})
	registerAlphaCashierAdminRoutes(mux, svc, nil)

	req := adminAlphaReq(stdhttp.MethodGet, "/api/v1/admin/cashier/alpha/preflight", "")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != stdhttp.StatusOK {
		t.Fatalf("preflight status=%d body=%s", rec.Code, rec.Body.String())
	}
	var payload struct {
		Preflight alphacashier.PreflightReport `json:"preflight"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode preflight: %v", err)
	}
	if payload.Preflight.Overall == "" || len(payload.Preflight.Checks) == 0 {
		t.Fatalf("unexpected preflight payload: %+v", payload.Preflight)
	}
}

func TestAlphaCashierAdminRoutesRequireCashierRBACPermissions(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	mux := stdhttp.NewServeMux()
	svc := alphacashier.NewService(alphaCashierHTTPTestConfig(), alphacashier.NewMemoryRepository())
	fakeRBAC := &rbacHandlerFake{
		perms: map[string]map[string]struct{}{
			"reader@test": {"cashier:read": {}},
			"writer@test": {"cashier:write": {}},
			"noperm@test": {},
		},
	}
	registerAlphaCashierAdminRoutes(mux, svc, rbac.NewService(fakeRBAC))

	noRead := doAlphaAdminAs(t, mux, stdhttp.MethodGet, "/api/v1/admin/cashier/alpha/withdrawals", "noperm@test", "")
	if noRead != stdhttp.StatusForbidden {
		t.Fatalf("read without cashier:read got %d, want 403", noRead)
	}
	read := doAlphaAdminAs(t, mux, stdhttp.MethodGet, "/api/v1/admin/cashier/alpha/withdrawals", "reader@test", "")
	if read != stdhttp.StatusOK {
		t.Fatalf("read with cashier:read got %d, want 200", read)
	}
	noWrite := doAlphaAdminAs(t, mux, stdhttp.MethodPost, "/api/v1/admin/cashier/alpha/withdrawals/missing/approve", "reader@test", "{}")
	if noWrite != stdhttp.StatusForbidden {
		t.Fatalf("write without cashier:write got %d, want 403", noWrite)
	}
	write := doAlphaAdminAs(t, mux, stdhttp.MethodPost, "/api/v1/admin/cashier/alpha/withdrawals/missing/approve", "writer@test", "{}")
	if write != stdhttp.StatusNotFound {
		t.Fatalf("write with cashier:write got %d, want 404 after permission passes", write)
	}
}

func TestAlphaCashierAdminRejectReleasesHeldFunds(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	repo := alphacashier.NewMemoryRepository()
	svc := alphacashier.NewService(alphaCashierHTTPTestConfig(), repo)
	ledger := &alphaHTTPFakeLedger{}
	svc.SetWalletLedger(ledger)
	req, err := svc.CreateWithdrawalRequest(t.Context(), "u-alpha", "0x0000000000000000000000000000000000000009", 2500, "wd-1")
	if err != nil {
		t.Fatalf("CreateWithdrawalRequest: %v", err)
	}
	mux := stdhttp.NewServeMux()
	registerAlphaCashierAdminRoutes(mux, svc, nil)

	status := doAlphaAdminAs(t, mux, stdhttp.MethodPost, "/api/v1/admin/cashier/alpha/withdrawals/"+req.ID+"/reject", "admin@test", `{"reviewNote":"operator rejected destination"}`)
	if status != stdhttp.StatusOK {
		t.Fatalf("reject status got %d, want 200", status)
	}
	if len(ledger.released) != 1 {
		t.Fatalf("release calls got %d, want 1", len(ledger.released))
	}
}

func adminAlphaReq(method, path, body string) *stdhttp.Request {
	req := httptest.NewRequest(method, path, bytes.NewBufferString(body))
	return req.WithContext(httpx.WithTestUser(req.Context(), "admin-1", "admin@test", "admin"))
}

func doAlphaAdminAs(t *testing.T, mux *stdhttp.ServeMux, method, path, email, body string) int {
	t.Helper()
	req := httptest.NewRequest(method, path, bytes.NewBufferString(body))
	req = req.WithContext(httpx.WithTestUser(req.Context(), "uid-"+email, email, "admin"))
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	return rec.Code
}

func alphaCashierHTTPTestConfig() alphacashier.Config {
	return alphacashier.Config{
		Enabled:                true,
		ChainID:                8453,
		ChainName:              "base",
		RPCURL:                 "https://rpc.example",
		TokenSymbol:            "USDC",
		TokenAddress:           "0x0000000000000000000000000000000000000001",
		TokenDecimals:          6,
		TreasuryAddress:        "0x0000000000000000000000000000000000000002",
		Confirmations:          12,
		MinDepositCents:        100,
		MaxDepositCents:        25000,
		DailyDepositLimitCents: 100000,
		WithdrawalsEnabled:     true,
		WithdrawalReviewNeeded: true,
	}
}

type alphaHTTPFakeLedger struct {
	released []string
}

func (l *alphaHTTPFakeLedger) Credit(request wallet.MutationRequest) (wallet.LedgerEntry, error) {
	return wallet.LedgerEntry{
		EntryID:      "entry-" + request.IdempotencyKey,
		UserID:       request.UserID,
		AmountCents:  request.AmountCents,
		BalanceCents: request.AmountCents,
	}, nil
}

func (l *alphaHTTPFakeLedger) Hold(request wallet.HoldRequest) (wallet.Reservation, error) {
	return wallet.Reservation{
		ID:            "rsv-" + request.ReferenceID,
		UserID:        request.UserID,
		AmountCents:   request.AmountCents,
		ReferenceType: request.ReferenceType,
		ReferenceID:   request.ReferenceID,
		Status:        "held",
	}, nil
}

func (l *alphaHTTPFakeLedger) Release(referenceType, referenceID string) error {
	l.released = append(l.released, referenceType+":"+referenceID)
	return nil
}

func (l *alphaHTTPFakeLedger) Capture(referenceType, referenceID string) (wallet.LedgerEntry, error) {
	return wallet.LedgerEntry{
		EntryID: "captured-" + referenceType + "-" + referenceID,
	}, nil
}
