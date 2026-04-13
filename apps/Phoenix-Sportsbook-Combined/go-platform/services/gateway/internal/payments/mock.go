package payments

import (
	"context"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"phoenix-revival/gateway/internal/wallet"
)

// MockPaymentService is an in-memory mock implementation for dev/demo
type MockPaymentService struct {
	mu                 sync.RWMutex
	deposits           map[string]*DepositResult
	withdrawals        map[string]*WithdrawalResult
	transactions       map[string]*TransactionStatus
	paymentMethods     map[string][]PaymentMethod
	walletService      *wallet.Service
	depositSeq         int64
	withdrawalSeq      int64
	transactionSeq     int64
}

// NewMockPaymentService creates a new in-memory payment service
func NewMockPaymentService(walletService *wallet.Service) *MockPaymentService {
	return &MockPaymentService{
		deposits:       make(map[string]*DepositResult),
		withdrawals:    make(map[string]*WithdrawalResult),
		transactions:   make(map[string]*TransactionStatus),
		paymentMethods: make(map[string][]PaymentMethod),
		walletService:  walletService,
	}
}

// InitiateDeposit creates a new deposit and immediately approves it (credits wallet)
func (m *MockPaymentService) InitiateDeposit(ctx context.Context, userID string, amountCents int64, paymentMethod string) (*DepositResult, error) {
	if userID == "" {
		return nil, ErrInvalidUserID
	}
	if amountCents <= 0 {
		return nil, ErrInvalidAmount
	}
	if paymentMethod == "" {
		return nil, ErrInvalidPaymentMethod
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	m.depositSeq++
	txnID := fmt.Sprintf("dep:%d", m.depositSeq)
	now := time.Now().UTC().Format(time.RFC3339)

	result := &DepositResult{
		TransactionID:    txnID,
		UserID:           userID,
		Amount:           amountCents,
		Status:           "approved",
		PaymentMethod:    paymentMethod,
		CreatedAt:        now,
		ProcessedAt:      now,
		ConfirmationCode: fmt.Sprintf("CONF-%d", m.depositSeq),
	}

	m.deposits[txnID] = result

	// Create transaction record
	m.transactionSeq++
	txn := &TransactionStatus{
		TransactionID:    txnID,
		UserID:           userID,
		Type:             "deposit",
		Amount:           amountCents,
		Status:           "approved",
		PaymentMethod:    paymentMethod,
		CreatedAt:        now,
		UpdatedAt:        now,
		ProcessedAt:      now,
		ConfirmationCode: result.ConfirmationCode,
	}
	m.transactions[txnID] = txn

	// Credit wallet immediately
	if m.walletService != nil {
		_, err := m.walletService.Credit(wallet.MutationRequest{
			UserID:         userID,
			AmountCents:    amountCents,
			IdempotencyKey: txnID,
			Reason:         fmt.Sprintf("deposit via %s", paymentMethod),
		})
		if err != nil {
			slog.Warn("failed to credit wallet for deposit", "txn_id", txnID, "error", err)
		}
	}

	return result, nil
}

// InitiateWithdrawal creates a new withdrawal and queues it for processing
func (m *MockPaymentService) InitiateWithdrawal(ctx context.Context, userID string, amountCents int64, paymentMethod string) (*WithdrawalResult, error) {
	if userID == "" {
		return nil, ErrInvalidUserID
	}
	if amountCents <= 0 {
		return nil, ErrInvalidAmount
	}
	if paymentMethod == "" {
		return nil, ErrInvalidPaymentMethod
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	// Check wallet balance
	if m.walletService != nil {
		balance := m.walletService.Balance(userID)
		if balance < amountCents {
			return nil, ErrInsufficientFunds
		}
	}

	m.withdrawalSeq++
	txnID := fmt.Sprintf("wdr:%d", m.withdrawalSeq)
	now := time.Now().UTC().Format(time.RFC3339)
	estimatedAt := time.Now().Add(2 * time.Hour).UTC().Format(time.RFC3339)

	result := &WithdrawalResult{
		TransactionID: txnID,
		UserID:        userID,
		Amount:        amountCents,
		Status:        "pending",
		PaymentMethod: paymentMethod,
		CreatedAt:     now,
		EstimatedAt:   estimatedAt,
	}

	m.withdrawals[txnID] = result

	// Create transaction record
	m.transactionSeq++
	txn := &TransactionStatus{
		TransactionID: txnID,
		UserID:        userID,
		Type:          "withdrawal",
		Amount:        amountCents,
		Status:        "pending",
		PaymentMethod: paymentMethod,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	m.transactions[txnID] = txn

	// Debit wallet immediately (withdrawal is pending but funds are held)
	if m.walletService != nil {
		_, err := m.walletService.Debit(wallet.MutationRequest{
			UserID:         userID,
			AmountCents:    amountCents,
			IdempotencyKey: txnID,
			Reason:         fmt.Sprintf("withdrawal via %s (pending)", paymentMethod),
		})
		if err != nil {
			slog.Warn("failed to debit wallet for withdrawal", "txn_id", txnID, "error", err)
		}
	}

	return result, nil
}

// GetPaymentMethods returns mock payment methods
func (m *MockPaymentService) GetPaymentMethods(ctx context.Context, userID string) ([]PaymentMethod, error) {
	if userID == "" {
		return nil, ErrInvalidUserID
	}

	m.mu.RLock()
	defer m.mu.RUnlock()

	// Return cached or default methods
	if methods, found := m.paymentMethods[userID]; found {
		return methods, nil
	}

	// Default mock methods
	defaultMethods := []PaymentMethod{
		{
			ID:           "cc:1234",
			Type:         "credit_card",
			Label:        "Visa ending in 4242",
			LastFour:     "4242",
			ExpiryDate:   "12/25",
			IsActive:     true,
			IsDefault:    true,
			CreatedAt:    time.Now().UTC().Format(time.RFC3339),
			Restrictions: []string{},
		},
		{
			ID:           "bank:5678",
			Type:         "bank_transfer",
			Label:        "Bank Account ending in 5678",
			LastFour:     "5678",
			IsActive:     true,
			IsDefault:    false,
			CreatedAt:    time.Now().UTC().Format(time.RFC3339),
			Restrictions: []string{"withdrawal_only"},
		},
		{
			ID:           "wallet:main",
			Type:         "wallet",
			Label:        "Digital Wallet",
			IsActive:     true,
			IsDefault:    false,
			CreatedAt:    time.Now().UTC().Format(time.RFC3339),
			Restrictions: []string{},
		},
	}

	return defaultMethods, nil
}

// GetTransactionStatus returns the status of a transaction
func (m *MockPaymentService) GetTransactionStatus(ctx context.Context, txnID string) (*TransactionStatus, error) {
	if txnID == "" {
		return nil, ErrTransactionNotFound
	}

	m.mu.RLock()
	defer m.mu.RUnlock()

	txn, found := m.transactions[txnID]
	if !found {
		return nil, ErrTransactionNotFound
	}

	// Return a copy
	copy := *txn
	return &copy, nil
}

// HandleWebhook processes payment gateway webhooks (mock just logs them)
func (m *MockPaymentService) HandleWebhook(ctx context.Context, payload WebhookPayload) error {
	if payload.TransactionID == "" {
		return ErrTransactionNotFound
	}

	m.mu.Lock()
	defer m.mu.Unlock()

	txn, found := m.transactions[payload.TransactionID]
	if !found {
		return ErrTransactionNotFound
	}

	// Update transaction status
	txn.Status = payload.Status
	txn.UpdatedAt = time.Now().UTC().Format(time.RFC3339)

	// If deposit is confirmed, credit wallet
	if txn.Type == "deposit" && payload.Status == "approved" && m.walletService != nil {
		// Wallet was already credited in InitiateDeposit, just log
		slog.Info("webhook deposit confirmed", "txn_id", payload.TransactionID, "user_id", payload.UserID)
	}

	// If withdrawal is processed, mark as complete
	if txn.Type == "withdrawal" && payload.Status == "processed" {
		txn.ProcessedAt = time.Now().UTC().Format(time.RFC3339)
		slog.Info("webhook withdrawal processed", "txn_id", payload.TransactionID, "user_id", payload.UserID)
	}

	return nil
}
