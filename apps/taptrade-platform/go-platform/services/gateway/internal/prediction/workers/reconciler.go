package workers

import (
	"context"
	"log/slog"
	"time"

	"taptrade/gateway/internal/prediction"
)

// Reconciler runs the two-phase collateral check across all open
// order-book markets on a fixed cadence. Per the engine plan, default
// cadence is 15 min/market plus an end-of-day full sweep; in practice we
// implement a single periodic sweep — the EOD sweep falls out for free
// when no markets are excluded.
//
// Phase 1 reads invariants without taking the per-market advisory lock,
// so healthy markets impose zero contention on matching. Phase 2 only
// runs when drift is suspected, taking the lock just long enough to
// confirm and write a forensics ledger row.
type Reconciler struct {
	repo     prediction.Repository
	interval time.Duration
	metrics  *prediction.Metrics // optional; nil-safe
}

// NewReconciler creates a new reconciliation worker. Interval is per-tick;
// 15 minutes matches the engine plan's confirmed default.
func NewReconciler(repo prediction.Repository, interval time.Duration) *Reconciler {
	return &Reconciler{repo: repo, interval: interval}
}

// SetMetrics wires the prediction-domain Prometheus counter registry. A
// nil receiver is safe — the Record* methods no-op. Wired from main.go
// after Reconciler construction.
func (w *Reconciler) SetMetrics(m *prediction.Metrics) {
	w.metrics = m
}

// Run starts the reconciliation loop. Blocks until ctx is cancelled.
func (w *Reconciler) Run(ctx context.Context) {
	slog.Info("reconciler started", "interval", w.interval)
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			slog.Info("reconciler stopped")
			return
		case <-ticker.C:
			w.tick(ctx)
		}
	}
}

func (w *Reconciler) tick(ctx context.Context) {
	exchangeRepo, ok := w.repo.(prediction.ExchangeRepository)
	if !ok {
		// Memory-mode repo; nothing to reconcile.
		return
	}
	// Pull open markets. This relies on the existing ListMarkets filter to
	// scope to status='open'. Only order-book markets carry a collateral
	// pool, so we inspect ExecutionMode below.
	statusOpen := prediction.MarketStatusOpen
	markets, _, err := w.repo.ListMarkets(ctx, prediction.MarketFilter{
		Status:   &statusOpen,
		Page:     1,
		PageSize: 1000, // enough for any realistic active market count
		// Collateral invariants must hold on every market, including ones the
		// public list hides behind the launch-safety scrub.
		IncludeLaunchScrubbed: true,
	})
	if err != nil {
		slog.Warn("reconciler: list markets failed", "error", err)
		return
	}
	for _, m := range markets {
		if m.ExecutionMode != prediction.ExecutionModeOrderBook {
			continue
		}
		report, err := exchangeRepo.ReconcileMarket(ctx, m.ID)
		if err != nil {
			slog.Warn("reconciler: market check failed", "market", m.Ticker, "error", err)
			// "error" outcome rolls up across all failing markets in the
			// tick; the per-market detail is in the slog stream above.
			w.metrics.RecordReconcilerRun("error")
			continue
		}
		if report.DriftCents == 0 && !report.YesNoMismatch {
			w.metrics.RecordReconcilerRun("clean")
			continue
		}
		// Drift surfaced. The repo already wrote a ledger row in phase 2
		// (if confirmed) and emitted-via-log here for ops visibility.
		// Real production deployment hooks this slog stream into the
		// existing alerting path (Datadog / PagerDuty / Slack) so on-call
		// is paged on non-zero drift.
		slog.Error("reconciler: collateral drift detected",
			"market", m.Ticker,
			"market_id", m.ID,
			"drift_cents", report.DriftCents,
			// Authoritative: drift = ledger_sum - actual_pool.
			"ledger_sum", report.LedgerSumCents,
			"actual_pool", report.ActualPoolCents,
			// Forensic position aggregates (don't drive drift, but help
			// bisect ledger-vs-positions disagreements when both surface
			// at once).
			"position_yes_pool", report.ExpectedYesPool,
			"position_no_pool", report.ExpectedNoPool,
			"yes_no_mismatch", report.YesNoMismatch,
			"adjustment_written", report.AdjustmentWritten,
		)
		w.metrics.RecordReconcilerRun("drift")
		w.metrics.RecordDriftEvent(m.ID)
	}
}
