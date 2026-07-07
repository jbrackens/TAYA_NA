package http

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	canonicalv1 "taptrade/platform/canonical/v1"
	"taptrade/platform/transport/httpx"
)

func TestLoyaltyRoutesExposeAccountLedgerAndTiers(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	accountReq := httptest.NewRequest(http.MethodGet, "/api/v1/loyalty?userId=u-1", nil)
	// requireSelfOrAdmin reads the session user from context/header — tests
	// use the X-User-ID bot-auth header path. Must match the userId param.
	accountReq.Header.Set("X-User-ID", "u-1")
	accountRes := httptest.NewRecorder()
	handler.ServeHTTP(accountRes, accountReq)
	if accountRes.Code != http.StatusOK {
		t.Fatalf("expected account status 200, got %d, body=%s", accountRes.Code, accountRes.Body.String())
	}

	var accountPayload map[string]any
	if err := json.Unmarshal(accountRes.Body.Bytes(), &accountPayload); err != nil {
		t.Fatalf("decode account payload: %v", err)
	}
	if accountPayload["userId"] != "u-1" {
		t.Fatalf("expected userId u-1, got %v", accountPayload["userId"])
	}
	if accountPayload["unit"] != "PTS" {
		t.Fatalf("expected loyalty standing unit PTS, got %+v", accountPayload)
	}
	for _, required := range []string{"pointsBalance", "xp", "xpPoints", "rank", "rankName", "nextRank", "nextRankName", "xpToNextRank"} {
		if _, ok := accountPayload[required]; !ok {
			t.Fatalf("expected loyalty standing field %q in %+v", required, accountPayload)
		}
	}
	if accountPayload["xp"] != accountPayload["xpPoints"] {
		t.Fatalf("expected xp and xpPoints to match in %+v", accountPayload)
	}
	for _, retired := range []string{"accountId", "playerId", "currentTier", "currentTierAssignedAt", "nextTier", "pointsToNextTier", "lastAccrualAt"} {
		if _, ok := accountPayload[retired]; ok {
			t.Fatalf("public loyalty standing should not emit retired/canonical alias %q in %+v", retired, accountPayload)
		}
	}

	ledgerReq := httptest.NewRequest(http.MethodGet, "/api/v1/loyalty/ledger?userId=u-1&limit=5", nil)
	ledgerReq.Header.Set("X-User-ID", "u-1")
	ledgerRes := httptest.NewRecorder()
	handler.ServeHTTP(ledgerRes, ledgerReq)
	if ledgerRes.Code != http.StatusOK {
		t.Fatalf("expected ledger status 200, got %d, body=%s", ledgerRes.Code, ledgerRes.Body.String())
	}

	var ledgerPayload struct {
		PlayerID string           `json:"playerId"`
		Items    []map[string]any `json:"items"`
		Total    int              `json:"total"`
	}
	if err := json.Unmarshal(ledgerRes.Body.Bytes(), &ledgerPayload); err != nil {
		t.Fatalf("decode ledger payload: %v", err)
	}
	if ledgerPayload.PlayerID != "u-1" {
		t.Fatalf("expected ledger playerId u-1, got %s", ledgerPayload.PlayerID)
	}
	if ledgerPayload.Total < 1 {
		t.Fatalf("expected seeded ledger total >= 1, got %d", ledgerPayload.Total)
	}
	var settlementEntry map[string]any
	for _, item := range ledgerPayload.Items {
		if item["predictionSourceType"] == "prediction_settlement" {
			settlementEntry = item
			break
		}
	}
	if settlementEntry == nil {
		t.Fatal("expected seeded prediction-settlement loyalty ledger entry")
	}
	if got := settlementEntry["predictionSourceId"]; got != "prediction:seed:1001" {
		t.Fatalf("expected predictionSourceId prediction:seed:1001, got %v", got)
	}
	if got := settlementEntry["unit"]; got != "PTS" {
		t.Fatalf("expected loyalty ledger entry unit PTS, got %v", got)
	}
	metadata, ok := settlementEntry["metadata"].(map[string]any)
	if !ok {
		t.Fatalf("expected settlement metadata map, got %v", settlementEntry["metadata"])
	}
	if got := metadata["predictionId"]; got != "prediction:seed:1001" {
		t.Fatalf("expected predictionId metadata alias, got %v", got)
	}
	if got := metadata["pointVolumePoints"]; got != "12500" {
		t.Fatalf("expected pointVolumePoints metadata alias, got %v", got)
	}
	if got := metadata["reason"]; got != "seeded prediction settlement loyalty accrual" {
		t.Fatalf("expected point-safe loyalty reason, got %v", got)
	}
	for _, blocked := range []string{"sourceType", "sourceId", "bet_settlement", "bet:", "betId", "stakePoints", "settled bet"} {
		encoded, err := json.Marshal(settlementEntry)
		if err != nil {
			t.Fatalf("marshal settlement entry: %v", err)
		}
		if bytes.Contains(encoded, []byte(blocked)) {
			t.Fatalf("expected settlement entry payload to avoid %q, got %s", blocked, string(encoded))
		}
	}

	tiersReq := httptest.NewRequest(http.MethodGet, "/api/v1/loyalty/tiers", nil)
	tiersRes := httptest.NewRecorder()
	handler.ServeHTTP(tiersRes, tiersReq)
	if tiersRes.Code != http.StatusOK {
		t.Fatalf("expected tiers status 200, got %d, body=%s", tiersRes.Code, tiersRes.Body.String())
	}

	var tiersPayload struct {
		Items      []map[string]any `json:"items"`
		TotalCount int              `json:"totalCount"`
	}
	if err := json.Unmarshal(tiersRes.Body.Bytes(), &tiersPayload); err != nil {
		t.Fatalf("decode tiers payload: %v", err)
	}
	if tiersPayload.TotalCount < 4 {
		t.Fatalf("expected at least four loyalty tiers, got %d", tiersPayload.TotalCount)
	}
	if len(tiersPayload.Items) != tiersPayload.TotalCount {
		t.Fatalf("expected tier item count to match totalCount, got items=%d total=%d", len(tiersPayload.Items), tiersPayload.TotalCount)
	}
	firstTier := tiersPayload.Items[0]
	for _, required := range []string{"rank", "rankName", "minXpPoints", "unit", "benefits"} {
		if _, ok := firstTier[required]; !ok {
			t.Fatalf("expected loyalty tier field %q in %+v", required, firstTier)
		}
	}
	if firstTier["unit"] != "PTS" {
		t.Fatalf("expected loyalty tier unit PTS, got %+v", firstTier)
	}
	for _, retired := range []string{"tierCode", "displayName", "minLifetimePoints", "minRolling30dPoints", "active", "tier", "name", "pointsThreshold"} {
		if _, ok := firstTier[retired]; ok {
			t.Fatalf("public loyalty tier should not emit retired/canonical alias %q in %+v", retired, firstTier)
		}
	}
}

func TestLoyaltyTierPayloadRedactsLegacyUnsafeBenefits(t *testing.T) {
	payload := toLoyaltyTierResponse(canonicalv1.LoyaltyTier{
		TierCode:          canonicalv1.LoyaltyTierSilver,
		DisplayName:       "Cash prize elite",
		Rank:              2,
		MinLifetimePoints: 700,
		Benefits: map[string]string{
			"safe":   "early market access",
			"unsafe": "crypto payout priority",
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

func TestLoyaltyLedgerPayloadRedactsLegacyUnsafeMetadata(t *testing.T) {
	metadata := map[string]string{
		"betId":         "bet:legacy:1001",
		"reason":        "cash payout loyalty bonus",
		"reviewComment": "crypto prize review",
	}
	payload := toLoyaltyLedgerEntryResponse(canonicalv1.LoyaltyLedgerEntry{
		EntryID:      "ledger-legacy-unsafe",
		AccountID:    "acct-legacy-unsafe",
		PlayerID:     "u-legacy-unsafe",
		SourceType:   canonicalv1.LoyaltyLedgerSourceBetSettlement,
		SourceID:     "bet:legacy:1001",
		PointsDelta:  100,
		BalanceAfter: 100,
		Metadata:     metadata,
		CreatedAt:    time.Unix(0, 0).UTC(),
	})

	if payload.PredictionSourceID != "prediction:legacy:1001" {
		t.Fatalf("expected prediction source alias, got %+v", payload)
	}
	if payload.Metadata["predictionId"] != "prediction:legacy:1001" {
		t.Fatalf("expected predictionId metadata alias, got %+v", payload.Metadata)
	}
	if payload.Metadata["reason"] != launchRedactedUserText || payload.Metadata["reviewComment"] != launchRedactedUserText {
		t.Fatalf("expected unsafe metadata redacted, got %+v", payload.Metadata)
	}
	if metadata["reason"] != "cash payout loyalty bonus" || metadata["reviewComment"] != "crypto prize review" {
		t.Fatalf("redaction should not mutate raw loyalty metadata, got %+v", metadata)
	}
	encoded, err := json.Marshal(payload)
	if err != nil {
		t.Fatalf("marshal loyalty ledger payload: %v", err)
	}
	for _, unsafe := range []string{"cash payout", "crypto prize", "bet:"} {
		if bytes.Contains(encoded, []byte(unsafe)) {
			t.Fatalf("loyalty ledger payload should not expose unsafe metadata %q in %s", unsafe, string(encoded))
		}
	}
}

// TestLoyaltyHandlersEnforceSelfOrAdmin verifies the auth-hardening added per
// PLAN-loyalty-leaderboards.md §8 "Auth hardening". Before this, any
// authenticated user could enumerate any other user's loyalty data via
// ?userId= — now it's 401 without a session user and 403 if the session
// user differs from the claim.
//
// Note: main_test.go sets GATEWAY_ALLOW_ADMIN_ANON=true globally, which
// bypasses requireAdminRole. Disable it here so mismatch cases exercise
// the real denial path instead of the dev bypass.
func TestLoyaltyHandlersEnforceSelfOrAdmin(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	cases := []struct {
		name          string
		url           string
		sessionUserID string
		wantStatus    int
	}{
		{"no session → 401", "/api/v1/loyalty?userId=u-1", "", http.StatusUnauthorized},
		{"self → 200", "/api/v1/loyalty?userId=u-1", "u-1", http.StatusOK},
		{"other user → 403", "/api/v1/loyalty?userId=u-1", "u-2", http.StatusForbidden},
		{"ledger no session → 401", "/api/v1/loyalty/ledger?userId=u-1", "", http.StatusUnauthorized},
		{"ledger self → 200", "/api/v1/loyalty/ledger?userId=u-1", "u-1", http.StatusOK},
		{"ledger other user → 403", "/api/v1/loyalty/ledger?userId=u-1", "u-2", http.StatusForbidden},
		{"referrals self → 200", "/api/v1/referrals?userId=u-1", "u-1", http.StatusOK},
		{"referrals other → 403", "/api/v1/referrals?userId=u-1", "u-2", http.StatusForbidden},
		// Note: admin-delegated access works in production via httpx.Auth
		// middleware, which populates both context.UserID + context.Role.
		// In this unit test we use the bot-auth X-User-ID header path,
		// which doesn't populate context, so requireAdminRole fails even
		// with X-Admin-Role set. The admin bypass is covered by the
		// existing TestAdminLoyaltyAdjustmentAndDetailFlow test (which
		// runs with GATEWAY_ALLOW_ADMIN_ANON=true, the usual test env).
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, tc.url, nil)
			if tc.sessionUserID != "" {
				req.Header.Set("X-User-ID", tc.sessionUserID)
			}
			res := httptest.NewRecorder()
			handler.ServeHTTP(res, req)
			if res.Code != tc.wantStatus {
				t.Errorf("%s: want %d got %d (body=%s)", tc.name, tc.wantStatus, res.Code, res.Body.String())
			}
		})
	}
}

func TestAdminLoyaltyAdjustmentAndDetailFlow(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	payload := []byte(`{"playerId":"u-loyalty-admin-1","pointsDelta":250,"idempotencyKey":"adj-1","reason":"manual goodwill","createdBy":"admin-ops-1","entrySubtype":"goodwill"}`)
	adjustReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/loyalty/adjustments", bytes.NewBuffer(payload))
	adjustReq = adjustReq.WithContext(httpx.WithTestUser(adjustReq.Context(), "admin-test", "admin-test", "admin"))
	adjustRes := httptest.NewRecorder()
	handler.ServeHTTP(adjustRes, adjustReq)
	if adjustRes.Code != http.StatusOK {
		t.Fatalf("expected adjust status 200, got %d, body=%s", adjustRes.Code, adjustRes.Body.String())
	}

	var adjustPayload struct {
		Account map[string]any `json:"account"`
		Entry   map[string]any `json:"entry"`
	}
	if err := json.Unmarshal(adjustRes.Body.Bytes(), &adjustPayload); err != nil {
		t.Fatalf("decode adjust payload: %v", err)
	}
	if adjustPayload.Account["playerId"] != "u-loyalty-admin-1" {
		t.Fatalf("expected account playerId u-loyalty-admin-1, got %v", adjustPayload.Account["playerId"])
	}
	if int(adjustPayload.Account["pointsBalance"].(float64)) != 250 {
		t.Fatalf("expected pointsBalance 250, got %v", adjustPayload.Account["pointsBalance"])
	}
	if adjustPayload.Entry["unit"] != "PTS" {
		t.Fatalf("expected adjustment ledger entry to expose PTS unit, got %+v", adjustPayload.Entry)
	}
	for _, retired := range []string{"sourceType", "sourceId"} {
		if _, ok := adjustPayload.Entry[retired]; ok {
			t.Fatalf("admin adjustment entry should not emit retired alias %q in %+v", retired, adjustPayload.Entry)
		}
	}

	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/loyalty/accounts?search=u-loyalty-admin-1", nil)
	listReq = listReq.WithContext(httpx.WithTestUser(listReq.Context(), "admin-test", "admin-test", "admin"))
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}

	var listPayload struct {
		Items      []map[string]any `json:"items"`
		TotalCount int              `json:"totalCount"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &listPayload); err != nil {
		t.Fatalf("decode list payload: %v", err)
	}
	if listPayload.TotalCount != 1 {
		t.Fatalf("expected one loyalty account in filtered admin list, got %d", listPayload.TotalCount)
	}
	if listPayload.Items[0]["unit"] != "PTS" {
		t.Fatalf("expected list loyalty account to expose PTS unit, got %+v", listPayload.Items[0])
	}
	for _, retired := range []string{"currentTier", "nextTier", "pointsToNextTier"} {
		if _, ok := listPayload.Items[0][retired]; ok {
			t.Fatalf("admin loyalty account list should not emit retired alias %q in %+v", retired, listPayload.Items[0])
		}
	}

	detailReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/loyalty/accounts/u-loyalty-admin-1?limit=5", nil)
	detailReq = detailReq.WithContext(httpx.WithTestUser(detailReq.Context(), "admin-test", "admin-test", "admin"))
	detailRes := httptest.NewRecorder()
	handler.ServeHTTP(detailRes, detailReq)
	if detailRes.Code != http.StatusOK {
		t.Fatalf("expected detail status 200, got %d, body=%s", detailRes.Code, detailRes.Body.String())
	}

	var detailPayload struct {
		Account map[string]any   `json:"account"`
		Ledger  []map[string]any `json:"ledger"`
		Tiers   []map[string]any `json:"tiers"`
	}
	if err := json.Unmarshal(detailRes.Body.Bytes(), &detailPayload); err != nil {
		t.Fatalf("decode detail payload: %v", err)
	}
	if len(detailPayload.Ledger) != 1 {
		t.Fatalf("expected one ledger entry in detail view, got %d", len(detailPayload.Ledger))
	}
	if detailPayload.Account["playerId"] != "u-loyalty-admin-1" {
		t.Fatalf("expected detail playerId u-loyalty-admin-1, got %v", detailPayload.Account["playerId"])
	}
	if detailPayload.Account["unit"] != "PTS" {
		t.Fatalf("expected detail loyalty account to expose PTS unit, got %+v", detailPayload.Account)
	}
	if detailPayload.Ledger[0]["unit"] != "PTS" {
		t.Fatalf("expected detail loyalty ledger to expose PTS unit, got %+v", detailPayload.Ledger[0])
	}
	for _, retired := range []string{"sourceType", "sourceId"} {
		if _, ok := detailPayload.Ledger[0][retired]; ok {
			t.Fatalf("admin loyalty ledger should not emit retired alias %q in %+v", retired, detailPayload.Ledger[0])
		}
	}
	for _, retired := range []string{"currentTier", "nextTier", "pointsToNextTier"} {
		if _, ok := detailPayload.Account[retired]; ok {
			t.Fatalf("admin loyalty account detail should not emit retired alias %q in %+v", retired, detailPayload.Account)
		}
	}
}

func TestAdminLoyaltyAdjustmentRejectsMoneyWordingReason(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	payload := []byte(`{"playerId":"u-loyalty-unsafe-reason","pointsDelta":250,"idempotencyKey":"unsafe-loyalty-adjustment","reason":"cash payout loyalty adjustment","createdBy":"admin-ops-1","entrySubtype":"goodwill"}`)
	adjustReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/loyalty/adjustments", bytes.NewBuffer(payload))
	adjustReq = adjustReq.WithContext(httpx.WithTestUser(adjustReq.Context(), "admin-test", "admin-test", "admin"))
	adjustRes := httptest.NewRecorder()
	handler.ServeHTTP(adjustRes, adjustReq)

	if adjustRes.Code != http.StatusBadRequest {
		t.Fatalf("expected unsafe adjustment reason status 400, got %d, body=%s", adjustRes.Code, adjustRes.Body.String())
	}
	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(adjustRes.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode unsafe-reason error: %v", err)
	}
	details, ok := envelope.Error.Details.(map[string]any)
	if !ok || details["field"] != "reason" {
		t.Fatalf("expected reason error field, got %+v", envelope.Error.Details)
	}
	if strings.Contains(adjustRes.Body.String(), "cash payout") {
		t.Fatalf("unsafe adjustment reason should not be echoed: %s", adjustRes.Body.String())
	}

	detailReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/loyalty/accounts/u-loyalty-unsafe-reason?limit=5", nil)
	detailReq = detailReq.WithContext(httpx.WithTestUser(detailReq.Context(), "admin-test", "admin-test", "admin"))
	detailRes := httptest.NewRecorder()
	handler.ServeHTTP(detailRes, detailReq)
	if detailRes.Code != http.StatusNotFound {
		t.Fatalf("unsafe adjustment reason should not create account or ledger entries, got %d body=%s", detailRes.Code, detailRes.Body.String())
	}
}

func TestAdminLoyaltyRoutesRequireAdminRole(t *testing.T) {
	t.Setenv("GATEWAY_ALLOW_ADMIN_ANON", "")
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodGet, "/api/v1/admin/loyalty/accounts", nil)
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)

	if res.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d, body=%s", res.Code, res.Body.String())
	}
}

func TestReferralRegistrationAndPlayerListFlow(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	createReq := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/loyalty/referrals",
		bytes.NewBufferString(`{"referrerPlayerId":"u-referrer-office-1","referredPlayerId":"u-referred-office-1"}`),
	)
	createReq.Header.Set("Content-Type", "application/json")
	createReq = createReq.WithContext(httpx.WithTestUser(createReq.Context(), "admin-test", "admin-test", "admin"))
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)
	if createRes.Code != http.StatusOK {
		t.Fatalf("expected create referral status 200, got %d, body=%s", createRes.Code, createRes.Body.String())
	}

	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/referrals?userId=u-referrer-office-1", nil)
	// Match userId param to satisfy requireSelfOrAdmin's session-user check
	// (other tests in this package use the same X-User-ID bot-auth header path).
	listReq.Header.Set("X-User-ID", "u-referrer-office-1")
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("expected referral list status 200, got %d, body=%s", listRes.Code, listRes.Body.String())
	}

	var payload struct {
		PlayerID string           `json:"playerId"`
		Items    []map[string]any `json:"items"`
		Total    int              `json:"total"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode referral list payload: %v", err)
	}
	if payload.PlayerID != "u-referrer-office-1" {
		t.Fatalf("expected playerId u-referrer-office-1, got %s", payload.PlayerID)
	}
	if payload.Total != 1 {
		t.Fatalf("expected one referral record, got %d", payload.Total)
	}
}

func TestAdminLoyaltyConfigAndSettingsUpdateFlow(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	configReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/loyalty/config", nil)
	configReq = configReq.WithContext(httpx.WithTestUser(configReq.Context(), "admin-test", "admin-test", "admin"))
	configRes := httptest.NewRecorder()
	handler.ServeHTTP(configRes, configReq)
	if configRes.Code != http.StatusOK {
		t.Fatalf("expected config status 200, got %d, body=%s", configRes.Code, configRes.Body.String())
	}
	var configPayload struct {
		Rules []map[string]any `json:"rules"`
	}
	if err := json.Unmarshal(configRes.Body.Bytes(), &configPayload); err != nil {
		t.Fatalf("decode config payload: %v", err)
	}
	if len(configPayload.Rules) == 0 {
		t.Fatal("expected seeded loyalty rules")
	}
	if got := configPayload.Rules[0]["predictionSourceType"]; got != "prediction_settlement" {
		t.Fatalf("expected predictionSourceType prediction_settlement, got %v", got)
	}
	if got := configPayload.Rules[0]["minQualifiedPoints"]; int(got.(float64)) != 100 {
		t.Fatalf("expected minQualifiedPoints 100, got %v", got)
	}
	if _, ok := configPayload.Rules[0]["eligiblePredictionTypes"]; !ok {
		t.Fatal("expected eligiblePredictionTypes alias on loyalty rule payload")
	}
	if got := configPayload.Rules[0]["unit"]; got != "PTS" {
		t.Fatalf("expected loyalty config rule unit PTS, got %v", got)
	}
	for _, retired := range []string{"sourceType", "minQualifiedStakePoints", "eligibleSportIds", "eligibleBetTypes"} {
		if _, ok := configPayload.Rules[0][retired]; ok {
			t.Fatalf("loyalty config rule leaked retired field %q in %+v", retired, configPayload.Rules[0])
		}
	}

	tierReq := httptest.NewRequest(
		http.MethodPut,
		"/api/v1/admin/loyalty/tiers/silver",
		bytes.NewBufferString(`{"displayName":"Silver","rank":2,"minLifetimePoints":700,"minRolling30dPoints":0,"benefits":{"statusBoost":"priority"},"active":true}`),
	)
	tierReq.Header.Set("Content-Type", "application/json")
	tierReq = tierReq.WithContext(httpx.WithTestUser(tierReq.Context(), "admin-test", "admin-test", "admin"))
	tierRes := httptest.NewRecorder()
	handler.ServeHTTP(tierRes, tierReq)
	if tierRes.Code != http.StatusOK {
		t.Fatalf("expected tier update status 200, got %d, body=%s", tierRes.Code, tierRes.Body.String())
	}

	ruleReq := httptest.NewRequest(
		http.MethodPut,
		"/api/v1/admin/loyalty/rules/rule:loyalty:default-settlement",
		bytes.NewBufferString(`{"name":"Default prediction settlement accrual","predictionSourceType":"prediction_settlement","active":true,"multiplier":2,"minQualifiedPoints":125,"eligiblePredictionTypes":["yes_no_prediction"],"maxPointsPerEvent":0}`),
	)
	ruleReq.Header.Set("Content-Type", "application/json")
	ruleReq = ruleReq.WithContext(httpx.WithTestUser(ruleReq.Context(), "admin-test", "admin-test", "admin"))
	ruleRes := httptest.NewRecorder()
	handler.ServeHTTP(ruleRes, ruleReq)
	if ruleRes.Code != http.StatusOK {
		t.Fatalf("expected rule update status 200, got %d, body=%s", ruleRes.Code, ruleRes.Body.String())
	}
	var rulePayload struct {
		Rules []map[string]any `json:"rules"`
	}
	if err := json.Unmarshal(ruleRes.Body.Bytes(), &rulePayload); err != nil {
		t.Fatalf("decode rule update payload: %v", err)
	}
	updated := rulePayload.Rules[0]
	if got := updated["predictionSourceType"]; got != "prediction_settlement" {
		t.Fatalf("expected predictionSourceType prediction_settlement, got %v", got)
	}
	if got := updated["minQualifiedPoints"]; int(got.(float64)) != 125 {
		t.Fatalf("expected minQualifiedPoints 125, got %v", got)
	}
	if got := updated["unit"]; got != "PTS" {
		t.Fatalf("expected updated loyalty rule unit PTS, got %v", got)
	}
	predictionTypes, ok := updated["eligiblePredictionTypes"].([]any)
	if !ok || len(predictionTypes) != 1 || predictionTypes[0] != "yes_no_prediction" {
		t.Fatalf("expected eligiblePredictionTypes alias, got %v", updated["eligiblePredictionTypes"])
	}
	for _, retired := range []string{"sourceType", "minQualifiedStakePoints", "eligibleSportIds", "eligibleBetTypes"} {
		if _, ok := updated[retired]; ok {
			t.Fatalf("loyalty update leaked retired field %q in %+v", retired, updated)
		}
	}

	createReq := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/loyalty/rules",
		bytes.NewBufferString(`{"name":"Weekend prediction boost","predictionSourceType":"prediction_settlement","active":true,"multiplier":1.5,"minQualifiedPoints":50,"eligiblePredictionTypes":[],"maxPointsPerEvent":250}`),
	)
	createReq.Header.Set("Content-Type", "application/json")
	createReq = createReq.WithContext(httpx.WithTestUser(createReq.Context(), "admin-test", "admin-test", "admin"))
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)
	if createRes.Code != http.StatusCreated {
		t.Fatalf("expected rule create status 201, got %d, body=%s", createRes.Code, createRes.Body.String())
	}
	var createPayload struct {
		Rules []map[string]any `json:"rules"`
	}
	if err := json.Unmarshal(createRes.Body.Bytes(), &createPayload); err != nil {
		t.Fatalf("decode rule create payload: %v", err)
	}
	created := createPayload.Rules[len(createPayload.Rules)-1]
	if got := created["predictionSourceType"]; got != "prediction_settlement" {
		t.Fatalf("expected created predictionSourceType prediction_settlement, got %v", got)
	}
	if got := created["minQualifiedPoints"]; int(got.(float64)) != 50 {
		t.Fatalf("expected created minQualifiedPoints 50, got %v", got)
	}
	if got := created["unit"]; got != "PTS" {
		t.Fatalf("expected created loyalty rule unit PTS, got %v", got)
	}
	for _, retired := range []string{"sourceType", "minQualifiedStakePoints", "eligibleSportIds", "eligibleBetTypes"} {
		if _, ok := created[retired]; ok {
			t.Fatalf("loyalty create leaked retired field %q in %+v", retired, created)
		}
	}
}

func TestAdminLoyaltyTierRejectsMoneyWordingBenefits(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	tierReq := httptest.NewRequest(
		http.MethodPut,
		"/api/v1/admin/loyalty/tiers/silver",
		bytes.NewBufferString(`{"displayName":"Silver","rank":2,"minLifetimePoints":700,"minRolling30dPoints":0,"benefits":{"statusBoost":"cash prize priority"},"active":true}`),
	)
	tierReq.Header.Set("Content-Type", "application/json")
	tierReq = tierReq.WithContext(httpx.WithTestUser(tierReq.Context(), "admin-test", "admin-test", "admin"))
	tierRes := httptest.NewRecorder()
	handler.ServeHTTP(tierRes, tierReq)

	if tierRes.Code != http.StatusBadRequest {
		t.Fatalf("expected unsafe tier benefit status 400, got %d, body=%s", tierRes.Code, tierRes.Body.String())
	}
	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(tierRes.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode unsafe-benefit error: %v", err)
	}
	details, ok := envelope.Error.Details.(map[string]any)
	if !ok || details["field"] != "benefits" {
		t.Fatalf("expected benefits error field, got %+v", envelope.Error.Details)
	}
	if strings.Contains(tierRes.Body.String(), "cash prize") {
		t.Fatalf("unsafe tier benefit should not be echoed: %s", tierRes.Body.String())
	}

	publicReq := httptest.NewRequest(http.MethodGet, "/api/v1/loyalty/tiers", nil)
	publicRes := httptest.NewRecorder()
	handler.ServeHTTP(publicRes, publicReq)
	if publicRes.Code != http.StatusOK {
		t.Fatalf("expected public tiers status 200, got %d, body=%s", publicRes.Code, publicRes.Body.String())
	}
	if strings.Contains(publicRes.Body.String(), "cash prize") {
		t.Fatalf("unsafe tier benefit should not be persisted into public tiers: %s", publicRes.Body.String())
	}
}

func TestAdminLoyaltyRuleRejectsMoneyWordingName(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	ruleReq := httptest.NewRequest(
		http.MethodPost,
		"/api/v1/admin/loyalty/rules",
		bytes.NewBufferString(`{"name":"Cash payout multiplier","predictionSourceType":"prediction_settlement","active":true,"multiplier":1,"minQualifiedPoints":100,"eligiblePredictionTypes":[]}`),
	)
	ruleReq.Header.Set("Content-Type", "application/json")
	ruleReq = ruleReq.WithContext(httpx.WithTestUser(ruleReq.Context(), "admin-test", "admin-test", "admin"))
	ruleRes := httptest.NewRecorder()
	handler.ServeHTTP(ruleRes, ruleReq)

	if ruleRes.Code != http.StatusBadRequest {
		t.Fatalf("expected unsafe loyalty rule name status 400, got %d, body=%s", ruleRes.Code, ruleRes.Body.String())
	}
	var envelope httpx.ErrorEnvelope
	if err := json.Unmarshal(ruleRes.Body.Bytes(), &envelope); err != nil {
		t.Fatalf("decode unsafe-rule-name error: %v", err)
	}
	details, ok := envelope.Error.Details.(map[string]any)
	if !ok || details["field"] != "name" {
		t.Fatalf("expected name error field, got %+v", envelope.Error.Details)
	}
	if strings.Contains(ruleRes.Body.String(), "Cash payout") {
		t.Fatalf("unsafe loyalty rule name should not be echoed: %s", ruleRes.Body.String())
	}

	configReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/loyalty/config", nil)
	configReq = configReq.WithContext(httpx.WithTestUser(configReq.Context(), "admin-test", "admin-test", "admin"))
	configRes := httptest.NewRecorder()
	handler.ServeHTTP(configRes, configReq)
	if configRes.Code != http.StatusOK {
		t.Fatalf("expected config status 200, got %d, body=%s", configRes.Code, configRes.Body.String())
	}
	if strings.Contains(configRes.Body.String(), "Cash payout") {
		t.Fatalf("unsafe loyalty rule name should not be persisted into config: %s", configRes.Body.String())
	}
}

func TestAdminLoyaltyRuleRejectsRetiredRequestFields(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	cases := []struct {
		name      string
		body      string
		wantField string
	}{
		{
			name:      "sourceType",
			body:      `{"name":"Retired source","sourceType":"bet_settlement","active":true,"multiplier":1,"minQualifiedPoints":100,"eligiblePredictionTypes":[]}`,
			wantField: "predictionSourceType",
		},
		{
			name:      "minQualifiedStakePoints",
			body:      `{"name":"Retired stake","predictionSourceType":"prediction_settlement","active":true,"multiplier":1,"minQualifiedStakePoints":100,"eligiblePredictionTypes":[]}`,
			wantField: "minQualifiedPoints",
		},
		{
			name:      "eligibleSportIds",
			body:      `{"name":"Retired sports","predictionSourceType":"prediction_settlement","active":true,"multiplier":1,"minQualifiedPoints":100,"eligibleSportIds":["football"],"eligiblePredictionTypes":[]}`,
			wantField: "eligiblePredictionTypes",
		},
		{
			name:      "eligibleBetTypes",
			body:      `{"name":"Retired bet types","predictionSourceType":"prediction_settlement","active":true,"multiplier":1,"minQualifiedPoints":100,"eligibleBetTypes":["single"]}`,
			wantField: "eligiblePredictionTypes",
		},
	}

	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/loyalty/rules", bytes.NewBufferString(tc.body))
			req.Header.Set("Content-Type", "application/json")
			req = req.WithContext(httpx.WithTestUser(req.Context(), "admin-test", "admin-test", "admin"))
			res := httptest.NewRecorder()
			handler.ServeHTTP(res, req)
			if res.Code != http.StatusBadRequest {
				t.Fatalf("expected retired field to return 400, got %d, body=%s", res.Code, res.Body.String())
			}
			if !strings.Contains(res.Body.String(), tc.wantField) {
				t.Fatalf("expected error to mention %s, body=%s", tc.wantField, res.Body.String())
			}
		})
	}
}
