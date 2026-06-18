package alphacashier

import (
	"context"
	"log/slog"
	"time"
)

// reorgWatcherListLimit bounds how many credited deposits one tick re-checks.
const reorgWatcherListLimit = 500

// ReorgWatcher periodically re-verifies the finality of credited deposits and
// freezes any whose backing transaction was orphaned by a chain reorg (audit
// A2-03). It is the interim guard that wires the otherwise-uncalled
// CheckDepositFinality / FreezeReorgedDeposit together — same shape as the
// prediction MarketCloser worker: a Run loop driving a tick.
//
// This is a safety net for the live custodial rail until the production-grade
// services/bridge-watcher (P3-09) lands; it is started only when the rail is
// enabled.
type ReorgWatcher struct {
	svc      *Service
	interval time.Duration
}

// NewReorgWatcher creates a reorg finality watcher over the given service.
func NewReorgWatcher(svc *Service, interval time.Duration) *ReorgWatcher {
	return &ReorgWatcher{svc: svc, interval: interval}
}

// Run starts the watcher loop. Blocks until ctx is cancelled.
func (w *ReorgWatcher) Run(ctx context.Context) {
	slog.Info("alpha cashier reorg watcher started", "interval", w.interval)
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			slog.Info("alpha cashier reorg watcher stopped")
			return
		case <-ticker.C:
			w.tick(ctx)
		}
	}
}

func (w *ReorgWatcher) tick(ctx context.Context) {
	svc := w.svc
	// Fail-closed guard: without an EVM client we cannot re-verify finality, and
	// without a ledger we cannot freeze. Skip the tick rather than crash — the
	// rail may be enabled before the RPC client connects.
	if svc == nil || svc.evmClient == nil || svc.ledger == nil {
		return
	}

	deposits, err := svc.repo.ListCreditedDepositsForFinality(ctx, reorgWatcherListLimit)
	if err != nil {
		slog.WarnContext(ctx, "alpha cashier reorg watcher: failed to list credited deposits", "error", err)
		return
	}

	finalityConfs := svc.cfg.FinalityConfirmations()
	reorged := 0
	for _, dep := range deposits {
		status, err := CheckDepositFinality(ctx, svc.evmClient, dep.Tx, finalityConfs)
		if err != nil {
			slog.WarnContext(ctx, "alpha cashier reorg watcher: finality check failed",
				"deposit_id", dep.DepositID, "tx_hash", dep.Tx.TxHash, "error", err)
			continue
		}
		if status != FinalityReorged {
			continue
		}
		if err := svc.FreezeReorgedDeposit(ctx, dep.DepositID, dep.UserID, dep.AmountCents); err != nil {
			slog.ErrorContext(ctx, "alpha cashier reorg watcher: failed to freeze reorged deposit",
				"deposit_id", dep.DepositID, "user_id", dep.UserID, "error", err)
			continue
		}
		reorged++
	}

	if reorged > 0 {
		slog.WarnContext(ctx, "alpha cashier reorg watcher: froze reorged deposits", "count", reorged, "scanned", len(deposits))
	}
}
