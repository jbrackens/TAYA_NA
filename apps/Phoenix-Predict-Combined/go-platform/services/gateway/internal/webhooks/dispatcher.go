package webhooks

import (
	"context"
	"fmt"
	"log/slog"
	stdhttp "net/http"
	"time"
)

// DispatcherConfig tunes the background delivery loop.
type DispatcherConfig struct {
	Interval    time.Duration // tick period
	BatchSize   int           // max deliveries claimed per tick
	Lease       time.Duration // visibility timeout while a row is in flight
	MaxAttempts int           // total send attempts before dead-lettering a retryable failure
	BackoffBase time.Duration
	BackoffMax  time.Duration
	Timeout     time.Duration // per-delivery HTTP timeout
}

// DefaultDispatcherConfig returns production-sane defaults: a 5s tick, batches
// of 50, and up to 6 attempts with exponential backoff (2s→4s→…→5m cap), so a
// flapping receiver is retried across ~several minutes before dead-lettering.
func DefaultDispatcherConfig() DispatcherConfig {
	return DispatcherConfig{
		Interval:    5 * time.Second,
		BatchSize:   50,
		Lease:       60 * time.Second,
		MaxAttempts: 6,
		BackoffBase: 2 * time.Second,
		BackoffMax:  5 * time.Minute,
		Timeout:     10 * time.Second,
	}
}

// Dispatcher drains the delivery outbox: claim due rows, POST the HMAC-signed
// event, then mark delivered / reschedule (transient) / dead-letter (permanent
// or attempts exhausted). One instance runs per process as a background loop,
// mirroring the MarketCloser/AutoSettler workers.
type Dispatcher struct {
	store  Store
	client *stdhttp.Client
	cfg    DispatcherConfig
}

// NewDispatcher builds a dispatcher over the store with its own HTTP client
// (per-delivery timeout from cfg).
func NewDispatcher(store Store, cfg DispatcherConfig) *Dispatcher {
	return &Dispatcher{
		store:  store,
		client: &stdhttp.Client{Timeout: cfg.Timeout},
		cfg:    cfg,
	}
}

// Run drives the loop until ctx is cancelled. Blocks; start it in a goroutine.
func (d *Dispatcher) Run(ctx context.Context) {
	slog.Info("webhook dispatcher started", "interval", d.cfg.Interval, "batch", d.cfg.BatchSize)
	ticker := time.NewTicker(d.cfg.Interval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			slog.Info("webhook dispatcher stopped")
			return
		case <-ticker.C:
			d.tick(ctx)
		}
	}
}

// tick processes one batch of due deliveries and returns how many it attempted.
func (d *Dispatcher) tick(ctx context.Context) int {
	due, err := d.store.ClaimDue(ctx, d.cfg.BatchSize, d.cfg.Lease)
	if err != nil {
		slog.Warn("webhook dispatcher: claim failed", "error", err)
		return 0
	}
	for _, dd := range due {
		d.process(ctx, dd)
	}
	return len(due)
}

// process makes one delivery attempt and records the result.
func (d *Dispatcher) process(ctx context.Context, dd DueDelivery) {
	ep := Endpoint{URL: dd.URL, Secret: dd.Secret, Active: true}
	outcome, code, derr := Deliver(ctx, d.client, ep, dd.Event())

	switch outcome {
	case Delivered:
		if err := d.store.MarkDelivered(ctx, dd.ID, code); err != nil {
			slog.Warn("webhook dispatcher: mark delivered failed", "id", dd.ID, "error", err)
		}
	case Retryable:
		attemptsAfter := dd.Attempts + 1
		if attemptsAfter >= d.cfg.MaxAttempts {
			d.deadLetter(ctx, dd, code, derr, "max attempts exhausted")
			return
		}
		next := nowUTC().Add(Backoff(attemptsAfter, d.cfg.BackoffBase, d.cfg.BackoffMax))
		if err := d.store.Reschedule(ctx, dd.ID, next, code, deliveryError(code, derr)); err != nil {
			slog.Warn("webhook dispatcher: reschedule failed", "id", dd.ID, "error", err)
		}
	default: // Permanent
		d.deadLetter(ctx, dd, code, derr, "permanent failure")
	}
}

func (d *Dispatcher) deadLetter(ctx context.Context, dd DueDelivery, code int, derr error, why string) {
	slog.Warn("webhook dispatcher: dead-letter", "id", dd.ID, "url", dd.URL, "event", dd.EventType, "code", code, "reason", why)
	if err := d.store.DeadLetter(ctx, dd.ID, code, deliveryError(code, derr)); err != nil {
		slog.Warn("webhook dispatcher: dead-letter write failed", "id", dd.ID, "error", err)
	}
}

// deliveryError renders a compact last_error: the transport error if any, else
// the HTTP status that triggered the retry/dead-letter.
func deliveryError(code int, err error) string {
	if err != nil {
		return err.Error()
	}
	if code != 0 {
		return fmt.Sprintf("HTTP %d", code)
	}
	return ""
}

// nowUTC is the dispatcher's clock; a tiny indirection keeps it swappable in
// tests without an injected clock interface.
var nowUTC = func() time.Time { return time.Now().UTC() }
