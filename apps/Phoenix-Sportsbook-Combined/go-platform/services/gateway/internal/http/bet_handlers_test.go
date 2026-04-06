package http

import (
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"phoenix-revival/platform/transport/httpx"
)

func TestPlaceBetAndFetchByID(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-bet-http-1","amountCents":5000,"idempotencyKey":"seed"}`))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", creditRes.Code, creditRes.Body.String())
	}

	placeReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(`{"userId":"u-bet-http-1","marketId":"m:local:001","selectionId":"home","stakeCents":1200,"odds":1.8,"idempotencyKey":"bet-key-1"}`))
	placeRes := httptest.NewRecorder()
	handler.ServeHTTP(placeRes, placeReq)
	if placeRes.Code != http.StatusOK {
		t.Fatalf("place bet failed: status=%d body=%s", placeRes.Code, placeRes.Body.String())
	}

	var placed map[string]any
	if err := json.Unmarshal(placeRes.Body.Bytes(), &placed); err != nil {
		t.Fatalf("decode placed bet response: %v", err)
	}
	betID := placed["betId"].(string)
	if betID == "" {
		t.Fatalf("expected betId in response")
	}

	getReq := httptest.NewRequest(http.MethodGet, "/api/v1/bets/"+betID, nil)
	getRes := httptest.NewRecorder()
	handler.ServeHTTP(getRes, getReq)
	if getRes.Code != http.StatusOK {
		t.Fatalf("get bet failed: status=%d body=%s", getRes.Code, getRes.Body.String())
	}
}

func TestListBetHistoryByUser(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-bet-history-1","amountCents":5000,"idempotencyKey":"seed-history"}`))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", creditRes.Code, creditRes.Body.String())
	}

	placeReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(`{"userId":"u-bet-history-1","marketId":"m:local:001","selectionId":"home","stakeCents":1200,"odds":1.8,"idempotencyKey":"bet-history-key-1"}`))
	placeRes := httptest.NewRecorder()
	handler.ServeHTTP(placeRes, placeReq)
	if placeRes.Code != http.StatusOK {
		t.Fatalf("place bet failed: status=%d body=%s", placeRes.Code, placeRes.Body.String())
	}

	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/bets?userId=u-bet-history-1&page=1&pageSize=10", nil)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("list bets failed: status=%d body=%s", listRes.Code, listRes.Body.String())
	}

	var payload struct {
		CurrentPage int `json:"currentPage"`
		Data        []struct {
			BetID  string `json:"betId"`
			UserID string `json:"userId"`
			Status string `json:"status"`
		} `json:"data"`
		ItemsPerPage int  `json:"itemsPerPage"`
		TotalCount   int  `json:"totalCount"`
		HasNextPage  bool `json:"hasNextPage"`
	}
	if err := json.Unmarshal(listRes.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode bet history response: %v", err)
	}

	if payload.CurrentPage != 1 {
		t.Fatalf("expected currentPage=1, got %d", payload.CurrentPage)
	}
	if payload.ItemsPerPage != 10 {
		t.Fatalf("expected itemsPerPage=10, got %d", payload.ItemsPerPage)
	}
	if payload.TotalCount != 1 {
		t.Fatalf("expected totalCount=1, got %d", payload.TotalCount)
	}
	if payload.HasNextPage {
		t.Fatalf("expected hasNextPage=false, got true")
	}
	if len(payload.Data) != 1 {
		t.Fatalf("expected 1 bet, got %d", len(payload.Data))
	}
	if payload.Data[0].UserID != "u-bet-history-1" {
		t.Fatalf("expected userId=u-bet-history-1, got %s", payload.Data[0].UserID)
	}
	if payload.Data[0].Status != "placed" {
		t.Fatalf("expected status=placed, got %s", payload.Data[0].Status)
	}
}

func TestPlaceBetSupportsCanonicalEnvelopeItems(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-bet-http-1b","amountCents":5000,"idempotencyKey":"seed"}`))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", creditRes.Code, creditRes.Body.String())
	}

	payload := `{
		"userId":"u-bet-http-1b",
		"requestId":"req-canonical-1",
		"idempotencyKey":"bet-canonical-1",
		"deviceId":"device-abc",
		"segmentId":"vip",
		"ipAddress":"127.0.0.1",
		"oddsPrecision":3,
		"items":[{"marketId":"m:local:001","selectionId":"home","stakeCents":1200,"odds":1.8,"requestLineId":"line-1"}]
	}`
	placeReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(payload))
	placeRes := httptest.NewRecorder()
	handler.ServeHTTP(placeRes, placeReq)
	if placeRes.Code != http.StatusOK {
		t.Fatalf("place bet failed: status=%d body=%s", placeRes.Code, placeRes.Body.String())
	}

	var placed map[string]any
	if err := json.Unmarshal(placeRes.Body.Bytes(), &placed); err != nil {
		t.Fatalf("decode placed bet response: %v", err)
	}
	if placed["marketId"] != "m:local:001" {
		t.Fatalf("expected marketId m:local:001, got %v", placed["marketId"])
	}
	if placed["selectionId"] != "home" {
		t.Fatalf("expected selectionId home, got %v", placed["selectionId"])
	}
}

func TestPlaceBetRejectsInvalidCanonicalEnvelopeShape(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-bet-http-1c","amountCents":5000,"idempotencyKey":"seed"}`))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", creditRes.Code, creditRes.Body.String())
	}

	multiItemPayload := `{
		"userId":"u-bet-http-1c",
		"requestId":"req-canonical-2",
		"idempotencyKey":"bet-canonical-2",
		"items":[
			{"marketId":"m:local:001","selectionId":"home","stakeCents":500,"odds":1.8},
			{"marketId":"m:local:001","selectionId":"away","stakeCents":500,"odds":2.1}
		]
	}`
	badReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(multiItemPayload))
	badRes := httptest.NewRecorder()
	handler.ServeHTTP(badRes, badReq)
	if badRes.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400 for multi-item shape, got %d body=%s", badRes.Code, badRes.Body.String())
	}

	invalidIPPayload := `{
		"userId":"u-bet-http-1c",
		"requestId":"req-canonical-3",
		"idempotencyKey":"bet-canonical-3",
		"ipAddress":"not-an-ip",
		"items":[{"marketId":"m:local:001","selectionId":"home","stakeCents":500,"odds":1.8}]
	}`
	invalidReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(invalidIPPayload))
	invalidRes := httptest.NewRecorder()
	handler.ServeHTTP(invalidRes, invalidReq)
	if invalidRes.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400 for invalid ipAddress, got %d body=%s", invalidRes.Code, invalidRes.Body.String())
	}
}

func TestPlaceBetRejectsOddsChangedWithReasonCode(t *testing.T) {
	t.Setenv("BET_ODDS_CHANGE_POLICY", "reject_on_change")

	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-bet-http-odds","amountCents":5000,"idempotencyKey":"seed"}`))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", creditRes.Code, creditRes.Body.String())
	}

	placeReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(`{"userId":"u-bet-http-odds","requestId":"req-odds","marketId":"m:local:001","selectionId":"home","stakeCents":300,"odds":1.95,"idempotencyKey":"odds-reject"}`))
	placeRes := httptest.NewRecorder()
	handler.ServeHTTP(placeRes, placeReq)
	if placeRes.Code != http.StatusConflict {
		t.Fatalf("expected status 409 for odds changed rejection, got %d body=%s", placeRes.Code, placeRes.Body.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(placeRes.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	errObj := payload["error"].(map[string]any)
	details := errObj["details"].(map[string]any)
	if details["reasonCode"] != "odds_changed" {
		t.Fatalf("expected reasonCode=odds_changed, got %v", details["reasonCode"])
	}
}

func TestPrecheckReturnsEligibilityAndReasonCodes(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-bet-http-precheck","amountCents":1000,"idempotencyKey":"seed"}`))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", creditRes.Code, creditRes.Body.String())
	}

	allowedReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/precheck", strings.NewReader(`{"userId":"u-bet-http-precheck","requestId":"precheck-1","marketId":"m:local:001","selectionId":"home","stakeCents":300,"odds":1.8}`))
	allowedRes := httptest.NewRecorder()
	handler.ServeHTTP(allowedRes, allowedReq)
	if allowedRes.Code != http.StatusOK {
		t.Fatalf("precheck allowed failed: status=%d body=%s", allowedRes.Code, allowedRes.Body.String())
	}

	var allowedBody map[string]any
	if err := json.Unmarshal(allowedRes.Body.Bytes(), &allowedBody); err != nil {
		t.Fatalf("decode allowed precheck: %v", err)
	}
	if allowedBody["allowed"] != true {
		t.Fatalf("expected allowed=true, got %v", allowedBody["allowed"])
	}
	if allowedBody["availableBalanceCents"] != float64(1000) {
		t.Fatalf("expected availableBalanceCents=1000, got %v", allowedBody["availableBalanceCents"])
	}
	if allowedBody["requiredStakeCents"] != float64(300) {
		t.Fatalf("expected requiredStakeCents=300, got %v", allowedBody["requiredStakeCents"])
	}

	insufficientReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/precheck", strings.NewReader(`{"userId":"u-bet-http-precheck","requestId":"precheck-2","marketId":"m:local:001","selectionId":"home","stakeCents":2000,"odds":1.8}`))
	insufficientRes := httptest.NewRecorder()
	handler.ServeHTTP(insufficientRes, insufficientReq)
	if insufficientRes.Code != http.StatusOK {
		t.Fatalf("precheck insufficient funds failed: status=%d body=%s", insufficientRes.Code, insufficientRes.Body.String())
	}

	var insufficientBody map[string]any
	if err := json.Unmarshal(insufficientRes.Body.Bytes(), &insufficientBody); err != nil {
		t.Fatalf("decode insufficient precheck: %v", err)
	}
	if insufficientBody["allowed"] != false {
		t.Fatalf("expected allowed=false, got %v", insufficientBody["allowed"])
	}
	if insufficientBody["reasonCode"] != "insufficient_funds" {
		t.Fatalf("expected reasonCode insufficient_funds, got %v", insufficientBody["reasonCode"])
	}
}

func TestBetBuilderQuoteRoutes(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	successReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/builder/quote", strings.NewReader(`{
		"userId":"u-builder-http-1",
		"requestId":"builder-http-1",
		"legs":[
			{"marketId":"m:local:001","selectionId":"home"},
			{"marketId":"m:local:002","selectionId":"over"}
		]
	}`))
	successRes := httptest.NewRecorder()
	handler.ServeHTTP(successRes, successReq)
	if successRes.Code != http.StatusOK {
		t.Fatalf("builder quote failed: status=%d body=%s", successRes.Code, successRes.Body.String())
	}

	var successBody map[string]any
	if err := json.Unmarshal(successRes.Body.Bytes(), &successBody); err != nil {
		t.Fatalf("decode builder quote response: %v", err)
	}
	if successBody["combinable"] != true {
		t.Fatalf("expected combinable=true, got %v", successBody["combinable"])
	}
	if successBody["comboType"] != "same_game_combo" {
		t.Fatalf("expected comboType=same_game_combo, got %v", successBody["comboType"])
	}
	if successBody["combinedOdds"] != 3.51 {
		t.Fatalf("expected combinedOdds=3.51, got %v", successBody["combinedOdds"])
	}
	quoteID, _ := successBody["quoteId"].(string)
	if quoteID == "" {
		t.Fatalf("expected quoteId in builder quote response, got %v", successBody["quoteId"])
	}

	getReq := httptest.NewRequest(http.MethodGet, "/api/v1/bets/builder/quotes/"+quoteID, nil)
	getRes := httptest.NewRecorder()
	handler.ServeHTTP(getRes, getReq)
	if getRes.Code != http.StatusOK {
		t.Fatalf("builder quote get failed: status=%d body=%s", getRes.Code, getRes.Body.String())
	}

	conflictReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/builder/quote", strings.NewReader(`{
		"userId":"u-builder-http-1",
		"requestId":"builder-http-2",
		"legs":[
			{"marketId":"m:local:001","selectionId":"home"},
			{"marketId":"m:local:001","selectionId":"away"}
		]
	}`))
	conflictRes := httptest.NewRecorder()
	handler.ServeHTTP(conflictRes, conflictReq)
	if conflictRes.Code != http.StatusConflict {
		t.Fatalf("expected 409 for duplicate-market builder legs, got status=%d body=%s", conflictRes.Code, conflictRes.Body.String())
	}

	var conflictBody map[string]any
	if err := json.Unmarshal(conflictRes.Body.Bytes(), &conflictBody); err != nil {
		t.Fatalf("decode builder conflict response: %v", err)
	}
	errObj := conflictBody["error"].(map[string]any)
	details := errObj["details"].(map[string]any)
	if details["reasonCode"] != "same_game_combo_duplicate_market" {
		t.Fatalf("expected reasonCode=same_game_combo_duplicate_market, got %v", details["reasonCode"])
	}
}

func TestBetBuilderAcceptRoutes(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-builder-http-accept","amountCents":5000,"idempotencyKey":"seed"}`))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", creditRes.Code, creditRes.Body.String())
	}

	quoteReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/builder/quote", strings.NewReader(`{
		"userId":"u-builder-http-accept",
		"requestId":"builder-http-accept-quote",
		"legs":[
			{"marketId":"m:local:001","selectionId":"home"},
			{"marketId":"m:local:002","selectionId":"over"}
		]
	}`))
	quoteRes := httptest.NewRecorder()
	handler.ServeHTTP(quoteRes, quoteReq)
	if quoteRes.Code != http.StatusOK {
		t.Fatalf("builder quote failed: status=%d body=%s", quoteRes.Code, quoteRes.Body.String())
	}

	var quoteBody map[string]any
	if err := json.Unmarshal(quoteRes.Body.Bytes(), &quoteBody); err != nil {
		t.Fatalf("decode quote response: %v", err)
	}
	quoteID, _ := quoteBody["quoteId"].(string)
	if quoteID == "" {
		t.Fatalf("expected quoteId in response, got %v", quoteBody["quoteId"])
	}

	acceptReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/builder/accept", strings.NewReader(`{
		"quoteId":"`+quoteID+`",
		"userId":"u-builder-http-accept",
		"requestId":"builder-http-accept-1",
		"stakeCents":900
	}`))
	acceptRes := httptest.NewRecorder()
	handler.ServeHTTP(acceptRes, acceptReq)
	if acceptRes.Code != http.StatusOK {
		t.Fatalf("builder accept failed: status=%d body=%s", acceptRes.Code, acceptRes.Body.String())
	}

	var acceptedBody map[string]any
	if err := json.Unmarshal(acceptRes.Body.Bytes(), &acceptedBody); err != nil {
		t.Fatalf("decode accepted response: %v", err)
	}
	bet, _ := acceptedBody["bet"].(map[string]any)
	quote, _ := acceptedBody["quote"].(map[string]any)
	if bet["status"] != "placed" {
		t.Fatalf("expected placed bet status, got %v", bet["status"])
	}
	if quote["status"] != "accepted" {
		t.Fatalf("expected accepted quote status, got %v", quote["status"])
	}
	betID, _ := bet["betId"].(string)
	if betID == "" {
		t.Fatalf("expected betId in accept response, got %v", bet["betId"])
	}
	if quote["acceptedBetId"] != betID {
		t.Fatalf("expected quote acceptedBetId %s, got %v", betID, quote["acceptedBetId"])
	}

	replayReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/builder/accept", strings.NewReader(`{
		"quoteId":"`+quoteID+`",
		"userId":"u-builder-http-accept",
		"requestId":"builder-http-accept-2",
		"stakeCents":900
	}`))
	replayRes := httptest.NewRecorder()
	handler.ServeHTTP(replayRes, replayReq)
	if replayRes.Code != http.StatusOK {
		t.Fatalf("builder accept replay failed: status=%d body=%s", replayRes.Code, replayRes.Body.String())
	}

	var replayBody map[string]any
	if err := json.Unmarshal(replayRes.Body.Bytes(), &replayBody); err != nil {
		t.Fatalf("decode replay accept response: %v", err)
	}
	replayBet, _ := replayBody["bet"].(map[string]any)
	if replayBet["betId"] != betID {
		t.Fatalf("expected replay betId %s, got %v", betID, replayBet["betId"])
	}
}

func TestFixedExoticQuoteRoute(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-exotic-http-1","amountCents":5000,"idempotencyKey":"seed"}`))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", creditRes.Code, creditRes.Body.String())
	}

	successReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/exotics/fixed/quote", strings.NewReader(`{
		"userId":"u-exotic-http-1",
		"requestId":"exotic-http-1",
		"exoticType":"exacta",
		"stakeCents":500,
		"legs":[
			{"position":1,"marketId":"m:local:001","selectionId":"home"},
			{"position":2,"marketId":"m:local:002","selectionId":"over"}
		]
	}`))
	successRes := httptest.NewRecorder()
	handler.ServeHTTP(successRes, successReq)
	if successRes.Code != http.StatusOK {
		t.Fatalf("fixed exotic quote failed: status=%d body=%s", successRes.Code, successRes.Body.String())
	}

	var successBody map[string]any
	if err := json.Unmarshal(successRes.Body.Bytes(), &successBody); err != nil {
		t.Fatalf("decode fixed exotic quote response: %v", err)
	}
	if successBody["exoticType"] != "exacta" {
		t.Fatalf("expected exoticType=exacta, got %v", successBody["exoticType"])
	}
	if successBody["encodedTicket"] != "exacta:home>over" {
		t.Fatalf("expected encodedTicket exacta:home>over, got %v", successBody["encodedTicket"])
	}
	if successBody["combinedOdds"] != 3.51 {
		t.Fatalf("expected combinedOdds=3.51, got %v", successBody["combinedOdds"])
	}
	quoteID, _ := successBody["quoteId"].(string)
	if quoteID == "" {
		t.Fatalf("expected quoteId in fixed exotic quote response, got %v", successBody["quoteId"])
	}
	if successBody["status"] != "open" {
		t.Fatalf("expected quote status open, got %v", successBody["status"])
	}

	getReq := httptest.NewRequest(http.MethodGet, "/api/v1/bets/exotics/fixed/quotes/"+quoteID, nil)
	getRes := httptest.NewRecorder()
	handler.ServeHTTP(getRes, getReq)
	if getRes.Code != http.StatusOK {
		t.Fatalf("fixed exotic quote get failed: status=%d body=%s", getRes.Code, getRes.Body.String())
	}

	acceptReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/exotics/fixed/accept", strings.NewReader(`{
		"quoteId":"`+quoteID+`",
		"userId":"u-exotic-http-1",
		"requestId":"exotic-accept-1"
	}`))
	acceptRes := httptest.NewRecorder()
	handler.ServeHTTP(acceptRes, acceptReq)
	if acceptRes.Code != http.StatusOK {
		t.Fatalf("fixed exotic accept failed: status=%d body=%s", acceptRes.Code, acceptRes.Body.String())
	}

	var acceptedBody map[string]any
	if err := json.Unmarshal(acceptRes.Body.Bytes(), &acceptedBody); err != nil {
		t.Fatalf("decode fixed exotic accept response: %v", err)
	}
	acceptedBet, _ := acceptedBody["bet"].(map[string]any)
	acceptedQuote, _ := acceptedBody["quote"].(map[string]any)
	if acceptedBet["status"] != "placed" {
		t.Fatalf("expected placed bet status, got %v", acceptedBet["status"])
	}
	if acceptedQuote["status"] != "accepted" {
		t.Fatalf("expected accepted quote status, got %v", acceptedQuote["status"])
	}
	betID, _ := acceptedBet["betId"].(string)
	if betID == "" {
		t.Fatalf("expected betId in fixed exotic accept response, got %v", acceptedBet["betId"])
	}
	if acceptedQuote["acceptedBetId"] != betID {
		t.Fatalf("expected quote acceptedBetId %s, got %v", betID, acceptedQuote["acceptedBetId"])
	}

	replayReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/exotics/fixed/accept", strings.NewReader(`{
		"quoteId":"`+quoteID+`",
		"userId":"u-exotic-http-1",
		"requestId":"exotic-accept-2"
	}`))
	replayRes := httptest.NewRecorder()
	handler.ServeHTTP(replayRes, replayReq)
	if replayRes.Code != http.StatusOK {
		t.Fatalf("fixed exotic accept replay failed: status=%d body=%s", replayRes.Code, replayRes.Body.String())
	}

	var replayBody map[string]any
	if err := json.Unmarshal(replayRes.Body.Bytes(), &replayBody); err != nil {
		t.Fatalf("decode fixed exotic accept replay response: %v", err)
	}
	replayBet, _ := replayBody["bet"].(map[string]any)
	if replayBet["betId"] != betID {
		t.Fatalf("expected replay betId %s, got %v", betID, replayBet["betId"])
	}

	conflictReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/exotics/fixed/quote", strings.NewReader(`{
		"userId":"u-exotic-http-1",
		"requestId":"exotic-http-2",
		"exoticType":"exacta",
		"legs":[
			{"position":1,"marketId":"m:local:001","selectionId":"home"},
			{"position":2,"marketId":"m:local:001","selectionId":"away"}
		]
	}`))
	conflictRes := httptest.NewRecorder()
	handler.ServeHTTP(conflictRes, conflictReq)
	if conflictRes.Code != http.StatusConflict {
		t.Fatalf("expected 409 for duplicate-market fixed exotic legs, got status=%d body=%s", conflictRes.Code, conflictRes.Body.String())
	}

	var conflictBody map[string]any
	if err := json.Unmarshal(conflictRes.Body.Bytes(), &conflictBody); err != nil {
		t.Fatalf("decode fixed exotic conflict response: %v", err)
	}
	conflictErr := conflictBody["error"].(map[string]any)
	conflictDetails := conflictErr["details"].(map[string]any)
	if conflictDetails["reasonCode"] != "fixed_exotic_duplicate_market" {
		t.Fatalf("expected reasonCode=fixed_exotic_duplicate_market, got %v", conflictDetails["reasonCode"])
	}

	unsupportedReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/exotics/fixed/quote", strings.NewReader(`{
		"userId":"u-exotic-http-1",
		"requestId":"exotic-http-3",
		"exoticType":"superfecta",
		"legs":[
			{"position":1,"marketId":"m:local:001","selectionId":"home"},
			{"position":2,"marketId":"m:local:002","selectionId":"over"}
		]
	}`))
	unsupportedRes := httptest.NewRecorder()
	handler.ServeHTTP(unsupportedRes, unsupportedReq)
	if unsupportedRes.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for unsupported fixed exotic type, got status=%d body=%s", unsupportedRes.Code, unsupportedRes.Body.String())
	}

	var unsupportedBody map[string]any
	if err := json.Unmarshal(unsupportedRes.Body.Bytes(), &unsupportedBody); err != nil {
		t.Fatalf("decode fixed exotic unsupported response: %v", err)
	}
	unsupportedErr := unsupportedBody["error"].(map[string]any)
	unsupportedDetails := unsupportedErr["details"].(map[string]any)
	if unsupportedDetails["reasonCode"] != "fixed_exotic_type_unsupported" {
		t.Fatalf("expected reasonCode=fixed_exotic_type_unsupported, got %v", unsupportedDetails["reasonCode"])
	}
}

func TestAdminFixedExoticLifecycleRoutes(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-exotic-admin-http-1","amountCents":5000,"idempotencyKey":"seed"}`))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", creditRes.Code, creditRes.Body.String())
	}

	openQuoteReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/exotics/fixed/quote", strings.NewReader(`{
		"userId":"u-exotic-admin-http-1",
		"requestId":"exotic-admin-open-1",
		"exoticType":"exacta",
		"stakeCents":500,
		"legs":[
			{"position":1,"marketId":"m:local:001","selectionId":"home"},
			{"position":2,"marketId":"m:local:002","selectionId":"over"}
		]
	}`))
	openQuoteRes := httptest.NewRecorder()
	handler.ServeHTTP(openQuoteRes, openQuoteReq)
	if openQuoteRes.Code != http.StatusOK {
		t.Fatalf("open quote failed: status=%d body=%s", openQuoteRes.Code, openQuoteRes.Body.String())
	}

	var openQuoteBody map[string]any
	if err := json.Unmarshal(openQuoteRes.Body.Bytes(), &openQuoteBody); err != nil {
		t.Fatalf("decode open quote response: %v", err)
	}
	openQuoteID, _ := openQuoteBody["quoteId"].(string)
	if openQuoteID == "" {
		t.Fatalf("expected open quoteId, got %v", openQuoteBody["quoteId"])
	}

	acceptedQuoteReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/exotics/fixed/quote", strings.NewReader(`{
		"userId":"u-exotic-admin-http-1",
		"requestId":"exotic-admin-accepted-1",
		"exoticType":"exacta",
		"stakeCents":500,
		"legs":[
			{"position":1,"marketId":"m:local:001","selectionId":"away"},
			{"position":2,"marketId":"m:local:002","selectionId":"under"}
		]
	}`))
	acceptedQuoteRes := httptest.NewRecorder()
	handler.ServeHTTP(acceptedQuoteRes, acceptedQuoteReq)
	if acceptedQuoteRes.Code != http.StatusOK {
		t.Fatalf("accepted quote seed failed: status=%d body=%s", acceptedQuoteRes.Code, acceptedQuoteRes.Body.String())
	}

	var acceptedQuoteBody map[string]any
	if err := json.Unmarshal(acceptedQuoteRes.Body.Bytes(), &acceptedQuoteBody); err != nil {
		t.Fatalf("decode accepted quote response: %v", err)
	}
	acceptedQuoteID, _ := acceptedQuoteBody["quoteId"].(string)
	if acceptedQuoteID == "" {
		t.Fatalf("expected accepted quoteId, got %v", acceptedQuoteBody["quoteId"])
	}

	acceptReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/exotics/fixed/accept", strings.NewReader(`{
		"quoteId":"`+acceptedQuoteID+`",
		"userId":"u-exotic-admin-http-1",
		"requestId":"exotic-admin-accept-1"
	}`))
	acceptRes := httptest.NewRecorder()
	handler.ServeHTTP(acceptRes, acceptReq)
	if acceptRes.Code != http.StatusOK {
		t.Fatalf("accept quote failed: status=%d body=%s", acceptRes.Code, acceptRes.Body.String())
	}

	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/exotics/fixed/quotes?status=open&limit=10", nil)
	listReq.Header.Set("X-Admin-Role", "admin")
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("list open quotes failed: status=%d body=%s", listRes.Code, listRes.Body.String())
	}
	var listBody map[string]any
	if err := json.Unmarshal(listRes.Body.Bytes(), &listBody); err != nil {
		t.Fatalf("decode admin quote list: %v", err)
	}
	items, _ := listBody["items"].([]any)
	if len(items) == 0 {
		t.Fatalf("expected at least one open quote in admin list, got %d", len(items))
	}

	getReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/exotics/fixed/quotes/"+openQuoteID, nil)
	getReq.Header.Set("X-Admin-Role", "admin")
	getRes := httptest.NewRecorder()
	handler.ServeHTTP(getRes, getReq)
	if getRes.Code != http.StatusOK {
		t.Fatalf("admin get quote failed: status=%d body=%s", getRes.Code, getRes.Body.String())
	}

	expireReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/exotics/fixed/quotes/"+openQuoteID+"/lifecycle/expire", strings.NewReader(`{"reason":"manual risk pause"}`))
	expireReq.Header.Set("X-Admin-Role", "admin")
	expireReq.Header.Set("X-Admin-Actor", "admin-risk-http-1")
	expireRes := httptest.NewRecorder()
	handler.ServeHTTP(expireRes, expireReq)
	if expireRes.Code != http.StatusOK {
		t.Fatalf("admin expire quote failed: status=%d body=%s", expireRes.Code, expireRes.Body.String())
	}

	var expiredBody map[string]any
	if err := json.Unmarshal(expireRes.Body.Bytes(), &expiredBody); err != nil {
		t.Fatalf("decode expired quote response: %v", err)
	}
	if expiredBody["status"] != "expired" {
		t.Fatalf("expected expired status, got %v", expiredBody["status"])
	}
	lastReason, _ := expiredBody["lastReason"].(string)
	if !strings.Contains(lastReason, "manual risk pause") {
		t.Fatalf("expected lastReason to include manual reason, got %s", lastReason)
	}
	if !strings.Contains(lastReason, "admin-risk-http-1") {
		t.Fatalf("expected lastReason to include admin actor, got %s", lastReason)
	}

	expiredAcceptReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/exotics/fixed/accept", strings.NewReader(`{
		"quoteId":"`+openQuoteID+`",
		"userId":"u-exotic-admin-http-1",
		"requestId":"exotic-admin-accept-expired-1"
	}`))
	expiredAcceptRes := httptest.NewRecorder()
	handler.ServeHTTP(expiredAcceptRes, expiredAcceptReq)
	if expiredAcceptRes.Code != http.StatusConflict {
		t.Fatalf("expected 409 on expired quote accept, got status=%d body=%s", expiredAcceptRes.Code, expiredAcceptRes.Body.String())
	}

	conflictExpireReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/exotics/fixed/quotes/"+acceptedQuoteID+"/lifecycle/expire", strings.NewReader(`{"reason":"manual expire accepted"}`))
	conflictExpireReq.Header.Set("X-Admin-Role", "admin")
	conflictExpireRes := httptest.NewRecorder()
	handler.ServeHTTP(conflictExpireRes, conflictExpireReq)
	if conflictExpireRes.Code != http.StatusConflict {
		t.Fatalf("expected 409 when expiring accepted quote, got status=%d body=%s", conflictExpireRes.Code, conflictExpireRes.Body.String())
	}

	auditReq := httptest.NewRequest(http.MethodGet, "/api/v1/admin/audit-logs?action=fixed_exotic.quote.expired&page=1&pageSize=20&sortBy=occurredAt&sortDir=desc", nil)
	auditReq.Header.Set("X-Admin-Role", "admin")
	auditRes := httptest.NewRecorder()
	handler.ServeHTTP(auditRes, auditReq)
	if auditRes.Code != http.StatusOK {
		t.Fatalf("audit query failed: status=%d body=%s", auditRes.Code, auditRes.Body.String())
	}
	var auditBody map[string]any
	if err := json.Unmarshal(auditRes.Body.Bytes(), &auditBody); err != nil {
		t.Fatalf("decode fixed exotic audit response: %v", err)
	}
	auditItems, _ := auditBody["items"].([]any)
	if len(auditItems) == 0 {
		t.Fatalf("expected fixed exotic expire audit log entries, got %v", auditBody["items"])
	}
}

func TestAlternativeOddsOfferLifecycleRoutes(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	createReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/alternative-odds/offers", strings.NewReader(`{
		"userId":"u-alt-http-1",
		"requestId":"alt-create-1",
		"marketId":"m:local:001",
		"selectionId":"home",
		"stakeCents":700,
		"requestedOdds":1.95,
		"offeredOdds":2.05,
		"expiresInSeconds":60
	}`))
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)
	if createRes.Code != http.StatusOK {
		t.Fatalf("create alternative offer failed: status=%d body=%s", createRes.Code, createRes.Body.String())
	}

	var created map[string]any
	if err := json.Unmarshal(createRes.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode create response: %v", err)
	}
	offerID, _ := created["offerId"].(string)
	if offerID == "" {
		t.Fatalf("expected offerId in create response, got %v", created["offerId"])
	}
	if created["status"] != "open" {
		t.Fatalf("expected open status after create, got %v", created["status"])
	}

	getReq := httptest.NewRequest(http.MethodGet, "/api/v1/bets/alternative-odds/offers/"+offerID, nil)
	getRes := httptest.NewRecorder()
	handler.ServeHTTP(getRes, getReq)
	if getRes.Code != http.StatusOK {
		t.Fatalf("get alternative offer failed: status=%d body=%s", getRes.Code, getRes.Body.String())
	}

	repriceReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/alternative-odds/offers/"+offerID+"/reprice", strings.NewReader(`{
		"userId":"u-alt-http-1",
		"requestId":"alt-reprice-1",
		"offeredOdds":2.1,
		"expiresInSeconds":45,
		"reason":"market moved"
	}`))
	repriceRes := httptest.NewRecorder()
	handler.ServeHTTP(repriceRes, repriceReq)
	if repriceRes.Code != http.StatusOK {
		t.Fatalf("reprice alternative offer failed: status=%d body=%s", repriceRes.Code, repriceRes.Body.String())
	}

	var repriced map[string]any
	if err := json.Unmarshal(repriceRes.Body.Bytes(), &repriced); err != nil {
		t.Fatalf("decode reprice response: %v", err)
	}
	if repriced["lastAction"] != "repriced" {
		t.Fatalf("expected lastAction repriced, got %v", repriced["lastAction"])
	}

	acceptReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/alternative-odds/offers/"+offerID+"/accept", strings.NewReader(`{
		"userId":"u-alt-http-1",
		"requestId":"alt-accept-1",
		"reason":"accepting"
	}`))
	acceptRes := httptest.NewRecorder()
	handler.ServeHTTP(acceptRes, acceptReq)
	if acceptRes.Code != http.StatusOK {
		t.Fatalf("accept alternative offer failed: status=%d body=%s", acceptRes.Code, acceptRes.Body.String())
	}

	var accepted map[string]any
	if err := json.Unmarshal(acceptRes.Body.Bytes(), &accepted); err != nil {
		t.Fatalf("decode accept response: %v", err)
	}
	if accepted["status"] != "accepted" {
		t.Fatalf("expected accepted status, got %v", accepted["status"])
	}

	listReq := httptest.NewRequest(http.MethodGet, "/api/v1/bets/alternative-odds/offers?userId=u-alt-http-1&status=accepted&limit=1", nil)
	listRes := httptest.NewRecorder()
	handler.ServeHTTP(listRes, listReq)
	if listRes.Code != http.StatusOK {
		t.Fatalf("list alternative offers failed: status=%d body=%s", listRes.Code, listRes.Body.String())
	}

	var listed []map[string]any
	if err := json.Unmarshal(listRes.Body.Bytes(), &listed); err != nil {
		t.Fatalf("decode list response: %v", err)
	}
	if len(listed) != 1 {
		t.Fatalf("expected one listed offer, got %d", len(listed))
	}
}

func TestAlternativeOddsOfferCommitRoute(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-alt-http-commit","amountCents":5000,"idempotencyKey":"seed"}`))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", creditRes.Code, creditRes.Body.String())
	}

	createReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/alternative-odds/offers", strings.NewReader(`{
		"userId":"u-alt-http-commit",
		"requestId":"alt-commit-create-1",
		"marketId":"m:local:001",
		"selectionId":"home",
		"stakeCents":700,
		"requestedOdds":1.95,
		"offeredOdds":2.05,
		"expiresInSeconds":60
	}`))
	createRes := httptest.NewRecorder()
	handler.ServeHTTP(createRes, createReq)
	if createRes.Code != http.StatusOK {
		t.Fatalf("create alternative offer failed: status=%d body=%s", createRes.Code, createRes.Body.String())
	}

	var created map[string]any
	if err := json.Unmarshal(createRes.Body.Bytes(), &created); err != nil {
		t.Fatalf("decode create response: %v", err)
	}
	offerID, _ := created["offerId"].(string)
	if offerID == "" {
		t.Fatalf("expected offerId in create response, got %v", created["offerId"])
	}

	commitReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/alternative-odds/offers/"+offerID+"/commit", strings.NewReader(`{
		"userId":"u-alt-http-commit",
		"requestId":"alt-commit-1",
		"idempotencyKey":"alt-commit-idem-1",
		"reason":"accepting and placing"
	}`))
	commitRes := httptest.NewRecorder()
	handler.ServeHTTP(commitRes, commitReq)
	if commitRes.Code != http.StatusOK {
		t.Fatalf("commit alternative offer failed: status=%d body=%s", commitRes.Code, commitRes.Body.String())
	}

	var committed map[string]any
	if err := json.Unmarshal(commitRes.Body.Bytes(), &committed); err != nil {
		t.Fatalf("decode commit response: %v", err)
	}
	offer, _ := committed["offer"].(map[string]any)
	bet, _ := committed["bet"].(map[string]any)
	if offer["status"] != "accepted" {
		t.Fatalf("expected offer status accepted, got %v", offer["status"])
	}
	if offer["lastAction"] != "committed" {
		t.Fatalf("expected offer lastAction committed, got %v", offer["lastAction"])
	}
	if offer["committedBetId"] == "" {
		t.Fatalf("expected committedBetId, got %v", offer["committedBetId"])
	}
	if bet["status"] != "placed" {
		t.Fatalf("expected placed bet status, got %v", bet["status"])
	}
}

func TestCashoutAcceptRouteRejectsStaleRevision(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-cashout-http-stale","amountCents":5000,"idempotencyKey":"seed"}`))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", creditRes.Code, creditRes.Body.String())
	}

	placeReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(`{"userId":"u-cashout-http-stale","requestId":"cashout-place-http-stale","marketId":"m:local:001","selectionId":"home","stakeCents":1000,"odds":2.0,"idempotencyKey":"cashout-place-http-stale"}`))
	placeRes := httptest.NewRecorder()
	handler.ServeHTTP(placeRes, placeReq)
	if placeRes.Code != http.StatusOK {
		t.Fatalf("place bet failed: status=%d body=%s", placeRes.Code, placeRes.Body.String())
	}

	var placed map[string]any
	if err := json.Unmarshal(placeRes.Body.Bytes(), &placed); err != nil {
		t.Fatalf("decode placed response: %v", err)
	}
	betID := placed["betId"].(string)

	quoteReq1 := httptest.NewRequest(http.MethodPost, "/api/v1/bets/cashout/quote", strings.NewReader(`{"betId":"`+betID+`","userId":"u-cashout-http-stale","requestId":"cashout-quote-http-stale-1"}`))
	quoteRes1 := httptest.NewRecorder()
	handler.ServeHTTP(quoteRes1, quoteReq1)
	if quoteRes1.Code != http.StatusOK {
		t.Fatalf("quote cashout #1 failed: status=%d body=%s", quoteRes1.Code, quoteRes1.Body.String())
	}
	var quote1 map[string]any
	if err := json.Unmarshal(quoteRes1.Body.Bytes(), &quote1); err != nil {
		t.Fatalf("decode quote #1 response: %v", err)
	}
	quoteID := quote1["quoteId"].(string)
	revision1 := int64(quote1["revision"].(float64))

	quoteReq2 := httptest.NewRequest(http.MethodPost, "/api/v1/bets/cashout/quote", strings.NewReader(`{"betId":"`+betID+`","userId":"u-cashout-http-stale","requestId":"cashout-quote-http-stale-2"}`))
	quoteRes2 := httptest.NewRecorder()
	handler.ServeHTTP(quoteRes2, quoteReq2)
	if quoteRes2.Code != http.StatusOK {
		t.Fatalf("quote cashout #2 failed: status=%d body=%s", quoteRes2.Code, quoteRes2.Body.String())
	}

	acceptReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/cashout/accept", strings.NewReader(`{"betId":"`+betID+`","userId":"u-cashout-http-stale","quoteId":"`+quoteID+`","requestId":"cashout-accept-http-stale","quoteRevision":`+fmt.Sprintf("%d", revision1)+`}`))
	acceptRes := httptest.NewRecorder()
	handler.ServeHTTP(acceptRes, acceptReq)
	if acceptRes.Code != http.StatusConflict {
		t.Fatalf("expected stale cashout accept to return 409, got %d body=%s", acceptRes.Code, acceptRes.Body.String())
	}

	var payload map[string]any
	if err := json.Unmarshal(acceptRes.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode stale accept response: %v", err)
	}
	errorObj, _ := payload["error"].(map[string]any)
	details, _ := errorObj["details"].(map[string]any)
	if details["reasonCode"] != "cashout_quote_stale" {
		t.Fatalf("expected reasonCode cashout_quote_stale, got %v", details["reasonCode"])
	}
}

func TestCashoutQuoteAndAcceptRoutes(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-cashout-http-1","amountCents":5000,"idempotencyKey":"seed"}`))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", creditRes.Code, creditRes.Body.String())
	}

	placeReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(`{"userId":"u-cashout-http-1","requestId":"cashout-place-http","marketId":"m:local:001","selectionId":"home","stakeCents":1000,"odds":2.0,"idempotencyKey":"cashout-place-http"}`))
	placeRes := httptest.NewRecorder()
	handler.ServeHTTP(placeRes, placeReq)
	if placeRes.Code != http.StatusOK {
		t.Fatalf("place bet failed: status=%d body=%s", placeRes.Code, placeRes.Body.String())
	}

	var placed map[string]any
	if err := json.Unmarshal(placeRes.Body.Bytes(), &placed); err != nil {
		t.Fatalf("decode placed response: %v", err)
	}
	betID := placed["betId"].(string)

	quoteReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/cashout/quote", strings.NewReader(`{"betId":"`+betID+`","userId":"u-cashout-http-1","requestId":"cashout-quote-http"}`))
	quoteRes := httptest.NewRecorder()
	handler.ServeHTTP(quoteRes, quoteReq)
	if quoteRes.Code != http.StatusOK {
		t.Fatalf("quote cashout failed: status=%d body=%s", quoteRes.Code, quoteRes.Body.String())
	}

	var quote map[string]any
	if err := json.Unmarshal(quoteRes.Body.Bytes(), &quote); err != nil {
		t.Fatalf("decode quote response: %v", err)
	}
	quoteID, _ := quote["quoteId"].(string)
	if quoteID == "" {
		t.Fatalf("expected quoteId in quote response, got %v", quote["quoteId"])
	}
	quoteRevision := int64(quote["revision"].(float64))
	if quoteRevision <= 0 {
		t.Fatalf("expected quote revision > 0, got %d", quoteRevision)
	}

	acceptReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/cashout/accept", strings.NewReader(`{"betId":"`+betID+`","userId":"u-cashout-http-1","quoteId":"`+quoteID+`","requestId":"cashout-accept-http","quoteRevision":`+fmt.Sprintf("%d", quoteRevision)+`,"reason":"lock profit"}`))
	acceptRes := httptest.NewRecorder()
	handler.ServeHTTP(acceptRes, acceptReq)
	if acceptRes.Code != http.StatusOK {
		t.Fatalf("accept cashout failed: status=%d body=%s", acceptRes.Code, acceptRes.Body.String())
	}

	var accepted map[string]any
	if err := json.Unmarshal(acceptRes.Body.Bytes(), &accepted); err != nil {
		t.Fatalf("decode accept response: %v", err)
	}
	acceptedBet, _ := accepted["bet"].(map[string]any)
	acceptedQuote, _ := accepted["quote"].(map[string]any)
	if acceptedBet["status"] != "cashed_out" {
		t.Fatalf("expected bet status cashed_out, got %v", acceptedBet["status"])
	}
	if acceptedQuote["status"] != "accepted" {
		t.Fatalf("expected quote status accepted, got %v", acceptedQuote["status"])
	}
	if acceptedQuote["revision"] != float64(quoteRevision) {
		t.Fatalf("expected quote revision %d, got %v", quoteRevision, acceptedQuote["revision"])
	}

	getQuoteReq := httptest.NewRequest(http.MethodGet, "/api/v1/bets/cashout/quotes/"+quoteID, nil)
	getQuoteRes := httptest.NewRecorder()
	handler.ServeHTTP(getQuoteRes, getQuoteReq)
	if getQuoteRes.Code != http.StatusOK {
		t.Fatalf("get cashout quote failed: status=%d body=%s", getQuoteRes.Code, getQuoteRes.Body.String())
	}
}

func TestPlaceBetRejectsClosedMarket(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-bet-http-2","amountCents":5000,"idempotencyKey":"seed"}`))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", creditRes.Code, creditRes.Body.String())
	}

	placeReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(`{"userId":"u-bet-http-2","marketId":"m:local:003","selectionId":"yes","stakeCents":300,"odds":2.2,"idempotencyKey":"bet-key-closed"}`))
	placeRes := httptest.NewRecorder()
	handler.ServeHTTP(placeRes, placeReq)
	if placeRes.Code != http.StatusForbidden {
		t.Fatalf("expected status 403 for closed market, got %d body=%s", placeRes.Code, placeRes.Body.String())
	}
}

func TestPlaceBetIdempotencyConflict(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-bet-http-3","amountCents":5000,"idempotencyKey":"seed"}`))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", creditRes.Code, creditRes.Body.String())
	}

	firstReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(`{"userId":"u-bet-http-3","marketId":"m:local:001","selectionId":"home","stakeCents":300,"odds":2.0,"idempotencyKey":"same-bet"}`))
	firstRes := httptest.NewRecorder()
	handler.ServeHTTP(firstRes, firstReq)
	if firstRes.Code != http.StatusOK {
		t.Fatalf("first place bet failed: status=%d body=%s", firstRes.Code, firstRes.Body.String())
	}

	conflictReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(`{"userId":"u-bet-http-3","marketId":"m:local:001","selectionId":"away","stakeCents":400,"odds":2.0,"idempotencyKey":"same-bet"}`))
	conflictRes := httptest.NewRecorder()
	handler.ServeHTTP(conflictRes, conflictReq)
	if conflictRes.Code != http.StatusConflict {
		t.Fatalf("expected status 409 for idempotency conflict, got %d body=%s", conflictRes.Code, conflictRes.Body.String())
	}
}

func TestPlaceBetRejectsSelectionIntegrityViolation(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-bet-http-4","amountCents":5000,"idempotencyKey":"seed"}`))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", creditRes.Code, creditRes.Body.String())
	}

	placeReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(`{"userId":"u-bet-http-4","marketId":"m:local:001","selectionId":"invalid","stakeCents":300,"odds":2.2,"idempotencyKey":"bad-selection"}`))
	placeRes := httptest.NewRecorder()
	handler.ServeHTTP(placeRes, placeReq)
	if placeRes.Code != http.StatusBadRequest {
		t.Fatalf("expected status 400 for selection integrity violation, got %d body=%s", placeRes.Code, placeRes.Body.String())
	}
}

func TestAdminSettleWinningBet(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-bet-http-5","amountCents":5000,"idempotencyKey":"seed"}`))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", creditRes.Code, creditRes.Body.String())
	}

	placeReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(`{"userId":"u-bet-http-5","marketId":"m:local:001","selectionId":"home","stakeCents":1000,"odds":2.0,"idempotencyKey":"bet-settle"}`))
	placeRes := httptest.NewRecorder()
	handler.ServeHTTP(placeRes, placeReq)
	if placeRes.Code != http.StatusOK {
		t.Fatalf("place bet failed: status=%d body=%s", placeRes.Code, placeRes.Body.String())
	}

	var placed map[string]any
	if err := json.Unmarshal(placeRes.Body.Bytes(), &placed); err != nil {
		t.Fatalf("decode placed bet response: %v", err)
	}
	betID := placed["betId"].(string)

	settleReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/bets/"+betID+"/lifecycle/settle", strings.NewReader(`{"winningSelectionId":"home","reason":"result confirmed"}`))
	settleReq.Header.Set("X-Admin-Role", "admin")
	settleRes := httptest.NewRecorder()
	handler.ServeHTTP(settleRes, settleReq)
	if settleRes.Code != http.StatusOK {
		t.Fatalf("settle bet failed: status=%d body=%s", settleRes.Code, settleRes.Body.String())
	}

	var settled map[string]any
	if err := json.Unmarshal(settleRes.Body.Bytes(), &settled); err != nil {
		t.Fatalf("decode settled response: %v", err)
	}
	if settled["status"] != "settled_won" {
		t.Fatalf("expected status settled_won, got %v", settled["status"])
	}
}

func TestAdminSettleSupportsDeadHeatFactor(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-bet-http-deadheat","amountCents":5000,"idempotencyKey":"seed"}`))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", creditRes.Code, creditRes.Body.String())
	}

	placeReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(`{"userId":"u-bet-http-deadheat","marketId":"m:local:001","selectionId":"home","stakeCents":1000,"odds":2.0,"idempotencyKey":"bet-settle-deadheat"}`))
	placeRes := httptest.NewRecorder()
	handler.ServeHTTP(placeRes, placeReq)
	if placeRes.Code != http.StatusOK {
		t.Fatalf("place bet failed: status=%d body=%s", placeRes.Code, placeRes.Body.String())
	}

	var placed map[string]any
	if err := json.Unmarshal(placeRes.Body.Bytes(), &placed); err != nil {
		t.Fatalf("decode placed bet response: %v", err)
	}
	betID := placed["betId"].(string)

	settleReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/bets/"+betID+"/lifecycle/settle", strings.NewReader(`{"winningSelectionIds":["home","away"],"deadHeatFactor":0.5,"reason":"dead heat confirmed"}`))
	settleReq.Header.Set("X-Admin-Role", "admin")
	settleRes := httptest.NewRecorder()
	handler.ServeHTTP(settleRes, settleReq)
	if settleRes.Code != http.StatusOK {
		t.Fatalf("settle bet failed: status=%d body=%s", settleRes.Code, settleRes.Body.String())
	}

	var settled map[string]any
	if err := json.Unmarshal(settleRes.Body.Bytes(), &settled); err != nil {
		t.Fatalf("decode settled response: %v", err)
	}
	if settled["status"] != "settled_won" {
		t.Fatalf("expected status settled_won, got %v", settled["status"])
	}
	if int64(settled["walletBalanceCents"].(float64)) != 5000 {
		t.Fatalf("expected walletBalanceCents=5000, got %v", settled["walletBalanceCents"])
	}
}

func TestAdminSettleRejectsInvalidDeadHeatFactor(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	creditReq := httptest.NewRequest(http.MethodPost, "/api/v1/wallet/credit", strings.NewReader(`{"userId":"u-bet-http-deadheat-invalid","amountCents":5000,"idempotencyKey":"seed"}`))
	creditRes := httptest.NewRecorder()
	handler.ServeHTTP(creditRes, creditReq)
	if creditRes.Code != http.StatusOK {
		t.Fatalf("seed credit failed: status=%d body=%s", creditRes.Code, creditRes.Body.String())
	}

	placeReq := httptest.NewRequest(http.MethodPost, "/api/v1/bets/place", strings.NewReader(`{"userId":"u-bet-http-deadheat-invalid","marketId":"m:local:001","selectionId":"home","stakeCents":1000,"odds":2.0,"idempotencyKey":"bet-settle-deadheat-invalid"}`))
	placeRes := httptest.NewRecorder()
	handler.ServeHTTP(placeRes, placeReq)
	if placeRes.Code != http.StatusOK {
		t.Fatalf("place bet failed: status=%d body=%s", placeRes.Code, placeRes.Body.String())
	}

	var placed map[string]any
	if err := json.Unmarshal(placeRes.Body.Bytes(), &placed); err != nil {
		t.Fatalf("decode placed bet response: %v", err)
	}
	betID := placed["betId"].(string)

	settleReq := httptest.NewRequest(http.MethodPost, "/api/v1/admin/bets/"+betID+"/lifecycle/settle", strings.NewReader(`{"winningSelectionId":"home","deadHeatFactor":1.5,"reason":"invalid dead heat"}`))
	settleReq.Header.Set("X-Admin-Role", "admin")
	settleRes := httptest.NewRecorder()
	handler.ServeHTTP(settleRes, settleReq)
	if settleRes.Code != http.StatusBadRequest {
		t.Fatalf("expected 400 for invalid deadHeatFactor, got %d body=%s", settleRes.Code, settleRes.Body.String())
	}
}

func TestAdminCancelBetRequiresAdminRole(t *testing.T) {
	mux := http.NewServeMux()
	RegisterRoutes(mux, "gateway")
	handler := httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))

	req := httptest.NewRequest(http.MethodPost, "/api/v1/admin/bets/b:local:000001/lifecycle/cancel", strings.NewReader(`{}`))
	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	if res.Code != http.StatusForbidden {
		t.Fatalf("expected status 403, got %d body=%s", res.Code, res.Body.String())
	}
}
