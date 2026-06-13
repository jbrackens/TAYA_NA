package prediction

import (
	"context"
	"database/sql"
	"math"
	"time"
)

// WalletAdapter is the prediction platform's view of the wallet service.
// Kept as an interface to avoid coupling prediction to the wallet package.
type WalletAdapter interface {
	// Debit removes funds from a user's wallet (e.g., when placing an order).
	// Returns an error if the user has insufficient balance.
	Debit(ctx context.Context, userID string, amountCents int64, idempotencyKey, reason string) error

	// Credit adds funds to a user's wallet (e.g., when a settlement pays out).
	Credit(ctx context.Context, userID string, amountCents int64, idempotencyKey, reason string) error

	// Balance returns the user's current balance in cents. Implementations
	// should return math.MaxInt64 to signal "unlimited" when they don't track
	// balances (see NoopWallet), so service-layer balance checks short-circuit
	// instead of incorrectly rejecting valid orders.
	Balance(ctx context.Context, userID string) int64
}

// TxWalletAdapter is an optional wallet capability for callers that need to
// participate in an externally managed SQL transaction.
type TxWalletAdapter interface {
	WalletAdapter
	BeginTx(ctx context.Context) (*sql.Tx, error)
	DebitWithTx(ctx context.Context, tx *sql.Tx, userID string, amountCents int64, idempotencyKey, reason string) error
	CreditWithTx(ctx context.Context, tx *sql.Tx, userID string, amountCents int64, idempotencyKey, reason string) error
}

// ExchangeWalletAdapter is the wallet capability surface required by the
// binary exchange engine. It extends TxWalletAdapter with reservation
// primitives (Hold/Capture/Release variants) and a READ COMMITTED tx opener
// suitable for matching under a per-market advisory lock.
//
// SERIALIZABLE adds retry overhead without benefit when contending writers
// are already serialized by the advisory lock; matching uses READ COMMITTED.
//
// Reservation methods take (refType, refID) instead of a reservation ID so
// that lookups stay idempotent across retries; the prediction engine uses
// refType="prediction_order" and refID=order.id for buy reservations.
type ExchangeWalletAdapter interface {
	TxWalletAdapter

	// BeginExchangeTx opens a transaction at READ COMMITTED isolation,
	// suitable for matching after the caller has taken pg_advisory_xact_lock
	// on the market.
	BeginExchangeTx(ctx context.Context) (*sql.Tx, error)

	// HoldWithTx reserves amountCents from the user's available balance
	// inside the caller's tx. Idempotent on (refType, refID).
	HoldWithTx(ctx context.Context, tx *sql.Tx, userID string, amountCents int64, refType, refID string, expiresIn time.Duration) error

	// CaptureReservationWithTx debits amountCents from the user's wallet,
	// drawing against the reservation identified by (refType, refID).
	// Cumulative captures across calls cannot exceed the reservation's
	// original amount. captureKey must be unique per call (e.g.,
	// "prediction_fill:<trade_id>") for ledger idempotency.
	CaptureReservationWithTx(ctx context.Context, tx *sql.Tx, refType, refID string, amountCents int64, captureKey string) error

	// ReleaseReservationWithTx releases the uncaptured remainder of the
	// reservation. Idempotent: releasing an already-released or
	// already-captured reservation is a no-op.
	ReleaseReservationWithTx(ctx context.Context, tx *sql.Tx, refType, refID string) error
}

// NoopWallet is a WalletAdapter that does nothing — used when the wallet
// service is not available (e.g. in tests that don't exercise wallet behavior).
// All mutations succeed silently and Balance reports MaxInt64 so balance
// checks in the service layer always pass.
type NoopWallet struct{}

func (NoopWallet) Debit(_ context.Context, userID string, amountCents int64, idempotencyKey, reason string) error {
	return nil
}

func (NoopWallet) Credit(_ context.Context, userID string, amountCents int64, idempotencyKey, reason string) error {
	return nil
}

// Balance returns math.MaxInt64 so that `balance < totalCost` is always false
// and the service-layer pre-check lets the order through. The noop adapter
// doesn't track real balances, so it cannot meaningfully reject anyone.
func (NoopWallet) Balance(_ context.Context, userID string) int64 { return math.MaxInt64 }
