package http

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"phoenix-revival/platform/transport/httpx"
)

func TestWalletCreditDebitBalanceAndLedgerFlow(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditPayload := []byte(`{"userId":"u-wallet-1","amountCents":1000,"idempotencyKey":"credit-1","reason":"deposit"}`)
	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", bytes.NewBuffer(creditPayload))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("expected credit status 200, got %d, body=%s", creditRes.Code, creditRes.Body.String())
	}

	debitPayload := []byte(`{"userId":"u-wallet-1","amountCents":400,"idempotencyKey":"debit-1","reason":"bet"}`)
	debitReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/debit", bytes.NewBuffer(debitPayload))
	debitRes := httptest.NewRecorder()
	handler.ServeHTTP(debitRes, debitReq)
	if debitRes.Code != http.StatusOK {
		t.Fatalf("expected debit status 200, got %d, body=%s", debitRes.Code, debitRes.Body.String())
	}

	balanceReq := httptest.NewRequest(http.MethodGet, "/api/v1/wallet/u-wallet-1", nil)
	balanceRes := httptest.NewRecorder()
	handler.ServeHTTP(balanceRes, balanceReq)
	if balanceRes.Code != http.StatusOK {
		t.Fatalf("expected balance status 200, got %d, body=%s", balanceRes.Code, balanceRes.Body.String())
	}

	var balancePayload map[string]any
	if err := json.Unmarshal(balanceRes.Body.Bytes(), &balancePayload); err != nil {
		t.Fatalf("decode balance payload: %v", err)
	}
	if int(balancePayload["balanceCents"].(float64)) != 600 {
		t.Fatalf("expected balance 600, got %v", balancePayload["balanceCents"])
	}

	ledgerReq := httptest.NewRequest(http.MethodGet, "/api/v1/wallet/u-wallet-1/ledger?limit=10", nil)
	ledgerRes := httptest.NewRecorder()
	handler.ServeHTTP(ledgerRes, ledgerReq)
	if ledgerRes.Code != http.StatusOK {
		t.Fatalf("expected ledger status 200, got %d, body=%s", ledgerRes.Code, ledgerRes.Body.String())
	}

	var ledgerPayload struct {
		Items []map[string]any `json:"items"`
		Total int              `json:"total"`
	}
	if err := json.Unmarshal(ledgerRes.Body.Bytes(), &ledgerPayload); err != nil {
		t.Fatalf("decode ledger payload: %v", err)
	}
	if ledgerPayload.Total != 2 || len(ledgerPayload.Items) != 2 {
		t.Fatalf("expected two ledger entries, got total=%d len=%d", ledgerPayload.Total, len(ledgerPayload.Items))
	}
}

func TestWalletCreditIsIdempotentAcrossRetries(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	payload := []byte(`{"userId":"u-wallet-2","amountCents":750,"idempotencyKey":"credit-unique","reason":"deposit"}`)

	firstReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", bytes.NewBuffer(payload))
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("first credit failed: status=%d body=%s", firstRes.Code, firstRes.Body.String())
	}

	secondReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", bytes.NewBuffer(payload))
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusOK {
		t.Fatalf("second credit failed: status=%d body=%s", secondRes.Code, secondRes.Body.String())
	}

	var firstPayload map[string]any
	var secondPayload map[string]any
	if err := json.Unmarshal(firstRes.Body.Bytes(), &firstPayload); err != nil {
		t.Fatalf("decode first response: %v", err)
	}
	if err := json.Unmarshal(secondRes.Body.Bytes(), &secondPayload); err != nil {
		t.Fatalf("decode second response: %v", err)
	}

	firstEntry := firstPayload["entry"].(map[string]any)
	secondEntry := secondPayload["entry"].(map[string]any)
	if firstEntry["entryId"] != secondEntry["entryId"] {
		t.Fatalf("expected same entryId on idempotent replay, got %v vs %v", firstEntry["entryId"], secondEntry["entryId"])
	}
	if int(secondPayload["balanceCents"].(float64)) != 750 {
		t.Fatalf("expected stable balance 750 after retry, got %v", secondPayload["balanceCents"])
	}
}

func TestWalletDebitInsufficientFundsReturnsForbidden(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	debitPayload := []byte(`{"userId":"u-wallet-3","amountCents":200,"idempotencyKey":"debit-insufficient","reason":"bet"}`)
	debitReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/debit", bytes.NewBuffer(debitPayload))
	debitRes := httptest.NewRecorder()
	handler.ServeHTTP(debitRes, debitReq)

	if debitRes.Code != http.StatusForbidden {
		t.Fatalf("expected debit status 403, got %d, body=%s", debitRes.Code, debitRes.Body.String())
	}

	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(debitRes.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode error payload: %v", err)
	}
	if envelope.Error.Code != httpx.CodeForbidden {
		t.Fatalf("expected error code %q, got %q", httpx.CodeForbidden, envelope.Error.Code)
	}
}

func TestWalletIdempotencyReplayConflictReturnsConflict(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	firstPayload := []byte(`{"userId":"u-wallet-4","amountCents":500,"idempotencyKey":"dup-key","reason":"first"}`)
	firstReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", bytes.NewBuffer(firstPayload))
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first credit status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}

	conflictPayload := []byte(`{"userId":"u-wallet-4","amountCents":700,"idempotencyKey":"dup-key","reason":"changed"}`)
	conflictReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", bytes.NewBuffer(conflictPayload))
	conflictRes := httptest.NewRecorder()
	handler.ServeHTTP(conflictRes, conflictReq)
	if conflictRes.Code != http.StatusConflict {
		t.Fatalf("expected conflict status 409, got %d, body=%s", conflictRes.Code, conflictRes.Body.String())
	}

	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(conflictRes.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode error payload: %v", err)
	}
	if envelope.Error.Code != httpx.CodeConflict {
		t.Fatalf("expected error code %q, got %q", httpx.CodeConflict, envelope.Error.Code)
	}
}
