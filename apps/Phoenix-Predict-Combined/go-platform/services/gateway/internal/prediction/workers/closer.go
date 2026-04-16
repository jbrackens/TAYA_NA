package workers

import (
	"context"
	"log/slog"
	"time"

	"phoenix-revival/gateway/internal/prediction"
)

// MarketCloser polls for markets past their close_at time and transitions them to 'closed'.
type MarketCloser struct {
	repo     prediction.Repository
	interval time.Duration
}

// NewMarketCloser creates a new market closer worker.
func NewMarketCloser(repo prediction.Repository, interval time.Duration) *MarketCloser {
	return &MarketCloser{repo: repo, interval: interval}
}

// Run starts the market closer loop. Blocks until context is cancelled.
func (w *MarketCloser) Run(ctx context.Context) {
	slog.Info("market closer started", "interval", w.interval)
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			slog.Info("market closer stopped")
			return
		case <-ticker.C:
			w.tick(ctx)
		}
	}
}

func (w *MarketCloser) tick(ctx context.Context) {
	markets, err := w.repo.ListMarketsToClose(ctx)
	if err != nil {
		slog.Warn("market closer: failed to list markets", "error", err)
		return
	}

	for _, m := range markets {
		if err := prediction.TransitionMarket(&m, prediction.MarketStatusClosed); err != nil {
			slog.Warn("market closer: invalid transition", "market", m.Ticker, "error", err)
			continue
		}

		if err := w.repo.UpdateMarketStatus(ctx, m.ID, prediction.MarketStatusClosed); err != nil {
			slog.Warn("market closer: failed to update", "market", m.Ticker, "error", err)
			continue
		}

		reason := "market close time reached"
		w.repo.CreateLifecycleEvent(ctx, &prediction.LifecycleEvent{
			MarketID:   m.ID,
			EventType:  "closed",
			ActorType:  "system",
			Reason:     &reason,
			OccurredAt: time.Now().UTC(),
		})

		slog.Info("market closer: market closed", "ticker", m.Ticker)
	}

	if len(markets) > 0 {
		slog.Info("market closer: closed markets", "count", len(markets))
	}
}
