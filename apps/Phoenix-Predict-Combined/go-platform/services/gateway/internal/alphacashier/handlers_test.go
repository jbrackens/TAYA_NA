package alphacashier

import (
	"encoding/json"
	stdhttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"phoenix-revival/gateway/internal/wallet"
	"phoenix-revival/platform/transport/httpx"
)

func TestAlphaCashierUserRoutesRedactLegacyUnsafeReadPayloads(t *testing.T) {
	repo := NewMemoryRepository()
	svc := NewService(alphaCashierHandlerTestConfig(), repo)
	now := time.Date(2026, 7, 1, 7, 5, 0, 0, time.UTC)
	deposit, err := repo.SaveDepositIntent(t.Context(), DepositIntent{
		UserID:          "u-alpha-user",
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
		IdempotencyKey:  "dep-user-redact-1",
		ExpiresAt:       now.Add(time.Hour),
		CreatedAt:       now,
		UpdatedAt:       now,
	})
	if err != nil {
		t.Fatalf("SaveDepositIntent: %v", err)
	}
	withdrawal, err := repo.SaveWithdrawalRequest(t.Context(), WithdrawalRequest{
		UserID:             "u-alpha-user",
		TokenSymbol:        "USDC",
		TokenAddress:       "0x0000000000000000000000000000000000000001",
		DestinationAddress: "0x0000000000000000000000000000000000000009",
		AmountCents:        2500,
		AmountUnits:        "25000000",
		Status:             "rejected",
		ReviewNote:         "cash payout review note",
		FailureReason:      "crypto prize release failed",
		IdempotencyKey:     "wd-user-redact-1",
		CreatedAt:          now,
		UpdatedAt:          now,
	})
	if err != nil {
		t.Fatalf("SaveWithdrawalRequest: %v", err)
	}

	mux := stdhttp.NewServeMux()
	RegisterRoutes(mux, svc)

	depositList := serveAlphaUser(t, mux, stdhttp.MethodGet, "/api/v1/cashier/alpha/deposit-intents", "u-alpha-user", "")
	if depositList.Code != stdhttp.StatusOK {
		t.Fatalf("deposit list status=%d body=%s", depositList.Code, depositList.Body.String())
	}
	if strings.Contains(depositList.Body.String(), "cash payout failed") {
		t.Fatalf("deposit list leaked unsafe failure reason: %s", depositList.Body.String())
	}
	if strings.Contains(depositList.Body.String(), "USDC") {
		t.Fatalf("deposit list leaked unsafe token symbol: %s", depositList.Body.String())
	}
	var depositListPayload struct {
		DepositIntents []DepositIntent `json:"depositIntents"`
	}
	if err := json.Unmarshal(depositList.Body.Bytes(), &depositListPayload); err != nil {
		t.Fatalf("decode deposit list: %v", err)
	}
	if len(depositListPayload.DepositIntents) != 1 ||
		depositListPayload.DepositIntents[0].TokenSymbol != alphaLaunchRedactedUserText ||
		depositListPayload.DepositIntents[0].FailureReason != alphaLaunchRedactedUserText {
		t.Fatalf("expected redacted deposit list payload, got %+v", depositListPayload)
	}

	depositDetail := serveAlphaUser(t, mux, stdhttp.MethodGet, "/api/v1/cashier/alpha/deposit-intents/"+deposit.ID, "u-alpha-user", "")
	if depositDetail.Code != stdhttp.StatusOK {
		t.Fatalf("deposit detail status=%d body=%s", depositDetail.Code, depositDetail.Body.String())
	}
	if strings.Contains(depositDetail.Body.String(), "cash payout failed") {
		t.Fatalf("deposit detail leaked unsafe failure reason: %s", depositDetail.Body.String())
	}
	if strings.Contains(depositDetail.Body.String(), "USDC") {
		t.Fatalf("deposit detail leaked unsafe token symbol: %s", depositDetail.Body.String())
	}

	withdrawalList := serveAlphaUser(t, mux, stdhttp.MethodGet, "/api/v1/cashier/alpha/withdrawal-requests", "u-alpha-user", "")
	if withdrawalList.Code != stdhttp.StatusOK {
		t.Fatalf("withdrawal list status=%d body=%s", withdrawalList.Code, withdrawalList.Body.String())
	}
	if strings.Contains(withdrawalList.Body.String(), "cash payout review note") || strings.Contains(withdrawalList.Body.String(), "crypto prize release failed") {
		t.Fatalf("withdrawal list leaked unsafe stored text: %s", withdrawalList.Body.String())
	}
	if strings.Contains(withdrawalList.Body.String(), "USDC") {
		t.Fatalf("withdrawal list leaked unsafe token symbol: %s", withdrawalList.Body.String())
	}
	var withdrawalListPayload struct {
		WithdrawalRequests []WithdrawalRequest `json:"withdrawalRequests"`
	}
	if err := json.Unmarshal(withdrawalList.Body.Bytes(), &withdrawalListPayload); err != nil {
		t.Fatalf("decode withdrawal list: %v", err)
	}
	if len(withdrawalListPayload.WithdrawalRequests) != 1 ||
		withdrawalListPayload.WithdrawalRequests[0].TokenSymbol != alphaLaunchRedactedUserText ||
		withdrawalListPayload.WithdrawalRequests[0].ReviewNote != alphaLaunchRedactedUserText ||
		withdrawalListPayload.WithdrawalRequests[0].FailureReason != alphaLaunchRedactedUserText {
		t.Fatalf("expected redacted withdrawal list payload, got %+v", withdrawalListPayload)
	}

	withdrawalDetail := serveAlphaUser(t, mux, stdhttp.MethodGet, "/api/v1/cashier/alpha/withdrawal-requests/"+withdrawal.ID, "u-alpha-user", "")
	if withdrawalDetail.Code != stdhttp.StatusOK {
		t.Fatalf("withdrawal detail status=%d body=%s", withdrawalDetail.Code, withdrawalDetail.Body.String())
	}
	if strings.Contains(withdrawalDetail.Body.String(), "cash payout review note") || strings.Contains(withdrawalDetail.Body.String(), "crypto prize release failed") {
		t.Fatalf("withdrawal detail leaked unsafe stored text: %s", withdrawalDetail.Body.String())
	}
	if strings.Contains(withdrawalDetail.Body.String(), "USDC") {
		t.Fatalf("withdrawal detail leaked unsafe token symbol: %s", withdrawalDetail.Body.String())
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
}

func TestAlphaCashierUserConfigRedactsLegacyUnsafeValues(t *testing.T) {
	svc := NewService(alphaCashierHandlerTestConfig(), NewMemoryRepository())
	if svc.Config().TokenSymbol != "USDC" {
		t.Fatalf("test fixture should preserve raw token symbol, got %q", svc.Config().TokenSymbol)
	}

	mux := stdhttp.NewServeMux()
	RegisterRoutes(mux, svc)

	rec := serveAlphaUser(t, mux, stdhttp.MethodGet, "/api/v1/cashier/alpha/config", "u-alpha-user", "")
	if rec.Code != stdhttp.StatusOK {
		t.Fatalf("config status=%d body=%s", rec.Code, rec.Body.String())
	}
	if strings.Contains(rec.Body.String(), "USDC") {
		t.Fatalf("config leaked unsafe token symbol: %s", rec.Body.String())
	}
	var payload struct {
		AlphaCashier Config `json:"alphaCashier"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode config: %v", err)
	}
	if payload.AlphaCashier.TokenSymbol != alphaLaunchRedactedUserText {
		t.Fatalf("expected redacted token symbol, got %+v", payload.AlphaCashier)
	}
	if payload.AlphaCashier.MinDepositCents != 100 || !payload.AlphaCashier.WithdrawalsEnabled {
		t.Fatalf("config redaction should preserve inherited compatibility fields, got %+v", payload.AlphaCashier)
	}
	if svc.Config().TokenSymbol != "USDC" {
		t.Fatalf("config redaction should not mutate raw service config, got %q", svc.Config().TokenSymbol)
	}
}

func TestAlphaCashierUserErrorsUseLaunchNeutralCopy(t *testing.T) {
	tests := []error{
		ErrDisabled,
		ErrWithdrawalsDisabled,
		ErrInvalidAddress,
		ErrInvalidAmount,
		ErrWalletNotConnected,
		ErrChallengeExpired,
		ErrChallengeConsumed,
		ErrSignatureInvalid,
		ErrTxVerificationMissing,
		ErrWalletLedgerMissing,
		ErrTxHashInvalid,
		ErrTxFailed,
		ErrTransferMismatch,
		ErrDepositExpired,
		ErrWithdrawalNotFound,
		ErrInvalidStatus,
		wallet.ErrInsufficientFunds,
	}

	for _, err := range tests {
		appErr := httpx.FromError(mapAlphaError(err))
		if appErr == nil {
			t.Fatalf("expected app error for %v", err)
		}
		message := strings.ToLower(appErr.Message)
		for _, unsafe := range []string{"cashier", "deposit", "withdraw", "withdrawal", "wallet", "crypto", "fiat", "payout"} {
			if strings.Contains(message, unsafe) {
				t.Fatalf("legacy user alpha error leaked %q in %q for %v", unsafe, appErr.Message, err)
			}
		}
	}
}

func serveAlphaUser(t *testing.T, mux *stdhttp.ServeMux, method, path, userID, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(method, path, strings.NewReader(body))
	req = req.WithContext(httpx.WithTestUser(req.Context(), userID, userID+"@example.test", "player"))
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	return rec
}

func alphaCashierHandlerTestConfig() Config {
	return Config{
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
