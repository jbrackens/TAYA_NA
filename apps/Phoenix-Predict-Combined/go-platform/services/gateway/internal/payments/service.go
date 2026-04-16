package payments

import (
	"context"
	"errors"
)

var (
	ErrInvalidUserID        = errors.New("invalid user id")
	ErrInvalidAmount        = errors.New("invalid amount")
	ErrInvalidPaymentMethod = errors.New("invalid payment method")
	ErrTransactionNotFound  = errors.New("transaction not found")
	ErrInsufficientFunds    = errors.New("insufficient funds")
	ErrWithdrawalFailed     = errors.New("withdrawal failed")
	ErrDepositFailed        = errors.New("deposit failed")
)

// PaymentService defines the interface for payment operations
type PaymentService interface {
	// InitiateDeposit initiates a deposit transaction
	InitiateDeposit(ctx context.Context, userID string, amountCents int64, paymentMethod string) (*DepositResult, error)

	// InitiateWithdrawal initiates a withdrawal transaction
	InitiateWithdrawal(ctx context.Context, userID string, amountCents int64, paymentMethod string) (*WithdrawalResult, error)

	// GetPaymentMethods returns available payment methods for a user
	GetPaymentMethods(ctx context.Context, userID string) ([]PaymentMethod, error)

	// GetTransactionStatus returns the status of a specific transaction
	GetTransactionStatus(ctx context.Context, txnID string) (*TransactionStatus, error)

	// HandleWebhook processes a webhook from the payment gateway
	HandleWebhook(ctx context.Context, payload WebhookPayload) error
}
