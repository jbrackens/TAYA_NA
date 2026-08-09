package http

// Notification inbox contract: per-user isolation, unread accounting,
// ownership-scoped mark-read, and points-only language in every rendered
// settlement message.

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"taptrade/gateway/internal/prediction"
	"taptrade/platform/transport/httpx"
)

func notifMux(store notificationStore) http.Handler {
	mux := http.NewServeMux()
	registerNotificationRoutes(mux, store)
	return httpx.Chain(mux, httpx.RequestID(), httpx.Recovery(nil))
}

func getNotifications(t *testing.T, h http.Handler, userID string) (items []userNotification, unread int) {
	t.Helper()
	req := playerWalletContext(httptest.NewRequest(http.MethodGet, "/api/v1/notifications", nil), userID)
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("GET notifications: expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	var payload struct {
		Items       []userNotification `json:"items"`
		UnreadCount int                `json:"unreadCount"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &payload); err != nil {
		t.Fatalf("decode: %v", err)
	}
	return payload.Items, payload.UnreadCount
}

func TestNotificationInboxIsolationAndMarkRead(t *testing.T) {
	store := newNotificationStore(nil) // memory
	h := notifMux(store)

	mkID := "mkt-notif-1"
	seed := []userNotification{
		{UserID: "u-a", Kind: "settlement_paid", Title: "Settled YES: +2000 PTS", Body: "b1", MarketID: &mkID},
		{UserID: "u-a", Kind: "settlement_closed", Title: "Settled NO: T-1", Body: "b2", MarketID: &mkID},
		{UserID: "u-b", Kind: "market_voided", Title: "Market voided: T-1", Body: "b3", MarketID: &mkID},
	}
	if err := store.InsertBatch(context.Background(), seed); err != nil {
		t.Fatalf("insert: %v", err)
	}

	itemsA, unreadA := getNotifications(t, h, "u-a")
	if len(itemsA) != 2 || unreadA != 2 {
		t.Fatalf("u-a: expected 2 items / 2 unread, got %d/%d", len(itemsA), unreadA)
	}
	itemsB, unreadB := getNotifications(t, h, "u-b")
	if len(itemsB) != 1 || unreadB != 1 {
		t.Fatalf("u-b: expected 1 item / 1 unread, got %d/%d", len(itemsB), unreadB)
	}

	// Ownership: u-a marking u-b's id changes nothing.
	body := strings.NewReader(`{"ids":[` + jsonInt(itemsB[0].ID) + `]}`)
	req := playerWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/notifications/read", body), "u-a")
	res := httptest.NewRecorder()
	h.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("cross-user mark-read: expected 200, got %d", res.Code)
	}
	if _, unread := getNotifications(t, h, "u-b"); unread != 1 {
		t.Fatalf("u-b unread changed by u-a's mark-read")
	}

	// Mark-all for u-a clears the badge; u-b untouched.
	req = playerWalletContext(httptest.NewRequest(http.MethodPost, "/api/v1/notifications/read", strings.NewReader(`{"all":true}`)), "u-a")
	res = httptest.NewRecorder()
	h.ServeHTTP(res, req)
	if res.Code != http.StatusOK {
		t.Fatalf("mark-all: expected 200, got %d body=%s", res.Code, res.Body.String())
	}
	var marked struct {
		MarkedRead int `json:"markedRead"`
	}
	_ = json.Unmarshal(res.Body.Bytes(), &marked)
	if marked.MarkedRead != 2 {
		t.Fatalf("mark-all: expected 2 marked, got %d", marked.MarkedRead)
	}
	if _, unread := getNotifications(t, h, "u-a"); unread != 0 {
		t.Fatalf("u-a unread should be 0 after mark-all, got %d", unread)
	}
	if _, unread := getNotifications(t, h, "u-b"); unread != 1 {
		t.Fatalf("u-b unread should stay 1, got %d", unread)
	}
}

func jsonInt(v int64) string {
	b, _ := json.Marshal(v)
	return string(b)
}

func TestSettlementPayoutsHandlerWritesInboxRows(t *testing.T) {
	store := newNotificationStore(nil)
	result := prediction.MarketResultYes
	market := &prediction.Market{
		ID: "mkt-9", Ticker: "T-9", Title: "Will it rain tomorrow?",
		Status: prediction.MarketStatusSettled, Result: &result,
	}
	handler := makeSettlementPayoutsHandler(
		store, nil,
		func(context.Context, string) int64 { return 0 },
		nil, nil,
	)
	handler(market, "settled", []prediction.Payout{
		{UserID: "alice", MarketID: "mkt-9", Side: prediction.OrderSideYes, Quantity: 20, PayoutPoints: 2000, PnlPoints: 1000},
		{UserID: "bob", MarketID: "mkt-9", Side: prediction.OrderSideNo, Quantity: 15, PayoutPoints: 0, PnlPoints: -750},
	})

	aliceItems, _ := store.List(context.Background(), "alice", 10)
	if len(aliceItems) != 1 || aliceItems[0].Kind != "settlement_paid" {
		t.Fatalf("alice: expected one settlement_paid row, got %+v", aliceItems)
	}
	if !strings.Contains(aliceItems[0].Title, "+2000 PTS") {
		t.Errorf("alice title should carry the payout, got %q", aliceItems[0].Title)
	}
	if aliceItems[0].Payload["type"] != "settlement" {
		t.Errorf("payload type: want settlement, got %v", aliceItems[0].Payload["type"])
	}
	bobItems, _ := store.List(context.Background(), "bob", 10)
	if len(bobItems) != 1 || bobItems[0].Kind != "settlement_closed" {
		t.Fatalf("bob: expected one settlement_closed row, got %+v", bobItems)
	}
}

func TestSettlementNotificationTextIsPointNative(t *testing.T) {
	result := prediction.MarketResultYes
	market := &prediction.Market{
		ID: "m", Ticker: "T-1", Title: "Sample market",
		Result: &result,
	}
	cases := []struct {
		kind   string
		payout prediction.Payout
	}{
		{"settled", prediction.Payout{Side: prediction.OrderSideYes, Quantity: 10, PayoutPoints: 1000, PnlPoints: 400}},
		{"settled", prediction.Payout{Side: prediction.OrderSideNo, Quantity: 5, PayoutPoints: 0, PnlPoints: -300}},
		{"voided", prediction.Payout{Side: prediction.OrderSideYes, Quantity: 8, PayoutPoints: 240}},
	}
	for _, tc := range cases {
		_, title, body := settlementNotificationText(market, tc.kind, tc.payout)
		text := strings.ToLower(title + " " + body)
		for _, retired := range []string{"money", "cash", "deposit", "withdraw", "crypto", "fiat", "redeem", "prize", "bet ", "winnings"} {
			if strings.Contains(text, retired) {
				t.Errorf("%s notification leaked retired term %q: %q / %q", tc.kind, retired, title, body)
			}
		}
		if !strings.Contains(text, "pts") {
			t.Errorf("%s notification should speak in PTS: %q / %q", tc.kind, title, body)
		}
	}
}
