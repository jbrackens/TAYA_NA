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
	mu             sync.RWMutex
	deposits       map[string]*DepositResult
	withdrawals    map[string]*WithdrawalResult
	transactions   map[string]*TransactionStatus
	paymentMethods map[string][]PaymentMethod
	walletService  *wallet.Service
	depositSeq     int64
	withdrawalSeq  int64
	transactionSeq int64
	// userGateLocks serializes InitiateGatedWithdrawal per user (D-9). Keyed
	// by userID → *sync.Mutex; the single-process mock analogue of the DB
	// path's per-user pg advisory lock.
	userGateLocks sync.Map
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
		_, err := m.walletService.Credit(ctx, wallet.MutationRequest{
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

	if m.walletService != nil {
		balance := m.walletService.Balance(ctx, userID)
		if balance < amountCents {
			return nil, ErrInsufficientFunds
		}
	}

	m.withdrawalSeq++
	txnID := fmt.Sprintf("wdr:%d", m.withdrawalSeq)
	now := time.Now().UTC().Format(time.RFC3339)
	estimatedAt := time.Now().Add(2 * time.Hour).UTC().Format(time.RFC3339)

	if m.walletService != nil {
		_, err := m.walletService.Debit(ctx, wallet.MutationRequest{
			UserID:         userID,
			AmountCents:    amountCents,
			IdempotencyKey: txnID,
			Reason:         fmt.Sprintf("withdrawal via %s (pending)", paymentMethod),
		})
		if err != nil {
			slog.Warn("failed to debit wallet for withdrawal", "txn_id", txnID, "error", err)
			return nil, ErrWithdrawalFailed
		}
	}

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

	return result, nil
}

// CumulativeWithdrawnCents sums the user's non-failed/non-cancelled
// withdrawals for the KYC just-in-time threshold.
func (m *MockPaymentService) CumulativeWithdrawnCents(ctx context.Context, userID string) (int64, error) {
	if userID == "" {
		return 0, ErrInvalidUserID
	}
	m.mu.RLock()
	defer m.mu.RUnlock()
	var total int64
	for _, wd := range m.withdrawals {
		if wd.UserID != userID {
			continue
		}
		if wd.Status == "failed" || wd.Status == "cancelled" {
			continue
		}
		total += wd.Amount
	}
	return total, nil
}

// InitiateGatedWithdrawal serializes (cumulative → gate → record) per user
// with a per-user mutex — the single-process mock analogue of the DB path's
// pg advisory lock (D-9 TOCTOU).
func (m *MockPaymentService) InitiateGatedWithdrawal(ctx context.Context, userID string, amountCents int64, paymentMethod string, gate func(cumulativeWithdrawnCents int64) error) (*WithdrawalResult, error) {
	if userID == "" {
		return nil, ErrInvalidUserID
	}
	lkAny, _ := m.userGateLocks.LoadOrStore(userID, &sync.Mutex{})
	lk := lkAny.(*sync.Mutex)
	lk.Lock()
	defer lk.Unlock()

	cumulative, err := m.CumulativeWithdrawnCents(ctx, userID)
	if err != nil {
		return nil, err
	}
	if gate != nil {
		if gerr := gate(cumulative); gerr != nil {
			return nil, gerr
		}
	}
	return m.InitiateWithdrawal(ctx, userID, amountCents, paymentMethod)
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

	if !canApplyWebhookTransition(txn.Status) {
		slog.Info("ignoring duplicate or stale mock webhook", "txn_id", payload.TransactionID, "current_status", txn.Status, "incoming_status", payload.Status)
		return nil
	}

	now := time.Now().UTC().Format(time.RFC3339)

	// If deposit is confirmed, credit wallet
	if txn.Type == "deposit" && payload.Status == "approved" && m.walletService != nil {
		// Wallet was already credited in InitiateDeposit, just log
		slog.Info("webhook deposit confirmed", "txn_id", payload.TransactionID, "user_id", payload.UserID)
	}

	// If withdrawal is processed, mark as complete
	if txn.Type == "withdrawal" && payload.Status == "processed" {
		txn.ProcessedAt = now
		slog.Info("webhook withdrawal processed", "txn_id", payload.TransactionID, "user_id", payload.UserID)
	}
	if txn.Type == "withdrawal" && (payload.Status == "failed" || payload.Status == "declined") {
		if m.walletService != nil {
			if _, err := m.walletService.Credit(ctx, wallet.MutationRequest{
				UserID:         txn.UserID,
				AmountCents:    txn.Amount,
				IdempotencyKey: "withdrawal-refund:" + payload.TransactionID,
				Reason:         "withdrawal failed; funds returned",
			}); err != nil {
				slog.Warn("failed to refund wallet debit for withdrawal", "txn_id", payload.TransactionID, "error", err)
				return ErrWithdrawalFailed
			}
		}
	}

	txn.Status = payload.Status
	txn.UpdatedAt = now
	if wd, found := m.withdrawals[payload.TransactionID]; found {
		wd.Status = payload.Status
		wd.ProcessedAt = txn.ProcessedAt
	}

	return nil
}
