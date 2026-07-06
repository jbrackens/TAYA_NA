package http

import (
	"context"
	"encoding/json"
	"log/slog"

	"taptrade/gateway/internal/prediction"
	"taptrade/gateway/internal/webhooks"
)

// webhookEnqueuer is the narrow slice of the webhooks store the HTTP layer
// needs: drop an event into the outbox. The dispatch worker does the actual
// signing + delivery + retries. nil when no DB/webhooks store is wired (the
// helpers below then no-op), so a deploy without webhooks behaves exactly as
// before.
//
// Enqueue is post-commit and fire-and-forget: the trade or settlement has
// already committed by the time these run, so a failed enqueue is logged and
// swallowed — it must never block or fail the prediction event path. The
// transactional-outbox-with-commit upgrade — enqueue inside the same tx for
// exactly-once — is deferred; it would couple this to the prediction
// transaction.
type webhookEnqueuer interface {
	Enqueue(ctx context.Context, eventType string, data json.RawMessage) (int, error)
}

// enqueueOrderFilled records an order.filled webhook for a trade fill.
func enqueueOrderFilled(ctx context.Context, enq webhookEnqueuer, t *prediction.Trade) {
	if enq == nil || t == nil {
		return
	}
	data, err := json.Marshal(buildTradeFillPayload(t))
	if err != nil {
		slog.Warn("webhooks: marshal order.filled failed", "trade", t.ID, "error", err)
		return
	}
	if _, err := enq.Enqueue(ctx, webhooks.EventOrderFilled, data); err != nil {
		slog.Warn("webhooks: enqueue order.filled failed", "trade", t.ID, "error", err)
	}
}

// enqueueMarketResolution records a market.settled or market.voided webhook for
// a terminal lifecycle transition. Non-terminal statuses are ignored, so it is
// safe to call from the shared lifecycle handler on every transition.
func enqueueMarketResolution(ctx context.Context, enq webhookEnqueuer, m *prediction.Market) {
	if enq == nil || m == nil {
		return
	}
	var eventType string
	switch m.Status {
	case prediction.MarketStatusSettled:
		eventType = webhooks.EventMarketSettled
	case prediction.MarketStatusVoided:
		eventType = webhooks.EventMarketVoided
	default:
		return
	}
	data, err := json.Marshal(buildMarketUpdatePayload(m))
	if err != nil {
		slog.Warn("webhooks: marshal market resolution failed", "event", eventType, "market", m.ID, "error", err)
		return
	}
	if _, err := enq.Enqueue(ctx, eventType, data); err != nil {
		slog.Warn("webhooks: enqueue market resolution failed", "event", eventType, "market", m.ID, "error", err)
	}
}
