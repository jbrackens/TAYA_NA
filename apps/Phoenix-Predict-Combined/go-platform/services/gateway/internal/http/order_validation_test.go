package http

import (
	"bytes"
	"encoding/json"
	stdhttp "net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"phoenix-revival/gateway/internal/prediction"
)

// stubMarketBroadcaster is a no-op marketUpdateBroadcaster for tests
// that don't care about WS notifications.
type stubMarketBroadcaster struct{}

func (stubMarketBroadcaster) NotifyPredictionMarketUpdate(string, interface{})   {}
func (stubMarketBroadcaster) NotifyPredictionTrade(string, interface{})           {}
func (stubMarketBroadcaster) NotifyPredictionOrderBookUpdate(string, interface{}) {}
func (stubMarketBroadcaster) NotifyPortfolioUpdate(string, interface{})           {}
func (stubMarketBroadcaster) NotifyWalletUpdate(string, interface{})              {}

const orderTestUserID = "u-test"

// postOrder sends a POST /api/v1/orders with the given body and the
// X-User-ID fallback header (which userIDFromRequest reads when no
// context user is present). registerOrderRoutes is wired against a
// service with nil repo — these tests should reject at the validation
// gate, well before any repo call.
func postOrder(t *testing.T, body interface{}) *httptest.ResponseRecorder {
	t.Helper()
	buf, _ := json.Marshal(body)
	req := httptest.NewRequest(stdhttp.MethodPost, "/api/v1/orders", bytes.NewReader(buf))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-User-ID", orderTestUserID)
	rec := httptest.NewRecorder()

	mux := stdhttp.NewServeMux()
	registerOrderRoutes(mux, prediction.NewService(nil, nil), stubMarketBroadcaster{}, nil)
	mux.ServeHTTP(rec, req)
	return rec
}

func TestPlaceOrderRejectsMissingMarketID(t *testing.T) {
	rec := postOrder(t, map[string]any{
		"side":      "yes",
		"action":    "buy",
		"orderType": "market",
		"quantity":  1,
	})
	if rec.Code != stdhttp.StatusBadRequest {
		t.Fatalf("want 400, got %d body=%s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "marketId") {
		t.Fatalf("error should mention marketId; got %s", rec.Body.String())
	}
}

func TestPlaceOrderRejectsMissingAction(t *testing.T) {
	// Regression for ISSUE-009: missing `action` used to surface as a
	// PostgreSQL CHECK constraint error
	//   "violates check constraint prediction_orders_action_check"
	// rather than a clean validation 400. This test guards the gate.
	rec := postOrder(t, map[string]any{
		"marketId":  "00000000-0000-0000-0000-000000000001",
		"side":      "yes",
		"orderType": "market",
		"quantity":  1,
	})
	if rec.Code != stdhttp.StatusBadRequest {
		t.Fatalf("want 400, got %d body=%s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "action") {
		t.Fatalf("error should mention action; got %s", rec.Body.String())
	}
	if strings.Contains(rec.Body.String(), "check constraint") {
		t.Fatalf("validation should reject before DB CHECK; got %s", rec.Body.String())
	}
}

func TestPlaceOrderRejectsBadAction(t *testing.T) {
	rec := postOrder(t, map[string]any{
		"marketId":  "00000000-0000-0000-0000-000000000001",
		"side":      "yes",
		"action":    "hodl",
		"orderType": "market",
		"quantity":  1,
	})
	if rec.Code != stdhttp.StatusBadRequest {
		t.Fatalf("want 400, got %d body=%s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "action") {
		t.Fatalf("error should mention action; got %s", rec.Body.String())
	}
}

func TestPlaceOrderRejectsBadSide(t *testing.T) {
	rec := postOrder(t, map[string]any{
		"marketId":  "00000000-0000-0000-0000-000000000001",
		"side":      "maybe",
		"action":    "buy",
		"orderType": "market",
		"quantity":  1,
	})
	if rec.Code != stdhttp.StatusBadRequest {
		t.Fatalf("want 400, got %d body=%s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "side") {
		t.Fatalf("error should mention side; got %s", rec.Body.String())
	}
}

func TestPlaceOrderRejectsBadOrderType(t *testing.T) {
	rec := postOrder(t, map[string]any{
		"marketId":  "00000000-0000-0000-0000-000000000001",
		"side":      "yes",
		"action":    "buy",
		"orderType": "stop-loss",
		"quantity":  1,
	})
	if rec.Code != stdhttp.StatusBadRequest {
		t.Fatalf("want 400, got %d body=%s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "orderType") {
		t.Fatalf("error should mention orderType; got %s", rec.Body.String())
	}
}

func TestPlaceOrderRejectsZeroQuantity(t *testing.T) {
	rec := postOrder(t, map[string]any{
		"marketId":  "00000000-0000-0000-0000-000000000001",
		"side":      "yes",
		"action":    "buy",
		"orderType": "market",
		"quantity":  0,
	})
	if rec.Code != stdhttp.StatusBadRequest {
		t.Fatalf("want 400, got %d body=%s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "quantity") {
		t.Fatalf("error should mention quantity; got %s", rec.Body.String())
	}
}

func TestPlaceOrderLimitRequiresPriceCents(t *testing.T) {
	rec := postOrder(t, map[string]any{
		"marketId":  "00000000-0000-0000-0000-000000000001",
		"side":      "yes",
		"action":    "buy",
		"orderType": "limit",
		"quantity":  1,
	})
	if rec.Code != stdhttp.StatusBadRequest {
		t.Fatalf("want 400, got %d body=%s", rec.Code, rec.Body.String())
	}
	if !strings.Contains(rec.Body.String(), "priceCents") {
		t.Fatalf("error should mention priceCents; got %s", rec.Body.String())
	}
}

func TestPlaceOrderLimitRejectsOutOfRangePriceCents(t *testing.T) {
	for _, p := range []int{0, 100, -1, 200} {
		body := map[string]any{
			"marketId":   "00000000-0000-0000-0000-000000000001",
			"side":       "yes",
			"action":     "buy",
			"orderType":  "limit",
			"quantity":   1,
			"priceCents": p,
		}
		rec := postOrder(t, body)
		if rec.Code != stdhttp.StatusBadRequest {
			t.Fatalf("priceCents=%d: want 400, got %d body=%s", p, rec.Code, rec.Body.String())
		}
	}
}
