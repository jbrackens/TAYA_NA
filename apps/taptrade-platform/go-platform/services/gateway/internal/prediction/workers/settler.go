package workers

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"taptrade/gateway/internal/prediction"
	"taptrade/gateway/internal/prediction/feed"
)

// AutoSettler polls for closed markets with automated settlement sources
// and resolves them using the appropriate feed adapter.
type AutoSettler struct {
	repo            prediction.Repository
	feeds           *feed.Registry
	engine          *prediction.SettlementEngine
	interval        time.Duration
	resolutions     prediction.ResolutionStore
	challengeWindow time.Duration
	health          *feed.HealthTracker
}

// NewAutoSettler creates a new auto-settlement worker.
// wallet can be nil for test mode; real deployments must supply a WalletAdapter
// so settlement payouts actually credit user wallets.
func NewAutoSettler(repo prediction.Repository, feeds *feed.Registry, wallet prediction.WalletAdapter, interval time.Duration) *AutoSettler {
	return &AutoSettler{
		repo:            repo,
		feeds:           feeds,
		engine:          prediction.NewSettlementEngine(repo, wallet),
		interval:        interval,
		challengeWindow: prediction.DefaultChallengeWindow,
		health:          feed.NewHealthTracker(),
	}
}

// SetSettlementAuditor wires the optional settlement audit recorder onto the
// worker's settlement engine so auto-settlements are audited.
func (w *AutoSettler) SetSettlementAuditor(a prediction.SettlementAuditor) {
	w.engine.SetSettlementAuditor(a)
}

// Health returns a snapshot of per-source fetch health (ADR-0003 source-health
// monitoring), surfaced via the admin resolution-sources endpoint.
func (w *AutoSettler) Health() []feed.SourceHealth {
	return w.health.Snapshot()
}

// SetResolutionStore enables the propose -> finalize windowed settle path: the
// worker proposes resolutions and finalizes them after the challenge window.
// Without it, the worker settles immediately (backward-compat).
func (w *AutoSettler) SetResolutionStore(store prediction.ResolutionStore) {
	w.resolutions = store
	w.engine.SetResolutionStore(store)
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
	// Phase A: finalize proposals whose challenge window has elapsed.
	// FinalizeResolution re-checks window + open disputes defensively.
	if w.resolutions != nil {
		ready, err := w.resolutions.ListFinalizableProposals(ctx, time.Now().UTC())
		if err != nil {
			slog.Warn("auto-settler: failed to list finalizable proposals", "error", err)
		}
		for _, p := range ready {
			settlement, payouts, err := w.engine.FinalizeResolution(ctx, p.MarketID, nil)
			if err != nil {
				slog.Warn("auto-settler: finalize failed", "market", p.MarketID, "error", err)
				continue
			}
			slog.Info("auto-settler: market finalized", "market", p.MarketID,
				"payouts", len(payouts), "total_payout_points", settlement.TotalPayoutPoints)
		}
	}

	// Phase B: propose (or, without a store, immediately settle) newly-closed
	// markets that have an automated source result available.
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
			continue
		}
		result, err := adapter.FetchResult(ctx, m.SettlementRule, m.SettlementParams)
		if err != nil {
			// Track per-source health so a degraded source is visible and
			// alertable; the market is left closed for manual settlement
			// rather than silently stalling (ADR-0003 #4 fallback).
			if w.health.RecordFailure(m.SettlementSourceKey, err) {
				slog.Error("auto-settler: resolution source unhealthy — falling back to manual settle",
					"source", m.SettlementSourceKey, "consecutive_failures", feed.DefaultUnhealthyThreshold, "error", err)
			} else {
				slog.Warn("auto-settler: fetch failed", "market", m.Ticker, "error", err)
			}
			continue
		}
		if recovered := w.health.RecordSuccess(m.SettlementSourceKey); recovered {
			slog.Info("auto-settler: resolution source recovered", "source", m.SettlementSourceKey)
		}
		if result == nil {
			slog.Debug("auto-settler: result not yet available", "market", m.Ticker)
			continue
		}
		req := prediction.ResolveMarketRequest{
			Result:            prediction.MarketResult(result.Outcome),
			AttestationSource: adapter.Name(),
			AttestationData:   result.SourceData,
		}
		if w.resolutions != nil {
			proposal, err := w.engine.ProposeResolution(ctx, req, m.ID, nil, w.challengeWindow)
			if err != nil {
				slog.Warn("auto-settler: propose failed", "market", m.Ticker, "error", err)
				continue
			}
			slog.Info("auto-settler: resolution proposed", "ticker", m.Ticker,
				"result", result.Outcome, "challenge_ends_at", proposal.ChallengeEndsAt)
			continue
		}
		settlement, payouts, err := w.engine.ResolveMarket(ctx, req, m.ID, nil)
		if err != nil {
			slog.Warn("auto-settler: settlement failed", "market", m.Ticker, "error", err)
			continue
		}
		slog.Info("auto-settler: market settled", "ticker", m.Ticker, "result", result.Outcome,
			"payouts", len(payouts), "total_payout_points", settlement.TotalPayoutPoints)
	}
}

// settleParamsJSON is a helper for logging settlement params.
func settleParamsJSON(params json.RawMessage) string {
	if params == nil {
		return "{}"
	}
	return string(params)
}
