package http

import (
	"bytes"
	"context"
	"database/sql"
	"encoding/json"
	stdhttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"taptrade/gateway/internal/alphacashier"
	"taptrade/gateway/internal/rbac"
	"taptrade/gateway/internal/wallet"
	"taptrade/platform/transport/httpx"
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
	if len(auditPayload.AuditEvents) != 1 ||
		auditPayload.AuditEvents[0].SubjectType != launchRedactedUserText ||
		auditPayload.AuditEvents[0].EventType != launchRedactedUserText {
		t.Fatalf("unexpected audit payload: %+v", auditPayload)
	}
	storedAudits, err := repo.ListAuditEvents(t.Context(), alphacashier.AuditEventFilter{EventType: "alpha_cashier.deposit_intent.created"})
	if err != nil {
		t.Fatalf("ListAuditEvents: %v", err)
	}
	if len(storedAudits) != 1 ||
		storedAudits[0].SubjectType != "deposit_intent" ||
		storedAudits[0].EventType != "alpha_cashier.deposit_intent.created" {
		t.Fatalf("redaction should not mutate stored audit event, got %+v", storedAudits)
	}
}

func TestAlphaCashierAdminRoutesRedactLegacyUnsafeReadPayloads(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	repo := alphacashier.NewMemoryRepository()
	svc := alphacashier.NewService(alphaCashierHTTPTestConfig(), repo)
	now := time.Date(2026, 5, 28, 4, 0, 0, 0, time.UTC)
	deposit, err := repo.SaveDepositIntent(t.Context(), alphacashier.DepositIntent{
		UserID:          "u-alpha-redact",
		ChainID:         8453,
		ChainName:       "base",
		TokenSymbol:     "USDC",
		TokenAddress:    "0x0000000000000000000000000000000000000001",
		TokenDecimals:   6,
		TreasuryAddress: "0x0000000000000000000000000000000000000002",
		FromAddress:     "0x0000000000000000000000000000000000000003",
		AmountCents:     2500,
		AmountUnits:     "25000000",
		Status:          "failed",
		FailureReason:   "cash payout failed",
		IdempotencyKey:  "dep-redact-1",
		ExpiresAt:       now.Add(time.Hour),
		CreatedAt:       now,
		UpdatedAt:       now,
	})
	if err != nil {
		t.Fatalf("SaveDepositIntent: %v", err)
	}
	withdrawal, err := repo.SaveWithdrawalRequest(t.Context(), alphacashier.WithdrawalRequest{
		UserID:             "u-alpha-redact",
		TokenSymbol:        "USDC",
		TokenAddress:       "0x0000000000000000000000000000000000000001",
		DestinationAddress: "0x0000000000000000000000000000000000000009",
		AmountCents:        2500,
		AmountUnits:        "25000000",
		Status:             "rejected",
		ReviewNote:         "cash payout review note",
		FailureReason:      "crypto prize release failed",
		IdempotencyKey:     "wd-redact-1",
		CreatedAt:          now,
		UpdatedAt:          now,
	})
	if err != nil {
		t.Fatalf("SaveWithdrawalRequest: %v", err)
	}
	if err := repo.RecordAudit(t.Context(), alphacashier.AuditEvent{
		SubjectType:  "withdrawal_request",
		SubjectID:    withdrawal.ID,
		EventType:    "alpha_cashier.withdrawal.reviewed",
		ActorType:    "admin",
		ActorID:      "admin-alpha",
		EventPayload: `{"note":"cash payout audit note","nested":["crypto prize review"],"safe":"manual review"}`,
		CreatedAt:    now,
	}); err != nil {
		t.Fatalf("RecordAudit: %v", err)
	}

	mux := stdhttp.NewServeMux()
	registerAlphaCashierAdminRoutes(mux, svc, nil)

	depositReq := adminAlphaReq(stdhttp.MethodGet, "/api/v1/admin/cashier/alpha/deposits?status=failed", "")
	depositRec := httptest.NewRecorder()
	mux.ServeHTTP(depositRec, depositReq)
	if depositRec.Code != stdhttp.StatusOK {
		t.Fatalf("deposits status=%d body=%s", depositRec.Code, depositRec.Body.String())
	}
	if strings.Contains(depositRec.Body.String(), "cash payout failed") {
		t.Fatalf("deposit response leaked unsafe failure reason: %s", depositRec.Body.String())
	}
	if strings.Contains(depositRec.Body.String(), "USDC") {
		t.Fatalf("deposit response leaked unsafe token symbol: %s", depositRec.Body.String())
	}
	var depositPayload struct {
		DepositIntents []alphacashier.DepositIntent `json:"depositIntents"`
	}
	if err := json.Unmarshal(depositRec.Body.Bytes(), &depositPayload); err != nil {
		t.Fatalf("decode deposit payload: %v", err)
	}
	if len(depositPayload.DepositIntents) != 1 ||
		depositPayload.DepositIntents[0].TokenSymbol != launchRedactedUserText ||
		depositPayload.DepositIntents[0].FailureReason != launchRedactedUserText {
		t.Fatalf("expected redacted deposit payload, got %+v", depositPayload)
	}

	withdrawalReq := adminAlphaReq(stdhttp.MethodGet, "/api/v1/admin/cashier/alpha/withdrawals?status=rejected", "")
	withdrawalRec := httptest.NewRecorder()
	mux.ServeHTTP(withdrawalRec, withdrawalReq)
	if withdrawalRec.Code != stdhttp.StatusOK {
		t.Fatalf("withdrawals status=%d body=%s", withdrawalRec.Code, withdrawalRec.Body.String())
	}
	if strings.Contains(withdrawalRec.Body.String(), "cash payout review note") || strings.Contains(withdrawalRec.Body.String(), "crypto prize release failed") {
		t.Fatalf("withdrawal response leaked unsafe stored text: %s", withdrawalRec.Body.String())
	}
	if strings.Contains(withdrawalRec.Body.String(), "USDC") {
		t.Fatalf("withdrawal response leaked unsafe token symbol: %s", withdrawalRec.Body.String())
	}
	var withdrawalPayload struct {
		WithdrawalRequests []alphacashier.WithdrawalRequest `json:"withdrawalRequests"`
	}
	if err := json.Unmarshal(withdrawalRec.Body.Bytes(), &withdrawalPayload); err != nil {
		t.Fatalf("decode withdrawal payload: %v", err)
	}
	if len(withdrawalPayload.WithdrawalRequests) != 1 ||
		withdrawalPayload.WithdrawalRequests[0].TokenSymbol != launchRedactedUserText ||
		withdrawalPayload.WithdrawalRequests[0].ReviewNote != launchRedactedUserText ||
		withdrawalPayload.WithdrawalRequests[0].FailureReason != launchRedactedUserText {
		t.Fatalf("expected redacted withdrawal text, got %+v", withdrawalPayload)
	}

	auditReq := adminAlphaReq(stdhttp.MethodGet, "/api/v1/admin/cashier/alpha/audit-events?eventType=alpha_cashier.withdrawal.reviewed", "")
	auditRec := httptest.NewRecorder()
	mux.ServeHTTP(auditRec, auditReq)
	if auditRec.Code != stdhttp.StatusOK {
		t.Fatalf("audit status=%d body=%s", auditRec.Code, auditRec.Body.String())
	}
	if strings.Contains(auditRec.Body.String(), "cash payout audit note") || strings.Contains(auditRec.Body.String(), "crypto prize review") {
		t.Fatalf("audit response leaked unsafe event payload: %s", auditRec.Body.String())
	}
	var auditPayload struct {
		AuditEvents []alphacashier.AuditEvent `json:"auditEvents"`
	}
	if err := json.Unmarshal(auditRec.Body.Bytes(), &auditPayload); err != nil {
		t.Fatalf("decode audit payload: %v", err)
	}
	if len(auditPayload.AuditEvents) != 1 ||
		auditPayload.AuditEvents[0].SubjectType != launchRedactedUserText ||
		auditPayload.AuditEvents[0].EventType != launchRedactedUserText ||
		!strings.Contains(auditPayload.AuditEvents[0].EventPayload, launchRedactedUserText) ||
		!strings.Contains(auditPayload.AuditEvents[0].EventPayload, "manual review") {
		t.Fatalf("expected redacted audit payload with safe text preserved, got %+v", auditPayload)
	}

	storedDeposit, err := repo.GetDepositIntent(t.Context(), deposit.ID)
	if err != nil {
		t.Fatalf("GetDepositIntent: %v", err)
	}
	if storedDeposit.TokenSymbol != "USDC" || storedDeposit.FailureReason != "cash payout failed" {
		t.Fatalf("redaction should not mutate stored deposit, got %+v", storedDeposit)
	}
	storedWithdrawal, err := repo.GetWithdrawalRequest(t.Context(), withdrawal.ID)
	if err != nil {
		t.Fatalf("GetWithdrawalRequest: %v", err)
	}
	if storedWithdrawal.TokenSymbol != "USDC" ||
		storedWithdrawal.ReviewNote != "cash payout review note" ||
		storedWithdrawal.FailureReason != "crypto prize release failed" {
		t.Fatalf("redaction should not mutate stored withdrawal, got %+v", storedWithdrawal)
	}
	storedAudits, err := repo.ListAuditEvents(t.Context(), alphacashier.AuditEventFilter{EventType: "alpha_cashier.withdrawal.reviewed"})
	if err != nil {
		t.Fatalf("ListAuditEvents: %v", err)
	}
	if len(storedAudits) != 1 || !strings.Contains(storedAudits[0].EventPayload, "cash payout audit note") {
		t.Fatalf("redaction should not mutate stored audit payload, got %+v", storedAudits)
	}
	if storedAudits[0].SubjectType != "withdrawal_request" || storedAudits[0].EventType != "alpha_cashier.withdrawal.reviewed" {
		t.Fatalf("redaction should not mutate stored audit event identifiers, got %+v", storedAudits)
	}
}

func TestAlphaCashierAdminPreflightRoute(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	mux := stdhttp.NewServeMux()
	svc := alphacashier.NewService(alphaCashierHTTPTestConfig(), alphacashier.NewMemoryRepository())
	svc.SetWalletLedger(&alphaHTTPFakeLedger{})
	rawReport := svc.Preflight(t.Context())
	if rawReport.TokenSymbol != "USDC" {
		t.Fatalf("test fixture should preserve raw token symbol, got %q", rawReport.TokenSymbol)
	}
	rawUnsafeMessage := false
	for _, check := range rawReport.Checks {
		if strings.Contains(strings.ToLower(check.Message), "withdrawal") {
			rawUnsafeMessage = true
			break
		}
	}
	if !rawUnsafeMessage {
		t.Fatalf("test fixture should include raw legacy unsafe preflight message: %+v", rawReport.Checks)
	}
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
	if payload.Preflight.TokenSymbol == "USDC" {
		t.Fatalf("preflight response should redact legacy token symbol: %+v", payload.Preflight)
	}
	for _, check := range payload.Preflight.Checks {
		assertNoAlphaCashierUnsafeLaunchCopy(t, check.Message)
		for _, value := range check.Metadata {
			if text, ok := value.(string); ok {
				assertNoAlphaCashierUnsafeLaunchCopy(t, text)
			}
		}
	}
}

func TestAlphaCashierAdminReconciliationRouteRedactsLegacyUnsafeValues(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	repo := alphacashier.NewMemoryRepository()
	svc := alphacashier.NewService(alphaCashierHTTPTestConfig(), repo)
	rawSummary, err := svc.ReconciliationSummary(t.Context())
	if err != nil {
		t.Fatalf("ReconciliationSummary: %v", err)
	}
	if rawSummary.TokenSymbol != "USDC" {
		t.Fatalf("test fixture should preserve raw token symbol, got %q", rawSummary.TokenSymbol)
	}

	mux := stdhttp.NewServeMux()
	registerAlphaCashierAdminRoutes(mux, svc, nil)

	req := adminAlphaReq(stdhttp.MethodGet, "/api/v1/admin/cashier/alpha/reconciliation", "")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	if rec.Code != stdhttp.StatusOK {
		t.Fatalf("reconciliation status=%d body=%s", rec.Code, rec.Body.String())
	}
	if strings.Contains(rec.Body.String(), "USDC") {
		t.Fatalf("reconciliation response leaked unsafe token symbol: %s", rec.Body.String())
	}
	var payload struct {
		Reconciliation alphacashier.ReconciliationSummary `json:"reconciliation"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode reconciliation: %v", err)
	}
	if payload.Reconciliation.TokenSymbol != launchRedactedUserText || payload.Reconciliation.ChainID != 8453 {
		t.Fatalf("expected redacted reconciliation token with inherited fields preserved, got %+v", payload.Reconciliation)
	}
	rawAfter, err := svc.ReconciliationSummary(t.Context())
	if err != nil {
		t.Fatalf("ReconciliationSummary after route: %v", err)
	}
	if rawAfter.TokenSymbol != "USDC" {
		t.Fatalf("redaction should not mutate raw service summary, got %+v", rawAfter)
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

func TestAlphaCashierAdminReviewNoteRejectsMoneyWordingBeforeService(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	repo := alphacashier.NewMemoryRepository()
	svc := alphacashier.NewService(alphaCashierHTTPTestConfig(), repo)
	ledger := &alphaHTTPFakeLedger{}
	svc.SetWalletLedger(ledger)
	req, err := svc.CreateWithdrawalRequest(t.Context(), "u-alpha", "0x0000000000000000000000000000000000000009", 2500, "wd-unsafe-note")
	if err != nil {
		t.Fatalf("CreateWithdrawalRequest: %v", err)
	}
	originalStatus := req.Status
	mux := stdhttp.NewServeMux()
	registerAlphaCashierAdminRoutes(mux, svc, nil)

	httpReq := httptest.NewRequest(stdhttp.MethodPost, "/api/v1/admin/cashier/alpha/withdrawals/"+req.ID+"/reject", bytes.NewBufferString(`{"reviewNote":"cash payout approval"}`))
	httpReq = httpReq.WithContext(httpx.WithTestUser(httpReq.Context(), "uid-admin@test", "admin@test", "admin"))
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, httpReq)
	if rec.Code != stdhttp.StatusBadRequest {
		t.Fatalf("reject unsafe note status got %d, want 400 body=%s", rec.Code, rec.Body.String())
	}
	if strings.Contains(rec.Body.String(), "cash payout approval") {
		t.Fatalf("unsafe review note was echoed in error response: %s", rec.Body.String())
	}
	stored, err := repo.GetWithdrawalRequest(t.Context(), req.ID)
	if err != nil {
		t.Fatalf("GetWithdrawalRequest: %v", err)
	}
	if stored.Status != originalStatus || stored.ReviewNote != "" {
		t.Fatalf("unsafe review note should be rejected before service persistence, got %+v", stored)
	}
	if len(ledger.released) != 0 {
		t.Fatalf("unsafe rejected review note should not release points, got %+v", ledger.released)
	}
}

func TestAlphaCashierAdminErrorsUseLaunchNeutralCopy(t *testing.T) {
	tests := []struct {
		name   string
		err    error
		status int
	}{
		{
			name:   "disabled",
			err:    alphacashier.ErrDisabled,
			status: stdhttp.StatusForbidden,
		},
		{
			name:   "external releases disabled",
			err:    alphacashier.ErrWithdrawalsDisabled,
			status: stdhttp.StatusForbidden,
		},
		{
			name:   "invalid status",
			err:    alphacashier.ErrInvalidStatus,
			status: stdhttp.StatusConflict,
		},
		{
			name:   "not found",
			err:    alphacashier.ErrWithdrawalNotFound,
			status: stdhttp.StatusNotFound,
		},
		{
			name:   "invalid tx hash",
			err:    alphacashier.ErrTxHashInvalid,
			status: stdhttp.StatusBadRequest,
		},
		{
			name:   "insufficient points",
			err:    wallet.ErrInsufficientFunds,
			status: stdhttp.StatusBadRequest,
		},
		{
			name:   "reservation",
			err:    wallet.ErrReservationExpired,
			status: stdhttp.StatusConflict,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			appErr := httpx.FromError(mapAlphaCashierAdminError(tt.err))
			if appErr == nil {
				t.Fatal("expected app error")
			}
			if appErr.Status != tt.status {
				t.Fatalf("status = %d, want %d", appErr.Status, tt.status)
			}
			for _, unsafe := range []string{"cashier", "withdrawal", "withdrawals", "wallet", "evm", "transaction"} {
				if strings.Contains(strings.ToLower(appErr.Message), unsafe) {
					t.Fatalf("legacy admin error leaked %q in %q", unsafe, appErr.Message)
				}
			}
		})
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

func assertNoAlphaCashierUnsafeLaunchCopy(t *testing.T, text string) {
	t.Helper()
	lower := strings.ToLower(text)
	for _, unsafe := range []string{"cashier", "deposit", "withdraw", "withdrawal", "crypto", "fiat", "payout", "usdc", "money", "redeemable"} {
		if strings.Contains(lower, unsafe) {
			t.Fatalf("response text contains unsafe launch copy %q in %q", unsafe, text)
		}
	}
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

func (l *alphaHTTPFakeLedger) Credit(_ context.Context, request wallet.MutationRequest) (wallet.LedgerEntry, error) {
	return wallet.LedgerEntry{
		EntryID:      "entry-" + request.IdempotencyKey,
		UserID:       request.UserID,
		AmountCents:  request.AmountCents,
		BalanceCents: request.AmountCents,
	}, nil
}

func (l *alphaHTTPFakeLedger) CreditWithTx(ctx context.Context, _ *sql.Tx, request wallet.MutationRequest) (wallet.LedgerEntry, error) {
	return l.Credit(ctx, request)
}

func (l *alphaHTTPFakeLedger) DB() *sql.DB { return nil }

func (l *alphaHTTPFakeLedger) Hold(_ context.Context, request wallet.HoldRequest) (wallet.Reservation, error) {
	return wallet.Reservation{
		ID:            "rsv-" + request.ReferenceID,
		UserID:        request.UserID,
		AmountCents:   request.AmountCents,
		ReferenceType: request.ReferenceType,
		ReferenceID:   request.ReferenceID,
		Status:        "held",
	}, nil
}

func (l *alphaHTTPFakeLedger) Release(_ context.Context, referenceType, referenceID string) error {
	l.released = append(l.released, referenceType+":"+referenceID)
	return nil
}

func (l *alphaHTTPFakeLedger) Capture(_ context.Context, referenceType, referenceID string) (wallet.LedgerEntry, error) {
	return wallet.LedgerEntry{
		EntryID: "captured-" + referenceType + "-" + referenceID,
	}, nil
}
