package workers

import (
	"context"
	"log/slog"
	"time"

	"taptrade/gateway/internal/prediction"
)

// RestingOrderExpirer periodically finalizes resting open/partial exchange
// orders whose market is no longer tradeable (closed / settled / voided).
// No market-transition path (admin transition, the MarketCloser worker, or
// the settlement-engine void) finalizes resting orders, so their RG
// committed stake stays counted toward the user's period risk limit and
// their wallet point reservation stays held forever. This reconciling sweep
// is the single place that drains them — robust to whichever path made the
// market inactive, and self-healing for historical orphans.
type RestingOrderExpirer struct {
	svc      *prediction.Service
	interval time.Duration
}

// NewRestingOrderExpirer creates the resting-order expiry worker. It holds
// the Service (not just the repo) because finalizing an order must run the
// tx-scoped reservation release + RG reconcile, which lives on the service
// (same pattern as the SMM worker).
func NewRestingOrderExpirer(svc *prediction.Service, interval time.Duration) *RestingOrderExpirer {
	return &RestingOrderExpirer{svc: svc, interval: interval}
}

// Run starts the expiry loop. Blocks until the context is cancelled.
func (w *RestingOrderExpirer) Run(ctx context.Context) {
	slog.Info("resting-order expirer started", "interval", w.interval)
	ticker := time.NewTicker(w.interval)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			slog.Info("resting-order expirer stopped")
			return
		case <-ticker.C:
			w.tick(ctx)
		}
	}
}

func (w *RestingOrderExpirer) tick(ctx context.Context) {
	expired, failed, err := w.svc.SweepExpiredRestingOrders(ctx)
	if err != nil {
		slog.Warn("resting-order expirer: sweep failed", "error", err)
		return
	}
	if expired > 0 || failed > 0 {
		slog.Info("resting-order expirer: swept",
			"expired", expired, "failed", failed)
	}
}
