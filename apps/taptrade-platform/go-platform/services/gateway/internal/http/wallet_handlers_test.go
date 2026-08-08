package http

import (
	"bytes"
	"encoding/csv"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"testing"
	"time"

	"taptrade/gateway/internal/leaderboards"
	"taptrade/gateway/internal/wallet"
	"taptrade/platform/transport/httpx"
)

// Wallet mutations (credit/debit) are admin-gated: the ungated public endpoints
// were removed per ADR-0002, so these tests drive the /api/v1/admin/wallet
// routes with a validated admin session. The GET balance/ledger routes remain
// (ownership-checked) and are exercised directly.

func adminWalletContext(req *http.Request) *http.Request {
	return req.WithContext(httpx.WithTestUser(req.Context(), "admin-test", "admin-test", "admin"))
}

func playerWalletContext(req *http.Request, userID string) *http.Request {
	return req.WithContext(httpx.WithTestUser(req.Context(), userID, userID, "user"))
}

func TestStarterGrantLedgerReasonIsPointNative(t *testing.T) {
	t.Setenv("STARTER_GRANT_CENTS", "5000")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	userID := "u-starter-ledger-reason"

	claimReq := playerWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/wallet/starter-grant", nil), userID)
	claimRes := httptest.NewRecorder()
	handler.ServeHTTP(claimRes, claimReq)
	if claimRes.Code != http.StatusOK {
		t.Fatalf("expected starter grant status 200, got %d body=%s", claimRes.Code, claimRes.Body.String())
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/"+userID+"/ledger?limit=5", nil), userID)
	ledgerRes := httptest.NewRecorder()
	handler.ServeHTTP(ledgerRes, ledgerReq)
	if ledgerRes.Code != http.StatusOK {
		t.Fatalf("expected ledger status 200, got %d body=%s", ledgerRes.Code, ledgerRes.Body.String())
	}

	var ledgerPayload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(ledgerRes.Body.Bytes(), &ledgerPayload); err != nil {
		t.Fatalf("decode ledger payload: %v", err)
	}
	if len(ledgerPayload.Items) != 1 {
		t.Fatalf("expected one starter grant ledger row, got %+v", ledgerPayload.Items)
	}
	reason, _ := ledgerPayload.Items[0]["reason"].(string)
	if reason != "starter point grant" {
		t.Fatalf("expected point-native starter reason, got %q", reason)
	}
	for _, retired := range []string{"money", "cash", "deposit", "withdraw", "crypto", "fiat", "redeem", "prize"} {
		if strings.Contains(strings.ToLower(reason), retired) {
			t.Fatalf("starter grant ledger reason leaked retired term %q: %q", retired, reason)
		}
	}
}

// The welcome moment contract: `granted` is true exactly once — the claim
// that actually writes the ledger row. Replays keep succeeding (idempotent)
// but must report granted=false so the UI never celebrates twice, and a
// disabled faucet reports enabled=false with no granted field implied.
func TestStarterGrantGrantedFlagFiresExactlyOnce(t *testing.T) {
	t.Setenv("STARTER_GRANT_CENTS", "500")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	userID := "u-starter-granted-once"

	claim := func() map[string]any {
		req := playerWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/wallet/starter-grant", nil), userID)
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusOK {
			t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
		}
		var payload map[string]any
		if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
			t.Fatalf("decode: %v", err)
		}
		return payload
	}

	first := claim()
	if first["granted"] != true {
		t.Fatalf("first claim: expected granted=true, got %+v", first)
	}
	if first["grantPoints"] != float64(500) || first["balancePoints"] != float64(500) {
		t.Fatalf("first claim: expected 500/500 points, got %+v", first)
	}

	second := claim()
	if second["granted"] != false {
		t.Fatalf("replay: expected granted=false, got %+v", second)
	}
	if second["balancePoints"] != float64(500) {
		t.Fatalf("replay: balance must not double, got %+v", second)
	}
}

func TestStarterGrantDisabledReportsNotEnabled(t *testing.T) {
	t.Setenv("STARTER_GRANT_CENTS", "0")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := playerWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/wallet/starter-grant", nil), "u-starter-disabled")
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	var payload map[string]any
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if payload["enabled"] != false {
		t.Fatalf("expected enabled=false, got %+v", payload)
	}
	if _, hasGrant := payload["grantPoints"]; hasGrant {
		t.Fatalf("disabled faucet must not advertise a grant amount, got %+v", payload)
	}
}

func TestWalletLedgerEntryPayloadRedactsLegacyUnsafeReason(t *testing.T) {
	payload := walletLedgerEntryPayload(wallet.LedgerEntry{
		EntryID:         "legacy-entry-1",
		UserID:          "u-legacy-wallet-reason",
		Type:            "credit",
		AmountPoints:    2500,
		BalancePoints:   2500,
		IdempotencyKey:  "legacy-wallet-reason",
		Reason:          "cash deposit payout adjustment",
		TransactionTime: "2026-04-23T14:58:00Z",
	})

	if payload["reason"] != launchRedactedUserText {
		t.Fatalf("unsafe wallet ledger reason should be redacted, got %#v", payload["reason"])
	}
	if payload["unit"] != "PTS" || payload["amountPoints"] != int64(2500) || payload["idempotencyKey"] != "legacy-wallet-reason" {
		t.Fatalf("stable wallet ledger fields should remain intact, got %+v", payload)
	}
}

func TestWalletErrorsUsePointNativeCopy(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want string
	}{
		{
			name: "invalid mutation",
			err:  wallet.ErrInvalidMutationRequest,
			want: "invalid point account mutation request",
		},
		{
			name: "insufficient points",
			err:  wallet.ErrInsufficientFunds,
			want: "insufficient points",
		},
		{
			name: "generic",
			err:  errors.New("boom"),
			want: "point account mutation failed",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			appErr := httpx.FromError(mapWalletError(tt.err))
			if appErr == nil {
				t.Fatal("expected app error")
			}
			if appErr.Message != tt.want {
				t.Fatalf("expected point-native copy %q, got %q", tt.want, appErr.Message)
			}
			for _, retired := range []string{"wallet", "funds", "cash", "money", "deposit", "withdraw", "crypto", "fiat"} {
				if strings.Contains(strings.ToLower(appErr.Message), retired) {
					t.Fatalf("wallet error leaked retired term %q in %q", retired, appErr.Message)
				}
			}
		})
	}
}

func TestWalletCreditDebitBalanceAndLedgerFlow(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditPayload := []byte(`{"userId":"u-wallet-1","amountPoints":1000,"idempotencyKey":"credit-1","reason":"admin point grant"}`)
	creditReq := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(creditPayload)))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("expected credit status 200, got %d, body=%s", creditRes.Code, creditRes.Body.String())
	}

	debitPayload := []byte(`{"userId":"u-wallet-1","amountPoints":400,"idempotencyKey":"debit-1","reason":"prediction point adjustment"}`)
	debitReq := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/debit", bytes.NewBuffer(debitPayload)))
	debitRes := httptest.NewRecorder()
	handler.ServeHTTP(debitRes, debitReq)
	if debitRes.Code != http.StatusOK {
		t.Fatalf("expected debit status 200, got %d, body=%s", debitRes.Code, debitRes.Body.String())
	}

	balanceReq := adminWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/u-wallet-1", nil))
	balanceRes := httptest.NewRecorder()
	handler.ServeHTTP(balanceRes, balanceReq)
	if balanceRes.Code != http.StatusOK {
		t.Fatalf("expected balance status 200, got %d, body=%s", balanceRes.Code, balanceRes.Body.String())
	}

	var balancePayload map[string]any
	if err := json.Unmarshal(balanceRes.Body.Bytes(), &balancePayload); err != nil {
		t.Fatalf("decode balance payload: %v", err)
	}
	if balancePayload["unit"] != "PTS" {
		t.Fatalf("expected point unit, got %v", balancePayload["unit"])
	}
	if int(balancePayload["balancePoints"].(float64)) != 600 {
		t.Fatalf("expected point balance 600, got %v", balancePayload["balancePoints"])
	}
	if int(balancePayload["availablePoints"].(float64)) != 600 {
		t.Fatalf("expected available points 600, got %v", balancePayload["availablePoints"])
	}
	if int(balancePayload["reservedPoints"].(float64)) != 0 {
		t.Fatalf("expected reserved points 0, got %v", balancePayload["reservedPoints"])
	}
	// Points unit-model (2026-07-07): retired spellings are the cents-era keys.
	for _, retired := range []string{"balancePointsCents", "availablePointsCents", "reservedPointsCents"} {
		if _, ok := balancePayload[retired]; ok {
			t.Fatalf("balance payload should not emit retired alias %s in %+v", retired, balancePayload)
		}
	}

	breakdownReq := adminWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/u-wallet-1/breakdown", nil))
	breakdownRes := httptest.NewRecorder()
	handler.ServeHTTP(breakdownRes, breakdownReq)
	if breakdownRes.Code != http.StatusOK {
		t.Fatalf("expected breakdown status 200, got %d, body=%s", breakdownRes.Code, breakdownRes.Body.String())
	}

	var breakdownPayload map[string]any
	if err := json.Unmarshal(breakdownRes.Body.Bytes(), &breakdownPayload); err != nil {
		t.Fatalf("decode breakdown payload: %v", err)
	}
	if breakdownPayload["unit"] != "PTS" {
		t.Fatalf("expected breakdown point unit, got %v", breakdownPayload["unit"])
	}
	if int(breakdownPayload["basePoints"].(float64)) != 600 {
		t.Fatalf("expected base points 600, got %v", breakdownPayload["basePoints"])
	}
	if int(breakdownPayload["bonusPoints"].(float64)) != 0 {
		t.Fatalf("expected bonus points 0, got %v", breakdownPayload["bonusPoints"])
	}
	if int(breakdownPayload["totalPoints"].(float64)) != 600 {
		t.Fatalf("expected total points 600, got %v", breakdownPayload["totalPoints"])
	}
	// Points unit-model (2026-07-07): totalPoints is canonical; its retired
	// spelling is the cents-era totalPointsCents.
	for _, retired := range []string{"realMoneyPoints", "bonusFundPoints", "totalPointsCents", "currency"} {
		if _, ok := breakdownPayload[retired]; ok {
			t.Fatalf("breakdown payload should not emit retired alias %s in %+v", retired, breakdownPayload)
		}
	}

	ledgerReq := adminWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/u-wallet-1/ledger?limit=10", nil))
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
	firstEntry := ledgerPayload.Items[0]
	if firstEntry["unit"] != "PTS" {
		t.Fatalf("expected point unit on ledger entry, got %v", firstEntry["unit"])
	}
	if int(firstEntry["amountPoints"].(float64)) != 1000 {
		t.Fatalf("expected amount points 1000, got entry=%+v", firstEntry)
	}
	if int(firstEntry["balancePoints"].(float64)) != 1000 {
		t.Fatalf("expected balance points 1000, got entry=%+v", firstEntry)
	}
	// Points unit-model (2026-07-07): retired spellings are the cents-era keys.
	for _, retired := range []string{"amountPointsCents", "balancePointsCents"} {
		if _, ok := firstEntry[retired]; ok {
			t.Fatalf("ledger entry should not emit retired alias %s in %+v", retired, firstEntry)
		}
	}
}

func TestWalletDailyClaimCreditsOncePerUtcDay(t *testing.T) {
	t.Setenv("DAILY_CLAIM_CENTS", "1200")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	userID := "u-daily-claim-1"

	firstReq := playerWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/wallet/daily-claim", nil), userID)
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first daily claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}

	secondReq := playerWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/wallet/daily-claim", nil), userID)
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusOK {
		t.Fatalf("expected second daily claim status 200, got %d, body=%s", secondRes.Code, secondRes.Body.String())
	}

	var claimPayload map[string]any
	if err := json.Unmarshal(secondRes.Body.Bytes(), &claimPayload); err != nil {
		t.Fatalf("decode second claim payload: %v", err)
	}
	if claimPayload["enabled"] != true {
		t.Fatalf("expected daily claim enabled, got %v", claimPayload["enabled"])
	}
	if claimPayload["unit"] != "PTS" {
		t.Fatalf("expected daily claim point unit, got %v", claimPayload["unit"])
	}
	if int(claimPayload["claimPoints"].(float64)) != 1200 {
		t.Fatalf("expected configured claim point alias 1200, got %v", claimPayload["claimPoints"])
	}
	if int(claimPayload["balancePoints"].(float64)) != 1200 {
		t.Fatalf("expected stable point balance 1200 after duplicate claim, got %v", claimPayload["balancePoints"])
	}
	// Points unit-model (2026-07-07): retired spellings are the cents-era keys.
	for _, retired := range []string{"claimPointsCents", "balancePointsCents"} {
		if _, ok := claimPayload[retired]; ok {
			t.Fatalf("daily claim response should not emit retired alias %s in %+v", retired, claimPayload)
		}
	}
	if claimPayload["claimedForDate"] == "" || claimPayload["nextClaimAt"] == "" {
		t.Fatalf("expected claim window fields, got %#v", claimPayload)
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/"+userID+"/ledger?limit=10", nil), userID)
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
	if ledgerPayload.Total != 1 || len(ledgerPayload.Items) != 1 {
		t.Fatalf("expected one daily claim ledger entry, got total=%d len=%d", ledgerPayload.Total, len(ledgerPayload.Items))
	}
	entry := ledgerPayload.Items[0]
	if entry["type"] != "credit" {
		t.Fatalf("expected credit ledger entry, got %v", entry["type"])
	}
	if entry["reason"] != "daily_claim" {
		t.Fatalf("expected daily_claim reason, got %v", entry["reason"])
	}
	if int(entry["amountPoints"].(float64)) != 1200 {
		t.Fatalf("expected amount points 1200, got %v", entry["amountPoints"])
	}
}

func TestWalletDailyClaimRequiresSessionUser(t *testing.T) {
	t.Setenv("DAILY_CLAIM_CENTS", "1200")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/daily-claim", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusForbidden {
		t.Fatalf("expected daily claim without auth to return 403, got %d, body=%s", res.Code, res.Body.String())
	}
}

func TestWalletDailyClaimDeviceClusterLimitBlocksSecondUser(t *testing.T) {
	t.Setenv("DAILY_CLAIM_CENTS", "1200")
	t.Setenv("REWARD_DAILY_MAX_USERS_PER_DEVICE", "1")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	deviceID := "device-daily-claim-cluster"

	firstReq := playerWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/wallet/daily-claim", nil), "u-device-claim-1")
	firstReq.Header.Set("X-TapTrade-Device-ID", deviceID)
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first device-cluster claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}

	secondReq := playerWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/wallet/daily-claim", nil), "u-device-claim-2")
	secondReq.Header.Set("X-TapTrade-Device-ID", deviceID)
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusForbidden {
		t.Fatalf("expected second user on same device to return 403, got %d, body=%s", secondRes.Code, secondRes.Body.String())
	}

	retryReq := playerWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/wallet/daily-claim", nil), "u-device-claim-1")
	retryReq.Header.Set("X-TapTrade-Device-ID", deviceID)
	retryRes := httptest.NewRecorder()
	handler.ServeHTTP(retryRes, retryReq)
	if retryRes.Code != http.StatusOK {
		t.Fatalf("expected same-user device-cluster retry status 200, got %d, body=%s", retryRes.Code, retryRes.Body.String())
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/u-device-claim-2/ledger?limit=10", nil), "u-device-claim-2")
	ledgerRes := httptest.NewRecorder()
	handler.ServeHTTP(ledgerRes, ledgerReq)
	if ledgerRes.Code != http.StatusOK {
		t.Fatalf("expected blocked user's ledger status 200, got %d, body=%s", ledgerRes.Code, ledgerRes.Body.String())
	}
	var ledgerPayload struct {
		Items []map[string]any `json:"items"`
		Total int              `json:"total"`
	}
	if err := json.Unmarshal(ledgerRes.Body.Bytes(), &ledgerPayload); err != nil {
		t.Fatalf("decode blocked user's ledger: %v", err)
	}
	if ledgerPayload.Total != 0 || len(ledgerPayload.Items) != 0 {
		t.Fatalf("blocked device-cluster claim should not write ledger rows, got %+v", ledgerPayload)
	}
}

func TestWalletDailyClaimDeviceClusterLimitPersistsAcrossRouteRestart(t *testing.T) {
	stateFile := filepath.Join(t.TempDir(), "wallet-state.json")
	t.Setenv("WALLET_LEDGER_FILE", stateFile)
	t.Setenv("DAILY_CLAIM_CENTS", "1200")
	t.Setenv("REWARD_DAILY_MAX_USERS_PER_DEVICE", "1")

	deviceID := "device-persist-cluster"

	firstMux := http.NewServeMux()
	RegisterRoutes(firstMux, "gateway")
	firstHandler := httpx.Chain(firstMux, httpx.RequestID(), httpx.Recovery(nil))

	firstReq := playerWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/wallet/daily-claim", nil), "u-device-persist-1")
	firstReq.Header.Set("X-TapTrade-Device-ID", deviceID)
	firstRes := httptest.NewRecorder()
	firstHandler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first persisted device-cluster claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}

	stateRaw, err := os.ReadFile(stateFile)
	if err != nil {
		t.Fatalf("read wallet state file: %v", err)
	}
	if !strings.Contains(string(stateRaw), `"rewardClusters"`) {
		t.Fatalf("expected persisted reward cluster evidence in wallet state, got %s", string(stateRaw))
	}
	if strings.Contains(string(stateRaw), deviceID) {
		t.Fatalf("wallet state should persist hashed cluster evidence, not raw device IDs: %s", string(stateRaw))
	}

	secondMux := http.NewServeMux()
	RegisterRoutes(secondMux, "gateway")
	secondHandler := httpx.Chain(secondMux, httpx.RequestID(), httpx.Recovery(nil))

	blockedReq := playerWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/wallet/daily-claim", nil), "u-device-persist-2")
	blockedReq.Header.Set("X-TapTrade-Device-ID", deviceID)
	blockedRes := httptest.NewRecorder()
	secondHandler.ServeHTTP(blockedRes, blockedReq)
	if blockedRes.Code != http.StatusForbidden {
		t.Fatalf("expected second user on same persisted device cluster to return 403, got %d, body=%s", blockedRes.Code, blockedRes.Body.String())
	}

	retryReq := playerWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/wallet/daily-claim", nil), "u-device-persist-1")
	retryReq.Header.Set("X-TapTrade-Device-ID", deviceID)
	retryRes := httptest.NewRecorder()
	secondHandler.ServeHTTP(retryRes, retryReq)
	if retryRes.Code != http.StatusOK {
		t.Fatalf("expected same-user persisted device-cluster retry status 200, got %d, body=%s", retryRes.Code, retryRes.Body.String())
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/u-device-persist-2/ledger?limit=10", nil), "u-device-persist-2")
	ledgerRes := httptest.NewRecorder()
	secondHandler.ServeHTTP(ledgerRes, ledgerReq)
	if ledgerRes.Code != http.StatusOK {
		t.Fatalf("expected blocked persisted-cluster user's ledger status 200, got %d, body=%s", ledgerRes.Code, ledgerRes.Body.String())
	}
	var ledgerPayload struct {
		Items []map[string]any `json:"items"`
		Total int              `json:"total"`
	}
	if err := json.Unmarshal(ledgerRes.Body.Bytes(), &ledgerPayload); err != nil {
		t.Fatalf("decode blocked persisted-cluster user's ledger: %v", err)
	}
	if ledgerPayload.Total != 0 || len(ledgerPayload.Items) != 0 {
		t.Fatalf("blocked persisted device-cluster claim should not write ledger rows, got %+v", ledgerPayload)
	}
}

func TestAdminWalletRewardClustersReturnsHashedReviewEvidence(t *testing.T) {
	stateFile := filepath.Join(t.TempDir(), "wallet-state.json")
	t.Setenv("WALLET_LEDGER_FILE", stateFile)
	t.Setenv("DAILY_CLAIM_CENTS", "1200")
	t.Setenv("REWARD_DAILY_MAX_USERS_PER_DEVICE", "10")
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "false")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	deviceID := "device-admin-review-cluster"

	firstReq := playerWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/wallet/daily-claim", nil), "u-admin-cluster-1")
	firstReq.Header.Set("X-TapTrade-Device-ID", deviceID)
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first clustered daily claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}

	var firstClaim struct {
		ClaimedForDate string `json:"claimedForDate"`
	}
	if err := json.Unmarshal(firstRes.Body.Bytes(), &firstClaim); err != nil {
		t.Fatalf("decode first claim: %v", err)
	}
	if firstClaim.ClaimedForDate == "" {
		t.Fatalf("expected claimedForDate in first claim response")
	}

	secondReq := playerWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/wallet/daily-claim", nil), "u-admin-cluster-2")
	secondReq.Header.Set("X-TapTrade-Device-ID", deviceID)
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusOK {
		t.Fatalf("expected second clustered daily claim status 200, got %d, body=%s", secondRes.Code, secondRes.Body.String())
	}

	nonAdminReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/admin/wallet/reward-clusters?windowDate="+firstClaim.ClaimedForDate, nil), "u-admin-cluster-1")
	nonAdminRes := httptest.NewRecorder()
	handler.ServeHTTP(nonAdminRes, nonAdminReq)
	if nonAdminRes.Code != http.StatusForbidden {
		t.Fatalf("expected reward cluster review to require admin role, got %d, body=%s", nonAdminRes.Code, nonAdminRes.Body.String())
	}

	adminReq := adminWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/admin/wallet/reward-clusters?windowDate="+firstClaim.ClaimedForDate+"&limit=5", nil))
	adminRes := httptest.NewRecorder()
	handler.ServeHTTP(adminRes, adminReq)
	if adminRes.Code != http.StatusOK {
		t.Fatalf("expected admin reward cluster review status 200, got %d, body=%s", adminRes.Code, adminRes.Body.String())
	}
	if strings.Contains(adminRes.Body.String(), deviceID) {
		t.Fatalf("admin reward cluster response should not expose raw device IDs: %s", adminRes.Body.String())
	}

	var payload struct {
		Items []struct {
			WindowDate        string   `json:"windowDate"`
			SignalType        string   `json:"signalType"`
			SignalHash        string   `json:"signalHash"`
			DistinctUserCount int      `json:"distinctUserCount"`
			UserIDs           []string `json:"userIds"`
		} `json:"items"`
		Notes      []string `json:"notes"`
		Total      int      `json:"total"`
		Unit       string   `json:"unit"`
		WindowDate string   `json:"windowDate"`
	}
	if err := json.Unmarshal(adminRes.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode admin reward cluster payload: %v", err)
	}
	if payload.Unit != "PTS" {
		t.Fatalf("expected points unit in admin reward cluster response, got %q", payload.Unit)
	}
	if payload.WindowDate != firstClaim.ClaimedForDate {
		t.Fatalf("expected window date %q, got %q", firstClaim.ClaimedForDate, payload.WindowDate)
	}
	if payload.Total != 1 || len(payload.Items) != 1 {
		t.Fatalf("expected one reward cluster summary, got total=%d items=%+v", payload.Total, payload.Items)
	}
	item := payload.Items[0]
	if item.SignalType != "device" {
		t.Fatalf("expected device cluster summary, got %+v", item)
	}
	if len(item.SignalHash) != 64 {
		t.Fatalf("expected hashed device evidence, got hash %q", item.SignalHash)
	}
	if item.DistinctUserCount != 2 {
		t.Fatalf("expected two users in device cluster, got %+v", item)
	}
	if len(item.UserIDs) != 2 || item.UserIDs[0] != "u-admin-cluster-1" || item.UserIDs[1] != "u-admin-cluster-2" {
		t.Fatalf("expected sorted cluster user IDs, got %+v", item.UserIDs)
	}
	if len(payload.Notes) == 0 || !strings.Contains(strings.ToLower(strings.Join(payload.Notes, " ")), "hashed") {
		t.Fatalf("expected response notes to explain hashed evidence, got %+v", payload.Notes)
	}

	csvReq := adminWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/admin/wallet/reward-clusters?windowDate="+firstClaim.ClaimedForDate+"&format=csv", nil))
	csvRes := httptest.NewRecorder()
	handler.ServeHTTP(csvRes, csvReq)
	if csvRes.Code != http.StatusOK {
		t.Fatalf("expected admin reward cluster csv status 200, got %d, body=%s", csvRes.Code, csvRes.Body.String())
	}
	if ct := csvRes.Header().Get("Content-Type"); !strings.HasPrefix(ct, "text/csv") {
		t.Fatalf("expected text/csv content type, got %q", ct)
	}
	if cd := csvRes.Header().Get("Content-Disposition"); !strings.Contains(cd, `filename="wallet-reward-clusters-`+firstClaim.ClaimedForDate+`.csv"`) {
		t.Fatalf("expected reward cluster csv filename, got %q", cd)
	}
	if strings.Contains(csvRes.Body.String(), deviceID) {
		t.Fatalf("admin reward cluster csv should not expose raw device IDs: %s", csvRes.Body.String())
	}
	rows, err := csv.NewReader(strings.NewReader(csvRes.Body.String())).ReadAll()
	if err != nil {
		t.Fatalf("read reward cluster csv: %v", err)
	}
	if len(rows) != 2 {
		t.Fatalf("expected header and one cluster row, got %+v", rows)
	}
	expectedHeader := []string{"window_date", "signal_type", "signal_hash", "distinct_user_count", "user_ids", "unit"}
	if got := rows[0]; strings.Join(got, "|") != strings.Join(expectedHeader, "|") {
		t.Fatalf("unexpected reward cluster csv header: %+v", got)
	}
	got := rows[1]
	if got[0] != firstClaim.ClaimedForDate || got[1] != "device" || len(got[2]) != 64 || got[3] != "2" || got[4] != "u-admin-cluster-1;u-admin-cluster-2" || got[5] != "PTS" {
		t.Fatalf("unexpected reward cluster csv row: %+v", got)
	}
}

func TestWalletPointPackClaimCreditsOncePerPack(t *testing.T) {
	t.Setenv("POINT_PACK_STARTER_BOOST_CENTS", "2500")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	userID := "u-point-pack-1"

	listReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/point-packs", nil), userID)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected point pack list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []pointPackDefinition `json:"items"`
		Total int                   `json:"total"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode point pack list: %v", err)
	}
	if listPayload.Total == 0 || !listPayload.Items[0].Enabled || listPayload.Items[0].AmountPoints != 2500 {
		t.Fatalf("expected enabled starter boost pack, got %+v", listPayload)
	}
	if listPayload.Items[0].Unit != "PTS" || listPayload.Items[0].AmountPoints != 2500 {
		t.Fatalf("expected point-native starter boost pack, got %+v", listPayload.Items[0])
	}
	var listMap struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listMap); err != nil {
		t.Fatalf("decode point pack list map: %v", err)
	}
	// Points unit-model (2026-07-07): amountPoints is canonical; the retired
	// spelling is the cents-era amountPointsCents.
	if _, ok := listMap.Items[0]["amountPointsCents"]; ok {
		t.Fatalf("point pack list should not emit retired amountPointsCents alias in %+v", listMap.Items[0])
	}

	firstReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/point-packs/claim", bytes.NewBufferString(`{"packId":"starter_boost"}`)),
		userID,
	)
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first point pack claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}
	secondReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/point-packs/claim", bytes.NewBufferString(`{"packId":"starter_boost"}`)),
		userID,
	)
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusOK {
		t.Fatalf("expected duplicate point pack claim status 200, got %d, body=%s", secondRes.Code, secondRes.Body.String())
	}

	var claimPayload map[string]any
	if err := json.Unmarshal(secondRes.Body.Bytes(), &claimPayload); err != nil {
		t.Fatalf("decode point pack claim: %v", err)
	}
	if claimPayload["unit"] != "PTS" {
		t.Fatalf("expected point pack claim point unit, got %v", claimPayload["unit"])
	}
	if int(claimPayload["claimPoints"].(float64)) != 2500 {
		t.Fatalf("expected configured pack point alias 2500, got %v", claimPayload["claimPoints"])
	}
	if int(claimPayload["balancePoints"].(float64)) != 2500 {
		t.Fatalf("expected stable point balance 2500 after duplicate pack claim, got %v", claimPayload["balancePoints"])
	}
	// Points unit-model (2026-07-07): retired spellings are the cents-era keys.
	for _, retired := range []string{"claimPointsCents", "balancePointsCents"} {
		if _, ok := claimPayload[retired]; ok {
			t.Fatalf("point pack claim response should not emit retired alias %s in %+v", retired, claimPayload)
		}
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/"+userID+"/ledger?limit=10", nil), userID)
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
		t.Fatalf("decode point pack ledger: %v", err)
	}
	if ledgerPayload.Total != 1 || len(ledgerPayload.Items) != 1 {
		t.Fatalf("expected one point pack ledger entry, got total=%d len=%d", ledgerPayload.Total, len(ledgerPayload.Items))
	}
	entry := ledgerPayload.Items[0]
	if entry["reason"] != "point_pack_grant" {
		t.Fatalf("expected point_pack_grant reason, got %v", entry["reason"])
	}
	if entry["idempotencyKey"] != "point_pack:"+userID+":starter_boost" {
		t.Fatalf("expected point pack idempotency key, got %v", entry["idempotencyKey"])
	}
}

func TestWalletPointPackIPClusterLimitBlocksSecondUser(t *testing.T) {
	t.Setenv("POINT_PACK_STARTER_BOOST_CENTS", "2500")
	t.Setenv("REWARD_DAILY_MAX_USERS_PER_IP", "1")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	firstReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/point-packs/claim", bytes.NewBufferString(`{"packId":"starter_boost"}`)),
		"u-ip-pack-1",
	)
	firstReq.Header.Set("CF-Connecting-IP", "203.0.113.71")
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first IP-cluster pack claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}

	blockedReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/point-packs/claim", bytes.NewBufferString(`{"packId":"starter_boost"}`)),
		"u-ip-pack-2",
	)
	blockedReq.Header.Set("CF-Connecting-IP", "203.0.113.71")
	blockedRes := httptest.NewRecorder()
	handler.ServeHTTP(blockedRes, blockedReq)
	if blockedRes.Code != http.StatusForbidden {
		t.Fatalf("expected second user on same IP to return 403, got %d, body=%s", blockedRes.Code, blockedRes.Body.String())
	}

	allowedReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/point-packs/claim", bytes.NewBufferString(`{"packId":"starter_boost"}`)),
		"u-ip-pack-2",
	)
	allowedReq.Header.Set("CF-Connecting-IP", "203.0.113.72")
	allowedRes := httptest.NewRecorder()
	handler.ServeHTTP(allowedRes, allowedReq)
	if allowedRes.Code != http.StatusOK {
		t.Fatalf("expected same user from a different IP to return 200, got %d, body=%s", allowedRes.Code, allowedRes.Body.String())
	}
}

func TestWalletPointPackClaimRequiresSessionUser(t *testing.T) {
	t.Setenv("POINT_PACK_STARTER_BOOST_CENTS", "2500")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/point-packs/claim", bytes.NewBufferString(`{"packId":"starter_boost"}`))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusUnauthorized {
		t.Fatalf("expected point pack claim without auth to return 401, got %d, body=%s", res.Code, res.Body.String())
	}
}

func TestWalletRewardDailyGrantLimitBlocksNewRewardButAllowsRetry(t *testing.T) {
	t.Setenv("DAILY_CLAIM_CENTS", "800")
	t.Setenv("POINT_PACK_STARTER_BOOST_CENTS", "500")
	t.Setenv("REWARD_DAILY_GRANT_LIMIT_CENTS", "1000")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	userID := "u-reward-limit-1"

	dailyReq := playerWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/wallet/daily-claim", nil), userID)
	dailyRes := httptest.NewRecorder()
	handler.ServeHTTP(dailyRes, dailyReq)
	if dailyRes.Code != http.StatusOK {
		t.Fatalf("expected first daily claim status 200, got %d, body=%s", dailyRes.Code, dailyRes.Body.String())
	}

	duplicateDailyReq := playerWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/wallet/daily-claim", nil), userID)
	duplicateDailyRes := httptest.NewRecorder()
	handler.ServeHTTP(duplicateDailyRes, duplicateDailyReq)
	if duplicateDailyRes.Code != http.StatusOK {
		t.Fatalf("expected duplicate daily claim status 200, got %d, body=%s", duplicateDailyRes.Code, duplicateDailyRes.Body.String())
	}

	packReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/point-packs/claim", bytes.NewBufferString(`{"packId":"starter_boost"}`)),
		userID,
	)
	packRes := httptest.NewRecorder()
	handler.ServeHTTP(packRes, packReq)
	if packRes.Code != http.StatusForbidden {
		t.Fatalf("expected point pack over daily reward cap to return 403, got %d, body=%s", packRes.Code, packRes.Body.String())
	}

	statusReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/reward-limits", nil), userID)
	statusRes := httptest.NewRecorder()
	handler.ServeHTTP(statusRes, statusReq)
	if statusRes.Code != http.StatusOK {
		t.Fatalf("expected reward limit status 200, got %d, body=%s", statusRes.Code, statusRes.Body.String())
	}
	var status rewardGrantLimitStatus
	if err := json.Unmarshal(statusRes.Body.Bytes(), &status); err != nil {
		t.Fatalf("decode reward limit status: %v", err)
	}
	if status.LimitPoints != 1000 || status.GrantedPoints != 800 || status.RemainingPoints != 200 {
		t.Fatalf("unexpected reward limit status: %+v", status)
	}
	var statusPayload map[string]any
	if err := json.Unmarshal(statusRes.Body.Bytes(), &statusPayload); err != nil {
		t.Fatalf("decode reward limit status map: %v", err)
	}
	// Points unit-model (2026-07-07): retired spellings are the cents-era keys.
	for _, retired := range []string{"limitPointsCents", "grantedPointsCents", "remainingPointsCents"} {
		if _, ok := statusPayload[retired]; ok {
			t.Fatalf("reward limit status should not emit retired alias %s in %+v", retired, statusPayload)
		}
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/"+userID+"/ledger?limit=10", nil), userID)
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
		t.Fatalf("decode reward limit ledger: %v", err)
	}
	if ledgerPayload.Total != 1 {
		t.Fatalf("expected only the daily claim ledger row, got %+v", ledgerPayload)
	}
}

func TestWalletDailyMissionCompletesFromLedgerAndCreditsOnce(t *testing.T) {
	t.Setenv("DAILY_CLAIM_CENTS", "1200")
	t.Setenv("MISSION_DAILY_CHECK_IN_REWARD_CENTS", "300")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	userID := "u-mission-1"

	dailyReq := playerWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/wallet/daily-claim", nil), userID)
	dailyRes := httptest.NewRecorder()
	handler.ServeHTTP(dailyRes, dailyReq)
	if dailyRes.Code != http.StatusOK {
		t.Fatalf("expected daily claim status 200, got %d, body=%s", dailyRes.Code, dailyRes.Body.String())
	}

	listReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/missions", nil), userID)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected missions list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []missionDefinition `json:"items"`
		Total int                 `json:"total"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode missions list: %v", err)
	}
	missionsByID := map[string]missionDefinition{}
	for _, mission := range listPayload.Items {
		missionsByID[mission.ID] = mission
	}
	dailyMission := missionsByID["daily_check_in"]
	if !dailyMission.Completed || dailyMission.Claimed {
		t.Fatalf("expected complete unclaimed daily mission, got %+v", listPayload)
	}

	firstReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"daily_check_in"}`)),
		userID,
	)
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first mission claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}
	secondReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"daily_check_in"}`)),
		userID,
	)
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusOK {
		t.Fatalf("expected duplicate mission claim status 200, got %d, body=%s", secondRes.Code, secondRes.Body.String())
	}

	var claimPayload map[string]any
	if err := json.Unmarshal(secondRes.Body.Bytes(), &claimPayload); err != nil {
		t.Fatalf("decode mission claim: %v", err)
	}
	if claimPayload["unit"] != "PTS" {
		t.Fatalf("expected mission claim point unit, got %v", claimPayload["unit"])
	}
	if int(claimPayload["claimPoints"].(float64)) != 300 {
		t.Fatalf("expected mission point reward 300, got %v", claimPayload["claimPoints"])
	}
	if int(claimPayload["balancePoints"].(float64)) != 1500 {
		t.Fatalf("expected stable point balance 1500 after duplicate mission claim, got %v", claimPayload["balancePoints"])
	}
	// Points unit-model (2026-07-07): retired spellings are the cents-era keys.
	for _, retired := range []string{"claimPointsCents", "balancePointsCents"} {
		if _, ok := claimPayload[retired]; ok {
			t.Fatalf("mission claim response should not emit retired alias %s in %+v", retired, claimPayload)
		}
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/"+userID+"/ledger?limit=10", nil), userID)
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
		t.Fatalf("decode mission ledger: %v", err)
	}
	missionRows := 0
	for _, entry := range ledgerPayload.Items {
		if entry["reason"] == "mission_reward" {
			missionRows++
		}
	}
	if missionRows != 1 {
		t.Fatalf("expected one mission_reward ledger row, got %d entries=%+v", missionRows, ledgerPayload.Items)
	}
}

func TestWalletFirstPredictionMissionCompletesFromOrderLedgerEvidence(t *testing.T) {
	t.Setenv("MISSION_FIRST_PREDICTION_REWARD_CENTS", "450")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	userID := "u-first-prediction-1"

	seed := []byte(`{"userId":"` + userID + `","amountPoints":250,"idempotencyKey":"reservation:prediction_order:order-first-1","reason":"reservation:prediction_order:order-first-1"}`)
	seedReq := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(seed)))
	seedRes := httptest.NewRecorder()
	handler.ServeHTTP(seedRes, seedReq)
	if seedRes.Code != http.StatusOK {
		t.Fatalf("expected seeded prediction-order evidence status 200, got %d, body=%s", seedRes.Code, seedRes.Body.String())
	}

	listReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/missions", nil), userID)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected missions list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []missionDefinition `json:"items"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode missions list: %v", err)
	}
	var firstPrediction missionDefinition
	for _, mission := range listPayload.Items {
		if mission.ID == "first_prediction_order" {
			firstPrediction = mission
			break
		}
	}
	if !firstPrediction.Completed || firstPrediction.Claimed || firstPrediction.RewardPoints != 450 {
		t.Fatalf("expected complete unclaimed first-prediction mission, got %+v", firstPrediction)
	}

	firstReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"first_prediction_order"}`)),
		userID,
	)
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first prediction mission claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}
	secondReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"first_prediction_order"}`)),
		userID,
	)
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusOK {
		t.Fatalf("expected duplicate first prediction mission claim status 200, got %d, body=%s", secondRes.Code, secondRes.Body.String())
	}

	var claimPayload struct {
		ClaimPoints   int64  `json:"claimPoints"`
		BalancePoints int64  `json:"balancePoints"`
		Unit          string `json:"unit"`
	}
	if err := json.Unmarshal(secondRes.Body.Bytes(), &claimPayload); err != nil {
		t.Fatalf("decode mission claim: %v", err)
	}
	if claimPayload.Unit != "PTS" || claimPayload.ClaimPoints != 450 || claimPayload.BalancePoints != 700 {
		t.Fatalf("expected stable first prediction mission point response, got %+v", claimPayload)
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/"+userID+"/ledger?limit=10", nil), userID)
	ledgerRes := httptest.NewRecorder()
	handler.ServeHTTP(ledgerRes, ledgerReq)
	if ledgerRes.Code != http.StatusOK {
		t.Fatalf("expected ledger status 200, got %d, body=%s", ledgerRes.Code, ledgerRes.Body.String())
	}
	var ledgerPayload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(ledgerRes.Body.Bytes(), &ledgerPayload); err != nil {
		t.Fatalf("decode mission ledger: %v", err)
	}
	missionRows := 0
	for _, entry := range ledgerPayload.Items {
		if entry["idempotencyKey"] == "mission_reward:"+userID+":first_prediction_order" {
			missionRows++
		}
	}
	if missionRows != 1 {
		t.Fatalf("expected one first prediction mission ledger row, got %d entries=%+v", missionRows, ledgerPayload.Items)
	}
}

func TestWalletThreePredictionsMissionCompletesFromOrderLedgerEvidence(t *testing.T) {
	t.Setenv("MISSION_THREE_PREDICTIONS_REWARD_CENTS", "575")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	userID := "u-three-predictions-1"

	for i := 1; i <= 3; i++ {
		seed := []byte(`{"userId":"` + userID + `","amountPoints":250,"idempotencyKey":"reservation:prediction_order:order-three-` + strconv.Itoa(i) + `","reason":"reservation:prediction_order:order-three-` + strconv.Itoa(i) + `"}`)
		seedReq := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(seed)))
		seedRes := httptest.NewRecorder()
		handler.ServeHTTP(seedRes, seedReq)
		if seedRes.Code != http.StatusOK {
			t.Fatalf("expected seeded prediction-order evidence %d status 200, got %d, body=%s", i, seedRes.Code, seedRes.Body.String())
		}
	}

	listReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/missions", nil), userID)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected missions list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []missionDefinition `json:"items"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode missions list: %v", err)
	}
	var threePredictions missionDefinition
	for _, mission := range listPayload.Items {
		if mission.ID == "three_predictions" {
			threePredictions = mission
			break
		}
	}
	if !threePredictions.Completed || threePredictions.Claimed || threePredictions.Progress != 3 || threePredictions.Target != 3 || threePredictions.RewardPoints != 575 {
		t.Fatalf("expected complete unclaimed three-predictions mission, got %+v", threePredictions)
	}

	firstReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"three_predictions"}`)),
		userID,
	)
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first three-predictions mission claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}
	secondReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"three_predictions"}`)),
		userID,
	)
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusOK {
		t.Fatalf("expected duplicate three-predictions mission claim status 200, got %d, body=%s", secondRes.Code, secondRes.Body.String())
	}

	var claimPayload struct {
		ClaimPoints   int64  `json:"claimPoints"`
		BalancePoints int64  `json:"balancePoints"`
		Unit          string `json:"unit"`
	}
	if err := json.Unmarshal(secondRes.Body.Bytes(), &claimPayload); err != nil {
		t.Fatalf("decode mission claim: %v", err)
	}
	if claimPayload.Unit != "PTS" || claimPayload.ClaimPoints != 575 || claimPayload.BalancePoints != 1325 {
		t.Fatalf("expected stable three-predictions mission point response, got %+v", claimPayload)
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/"+userID+"/ledger?limit=10", nil), userID)
	ledgerRes := httptest.NewRecorder()
	handler.ServeHTTP(ledgerRes, ledgerReq)
	if ledgerRes.Code != http.StatusOK {
		t.Fatalf("expected ledger status 200, got %d, body=%s", ledgerRes.Code, ledgerRes.Body.String())
	}
	var ledgerPayload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(ledgerRes.Body.Bytes(), &ledgerPayload); err != nil {
		t.Fatalf("decode mission ledger: %v", err)
	}
	missionRows := 0
	for _, entry := range ledgerPayload.Items {
		if entry["idempotencyKey"] == "mission_reward:"+userID+":three_predictions" {
			missionRows++
		}
	}
	if missionRows != 1 {
		t.Fatalf("expected one three-predictions mission ledger row, got %d entries=%+v", missionRows, ledgerPayload.Items)
	}
}

func TestWalletFivePredictionsMissionCompletesFromOrderLedgerEvidence(t *testing.T) {
	t.Setenv("MISSION_FIVE_PREDICTIONS_REWARD_CENTS", "625")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	userID := "u-five-predictions-1"

	for i := 1; i <= 5; i++ {
		seed := []byte(`{"userId":"` + userID + `","amountPoints":200,"idempotencyKey":"reservation:prediction_order:order-five-` + strconv.Itoa(i) + `","reason":"reservation:prediction_order:order-five-` + strconv.Itoa(i) + `"}`)
		seedReq := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(seed)))
		seedRes := httptest.NewRecorder()
		handler.ServeHTTP(seedRes, seedReq)
		if seedRes.Code != http.StatusOK {
			t.Fatalf("expected seeded prediction-order evidence %d status 200, got %d, body=%s", i, seedRes.Code, seedRes.Body.String())
		}
	}

	listReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/missions", nil), userID)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected missions list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []missionDefinition `json:"items"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode missions list: %v", err)
	}
	var fivePredictions missionDefinition
	for _, mission := range listPayload.Items {
		if mission.ID == "five_predictions" {
			fivePredictions = mission
			break
		}
	}
	if !fivePredictions.Completed || fivePredictions.Claimed || fivePredictions.Progress != 5 || fivePredictions.Target != 5 || fivePredictions.RewardPoints != 625 {
		t.Fatalf("expected complete unclaimed five-predictions mission, got %+v", fivePredictions)
	}

	firstReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"five_predictions"}`)),
		userID,
	)
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first five-predictions mission claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}
	secondReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"five_predictions"}`)),
		userID,
	)
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusOK {
		t.Fatalf("expected duplicate five-predictions mission claim status 200, got %d, body=%s", secondRes.Code, secondRes.Body.String())
	}

	var claimPayload struct {
		ClaimPoints   int64  `json:"claimPoints"`
		BalancePoints int64  `json:"balancePoints"`
		Unit          string `json:"unit"`
	}
	if err := json.Unmarshal(secondRes.Body.Bytes(), &claimPayload); err != nil {
		t.Fatalf("decode mission claim: %v", err)
	}
	if claimPayload.Unit != "PTS" || claimPayload.ClaimPoints != 625 || claimPayload.BalancePoints != 1625 {
		t.Fatalf("expected stable five-predictions mission point response, got %+v", claimPayload)
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/"+userID+"/ledger?limit=10", nil), userID)
	ledgerRes := httptest.NewRecorder()
	handler.ServeHTTP(ledgerRes, ledgerReq)
	if ledgerRes.Code != http.StatusOK {
		t.Fatalf("expected ledger status 200, got %d, body=%s", ledgerRes.Code, ledgerRes.Body.String())
	}
	var ledgerPayload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(ledgerRes.Body.Bytes(), &ledgerPayload); err != nil {
		t.Fatalf("decode mission ledger: %v", err)
	}
	missionRows := 0
	for _, entry := range ledgerPayload.Items {
		if entry["idempotencyKey"] == "mission_reward:"+userID+":five_predictions" {
			missionRows++
		}
	}
	if missionRows != 1 {
		t.Fatalf("expected one five-predictions mission ledger row, got %d entries=%+v", missionRows, ledgerPayload.Items)
	}
}

func TestWalletTenPredictionsMissionCompletesFromOrderLedgerEvidence(t *testing.T) {
	t.Setenv("MISSION_TEN_PREDICTIONS_REWARD_CENTS", "825")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	userID := "u-ten-predictions-1"

	for i := 1; i <= 10; i++ {
		seed := []byte(`{"userId":"` + userID + `","amountPoints":100,"idempotencyKey":"reservation:prediction_order:order-ten-` + strconv.Itoa(i) + `","reason":"reservation:prediction_order:order-ten-` + strconv.Itoa(i) + `"}`)
		seedReq := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(seed)))
		seedRes := httptest.NewRecorder()
		handler.ServeHTTP(seedRes, seedReq)
		if seedRes.Code != http.StatusOK {
			t.Fatalf("expected seeded prediction-order evidence %d status 200, got %d, body=%s", i, seedRes.Code, seedRes.Body.String())
		}
	}

	listReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/missions", nil), userID)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected missions list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []missionDefinition `json:"items"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode missions list: %v", err)
	}
	var tenPredictions missionDefinition
	for _, mission := range listPayload.Items {
		if mission.ID == "ten_predictions" {
			tenPredictions = mission
			break
		}
	}
	if !tenPredictions.Completed || tenPredictions.Claimed || tenPredictions.Progress != 10 || tenPredictions.Target != 10 || tenPredictions.RewardPoints != 825 {
		t.Fatalf("expected complete unclaimed ten-predictions mission, got %+v", tenPredictions)
	}

	firstReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"ten_predictions"}`)),
		userID,
	)
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first ten-predictions mission claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}
	secondReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"ten_predictions"}`)),
		userID,
	)
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusOK {
		t.Fatalf("expected duplicate ten-predictions mission claim status 200, got %d, body=%s", secondRes.Code, secondRes.Body.String())
	}

	var claimPayload struct {
		ClaimPoints   int64  `json:"claimPoints"`
		BalancePoints int64  `json:"balancePoints"`
		Unit          string `json:"unit"`
	}
	if err := json.Unmarshal(secondRes.Body.Bytes(), &claimPayload); err != nil {
		t.Fatalf("decode mission claim: %v", err)
	}
	if claimPayload.Unit != "PTS" || claimPayload.ClaimPoints != 825 || claimPayload.BalancePoints != 1825 {
		t.Fatalf("expected stable ten-predictions mission point response, got %+v", claimPayload)
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/"+userID+"/ledger?limit=20", nil), userID)
	ledgerRes := httptest.NewRecorder()
	handler.ServeHTTP(ledgerRes, ledgerReq)
	if ledgerRes.Code != http.StatusOK {
		t.Fatalf("expected ledger status 200, got %d, body=%s", ledgerRes.Code, ledgerRes.Body.String())
	}
	var ledgerPayload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(ledgerRes.Body.Bytes(), &ledgerPayload); err != nil {
		t.Fatalf("decode mission ledger: %v", err)
	}
	missionRows := 0
	for _, entry := range ledgerPayload.Items {
		if entry["idempotencyKey"] == "mission_reward:"+userID+":ten_predictions" {
			missionRows++
		}
	}
	if missionRows != 1 {
		t.Fatalf("expected one ten-predictions mission ledger row, got %d entries=%+v", missionRows, ledgerPayload.Items)
	}
}

func TestWalletSettledResultMissionCompletesFromPayoutLedgerEvidence(t *testing.T) {
	t.Setenv("MISSION_SETTLED_RESULT_REWARD_CENTS", "550")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	userID := "u-settled-result-1"

	seed := []byte(`{"userId":"` + userID + `","amountPoints":800,"idempotencyKey":"prediction_payout:mkt-final:pos-win-1","reason":"prediction settlement: market final resolved YES, YES position won"}`)
	seedReq := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(seed)))
	seedRes := httptest.NewRecorder()
	handler.ServeHTTP(seedRes, seedReq)
	if seedRes.Code != http.StatusOK {
		t.Fatalf("expected seeded settlement payout evidence status 200, got %d, body=%s", seedRes.Code, seedRes.Body.String())
	}

	listReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/missions", nil), userID)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected missions list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []missionDefinition `json:"items"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode missions list: %v", err)
	}
	var settledResult missionDefinition
	for _, mission := range listPayload.Items {
		if mission.ID == "settled_result" {
			settledResult = mission
			break
		}
	}
	if !settledResult.Completed || settledResult.Claimed || settledResult.RewardPoints != 550 {
		t.Fatalf("expected complete unclaimed settled-result mission, got %+v", settledResult)
	}

	firstReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"settled_result"}`)),
		userID,
	)
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected settled result mission claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}
	secondReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"settled_result"}`)),
		userID,
	)
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusOK {
		t.Fatalf("expected duplicate settled result mission claim status 200, got %d, body=%s", secondRes.Code, secondRes.Body.String())
	}

	var claimPayload struct {
		ClaimPoints   int64  `json:"claimPoints"`
		BalancePoints int64  `json:"balancePoints"`
		Unit          string `json:"unit"`
	}
	if err := json.Unmarshal(secondRes.Body.Bytes(), &claimPayload); err != nil {
		t.Fatalf("decode mission claim: %v", err)
	}
	if claimPayload.Unit != "PTS" || claimPayload.ClaimPoints != 550 || claimPayload.BalancePoints != 1350 {
		t.Fatalf("expected stable settled-result mission point response, got %+v", claimPayload)
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/"+userID+"/ledger?limit=10", nil), userID)
	ledgerRes := httptest.NewRecorder()
	handler.ServeHTTP(ledgerRes, ledgerReq)
	if ledgerRes.Code != http.StatusOK {
		t.Fatalf("expected ledger status 200, got %d, body=%s", ledgerRes.Code, ledgerRes.Body.String())
	}
	var ledgerPayload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(ledgerRes.Body.Bytes(), &ledgerPayload); err != nil {
		t.Fatalf("decode mission ledger: %v", err)
	}
	missionRows := 0
	for _, entry := range ledgerPayload.Items {
		if entry["idempotencyKey"] == "mission_reward:"+userID+":settled_result" {
			missionRows++
		}
	}
	if missionRows != 1 {
		t.Fatalf("expected one settled result mission ledger row, got %d entries=%+v", missionRows, ledgerPayload.Items)
	}
}

func TestWalletThreeSettledResultsMissionCompletesFromPayoutLedgerEvidence(t *testing.T) {
	t.Setenv("MISSION_THREE_SETTLED_RESULTS_REWARD_CENTS", "675")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	userID := "u-three-settled-results-1"

	for i := 1; i <= 3; i++ {
		seed := []byte(`{"userId":"` + userID + `","amountPoints":800,"idempotencyKey":"prediction_payout:mkt-three-` + strconv.Itoa(i) + `:pos-win-` + strconv.Itoa(i) + `","reason":"prediction settlement: market three resolved YES, YES position won"}`)
		seedReq := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(seed)))
		seedRes := httptest.NewRecorder()
		handler.ServeHTTP(seedRes, seedReq)
		if seedRes.Code != http.StatusOK {
			t.Fatalf("expected seeded settlement payout evidence %d status 200, got %d, body=%s", i, seedRes.Code, seedRes.Body.String())
		}
	}

	listReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/missions", nil), userID)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected missions list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []missionDefinition `json:"items"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode missions list: %v", err)
	}
	var threeSettled missionDefinition
	for _, mission := range listPayload.Items {
		if mission.ID == "three_settled_results" {
			threeSettled = mission
			break
		}
	}
	if !threeSettled.Completed || threeSettled.Claimed || threeSettled.Progress != 3 || threeSettled.Target != 3 || threeSettled.RewardPoints != 675 {
		t.Fatalf("expected complete unclaimed three-settled-results mission, got %+v", threeSettled)
	}

	firstReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"three_settled_results"}`)),
		userID,
	)
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first three-settled-results mission claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}
	secondReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"three_settled_results"}`)),
		userID,
	)
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusOK {
		t.Fatalf("expected duplicate three-settled-results mission claim status 200, got %d, body=%s", secondRes.Code, secondRes.Body.String())
	}

	var claimPayload struct {
		ClaimPoints   int64  `json:"claimPoints"`
		BalancePoints int64  `json:"balancePoints"`
		Unit          string `json:"unit"`
	}
	if err := json.Unmarshal(secondRes.Body.Bytes(), &claimPayload); err != nil {
		t.Fatalf("decode mission claim: %v", err)
	}
	if claimPayload.Unit != "PTS" || claimPayload.ClaimPoints != 675 || claimPayload.BalancePoints != 3075 {
		t.Fatalf("expected stable three-settled-results mission point response, got %+v", claimPayload)
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/"+userID+"/ledger?limit=10", nil), userID)
	ledgerRes := httptest.NewRecorder()
	handler.ServeHTTP(ledgerRes, ledgerReq)
	if ledgerRes.Code != http.StatusOK {
		t.Fatalf("expected ledger status 200, got %d, body=%s", ledgerRes.Code, ledgerRes.Body.String())
	}
	var ledgerPayload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(ledgerRes.Body.Bytes(), &ledgerPayload); err != nil {
		t.Fatalf("decode mission ledger: %v", err)
	}
	missionRows := 0
	for _, entry := range ledgerPayload.Items {
		if entry["idempotencyKey"] == "mission_reward:"+userID+":three_settled_results" {
			missionRows++
		}
	}
	if missionRows != 1 {
		t.Fatalf("expected one three-settled-results mission ledger row, got %d entries=%+v", missionRows, ledgerPayload.Items)
	}
}

func TestWalletFiveSettledResultsMissionCompletesFromPayoutLedgerEvidence(t *testing.T) {
	t.Setenv("MISSION_FIVE_SETTLED_RESULTS_REWARD_CENTS", "725")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	userID := "u-five-settled-results-1"

	for i := 1; i <= 5; i++ {
		seed := []byte(`{"userId":"` + userID + `","amountPoints":700,"idempotencyKey":"prediction_payout:mkt-five-` + strconv.Itoa(i) + `:pos-win-` + strconv.Itoa(i) + `","reason":"prediction settlement: market five resolved YES, YES position won"}`)
		seedReq := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(seed)))
		seedRes := httptest.NewRecorder()
		handler.ServeHTTP(seedRes, seedReq)
		if seedRes.Code != http.StatusOK {
			t.Fatalf("expected seeded settlement payout evidence %d status 200, got %d, body=%s", i, seedRes.Code, seedRes.Body.String())
		}
	}

	listReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/missions", nil), userID)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected missions list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []missionDefinition `json:"items"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode missions list: %v", err)
	}
	var fiveSettled missionDefinition
	for _, mission := range listPayload.Items {
		if mission.ID == "five_settled_results" {
			fiveSettled = mission
			break
		}
	}
	if !fiveSettled.Completed || fiveSettled.Claimed || fiveSettled.Progress != 5 || fiveSettled.Target != 5 || fiveSettled.RewardPoints != 725 {
		t.Fatalf("expected complete unclaimed five-settled-results mission, got %+v", fiveSettled)
	}

	firstReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"five_settled_results"}`)),
		userID,
	)
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first five-settled-results mission claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}
	secondReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"five_settled_results"}`)),
		userID,
	)
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusOK {
		t.Fatalf("expected duplicate five-settled-results mission claim status 200, got %d, body=%s", secondRes.Code, secondRes.Body.String())
	}

	var claimPayload struct {
		ClaimPoints   int64  `json:"claimPoints"`
		BalancePoints int64  `json:"balancePoints"`
		Unit          string `json:"unit"`
	}
	if err := json.Unmarshal(secondRes.Body.Bytes(), &claimPayload); err != nil {
		t.Fatalf("decode mission claim: %v", err)
	}
	if claimPayload.Unit != "PTS" || claimPayload.ClaimPoints != 725 || claimPayload.BalancePoints != 4225 {
		t.Fatalf("expected stable five-settled-results mission point response, got %+v", claimPayload)
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/"+userID+"/ledger?limit=20", nil), userID)
	ledgerRes := httptest.NewRecorder()
	handler.ServeHTTP(ledgerRes, ledgerReq)
	if ledgerRes.Code != http.StatusOK {
		t.Fatalf("expected ledger status 200, got %d, body=%s", ledgerRes.Code, ledgerRes.Body.String())
	}
	var ledgerPayload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(ledgerRes.Body.Bytes(), &ledgerPayload); err != nil {
		t.Fatalf("decode mission ledger: %v", err)
	}
	missionRows := 0
	for _, entry := range ledgerPayload.Items {
		if entry["idempotencyKey"] == "mission_reward:"+userID+":five_settled_results" {
			missionRows++
		}
	}
	if missionRows != 1 {
		t.Fatalf("expected one five-settled-results mission ledger row, got %d entries=%+v", missionRows, ledgerPayload.Items)
	}
}

func TestWalletTenSettledResultsMissionCompletesFromPayoutLedgerEvidence(t *testing.T) {
	t.Setenv("MISSION_TEN_SETTLED_RESULTS_REWARD_CENTS", "925")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	userID := "u-ten-settled-results-1"

	for i := 1; i <= 10; i++ {
		seed := []byte(`{"userId":"` + userID + `","amountPoints":600,"idempotencyKey":"prediction_payout:mkt-ten-` + strconv.Itoa(i) + `:pos-win-` + strconv.Itoa(i) + `","reason":"prediction settlement: market ten resolved YES, YES position won"}`)
		seedReq := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(seed)))
		seedRes := httptest.NewRecorder()
		handler.ServeHTTP(seedRes, seedReq)
		if seedRes.Code != http.StatusOK {
			t.Fatalf("expected seeded settlement payout evidence %d status 200, got %d, body=%s", i, seedRes.Code, seedRes.Body.String())
		}
	}

	listReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/missions", nil), userID)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected missions list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []missionDefinition `json:"items"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode missions list: %v", err)
	}
	var tenSettled missionDefinition
	for _, mission := range listPayload.Items {
		if mission.ID == "ten_settled_results" {
			tenSettled = mission
			break
		}
	}
	if !tenSettled.Completed || tenSettled.Claimed || tenSettled.Progress != 10 || tenSettled.Target != 10 || tenSettled.RewardPoints != 925 {
		t.Fatalf("expected complete unclaimed ten-settled-results mission, got %+v", tenSettled)
	}

	firstReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"ten_settled_results"}`)),
		userID,
	)
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first ten-settled-results mission claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}
	secondReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"ten_settled_results"}`)),
		userID,
	)
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusOK {
		t.Fatalf("expected duplicate ten-settled-results mission claim status 200, got %d, body=%s", secondRes.Code, secondRes.Body.String())
	}

	var claimPayload struct {
		ClaimPoints   int64  `json:"claimPoints"`
		BalancePoints int64  `json:"balancePoints"`
		Unit          string `json:"unit"`
	}
	if err := json.Unmarshal(secondRes.Body.Bytes(), &claimPayload); err != nil {
		t.Fatalf("decode mission claim: %v", err)
	}
	if claimPayload.Unit != "PTS" || claimPayload.ClaimPoints != 925 || claimPayload.BalancePoints != 6925 {
		t.Fatalf("expected stable ten-settled-results mission point response, got %+v", claimPayload)
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/"+userID+"/ledger?limit=20", nil), userID)
	ledgerRes := httptest.NewRecorder()
	handler.ServeHTTP(ledgerRes, ledgerReq)
	if ledgerRes.Code != http.StatusOK {
		t.Fatalf("expected ledger status 200, got %d, body=%s", ledgerRes.Code, ledgerRes.Body.String())
	}
	var ledgerPayload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(ledgerRes.Body.Bytes(), &ledgerPayload); err != nil {
		t.Fatalf("decode mission ledger: %v", err)
	}
	missionRows := 0
	for _, entry := range ledgerPayload.Items {
		if entry["idempotencyKey"] == "mission_reward:"+userID+":ten_settled_results" {
			missionRows++
		}
	}
	if missionRows != 1 {
		t.Fatalf("expected one ten-settled-results mission ledger row, got %d entries=%+v", missionRows, ledgerPayload.Items)
	}
}

func TestWalletWeeklyCheckInMissionCompletesFromDailyClaimStreak(t *testing.T) {
	t.Setenv("MISSION_WEEKLY_CHECK_IN_REWARD_CENTS", "650")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	userID := "u-weekly-mission-1"
	now := time.Now().UTC()

	for i := 0; i < 7; i++ {
		date := now.AddDate(0, 0, -i).Format("2006-01-02")
		payload := []byte(`{"userId":"` + userID + `","amountPoints":100,"idempotencyKey":"daily_claim:` + userID + `:` + date + `","reason":"daily_claim"}`)
		req := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(payload)))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusOK {
			t.Fatalf("expected seeded daily claim %s status 200, got %d, body=%s", date, res.Code, res.Body.String())
		}
	}

	listReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/missions", nil), userID)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected missions list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []missionDefinition `json:"items"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode missions list: %v", err)
	}
	var weekly missionDefinition
	for _, mission := range listPayload.Items {
		if mission.ID == "weekly_check_in" {
			weekly = mission
			break
		}
	}
	if !weekly.Completed || weekly.Claimed || weekly.Progress != 7 || weekly.Target != 7 || weekly.RewardPoints != 650 {
		t.Fatalf("expected complete unclaimed weekly mission, got %+v", weekly)
	}

	firstReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"weekly_check_in"}`)),
		userID,
	)
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first weekly mission claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}
	secondReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"weekly_check_in"}`)),
		userID,
	)
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusOK {
		t.Fatalf("expected duplicate weekly mission claim status 200, got %d, body=%s", secondRes.Code, secondRes.Body.String())
	}

	var claimPayload struct {
		ClaimPoints   int64  `json:"claimPoints"`
		BalancePoints int64  `json:"balancePoints"`
		Unit          string `json:"unit"`
	}
	if err := json.Unmarshal(secondRes.Body.Bytes(), &claimPayload); err != nil {
		t.Fatalf("decode weekly mission claim: %v", err)
	}
	if claimPayload.Unit != "PTS" || claimPayload.ClaimPoints != 650 || claimPayload.BalancePoints != 1350 {
		t.Fatalf("expected stable weekly mission point response, got %+v", claimPayload)
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/"+userID+"/ledger?limit=20", nil), userID)
	ledgerRes := httptest.NewRecorder()
	handler.ServeHTTP(ledgerRes, ledgerReq)
	if ledgerRes.Code != http.StatusOK {
		t.Fatalf("expected ledger status 200, got %d, body=%s", ledgerRes.Code, ledgerRes.Body.String())
	}
	var ledgerPayload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(ledgerRes.Body.Bytes(), &ledgerPayload); err != nil {
		t.Fatalf("decode weekly mission ledger: %v", err)
	}
	weeklyRows := 0
	for _, entry := range ledgerPayload.Items {
		if entry["idempotencyKey"] == "mission_reward:"+userID+":weekly_check_in" {
			weeklyRows++
		}
	}
	if weeklyRows != 1 {
		t.Fatalf("expected one weekly mission ledger row, got %d entries=%+v", weeklyRows, ledgerPayload.Items)
	}
}

func TestWalletMonthlyCheckInMissionCompletesFromDailyClaimStreak(t *testing.T) {
	t.Setenv("MISSION_MONTHLY_CHECK_IN_REWARD_CENTS", "4200")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	userID := "u-monthly-mission-1"
	now := time.Now().UTC()

	for i := 0; i < 30; i++ {
		date := now.AddDate(0, 0, -i).Format("2006-01-02")
		payload := []byte(`{"userId":"` + userID + `","amountPoints":100,"idempotencyKey":"daily_claim:` + userID + `:` + date + `","reason":"daily_claim"}`)
		req := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(payload)))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusOK {
			t.Fatalf("expected seeded daily claim %s status 200, got %d, body=%s", date, res.Code, res.Body.String())
		}
	}

	listReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/missions", nil), userID)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected missions list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []missionDefinition `json:"items"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode missions list: %v", err)
	}
	var monthly missionDefinition
	for _, mission := range listPayload.Items {
		if mission.ID == "monthly_check_in" {
			monthly = mission
			break
		}
	}
	if !monthly.Completed || monthly.Claimed || monthly.Progress != 30 || monthly.Target != 30 || monthly.RewardPoints != 4200 {
		t.Fatalf("expected complete unclaimed monthly mission, got %+v", monthly)
	}

	firstReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"monthly_check_in"}`)),
		userID,
	)
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first monthly mission claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}
	secondReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"monthly_check_in"}`)),
		userID,
	)
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusOK {
		t.Fatalf("expected duplicate monthly mission claim status 200, got %d, body=%s", secondRes.Code, secondRes.Body.String())
	}

	var claimPayload struct {
		ClaimPoints   int64  `json:"claimPoints"`
		BalancePoints int64  `json:"balancePoints"`
		Unit          string `json:"unit"`
	}
	if err := json.Unmarshal(secondRes.Body.Bytes(), &claimPayload); err != nil {
		t.Fatalf("decode monthly mission claim: %v", err)
	}
	if claimPayload.Unit != "PTS" || claimPayload.ClaimPoints != 4200 || claimPayload.BalancePoints != 7200 {
		t.Fatalf("expected stable monthly mission point response, got %+v", claimPayload)
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/"+userID+"/ledger?limit=60", nil), userID)
	ledgerRes := httptest.NewRecorder()
	handler.ServeHTTP(ledgerRes, ledgerReq)
	if ledgerRes.Code != http.StatusOK {
		t.Fatalf("expected ledger status 200, got %d, body=%s", ledgerRes.Code, ledgerRes.Body.String())
	}
	var ledgerPayload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(ledgerRes.Body.Bytes(), &ledgerPayload); err != nil {
		t.Fatalf("decode monthly mission ledger: %v", err)
	}
	monthlyRows := 0
	for _, entry := range ledgerPayload.Items {
		if entry["idempotencyKey"] == "mission_reward:"+userID+":monthly_check_in" {
			monthlyRows++
		}
	}
	if monthlyRows != 1 {
		t.Fatalf("expected one monthly mission ledger row, got %d entries=%+v", monthlyRows, ledgerPayload.Items)
	}

	badgesReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/badges", nil), userID)
	badgesRes := httptest.NewRecorder()
	handler.ServeHTTP(badgesRes, badgesReq)
	if badgesRes.Code != http.StatusOK {
		t.Fatalf("expected badges status 200, got %d, body=%s", badgesRes.Code, badgesRes.Body.String())
	}
	var badgesPayload struct {
		Items []badgeDefinition `json:"items"`
	}
	if err := json.Unmarshal(badgesRes.Body.Bytes(), &badgesPayload); err != nil {
		t.Fatalf("decode monthly mission badges: %v", err)
	}
	earnedByID := map[string]bool{}
	for _, badge := range badgesPayload.Items {
		earnedByID[badge.ID] = badge.Earned
	}
	if !earnedByID["monthly_check_in"] {
		t.Fatalf("expected monthly check-in badge to be earned after monthly mission claim, got %+v", earnedByID)
	}
}

func TestWalletSeasonalCheckInMissionCompletesFromDailyClaimStreak(t *testing.T) {
	t.Setenv("MISSION_SEASONAL_CHECK_IN_REWARD_CENTS", "9000")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	userID := "u-seasonal-mission-1"
	now := time.Now().UTC()

	for i := 0; i < 60; i++ {
		date := now.AddDate(0, 0, -i).Format("2006-01-02")
		payload := []byte(`{"userId":"` + userID + `","amountPoints":100,"idempotencyKey":"daily_claim:` + userID + `:` + date + `","reason":"daily_claim"}`)
		req := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(payload)))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusOK {
			t.Fatalf("expected seeded daily claim %s status 200, got %d, body=%s", date, res.Code, res.Body.String())
		}
	}

	listReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/missions", nil), userID)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected missions list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []missionDefinition `json:"items"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode missions list: %v", err)
	}
	var seasonal missionDefinition
	for _, mission := range listPayload.Items {
		if mission.ID == "seasonal_check_in" {
			seasonal = mission
			break
		}
	}
	if !seasonal.Completed || seasonal.Claimed || seasonal.Progress != 60 || seasonal.Target != 60 || seasonal.RewardPoints != 9000 {
		t.Fatalf("expected complete unclaimed seasonal mission, got %+v", seasonal)
	}

	firstReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"seasonal_check_in"}`)),
		userID,
	)
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first seasonal mission claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}
	secondReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"seasonal_check_in"}`)),
		userID,
	)
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusOK {
		t.Fatalf("expected duplicate seasonal mission claim status 200, got %d, body=%s", secondRes.Code, secondRes.Body.String())
	}

	var claimPayload struct {
		ClaimPoints   int64  `json:"claimPoints"`
		BalancePoints int64  `json:"balancePoints"`
		Unit          string `json:"unit"`
	}
	if err := json.Unmarshal(secondRes.Body.Bytes(), &claimPayload); err != nil {
		t.Fatalf("decode seasonal mission claim: %v", err)
	}
	if claimPayload.Unit != "PTS" || claimPayload.ClaimPoints != 9000 || claimPayload.BalancePoints != 15000 {
		t.Fatalf("expected stable seasonal mission point response, got %+v", claimPayload)
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/"+userID+"/ledger?limit=100", nil), userID)
	ledgerRes := httptest.NewRecorder()
	handler.ServeHTTP(ledgerRes, ledgerReq)
	if ledgerRes.Code != http.StatusOK {
		t.Fatalf("expected ledger status 200, got %d, body=%s", ledgerRes.Code, ledgerRes.Body.String())
	}
	var ledgerPayload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(ledgerRes.Body.Bytes(), &ledgerPayload); err != nil {
		t.Fatalf("decode seasonal mission ledger: %v", err)
	}
	seasonalRows := 0
	for _, entry := range ledgerPayload.Items {
		if entry["idempotencyKey"] == "mission_reward:"+userID+":seasonal_check_in" {
			seasonalRows++
		}
	}
	if seasonalRows != 1 {
		t.Fatalf("expected one seasonal mission ledger row, got %d entries=%+v", seasonalRows, ledgerPayload.Items)
	}

	badgesReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/badges", nil), userID)
	badgesRes := httptest.NewRecorder()
	handler.ServeHTTP(badgesRes, badgesReq)
	if badgesRes.Code != http.StatusOK {
		t.Fatalf("expected badges status 200, got %d, body=%s", badgesRes.Code, badgesRes.Body.String())
	}
	var badgesPayload struct {
		Items []badgeDefinition `json:"items"`
	}
	if err := json.Unmarshal(badgesRes.Body.Bytes(), &badgesPayload); err != nil {
		t.Fatalf("decode seasonal mission badges: %v", err)
	}
	earnedByID := map[string]bool{}
	for _, badge := range badgesPayload.Items {
		earnedByID[badge.ID] = badge.Earned
	}
	if !earnedByID["seasonal_check_in"] {
		t.Fatalf("expected seasonal check-in badge to be earned after seasonal mission claim, got %+v", earnedByID)
	}
}

func TestWalletQuarterlyCheckInMissionCompletesFromDailyClaimStreak(t *testing.T) {
	t.Setenv("MISSION_QUARTERLY_CHECK_IN_REWARD_CENTS", "15000")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	userID := "u-quarterly-mission-1"
	now := time.Now().UTC()

	for i := 0; i < 90; i++ {
		date := now.AddDate(0, 0, -i).Format("2006-01-02")
		payload := []byte(`{"userId":"` + userID + `","amountPoints":100,"idempotencyKey":"daily_claim:` + userID + `:` + date + `","reason":"daily_claim"}`)
		req := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(payload)))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusOK {
			t.Fatalf("expected seeded daily claim %s status 200, got %d, body=%s", date, res.Code, res.Body.String())
		}
	}

	listReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/missions", nil), userID)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected missions list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []missionDefinition `json:"items"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode missions list: %v", err)
	}
	var quarterly missionDefinition
	for _, mission := range listPayload.Items {
		if mission.ID == "quarterly_check_in" {
			quarterly = mission
			break
		}
	}
	if !quarterly.Completed || quarterly.Claimed || quarterly.Progress != 90 || quarterly.Target != 90 || quarterly.RewardPoints != 15000 {
		t.Fatalf("expected complete unclaimed quarterly mission, got %+v", quarterly)
	}

	firstReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"quarterly_check_in"}`)),
		userID,
	)
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first quarterly mission claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}
	secondReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"quarterly_check_in"}`)),
		userID,
	)
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusOK {
		t.Fatalf("expected duplicate quarterly mission claim status 200, got %d, body=%s", secondRes.Code, secondRes.Body.String())
	}

	var claimPayload struct {
		ClaimPoints   int64  `json:"claimPoints"`
		BalancePoints int64  `json:"balancePoints"`
		Unit          string `json:"unit"`
	}
	if err := json.Unmarshal(secondRes.Body.Bytes(), &claimPayload); err != nil {
		t.Fatalf("decode quarterly mission claim: %v", err)
	}
	if claimPayload.Unit != "PTS" || claimPayload.ClaimPoints != 15000 || claimPayload.BalancePoints != 24000 {
		t.Fatalf("expected stable quarterly mission point response, got %+v", claimPayload)
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/"+userID+"/ledger?limit=120", nil), userID)
	ledgerRes := httptest.NewRecorder()
	handler.ServeHTTP(ledgerRes, ledgerReq)
	if ledgerRes.Code != http.StatusOK {
		t.Fatalf("expected ledger status 200, got %d, body=%s", ledgerRes.Code, ledgerRes.Body.String())
	}
	var ledgerPayload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(ledgerRes.Body.Bytes(), &ledgerPayload); err != nil {
		t.Fatalf("decode quarterly mission ledger: %v", err)
	}
	quarterlyRows := 0
	for _, entry := range ledgerPayload.Items {
		if entry["idempotencyKey"] == "mission_reward:"+userID+":quarterly_check_in" {
			quarterlyRows++
		}
	}
	if quarterlyRows != 1 {
		t.Fatalf("expected one quarterly mission ledger row, got %d entries=%+v", quarterlyRows, ledgerPayload.Items)
	}

	badgesReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/badges", nil), userID)
	badgesRes := httptest.NewRecorder()
	handler.ServeHTTP(badgesRes, badgesReq)
	if badgesRes.Code != http.StatusOK {
		t.Fatalf("expected badges status 200, got %d, body=%s", badgesRes.Code, badgesRes.Body.String())
	}
	var badgesPayload struct {
		Items []badgeDefinition `json:"items"`
	}
	if err := json.Unmarshal(badgesRes.Body.Bytes(), &badgesPayload); err != nil {
		t.Fatalf("decode quarterly mission badges: %v", err)
	}
	earnedByID := map[string]bool{}
	for _, badge := range badgesPayload.Items {
		earnedByID[badge.ID] = badge.Earned
	}
	if !earnedByID["quarterly_check_in"] {
		t.Fatalf("expected quarterly check-in badge to be earned after quarterly mission claim, got %+v", earnedByID)
	}
}

func TestWalletMissionClaimRequiresSessionUser(t *testing.T) {
	t.Setenv("MISSION_DAILY_CHECK_IN_REWARD_CENTS", "300")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"daily_check_in"}`))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusUnauthorized {
		t.Fatalf("expected mission claim without auth to return 401, got %d, body=%s", res.Code, res.Body.String())
	}
}

func TestWalletDailyStreakCompletesFromLedgerAndCreditsOnce(t *testing.T) {
	t.Setenv("STREAK_DAILY_3_REWARD_CENTS", "900")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	userID := "u-streak-1"
	now := time.Now().UTC()

	for i := 0; i < 3; i++ {
		date := now.AddDate(0, 0, -i).Format("2006-01-02")
		payload := []byte(`{"userId":"` + userID + `","amountPoints":100,"idempotencyKey":"daily_claim:` + userID + `:` + date + `","reason":"daily_claim"}`)
		req := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(payload)))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusOK {
			t.Fatalf("expected seeded daily claim %s status 200, got %d, body=%s", date, res.Code, res.Body.String())
		}
	}

	listReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/streaks", nil), userID)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected streaks list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []streakDefinition `json:"items"`
		Total int                `json:"total"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode streaks list: %v", err)
	}
	var threeDay streakDefinition
	for _, streak := range listPayload.Items {
		if streak.ID == "daily_3" {
			threeDay = streak
			break
		}
	}
	if !threeDay.Completed || threeDay.Claimed || threeDay.CurrentStreak != 3 || threeDay.Target != 3 || threeDay.RewardPoints != 900 {
		t.Fatalf("expected complete unclaimed 3-day streak, got %+v", listPayload)
	}

	firstReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/streaks/claim", bytes.NewBufferString(`{"streakId":"daily_3"}`)),
		userID,
	)
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first streak claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}
	secondReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/streaks/claim", bytes.NewBufferString(`{"streakId":"daily_3"}`)),
		userID,
	)
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusOK {
		t.Fatalf("expected duplicate streak claim status 200, got %d, body=%s", secondRes.Code, secondRes.Body.String())
	}

	var claimPayload map[string]any
	if err := json.Unmarshal(secondRes.Body.Bytes(), &claimPayload); err != nil {
		t.Fatalf("decode streak claim: %v", err)
	}
	if claimPayload["unit"] != "PTS" {
		t.Fatalf("expected streak claim point unit, got %v", claimPayload["unit"])
	}
	if int(claimPayload["claimPoints"].(float64)) != 900 {
		t.Fatalf("expected streak point reward 900, got %v", claimPayload["claimPoints"])
	}
	if int(claimPayload["balancePoints"].(float64)) != 1200 {
		t.Fatalf("expected stable point balance 1200 after duplicate streak claim, got %v", claimPayload["balancePoints"])
	}
	// Points unit-model (2026-07-07): retired spellings are the cents-era keys.
	for _, retired := range []string{"claimPointsCents", "balancePointsCents"} {
		if _, ok := claimPayload[retired]; ok {
			t.Fatalf("streak claim response should not emit retired alias %s in %+v", retired, claimPayload)
		}
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/"+userID+"/ledger?limit=10", nil), userID)
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
		t.Fatalf("decode streak ledger: %v", err)
	}
	streakRows := 0
	for _, entry := range ledgerPayload.Items {
		if entry["reason"] == "streak_reward" {
			streakRows++
			if entry["idempotencyKey"] != "streak_reward:"+userID+":daily_3" {
				t.Fatalf("expected streak reward idempotency key, got %v", entry["idempotencyKey"])
			}
		}
	}
	if streakRows != 1 {
		t.Fatalf("expected one streak_reward ledger row, got %d entries=%+v", streakRows, ledgerPayload.Items)
	}
}

func TestWalletWeeklyStreakCompletesFromLedgerAndCreditsOnce(t *testing.T) {
	t.Setenv("STREAK_DAILY_7_REWARD_CENTS", "1700")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	userID := "u-weekly-streak-1"
	now := time.Now().UTC()

	for i := 0; i < 7; i++ {
		date := now.AddDate(0, 0, -i).Format("2006-01-02")
		payload := []byte(`{"userId":"` + userID + `","amountPoints":100,"idempotencyKey":"daily_claim:` + userID + `:` + date + `","reason":"daily_claim"}`)
		req := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(payload)))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusOK {
			t.Fatalf("expected seeded daily claim %s status 200, got %d, body=%s", date, res.Code, res.Body.String())
		}
	}

	listReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/streaks", nil), userID)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected streaks list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []streakDefinition `json:"items"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode streaks list: %v", err)
	}
	var weekly streakDefinition
	for _, streak := range listPayload.Items {
		if streak.ID == "daily_7" {
			weekly = streak
			break
		}
	}
	if !weekly.Completed || weekly.Claimed || weekly.CurrentStreak != 7 || weekly.Target != 7 || weekly.RewardPoints != 1700 {
		t.Fatalf("expected complete unclaimed weekly streak, got %+v", weekly)
	}

	firstReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/streaks/claim", bytes.NewBufferString(`{"streakId":"daily_7"}`)),
		userID,
	)
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first weekly streak claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}
	secondReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/streaks/claim", bytes.NewBufferString(`{"streakId":"daily_7"}`)),
		userID,
	)
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusOK {
		t.Fatalf("expected duplicate weekly streak claim status 200, got %d, body=%s", secondRes.Code, secondRes.Body.String())
	}

	var claimPayload struct {
		ClaimPoints   int64  `json:"claimPoints"`
		BalancePoints int64  `json:"balancePoints"`
		Unit          string `json:"unit"`
	}
	if err := json.Unmarshal(secondRes.Body.Bytes(), &claimPayload); err != nil {
		t.Fatalf("decode weekly streak claim: %v", err)
	}
	if claimPayload.Unit != "PTS" || claimPayload.ClaimPoints != 1700 || claimPayload.BalancePoints != 2400 {
		t.Fatalf("expected stable weekly streak point response, got %+v", claimPayload)
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/"+userID+"/ledger?limit=20", nil), userID)
	ledgerRes := httptest.NewRecorder()
	handler.ServeHTTP(ledgerRes, ledgerReq)
	if ledgerRes.Code != http.StatusOK {
		t.Fatalf("expected ledger status 200, got %d, body=%s", ledgerRes.Code, ledgerRes.Body.String())
	}
	var ledgerPayload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(ledgerRes.Body.Bytes(), &ledgerPayload); err != nil {
		t.Fatalf("decode weekly streak ledger: %v", err)
	}
	weeklyRows := 0
	for _, entry := range ledgerPayload.Items {
		if entry["idempotencyKey"] == "streak_reward:"+userID+":daily_7" {
			weeklyRows++
		}
	}
	if weeklyRows != 1 {
		t.Fatalf("expected one weekly streak ledger row, got %d entries=%+v", weeklyRows, ledgerPayload.Items)
	}
}

func TestWalletFortnightStreakCompletesFromLedgerAndCreditsOnce(t *testing.T) {
	t.Setenv("STREAK_DAILY_14_REWARD_CENTS", "3100")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	userID := "u-fortnight-streak-1"
	now := time.Now().UTC()

	for i := 0; i < 14; i++ {
		date := now.AddDate(0, 0, -i).Format("2006-01-02")
		payload := []byte(`{"userId":"` + userID + `","amountPoints":100,"idempotencyKey":"daily_claim:` + userID + `:` + date + `","reason":"daily_claim"}`)
		req := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(payload)))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusOK {
			t.Fatalf("expected seeded daily claim %s status 200, got %d, body=%s", date, res.Code, res.Body.String())
		}
	}

	listReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/streaks", nil), userID)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected streaks list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []streakDefinition `json:"items"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode streaks list: %v", err)
	}
	var fortnight streakDefinition
	for _, streak := range listPayload.Items {
		if streak.ID == "daily_14" {
			fortnight = streak
			break
		}
	}
	if !fortnight.Completed || fortnight.Claimed || fortnight.CurrentStreak != 14 || fortnight.Target != 14 || fortnight.RewardPoints != 3100 {
		t.Fatalf("expected complete unclaimed fortnight streak, got %+v", fortnight)
	}

	firstReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/streaks/claim", bytes.NewBufferString(`{"streakId":"daily_14"}`)),
		userID,
	)
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first fortnight streak claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}
	secondReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/streaks/claim", bytes.NewBufferString(`{"streakId":"daily_14"}`)),
		userID,
	)
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusOK {
		t.Fatalf("expected duplicate fortnight streak claim status 200, got %d, body=%s", secondRes.Code, secondRes.Body.String())
	}

	var claimPayload struct {
		ClaimPoints   int64  `json:"claimPoints"`
		BalancePoints int64  `json:"balancePoints"`
		Unit          string `json:"unit"`
	}
	if err := json.Unmarshal(secondRes.Body.Bytes(), &claimPayload); err != nil {
		t.Fatalf("decode fortnight streak claim: %v", err)
	}
	if claimPayload.Unit != "PTS" || claimPayload.ClaimPoints != 3100 || claimPayload.BalancePoints != 4500 {
		t.Fatalf("expected stable fortnight streak point response, got %+v", claimPayload)
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/"+userID+"/ledger?limit=30", nil), userID)
	ledgerRes := httptest.NewRecorder()
	handler.ServeHTTP(ledgerRes, ledgerReq)
	if ledgerRes.Code != http.StatusOK {
		t.Fatalf("expected ledger status 200, got %d, body=%s", ledgerRes.Code, ledgerRes.Body.String())
	}
	var ledgerPayload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(ledgerRes.Body.Bytes(), &ledgerPayload); err != nil {
		t.Fatalf("decode fortnight streak ledger: %v", err)
	}
	fortnightRows := 0
	for _, entry := range ledgerPayload.Items {
		if entry["idempotencyKey"] == "streak_reward:"+userID+":daily_14" {
			fortnightRows++
		}
	}
	if fortnightRows != 1 {
		t.Fatalf("expected one fortnight streak ledger row, got %d entries=%+v", fortnightRows, ledgerPayload.Items)
	}
}

func TestWalletMonthlyStreakCompletesFromLedgerAndCreditsOnce(t *testing.T) {
	t.Setenv("STREAK_DAILY_30_REWARD_CENTS", "6400")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	userID := "u-monthly-streak-1"
	now := time.Now().UTC()

	for i := 0; i < 30; i++ {
		date := now.AddDate(0, 0, -i).Format("2006-01-02")
		payload := []byte(`{"userId":"` + userID + `","amountPoints":100,"idempotencyKey":"daily_claim:` + userID + `:` + date + `","reason":"daily_claim"}`)
		req := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(payload)))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusOK {
			t.Fatalf("expected seeded daily claim %s status 200, got %d, body=%s", date, res.Code, res.Body.String())
		}
	}

	listReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/streaks", nil), userID)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected streaks list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []streakDefinition `json:"items"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode streaks list: %v", err)
	}
	var monthly streakDefinition
	for _, streak := range listPayload.Items {
		if streak.ID == "daily_30" {
			monthly = streak
			break
		}
	}
	if !monthly.Completed || monthly.Claimed || monthly.CurrentStreak != 30 || monthly.Target != 30 || monthly.RewardPoints != 6400 {
		t.Fatalf("expected complete unclaimed monthly streak, got %+v", monthly)
	}

	firstReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/streaks/claim", bytes.NewBufferString(`{"streakId":"daily_30"}`)),
		userID,
	)
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first monthly streak claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}
	secondReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/streaks/claim", bytes.NewBufferString(`{"streakId":"daily_30"}`)),
		userID,
	)
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusOK {
		t.Fatalf("expected duplicate monthly streak claim status 200, got %d, body=%s", secondRes.Code, secondRes.Body.String())
	}

	var claimPayload struct {
		ClaimPoints   int64  `json:"claimPoints"`
		BalancePoints int64  `json:"balancePoints"`
		Unit          string `json:"unit"`
	}
	if err := json.Unmarshal(secondRes.Body.Bytes(), &claimPayload); err != nil {
		t.Fatalf("decode monthly streak claim: %v", err)
	}
	if claimPayload.Unit != "PTS" || claimPayload.ClaimPoints != 6400 || claimPayload.BalancePoints != 9400 {
		t.Fatalf("expected stable monthly streak point response, got %+v", claimPayload)
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/"+userID+"/ledger?limit=40", nil), userID)
	ledgerRes := httptest.NewRecorder()
	handler.ServeHTTP(ledgerRes, ledgerReq)
	if ledgerRes.Code != http.StatusOK {
		t.Fatalf("expected ledger status 200, got %d, body=%s", ledgerRes.Code, ledgerRes.Body.String())
	}
	var ledgerPayload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(ledgerRes.Body.Bytes(), &ledgerPayload); err != nil {
		t.Fatalf("decode monthly streak ledger: %v", err)
	}
	monthlyRows := 0
	for _, entry := range ledgerPayload.Items {
		if entry["idempotencyKey"] == "streak_reward:"+userID+":daily_30" {
			monthlyRows++
		}
	}
	if monthlyRows != 1 {
		t.Fatalf("expected one monthly streak ledger row, got %d entries=%+v", monthlyRows, ledgerPayload.Items)
	}
}

func TestWalletDoubleMonthlyStreakCompletesFromLedgerAndCreditsOnce(t *testing.T) {
	t.Setenv("STREAK_DAILY_60_REWARD_CENTS", "12000")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	userID := "u-double-monthly-streak-1"
	now := time.Now().UTC()

	for i := 0; i < 60; i++ {
		date := now.AddDate(0, 0, -i).Format("2006-01-02")
		payload := []byte(`{"userId":"` + userID + `","amountPoints":100,"idempotencyKey":"daily_claim:` + userID + `:` + date + `","reason":"daily_claim"}`)
		req := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(payload)))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusOK {
			t.Fatalf("expected seeded daily claim %s status 200, got %d, body=%s", date, res.Code, res.Body.String())
		}
	}

	listReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/streaks", nil), userID)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected streaks list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []streakDefinition `json:"items"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode streaks list: %v", err)
	}
	var doubleMonthly streakDefinition
	for _, streak := range listPayload.Items {
		if streak.ID == "daily_60" {
			doubleMonthly = streak
			break
		}
	}
	if !doubleMonthly.Completed || doubleMonthly.Claimed || doubleMonthly.CurrentStreak != 60 || doubleMonthly.Target != 60 || doubleMonthly.RewardPoints != 12000 {
		t.Fatalf("expected complete unclaimed double-monthly streak, got %+v", doubleMonthly)
	}

	firstReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/streaks/claim", bytes.NewBufferString(`{"streakId":"daily_60"}`)),
		userID,
	)
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first double-monthly streak claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}
	secondReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/streaks/claim", bytes.NewBufferString(`{"streakId":"daily_60"}`)),
		userID,
	)
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusOK {
		t.Fatalf("expected duplicate double-monthly streak claim status 200, got %d, body=%s", secondRes.Code, secondRes.Body.String())
	}

	var claimPayload struct {
		ClaimPoints   int64  `json:"claimPoints"`
		BalancePoints int64  `json:"balancePoints"`
		Unit          string `json:"unit"`
	}
	if err := json.Unmarshal(secondRes.Body.Bytes(), &claimPayload); err != nil {
		t.Fatalf("decode double-monthly streak claim: %v", err)
	}
	if claimPayload.Unit != "PTS" || claimPayload.ClaimPoints != 12000 || claimPayload.BalancePoints != 18000 {
		t.Fatalf("expected stable double-monthly streak point response, got %+v", claimPayload)
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/"+userID+"/ledger?limit=80", nil), userID)
	ledgerRes := httptest.NewRecorder()
	handler.ServeHTTP(ledgerRes, ledgerReq)
	if ledgerRes.Code != http.StatusOK {
		t.Fatalf("expected ledger status 200, got %d, body=%s", ledgerRes.Code, ledgerRes.Body.String())
	}
	var ledgerPayload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(ledgerRes.Body.Bytes(), &ledgerPayload); err != nil {
		t.Fatalf("decode double-monthly streak ledger: %v", err)
	}
	doubleMonthlyRows := 0
	for _, entry := range ledgerPayload.Items {
		if entry["idempotencyKey"] == "streak_reward:"+userID+":daily_60" {
			doubleMonthlyRows++
		}
	}
	if doubleMonthlyRows != 1 {
		t.Fatalf("expected one double-monthly streak ledger row, got %d entries=%+v", doubleMonthlyRows, ledgerPayload.Items)
	}
}

func TestWalletQuarterlyStreakCompletesFromLedgerAndCreditsOnce(t *testing.T) {
	t.Setenv("STREAK_DAILY_90_REWARD_CENTS", "18000")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	userID := "u-quarterly-streak-1"
	now := time.Now().UTC()

	for i := 0; i < 90; i++ {
		date := now.AddDate(0, 0, -i).Format("2006-01-02")
		payload := []byte(`{"userId":"` + userID + `","amountPoints":100,"idempotencyKey":"daily_claim:` + userID + `:` + date + `","reason":"daily_claim"}`)
		req := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(payload)))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusOK {
			t.Fatalf("expected seeded daily claim %s status 200, got %d, body=%s", date, res.Code, res.Body.String())
		}
	}

	listReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/streaks", nil), userID)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected streaks list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []streakDefinition `json:"items"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode streaks list: %v", err)
	}
	var quarterly streakDefinition
	for _, streak := range listPayload.Items {
		if streak.ID == "daily_90" {
			quarterly = streak
			break
		}
	}
	if !quarterly.Completed || quarterly.Claimed || quarterly.CurrentStreak != 90 || quarterly.Target != 90 || quarterly.RewardPoints != 18000 {
		t.Fatalf("expected complete unclaimed quarterly streak, got %+v", quarterly)
	}

	firstReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/streaks/claim", bytes.NewBufferString(`{"streakId":"daily_90"}`)),
		userID,
	)
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first quarterly streak claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}
	secondReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/streaks/claim", bytes.NewBufferString(`{"streakId":"daily_90"}`)),
		userID,
	)
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusOK {
		t.Fatalf("expected duplicate quarterly streak claim status 200, got %d, body=%s", secondRes.Code, secondRes.Body.String())
	}

	var claimPayload struct {
		ClaimPoints   int64  `json:"claimPoints"`
		BalancePoints int64  `json:"balancePoints"`
		Unit          string `json:"unit"`
	}
	if err := json.Unmarshal(secondRes.Body.Bytes(), &claimPayload); err != nil {
		t.Fatalf("decode quarterly streak claim: %v", err)
	}
	if claimPayload.Unit != "PTS" || claimPayload.ClaimPoints != 18000 || claimPayload.BalancePoints != 27000 {
		t.Fatalf("expected stable quarterly streak point response, got %+v", claimPayload)
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/"+userID+"/ledger?limit=120", nil), userID)
	ledgerRes := httptest.NewRecorder()
	handler.ServeHTTP(ledgerRes, ledgerReq)
	if ledgerRes.Code != http.StatusOK {
		t.Fatalf("expected ledger status 200, got %d, body=%s", ledgerRes.Code, ledgerRes.Body.String())
	}
	var ledgerPayload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(ledgerRes.Body.Bytes(), &ledgerPayload); err != nil {
		t.Fatalf("decode quarterly streak ledger: %v", err)
	}
	quarterlyRows := 0
	for _, entry := range ledgerPayload.Items {
		if entry["idempotencyKey"] == "streak_reward:"+userID+":daily_90" {
			quarterlyRows++
		}
	}
	if quarterlyRows != 1 {
		t.Fatalf("expected one quarterly streak ledger row, got %d entries=%+v", quarterlyRows, ledgerPayload.Items)
	}
}

func TestWalletLeaderboardDebutMissionCompletesFromPredictStanding(t *testing.T) {
	t.Setenv("MISSION_LEADERBOARD_DEBUT_REWARD_CENTS", "975")

	userID := "u-leaderboard-mission-1"
	now := time.Now().UTC()
	leaderboardService := leaderboards.NewPredictService(&fakeLBRepo{
		standing: []leaderboards.PredictEntry{
			{
				BoardID:     "accuracy",
				Rank:        7,
				UserID:      userID,
				DisplayName: "Leaderboard Debut",
				MetricValue: 0.72,
				WindowStart: now.Add(-24 * time.Hour),
				WindowEnd:   now,
			},
		},
	}, nil)
	mux := http.NewServeMux()
	registerWalletRoutes(mux, wallet.NewService(), leaderboardService)
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	listReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/missions", nil), userID)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected missions list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}
	var listPayload struct {
		Items []missionDefinition `json:"items"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode missions list: %v", err)
	}
	var leaderboardMission missionDefinition
	for _, mission := range listPayload.Items {
		if mission.ID == "leaderboard_debut" {
			leaderboardMission = mission
			break
		}
	}
	if !leaderboardMission.Completed || leaderboardMission.Claimed || leaderboardMission.Progress != 1 || leaderboardMission.Target != 1 || leaderboardMission.Unit != "PTS" {
		t.Fatalf("expected complete unclaimed leaderboard mission, got %+v", leaderboardMission)
	}

	firstReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"leaderboard_debut"}`)),
		userID,
	)
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first leaderboard mission claim status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}
	secondReq := playerWalletContext(
		httptest.NewRequest(http.MethodPost, "/api/v1/wallet/missions/claim", bytes.NewBufferString(`{"missionId":"leaderboard_debut"}`)),
		userID,
	)
	secondRes := httptest.NewRecorder()
	handler.ServeHTTP(secondRes, secondReq)
	if secondRes.Code != http.StatusOK {
		t.Fatalf("expected duplicate leaderboard mission claim status 200, got %d, body=%s", secondRes.Code, secondRes.Body.String())
	}

	var claimPayload struct {
		ClaimPoints   int64             `json:"claimPoints"`
		BalancePoints int64             `json:"balancePoints"`
		Unit          string            `json:"unit"`
		Mission       missionDefinition `json:"mission"`
	}
	if err := json.Unmarshal(secondRes.Body.Bytes(), &claimPayload); err != nil {
		t.Fatalf("decode leaderboard mission claim: %v", err)
	}
	if claimPayload.Unit != "PTS" || claimPayload.ClaimPoints != 975 || claimPayload.BalancePoints != 975 || !claimPayload.Mission.Claimed {
		t.Fatalf("expected stable leaderboard mission point response, got %+v", claimPayload)
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/"+userID+"/ledger?limit=20", nil), userID)
	ledgerRes := httptest.NewRecorder()
	handler.ServeHTTP(ledgerRes, ledgerReq)
	if ledgerRes.Code != http.StatusOK {
		t.Fatalf("expected ledger status 200, got %d, body=%s", ledgerRes.Code, ledgerRes.Body.String())
	}
	var ledgerPayload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(ledgerRes.Body.Bytes(), &ledgerPayload); err != nil {
		t.Fatalf("decode leaderboard mission ledger: %v", err)
	}
	leaderboardRows := 0
	for _, entry := range ledgerPayload.Items {
		if entry["idempotencyKey"] == "mission_reward:"+userID+":leaderboard_debut" {
			leaderboardRows++
		}
	}
	if leaderboardRows != 1 {
		t.Fatalf("expected one leaderboard mission ledger row, got %d entries=%+v", leaderboardRows, ledgerPayload.Items)
	}

	badgesReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/badges", nil), userID)
	badgesRes := httptest.NewRecorder()
	handler.ServeHTTP(badgesRes, badgesReq)
	if badgesRes.Code != http.StatusOK {
		t.Fatalf("expected badges status 200, got %d, body=%s", badgesRes.Code, badgesRes.Body.String())
	}
	var badgesPayload struct {
		Items []badgeDefinition `json:"items"`
	}
	if err := json.Unmarshal(badgesRes.Body.Bytes(), &badgesPayload); err != nil {
		t.Fatalf("decode leaderboard mission badges: %v", err)
	}
	earnedByID := map[string]bool{}
	for _, badge := range badgesPayload.Items {
		earnedByID[badge.ID] = badge.Earned
	}
	if !earnedByID["leaderboard_debut"] {
		t.Fatalf("expected leaderboard debut badge from standing evidence, got %+v", earnedByID)
	}
}

func TestWalletStreakClaimRequiresSessionUser(t *testing.T) {
	t.Setenv("STREAK_DAILY_3_REWARD_CENTS", "900")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/streaks/claim", bytes.NewBufferString(`{"streakId":"daily_3"}`))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusUnauthorized {
		t.Fatalf("expected streak claim without auth to return 401, got %d, body=%s", res.Code, res.Body.String())
	}
}

func TestWalletBadgesDeriveFromLedgerAchievements(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
	userID := "u-badge-1"
	date := time.Now().UTC().Format("2006-01-02")

	seeds := []struct {
		key    string
		reason string
	}{
		{key: "daily_claim:" + userID + ":" + date, reason: "daily_claim"},
		{key: "streak_reward:" + userID + ":daily_3", reason: "streak_reward"},
		{key: "streak_reward:" + userID + ":daily_7", reason: "streak_reward"},
		{key: "streak_reward:" + userID + ":daily_14", reason: "streak_reward"},
		{key: "streak_reward:" + userID + ":daily_30", reason: "streak_reward"},
		{key: "streak_reward:" + userID + ":daily_60", reason: "streak_reward"},
		{key: "streak_reward:" + userID + ":daily_90", reason: "streak_reward"},
		{key: "reservation:prediction_order:order-badge-1", reason: "reservation:prediction_order:order-badge-1"},
		{key: "reservation:prediction_order:order-badge-2", reason: "reservation:prediction_order:order-badge-2"},
		{key: "reservation:prediction_order:order-badge-3", reason: "reservation:prediction_order:order-badge-3"},
		{key: "reservation:prediction_order:order-badge-4", reason: "reservation:prediction_order:order-badge-4"},
		{key: "reservation:prediction_order:order-badge-5", reason: "reservation:prediction_order:order-badge-5"},
		{key: "reservation:prediction_order:order-badge-6", reason: "reservation:prediction_order:order-badge-6"},
		{key: "reservation:prediction_order:order-badge-7", reason: "reservation:prediction_order:order-badge-7"},
		{key: "reservation:prediction_order:order-badge-8", reason: "reservation:prediction_order:order-badge-8"},
		{key: "reservation:prediction_order:order-badge-9", reason: "reservation:prediction_order:order-badge-9"},
		{key: "reservation:prediction_order:order-badge-10", reason: "reservation:prediction_order:order-badge-10"},
		{key: "prediction_payout:mkt-badge:pos-win-1", reason: "prediction settlement: market badge resolved YES, YES position won"},
		{key: "prediction_payout:mkt-badge:pos-win-2", reason: "prediction settlement: market badge resolved YES, YES position won"},
		{key: "prediction_payout:mkt-badge:pos-win-3", reason: "prediction settlement: market badge resolved YES, YES position won"},
		{key: "prediction_payout:mkt-badge:pos-win-4", reason: "prediction settlement: market badge resolved YES, YES position won"},
		{key: "prediction_payout:mkt-badge:pos-win-5", reason: "prediction settlement: market badge resolved YES, YES position won"},
		{key: "prediction_payout:mkt-badge:pos-win-6", reason: "prediction settlement: market badge resolved YES, YES position won"},
		{key: "prediction_payout:mkt-badge:pos-win-7", reason: "prediction settlement: market badge resolved YES, YES position won"},
		{key: "prediction_payout:mkt-badge:pos-win-8", reason: "prediction settlement: market badge resolved YES, YES position won"},
		{key: "prediction_payout:mkt-badge:pos-win-9", reason: "prediction settlement: market badge resolved YES, YES position won"},
		{key: "prediction_payout:mkt-badge:pos-win-10", reason: "prediction settlement: market badge resolved YES, YES position won"},
	}
	for _, seed := range seeds {
		payload := []byte(`{"userId":"` + userID + `","amountPoints":100,"idempotencyKey":"` + seed.key + `","reason":"` + seed.reason + `"}`)
		req := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(payload)))
		res := httptest.NewRecorder()
		handler.ServeHTTP(res, req)
		if res.Code != http.StatusOK {
			t.Fatalf("expected seeded badge source %s status 200, got %d, body=%s", seed.key, res.Code, res.Body.String())
		}
	}

	req := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/badges", nil), userID)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("expected badges status 200, got %d, body=%s", res.Code, res.Body.String())
	}
	var payload struct {
		Items []badgeDefinition `json:"items"`
		Total int               `json:"total"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode badges payload: %v", err)
	}
	if payload.Total != 20 {
		t.Fatalf("expected twenty badges, got %+v", payload)
	}
	earnedByID := map[string]bool{}
	for _, badge := range payload.Items {
		earnedByID[badge.ID] = badge.Earned
		if badge.CosmeticID == "" || badge.Source == "" {
			t.Fatalf("expected cosmetic source metadata, got %+v", badge)
		}
	}
	if !earnedByID["daily_check_in"] || earnedByID["mission_finisher"] || !earnedByID["streak_builder"] || !earnedByID["weekly_streak"] || !earnedByID["streak_champion"] || !earnedByID["monthly_streak"] || !earnedByID["double_monthly_streak"] || !earnedByID["quarterly_streak"] || earnedByID["monthly_check_in"] || earnedByID["seasonal_check_in"] || earnedByID["quarterly_check_in"] || !earnedByID["first_prediction"] || !earnedByID["prediction_regular"] || !earnedByID["prediction_veteran"] || !earnedByID["prediction_expert"] || !earnedByID["settled_result"] || !earnedByID["settlement_regular"] || !earnedByID["settlement_veteran"] || !earnedByID["settlement_expert"] || earnedByID["leaderboard_debut"] {
		t.Fatalf("unexpected badge earned state: %+v", earnedByID)
	}
}

func TestWalletBadgesRequireSessionUser(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/wallet/badges", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusUnauthorized {
		t.Fatalf("expected badges without auth to return 401, got %d, body=%s", res.Code, res.Body.String())
	}
}

func TestAdminWalletMutationRequestRequiresPointAmountAlias(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	pointPayload := []byte(`{"userId":"u-wallet-point","amountPoints":250,"idempotencyKey":"point-amount","reason":"admin point adjustment"}`)
	pointReq := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(pointPayload)))
	pointRes := httptest.NewRecorder()
	handler.ServeHTTP(pointRes, pointReq)
	if pointRes.Code != http.StatusOK {
		t.Fatalf("expected amountPoints request to succeed, got %d, body=%s", pointRes.Code, pointRes.Body.String())
	}

	// Points unit-model (2026-07-07): the retired request key is the
	// cents-era amountCents; amountPoints is the accepted canonical key.
	retiredPayload := []byte(`{"userId":"u-wallet-retired","amountCents":250,"idempotencyKey":"retired-amount","reason":"admin point adjustment"}`)
	retiredReq := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(retiredPayload)))
	retiredRes := httptest.NewRecorder()
	handler.ServeHTTP(retiredRes, retiredReq)
	if retiredRes.Code != http.StatusBadRequest {
		t.Fatalf("expected retired amountCents request to return 400, got %d, body=%s", retiredRes.Code, retiredRes.Body.String())
	}

	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(retiredRes.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode retired-alias error payload: %v", err)
	}
	details, ok := envelope.Error.Details.(map[string]any)
	if !ok || details["field"] != "amountPoints" {
		t.Fatalf("expected point-native error field, got %+v", envelope.Error.Details)
	}
	if strings.Contains(retiredRes.Body.String(), "compatibility") {
		t.Fatalf("retired amount alias error should not describe compatibility semantics: %s", retiredRes.Body.String())
	}

	snakePayload := []byte(`{"userId":"u-wallet-retired-snake","amount_cents":250,"idempotencyKey":"retired-snake-amount","reason":"admin point adjustment"}`)
	snakeReq := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(snakePayload)))
	snakeRes := httptest.NewRecorder()
	handler.ServeHTTP(snakeRes, snakeReq)
	if snakeRes.Code != http.StatusBadRequest {
		t.Fatalf("expected retired amount_cents request to return 400, got %d, body=%s", snakeRes.Code, snakeRes.Body.String())
	}
}

func TestAdminWalletMutationReasonRejectsMoneyWording(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	safePayload := []byte(`{"userId":"u-wallet-reason-safe","amountPoints":250,"idempotencyKey":"safe-point-reason","reason":" non-redeemable point support adjustment "}`)
	safeReq := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(safePayload)))
	safeRes := httptest.NewRecorder()
	handler.ServeHTTP(safeRes, safeReq)
	if safeRes.Code != http.StatusOK {
		t.Fatalf("expected non-redeemable point reason to pass, got %d, body=%s", safeRes.Code, safeRes.Body.String())
	}

	for _, tc := range []struct {
		name    string
		path    string
		payload string
	}{
		{
			name:    "credit",
			path:    "/api/v1/admin/wallet/credit",
			payload: `{"userId":"u-wallet-reason-credit","amountPoints":250,"idempotencyKey":"unsafe-credit-reason","reason":"cash deposit adjustment"}`,
		},
		{
			name:    "debit",
			path:    "/api/v1/admin/wallet/debit",
			payload: `{"userId":"u-wallet-reason-debit","amountPoints":250,"idempotencyKey":"unsafe-debit-reason","reason":"redeemable prize reversal"}`,
		},
	} {
		t.Run(tc.name, func(t *testing.T) {
			req := adminWalletContext(httptest.NewRequest(http.MethodPost, tc.path, bytes.NewBufferString(tc.payload)))
			res := httptest.NewRecorder()
			handler.ServeHTTP(res, req)
			if res.Code != http.StatusBadRequest {
				t.Fatalf("expected unsafe admin wallet reason to return 400, got %d, body=%s", res.Code, res.Body.String())
			}

			var envelope httpx.ErrorEnvelope
			if err := json.Unmarshal(res.Body.Bytes(), &envelope); err != nil {
				t.Fatalf("decode unsafe-reason error payload: %v", err)
			}
			details, ok := envelope.Error.Details.(map[string]any)
			if !ok || details["field"] != "reason" {
				t.Fatalf("expected reason error field, got %+v", envelope.Error.Details)
			}
			if strings.Contains(res.Body.String(), "cash deposit") || strings.Contains(res.Body.String(), "redeemable prize") {
				t.Fatalf("unsafe reason value should not be echoed in error response: %s", res.Body.String())
			}
		})
	}

	ledgerReq := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/wallet/u-wallet-reason-credit/ledger?limit=10", nil), "u-wallet-reason-credit")
	ledgerRes := httptest.NewRecorder()
	handler.ServeHTTP(ledgerRes, ledgerReq)
	if ledgerRes.Code != http.StatusOK {
		t.Fatalf("expected rejected credit ledger read status 200, got %d, body=%s", ledgerRes.Code, ledgerRes.Body.String())
	}
	var ledgerPayload struct {
		Items []map[string]any `json:"items"`
	}
	if err := json.Unmarshal(ledgerRes.Body.Bytes(), &ledgerPayload); err != nil {
		t.Fatalf("decode rejected credit ledger: %v", err)
	}
	if len(ledgerPayload.Items) != 0 {
		t.Fatalf("unsafe credit reason should not persist ledger entries, got %+v", ledgerPayload.Items)
	}
}

func TestWalletCreditIsIdempotentAcrossRetries(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	payload := []byte(`{"userId":"u-wallet-2","amountPoints":750,"idempotencyKey":"credit-unique","reason":"admin point grant"}`)

	firstReq := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(payload)))
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("first credit failed: status=%d body=%s", firstRes.Code, firstRes.Body.String())
	}

	secondReq := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(payload)))
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
	if int(secondPayload["balancePoints"].(float64)) != 750 {
		t.Fatalf("expected stable point balance 750 after retry, got %v", secondPayload["balancePoints"])
	}
	if secondPayload["unit"] != "PTS" || secondEntry["unit"] != "PTS" {
		t.Fatalf("expected point unit in replay response, got payload=%v entry=%v", secondPayload["unit"], secondEntry["unit"])
	}
	// Points unit-model (2026-07-07): balancePoints is canonical; the retired
	// spelling is the cents-era balancePointsCents.
	if _, ok := secondPayload["balancePointsCents"]; ok {
		t.Fatalf("admin wallet credit replay response leaked retired balancePointsCents: %v", secondPayload)
	}
	if _, ok := secondEntry["balancePointsCents"]; ok {
		t.Fatalf("admin wallet credit replay entry leaked retired balancePointsCents: %v", secondEntry)
	}
}

func TestWalletDebitInsufficientFundsReturnsForbidden(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	debitPayload := []byte(`{"userId":"u-wallet-3","amountPoints":200,"idempotencyKey":"debit-insufficient","reason":"prediction point adjustment"}`)
	debitReq := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/debit", bytes.NewBuffer(debitPayload)))
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

	firstPayload := []byte(`{"userId":"u-wallet-4","amountPoints":500,"idempotencyKey":"dup-key","reason":"first point adjustment"}`)
	firstReq := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(firstPayload)))
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("expected first credit status 200, got %d, body=%s", firstRes.Code, firstRes.Body.String())
	}

	conflictPayload := []byte(`{"userId":"u-wallet-4","amountPoints":700,"idempotencyKey":"dup-key","reason":"changed point adjustment"}`)
	conflictReq := adminWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/admin/wallet/credit", bytes.NewBuffer(conflictPayload)))
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

// TestLedgerTailMatchesDirectNarrowFetch pins the shared-fetch equivalence the
// reward claim paths rely on: taking the tail of a wide Ledger window must be
// byte-for-byte identical to fetching the narrow window directly (packs keep
// their pinned 200-row claimed-state scan while sharing one 500-row read).
func TestLedgerTailMatchesDirectNarrowFetch(t *testing.T) {
	service := wallet.NewService()
	userID := "u-ledger-tail"
	for i := 0; i < 12; i++ {
		if _, err := service.Credit(t.Context(), wallet.MutationRequest{
			UserID:         userID,
			AmountPoints:   100,
			IdempotencyKey: "tail-seed-" + strconv.Itoa(i),
			Reason:         "starter points",
		}); err != nil {
			t.Fatalf("seed credit %d: %v", i, err)
		}
	}

	wide := service.Ledger(t.Context(), userID, 500)
	for _, narrow := range []int{5, 12, 200} {
		direct := service.Ledger(t.Context(), userID, narrow)
		tail := ledgerTail(wide, narrow)
		if len(tail) != len(direct) {
			t.Fatalf("ledgerTail(%d) length %d, direct fetch length %d", narrow, len(tail), len(direct))
		}
		for i := range tail {
			if tail[i] != direct[i] {
				t.Fatalf("ledgerTail(%d)[%d] = %+v, direct fetch = %+v", narrow, i, tail[i], direct[i])
			}
		}
	}
}
