package payments

import (
	"context"
	"testing"

	"phoenix-revival/gateway/internal/wallet"
)

func seedWallet(t *testing.T, ws *wallet.Service, userID string, cents int64) {
	t.Helper()
	_, err := ws.Credit(wallet.MutationRequest{
		UserID:         userID,
		AmountCents:    cents,
		IdempotencyKey: "seed:" + userID,
	})
	if err != nil {
		t.Fatalf("seed wallet for %s: %v", userID, err)
	}
}

func newTestService(t *testing.T) (*MockPaymentService, *wallet.Service) {
	t.Helper()
	ws := wallet.NewService()
	svc := NewMockPaymentService(ws)
	return svc, ws
}

// --- Deposit flow ---

func TestDepositFlowCreditsWalletAndCreatesTransaction(t *testing.T) {
	svc, ws := newTestService(t)
	ctx := context.Background()

	result, err := svc.InitiateDeposit(ctx, "u-dep-1", 2500, "credit_card")
	if err != nil {
		t.Fatalf("initiate deposit: %v", err)
	}
	if result.Status != "approved" {
		t.Fatalf("expected status approved, got %s", result.Status)
	}
	if result.TransactionID == "" {
		t.Fatal("expected non-empty transaction id")
	}
	if result.Amount != 2500 {
		t.Fatalf("expected amount 2500, got %d", result.Amount)
	}
	if result.ConfirmationCode == "" {
		t.Fatal("expected non-empty confirmation code")
	}

	// Verify wallet was credited
	balance := ws.Balance("u-dep-1")
	if balance != 2500 {
		t.Fatalf("expected wallet balance 2500, got %d", balance)
	}

	// Verify transaction record was created
	txn, err := svc.GetTransactionStatus(ctx, result.TransactionID)
	if err != nil {
		t.Fatalf("get transaction status: %v", err)
	}
	if txn.Type != "deposit" {
		t.Fatalf("expected transaction type deposit, got %s", txn.Type)
	}
	if txn.UserID != "u-dep-1" {
		t.Fatalf("expected user id u-dep-1, got %s", txn.UserID)
	}
	if txn.Amount != 2500 {
		t.Fatalf("expected transaction amount 2500, got %d", txn.Amount)
	}
	if txn.Status != "approved" {
		t.Fatalf("expected transaction status approved, got %s", txn.Status)
	}
}

// --- Withdrawal flow ---

func TestWithdrawalFlowDebitsWallet(t *testing.T) {
	svc, ws := newTestService(t)
	ctx := context.Background()
	seedWallet(t, ws, "u-wdr-1", 5000)

	result, err := svc.InitiateWithdrawal(ctx, "u-wdr-1", 2000, "bank_transfer")
	if err != nil {
		t.Fatalf("initiate withdrawal: %v", err)
	}
	if result.Status != "pending" {
		t.Fatalf("expected status pending, got %s", result.Status)
	}
	if result.TransactionID == "" {
		t.Fatal("expected non-empty transaction id")
	}
	if result.Amount != 2000 {
		t.Fatalf("expected amount 2000, got %d", result.Amount)
	}

	// Verify wallet was debited (funds held)
	balance := ws.Balance("u-wdr-1")
	if balance != 3000 {
		t.Fatalf("expected wallet balance 3000 after withdrawal, got %d", balance)
	}

	// Verify transaction record exists
	txn, err := svc.GetTransactionStatus(ctx, result.TransactionID)
	if err != nil {
		t.Fatalf("get transaction status: %v", err)
	}
	if txn.Type != "withdrawal" {
		t.Fatalf("expected transaction type withdrawal, got %s", txn.Type)
	}
	if txn.Status != "pending" {
		t.Fatalf("expected transaction status pending, got %s", txn.Status)
	}
}

// --- Withdrawal insufficient funds ---

func TestWithdrawalInsufficientFundsReturnsError(t *testing.T) {
	svc, ws := newTestService(t)
	ctx := context.Background()
	seedWallet(t, ws, "u-wdr-2", 1000)

	_, err := svc.InitiateWithdrawal(ctx, "u-wdr-2", 5000, "bank_transfer")
	if err == nil {
		t.Fatal("expected insufficient funds error")
	}
	if err != ErrInsufficientFunds {
		t.Fatalf("expected ErrInsufficientFunds, got %v", err)
	}

	// Verify balance unchanged
	balance := ws.Balance("u-wdr-2")
	if balance != 1000 {
		t.Fatalf("expected wallet balance unchanged at 1000, got %d", balance)
	}
}

// --- Idempotent webhook (no double-credit) ---

func TestIdempotentWebhookNoDoubleCredit(t *testing.T) {
	svc, ws := newTestService(t)
	ctx := context.Background()

	// Deposit credits the wallet immediately in mock
	result, err := svc.InitiateDeposit(ctx, "u-idempotent-1", 3000, "credit_card")
	if err != nil {
		t.Fatalf("initiate deposit: %v", err)
	}

	balanceAfterDeposit := ws.Balance("u-idempotent-1")
	if balanceAfterDeposit != 3000 {
		t.Fatalf("expected balance 3000, got %d", balanceAfterDeposit)
	}

	// Process the same webhook twice — should not double-credit
	webhook := WebhookPayload{
		TransactionID: result.TransactionID,
		UserID:        "u-idempotent-1",
		Amount:        3000,
		Status:        "approved",
		EventType:     "deposit.confirmed",
	}

	err = svc.HandleWebhook(ctx, webhook)
	if err != nil {
		t.Fatalf("first webhook: %v", err)
	}

	err = svc.HandleWebhook(ctx, webhook)
	if err != nil {
		t.Fatalf("second webhook: %v", err)
	}

	// Wallet balance should still be 3000 — mock credits only on InitiateDeposit,
	// webhook just updates status without re-crediting
	balanceAfterWebhooks := ws.Balance("u-idempotent-1")
	if balanceAfterWebhooks != 3000 {
		t.Fatalf("expected balance 3000 after duplicate webhooks, got %d", balanceAfterWebhooks)
	}
}

// --- Deposit status transitions ---

func TestWithdrawalStatusTransitionPendingToFailed(t *testing.T) {
	svc, ws := newTestService(t)
	ctx := context.Background()
	seedWallet(t, ws, "u-status-1", 1500)

	result, err := svc.InitiateWithdrawal(ctx, "u-status-1", 1500, "bank_transfer")
	if err != nil {
		t.Fatalf("initiate withdrawal: %v", err)
	}

	// Transition to failed via webhook
	err = svc.HandleWebhook(ctx, WebhookPayload{
		TransactionID: result.TransactionID,
		UserID:        "u-status-1",
		Status:        "failed",
		EventType:     "withdrawal.failed",
	})
	if err != nil {
		t.Fatalf("failed webhook: %v", err)
	}

	txn, err := svc.GetTransactionStatus(ctx, result.TransactionID)
	if err != nil {
		t.Fatalf("get status after failure: %v", err)
	}
	if txn.Status != "failed" {
		t.Fatalf("expected status failed, got %s", txn.Status)
	}
}

func TestDepositStatusTransitionApprovedViaWebhook(t *testing.T) {
	svc, _ := newTestService(t)
	ctx := context.Background()

	result, err := svc.InitiateDeposit(ctx, "u-status-2", 2000, "wallet")
	if err != nil {
		t.Fatalf("initiate deposit: %v", err)
	}

	// Webhook confirms deposit approval
	err = svc.HandleWebhook(ctx, WebhookPayload{
		TransactionID: result.TransactionID,
		UserID:        "u-status-2",
		Status:        "approved",
		EventType:     "deposit.confirmed",
	})
	if err != nil {
		t.Fatalf("approved webhook: %v", err)
	}

	txn, err := svc.GetTransactionStatus(ctx, result.TransactionID)
	if err != nil {
		t.Fatalf("get status after approval: %v", err)
	}
	if txn.Status != "approved" {
		t.Fatalf("expected status approved, got %s", txn.Status)
	}
}

func TestApprovedDepositWebhookIgnoresLaterFailure(t *testing.T) {
	svc, _ := newTestService(t)
	ctx := context.Background()

	result, err := svc.InitiateDeposit(ctx, "u-status-3", 2000, "wallet")
	if err != nil {
		t.Fatalf("initiate deposit: %v", err)
	}

	err = svc.HandleWebhook(ctx, WebhookPayload{
		TransactionID: result.TransactionID,
		UserID:        "u-status-3",
		Status:        "failed",
		EventType:     "deposit.failed",
	})
	if err != nil {
		t.Fatalf("failed webhook after approval: %v", err)
	}

	txn, err := svc.GetTransactionStatus(ctx, result.TransactionID)
	if err != nil {
		t.Fatalf("get status after stale failure: %v", err)
	}
	if txn.Status != "approved" {
		t.Fatalf("expected approved status to remain terminal, got %s", txn.Status)
	}
}

// --- Get transaction by ID ---

func TestGetTransactionByIDReturnsCorrectFields(t *testing.T) {
	svc, _ := newTestService(t)
	ctx := context.Background()

	result, err := svc.InitiateDeposit(ctx, "u-gettxn-1", 4200, "credit_card")
	if err != nil {
		t.Fatalf("initiate deposit: %v", err)
	}

	txn, err := svc.GetTransactionStatus(ctx, result.TransactionID)
	if err != nil {
		t.Fatalf("get transaction: %v", err)
	}
	if txn.TransactionID != result.TransactionID {
		t.Fatalf("expected txn id %s, got %s", result.TransactionID, txn.TransactionID)
	}
	if txn.UserID != "u-gettxn-1" {
		t.Fatalf("expected user id u-gettxn-1, got %s", txn.UserID)
	}
	if txn.Type != "deposit" {
		t.Fatalf("expected type deposit, got %s", txn.Type)
	}
	if txn.Amount != 4200 {
		t.Fatalf("expected amount 4200, got %d", txn.Amount)
	}
	if txn.PaymentMethod != "credit_card" {
		t.Fatalf("expected payment method credit_card, got %s", txn.PaymentMethod)
	}
	if txn.CreatedAt == "" {
		t.Fatal("expected non-empty createdAt")
	}
	if txn.UpdatedAt == "" {
		t.Fatal("expected non-empty updatedAt")
	}
}

func TestGetTransactionNotFoundReturnsError(t *testing.T) {
	svc, _ := newTestService(t)
	ctx := context.Background()

	_, err := svc.GetTransactionStatus(ctx, "nonexistent-txn")
	if err == nil {
		t.Fatal("expected transaction not found error")
	}
	if err != ErrTransactionNotFound {
		t.Fatalf("expected ErrTransactionNotFound, got %v", err)
	}
}

func TestGetTransactionEmptyIDReturnsError(t *testing.T) {
	svc, _ := newTestService(t)
	ctx := context.Background()

	_, err := svc.GetTransactionStatus(ctx, "")
	if err == nil {
		t.Fatal("expected error for empty transaction id")
	}
	if err != ErrTransactionNotFound {
		t.Fatalf("expected ErrTransactionNotFound, got %v", err)
	}
}

// --- Validation edge cases ---

func TestDepositRejectsEmptyUserID(t *testing.T) {
	svc, _ := newTestService(t)
	_, err := svc.InitiateDeposit(context.Background(), "", 1000, "credit_card")
	if err != ErrInvalidUserID {
		t.Fatalf("expected ErrInvalidUserID, got %v", err)
	}
}

func TestDepositRejectsZeroAmount(t *testing.T) {
	svc, _ := newTestService(t)
	_, err := svc.InitiateDeposit(context.Background(), "u-val-1", 0, "credit_card")
	if err != ErrInvalidAmount {
		t.Fatalf("expected ErrInvalidAmount, got %v", err)
	}
}

func TestDepositRejectsNegativeAmount(t *testing.T) {
	svc, _ := newTestService(t)
	_, err := svc.InitiateDeposit(context.Background(), "u-val-2", -500, "credit_card")
	if err != ErrInvalidAmount {
		t.Fatalf("expected ErrInvalidAmount, got %v", err)
	}
}

func TestDepositRejectsEmptyPaymentMethod(t *testing.T) {
	svc, _ := newTestService(t)
	_, err := svc.InitiateDeposit(context.Background(), "u-val-3", 1000, "")
	if err != ErrInvalidPaymentMethod {
		t.Fatalf("expected ErrInvalidPaymentMethod, got %v", err)
	}
}

func TestWithdrawalRejectsEmptyUserID(t *testing.T) {
	svc, _ := newTestService(t)
	_, err := svc.InitiateWithdrawal(context.Background(), "", 1000, "bank_transfer")
	if err != ErrInvalidUserID {
		t.Fatalf("expected ErrInvalidUserID, got %v", err)
	}
}

func TestWithdrawalRejectsZeroAmount(t *testing.T) {
	svc, _ := newTestService(t)
	_, err := svc.InitiateWithdrawal(context.Background(), "u-val-4", 0, "bank_transfer")
	if err != ErrInvalidAmount {
		t.Fatalf("expected ErrInvalidAmount, got %v", err)
	}
}

func TestWithdrawalRejectsEmptyPaymentMethod(t *testing.T) {
	svc, _ := newTestService(t)
	_, err := svc.InitiateWithdrawal(context.Background(), "u-val-5", 1000, "")
	if err != ErrInvalidPaymentMethod {
		t.Fatalf("expected ErrInvalidPaymentMethod, got %v", err)
	}
}

// --- Payment methods ---

func TestGetPaymentMethodsReturnsDefaults(t *testing.T) {
	svc, _ := newTestService(t)
	ctx := context.Background()

	methods, err := svc.GetPaymentMethods(ctx, "u-methods-1")
	if err != nil {
		t.Fatalf("get payment methods: %v", err)
	}
	if len(methods) != 3 {
		t.Fatalf("expected 3 default methods, got %d", len(methods))
	}

	// Verify at least one is a credit card and one is active
	hasCard := false
	hasActive := false
	for _, m := range methods {
		if m.Type == "credit_card" {
			hasCard = true
		}
		if m.IsActive {
			hasActive = true
		}
	}
	if !hasCard {
		t.Fatal("expected at least one credit_card method")
	}
	if !hasActive {
		t.Fatal("expected at least one active method")
	}
}

func TestGetPaymentMethodsRejectsEmptyUserID(t *testing.T) {
	svc, _ := newTestService(t)
	_, err := svc.GetPaymentMethods(context.Background(), "")
	if err != ErrInvalidUserID {
		t.Fatalf("expected ErrInvalidUserID, got %v", err)
	}
}

// --- Webhook edge cases ---

func TestWebhookEmptyTransactionIDReturnsError(t *testing.T) {
	svc, _ := newTestService(t)
	err := svc.HandleWebhook(context.Background(), WebhookPayload{
		TransactionID: "",
		Status:        "approved",
	})
	if err != ErrTransactionNotFound {
		t.Fatalf("expected ErrTransactionNotFound, got %v", err)
	}
}

func TestWebhookNonexistentTransactionReturnsError(t *testing.T) {
	svc, _ := newTestService(t)
	err := svc.HandleWebhook(context.Background(), WebhookPayload{
		TransactionID: "does-not-exist",
		Status:        "approved",
	})
	if err != ErrTransactionNotFound {
		t.Fatalf("expected ErrTransactionNotFound, got %v", err)
	}
}

// --- Withdrawal webhook processed transition ---

func TestWithdrawalWebhookProcessedSetsProcessedAt(t *testing.T) {
	svc, ws := newTestService(t)
	ctx := context.Background()
	seedWallet(t, ws, "u-wdr-webhook-1", 5000)

	result, err := svc.InitiateWithdrawal(ctx, "u-wdr-webhook-1", 2000, "bank_transfer")
	if err != nil {
		t.Fatalf("initiate withdrawal: %v", err)
	}

	err = svc.HandleWebhook(ctx, WebhookPayload{
		TransactionID: result.TransactionID,
		UserID:        "u-wdr-webhook-1",
		Status:        "processed",
		EventType:     "withdrawal.processed",
	})
	if err != nil {
		t.Fatalf("processed webhook: %v", err)
	}

	txn, err := svc.GetTransactionStatus(ctx, result.TransactionID)
	if err != nil {
		t.Fatalf("get status: %v", err)
	}
	if txn.Status != "processed" {
		t.Fatalf("expected status processed, got %s", txn.Status)
	}
	if txn.ProcessedAt == "" {
		t.Fatal("expected non-empty processedAt after processed webhook")
	}
}
