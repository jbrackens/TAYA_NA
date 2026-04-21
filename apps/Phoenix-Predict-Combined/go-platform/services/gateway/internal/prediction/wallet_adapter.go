package prediction

import (
	"context"
	"database/sql"
	"math"
)

// WalletAdapter is the prediction platform's view of the wallet service.
// Kept as an interface to avoid coupling prediction to the wallet package.
type WalletAdapter interface {
	// Debit removes funds from a user's wallet (e.g., when placing an order).
	// Returns an error if the user has insufficient balance.
	Debit(userID string, amountCents int64, idempotencyKey, reason string) error

	// Credit adds funds to a user's wallet (e.g., when a settlement pays out).
	Credit(userID string, amountCents int64, idempotencyKey, reason string) error

	// Balance returns the user's current balance in cents. Implementations
	// should return math.MaxInt64 to signal "unlimited" when they don't track
	// balances (see NoopWallet), so service-layer balance checks short-circuit
	// instead of incorrectly rejecting valid orders.
	Balance(userID string) int64
}

// TxWalletAdapter is an optional wallet capability for callers that need to
// participate in an externally managed SQL transaction.
type TxWalletAdapter interface {
	WalletAdapter
	BeginTx(ctx context.Context) (*sql.Tx, error)
	DebitWithTx(ctx context.Context, tx *sql.Tx, userID string, amountCents int64, idempotencyKey, reason string) error
	CreditWithTx(ctx context.Context, tx *sql.Tx, userID string, amountCents int64, idempotencyKey, reason string) error
}

// NoopWallet is a WalletAdapter that does nothing — used when the wallet
// service is not available (e.g. in tests that don't exercise wallet behavior).
// All mutations succeed silently and Balance reports MaxInt64 so balance
// checks in the service layer always pass.
type NoopWallet struct{}

func (NoopWallet) Debit(userID string, amountCents int64, idempotencyKey, reason string) error {
	return nil
}

func (NoopWallet) Credit(userID string, amountCents int64, idempotencyKey, reason string) error {
	return nil
}

// Balance returns math.MaxInt64 so that `balance < totalCost` is always false
// and the service-layer pre-check lets the order through. The noop adapter
// doesn't track real balances, so it cannot meaningfully reject anyone.
func (NoopWallet) Balance(userID string) int64 { return math.MaxInt64 }
