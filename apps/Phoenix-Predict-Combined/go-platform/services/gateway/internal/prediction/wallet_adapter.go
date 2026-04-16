package prediction

// WalletAdapter is the prediction platform's view of the wallet service.
// Kept as an interface to avoid coupling prediction to the wallet package.
type WalletAdapter interface {
	// Debit removes funds from a user's wallet (e.g., when placing an order).
	// Returns an error if the user has insufficient balance.
	Debit(userID string, amountCents int64, idempotencyKey, reason string) error

	// Credit adds funds to a user's wallet (e.g., when a settlement pays out).
	Credit(userID string, amountCents int64, idempotencyKey, reason string) error

	// Balance returns the user's current balance in cents.
	Balance(userID string) int64
}

// NoopWallet is a WalletAdapter that does nothing — used when wallet service
// is not available (e.g., in memory-only test mode). All operations succeed.
type NoopWallet struct{}

func (NoopWallet) Debit(userID string, amountCents int64, idempotencyKey, reason string) error {
	return nil
}

func (NoopWallet) Credit(userID string, amountCents int64, idempotencyKey, reason string) error {
	return nil
}

func (NoopWallet) Balance(userID string) int64 { return 0 }
