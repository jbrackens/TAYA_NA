package store

import "context"

// PaymentProvider is the checkout-provider seam (STORE_AND_PAYMENTS.md §6).
// DemoProvider implements it today; the future Stripe integration implements
// the same three methods with Stripe Checkout Sessions and nothing about the
// store, wallet, or ledger changes.
//
// Trust boundary: points are only credited by server-side fulfillment after a
// server-verified confirmation. Providers map confirmations to outcomes; they
// never credit points themselves.
type PaymentProvider interface {
	// CreateCheckoutSession registers a checkout attempt with the provider
	// and returns provider session details for the client.
	CreateCheckoutSession(ctx context.Context, req CheckoutSessionRequest) (CheckoutSession, error)
	// GetCheckoutStatus asks the provider for the current session state.
	GetCheckoutStatus(ctx context.Context, providerSessionID string) (CheckoutStatus, error)
	// HandlePaymentConfirmation validates a provider confirmation (demo
	// confirm call or verified webhook event) and maps it to a purchase
	// outcome. It never credits points itself.
	HandlePaymentConfirmation(ctx context.Context, conf ConfirmationInput) (ConfirmationResult, error)
}
