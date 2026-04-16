package workers

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"phoenix-revival/gateway/internal/prediction"
	"phoenix-revival/gateway/internal/prediction/feed"
)

// AutoSettler polls for closed markets with automated settlement sources
// and resolves them using the appropriate feed adapter.
type AutoSettler struct {
	repo     prediction.Repository
	feeds    *feed.Registry
	engine   *prediction.SettlementEngine
	interval time.Duration
}

// NewAutoSettler creates a new auto-settlement worker.
func NewAutoSettler(repo prediction.Repository, feeds *feed.Registry, interval time.Duration) *AutoSettler {
	return &AutoSettler{
		repo:     repo,
		feeds:    feeds,
		engine:   prediction.NewSettlementEngine(repo),
		interval: interval,
	}
}

// Run starts the auto-settler loop. Blocks until context is cancelled.
func (w *AutoSettler) Run(ctx context.Context) {
	slog.Info("auto-settler started", "interval", w.interval)
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			slog.Info("auto-settler stopped")
			return
		case <-ticker.C:
			w.tick(ctx)
		}
	}
}

func (w *AutoSettler) tick(ctx context.Context) {
	markets, err := w.repo.ListMarketsToSettle(ctx)
	if err != nil {
		slog.Warn("auto-settler: failed to list markets", "error", err)
		return
	}

	for _, m := range markets {
		adapter := w.feeds.Get(m.SettlementSourceKey)
		if adapter == nil {
			slog.Warn("auto-settler: no adapter for source", "market", m.Ticker, "source", m.SettlementSourceKey)
			continue
		}

		if !adapter.CanSettle(m.SettlementRule, m.SettlementParams) {
			// This adapter can't auto-settle (e.g., manual adapter) — skip
			continue
		}

		result, err := adapter.FetchResult(ctx, m.SettlementRule, m.SettlementParams)
		if err != nil {
			slog.Warn("auto-settler: fetch failed", "market", m.Ticker, "error", err)
			continue
		}
		if result == nil {
			slog.Debug("auto-settler: result not yet available", "market", m.Ticker)
			continue
		}

		// Settle the market
		req := prediction.ResolveMarketRequest{
			Result:            prediction.MarketResult(result.Outcome),
			AttestationSource: adapter.Name(),
			AttestationData:   result.SourceData,
		}

		settlement, payouts, err := w.engine.ResolveMarket(ctx, req, m.ID, nil)
		if err != nil {
			slog.Warn("auto-settler: settlement failed", "market", m.Ticker, "error", err)
			continue
		}

		slog.Info("auto-settler: market settled",
			"ticker", m.Ticker,
			"result", result.Outcome,
			"payouts", len(payouts),
			"total_payout_cents", settlement.TotalPayoutCents,
		)

		// TODO: Credit wallets for each payout
		// for _, p := range payouts {
		//     walletService.Credit(p.UserID, p.PayoutCents, "prediction_settlement", m.ID)
		// }
	}
}

// settleParamsJSON is a helper for logging settlement params.
func settleParamsJSON(params json.RawMessage) string {
	if params == nil {
		return "{}"
	}
	return string(params)
}
