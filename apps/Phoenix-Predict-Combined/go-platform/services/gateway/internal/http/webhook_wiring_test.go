package http

import (
	"context"
	"encoding/json"
	"testing"
	"time"

	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/gateway/internal/webhooks"
)

type captureEnqueuer struct {
	calls []struct {
		eventType string
		data      json.RawMessage
	}
	err error
}

func (c *captureEnqueuer) Enqueue(_ context.Context, eventType string, data json.RawMessage) (int, error) {
	c.calls = append(c.calls, struct {
		eventType string
		data      json.RawMessage
	}{eventType, data})
	return len(c.calls), c.err
}

func TestEnqueueOrderFilledEmitsEvent(t *testing.T) {
	enq := &captureEnqueuer{}
	trade := &prediction.Trade{ID: "t1", MarketID: "m1", Side: "yes", PriceCents: 60, Quantity: 10, TradedAt: time.Now()}

	enqueueOrderFilled(context.Background(), enq, trade)

	if len(enq.calls) != 1 {
		t.Fatalf("want 1 enqueue, got %d", len(enq.calls))
	}
	if enq.calls[0].eventType != webhooks.EventOrderFilled {
		t.Fatalf("event type = %q, want %q", enq.calls[0].eventType, webhooks.EventOrderFilled)
	}
	var payload map[string]any
	if err := json.Unmarshal(enq.calls[0].data, &payload); err != nil {
		t.Fatalf("payload not valid json: %v", err)
	}
	if payload["tradeId"] != "t1" || payload["marketId"] != "m1" {
		t.Fatalf("payload missing trade coords: %+v", payload)
	}
}

func TestEnqueueMarketResolutionEmitsSettledAndVoided(t *testing.T) {
	cases := []struct {
		status prediction.MarketStatus
		want   string
	}{
		{prediction.MarketStatusSettled, webhooks.EventMarketSettled},
		{prediction.MarketStatusVoided, webhooks.EventMarketVoided},
	}
	for _, tc := range cases {
		enq := &captureEnqueuer{}
		m := &prediction.Market{ID: "m1", Ticker: "TICK", Status: tc.status}
		enqueueMarketResolution(context.Background(), enq, m)
		if len(enq.calls) != 1 || enq.calls[0].eventType != tc.want {
			t.Fatalf("status %s: got %+v, want one %q", tc.status, enq.calls, tc.want)
		}
	}
}

func TestEnqueueMarketResolutionIgnoresNonTerminal(t *testing.T) {
	enq := &captureEnqueuer{}
	for _, st := range []prediction.MarketStatus{
		prediction.MarketStatusOpen, prediction.MarketStatusHalted, prediction.MarketStatusClosed,
	} {
		enqueueMarketResolution(context.Background(), enq, &prediction.Market{ID: "m1", Status: st})
	}
	if len(enq.calls) != 0 {
		t.Fatalf("non-terminal transitions should not enqueue, got %+v", enq.calls)
	}
}

func TestEnqueueHelpersNilSafe(t *testing.T) {
	// A nil enqueuer (no DB / webhooks disabled) must not panic.
	enqueueOrderFilled(context.Background(), nil, &prediction.Trade{ID: "t1"})
	enqueueMarketResolution(context.Background(), nil, &prediction.Market{Status: prediction.MarketStatusSettled})
}
