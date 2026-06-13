package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"errors"
	"io"
	"log/slog"
	"testing"
	"time"

	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-wallet/internal/config"
	"github.com/phoenixbot/phoenix-wallet/internal/models"
)

type stubWalletRepo struct {
	createPendingDepositCalled    bool
	createPendingWithdrawalCalled bool
	updateAdminStatusCalled       bool
	reconcileAdminCalled          bool
	previewReconcileCalled        bool
	listAdminSummaryCalled        bool
	listReconciliationQueueCalled bool
	refundAdminCalled             bool
	reverseAdminCalled            bool
	chargebackAdminCalled         bool
	retryAdminCalled              bool
	approveAdminCalled            bool
	declineAdminCalled            bool
	settleAdminCalled             bool
	assignAdminCalled             bool
	noteAdminCalled               bool
	createAdminFundsCreditCalled  bool
	createAdminFundsDebitCalled   bool
	cancelProviderCalled          bool
	lastProviderCancelReq         *models.ProviderCancelRequest
	lastProviderCancelActorUserID string
}

func (s *stubWalletRepo) CreateWallet(_ context.Context, userID, currency string) (*models.Wallet, error) {
	return &models.Wallet{ID: "wallet-1", UserID: userID, Currency: currency, Balance: decimal.RequireFromString("0.00"), Status: "active", CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}, nil
}
func (s *stubWalletRepo) GetWalletByUserID(_ context.Context, userID string) (*models.Wallet, error) {
	return &models.Wallet{ID: "wallet-1", UserID: userID, Currency: "USD", Balance: decimal.RequireFromString("50.00"), Status: "active", CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}, nil
}
func (s *stubWalletRepo) GetWalletByID(_ context.Context, walletID string) (*models.Wallet, error) {
	return &models.Wallet{ID: walletID, UserID: "user-1", Currency: "USD", Balance: decimal.RequireFromString("50.00"), Status: "active", CreatedAt: time.Now().UTC(), UpdatedAt: time.Now().UTC()}, nil
}
func (s *stubWalletRepo) GetWalletSummary(_ context.Context, userID string) (*models.WalletSummary, error) {
	return &models.WalletSummary{UserID: userID, Balance: decimal.RequireFromString("50.00"), Currency: "USD", Reserved: decimal.RequireFromString("10.00"), Available: decimal.RequireFromString("40.00"), LastUpdated: time.Now().UTC()}, nil
}
func (s *stubWalletRepo) GetFinancialSummary(_ context.Context, userID string) (*models.FinancialSummaryResponse, error) {
	return &models.FinancialSummaryResponse{
		CurrentBalance:      decimal.RequireFromString("50.00"),
		OpenedBets:          decimal.RequireFromString("12.00"),
		PendingWithdrawals:  decimal.RequireFromString("5.00"),
		LifetimeDeposits:    decimal.RequireFromString("100.00"),
		LifetimeWithdrawals: decimal.RequireFromString("50.00"),
		NetCash:             decimal.RequireFromString("50.00"),
		ProductBreakdown: models.FinancialSummaryProductBreakdown{
			Sportsbook: models.ProductExposureSummary{OpenExposure: decimal.RequireFromString("10.00")},
			Prediction: models.PredictionProductSummary{OpenExposure: decimal.RequireFromString("2.00"), OpenOrders: 1, SettledOrders: 2, CancelledOrders: 1},
		},
	}, nil
}
func (s *stubWalletRepo) CreateDeposit(_ context.Context, userID string, req *models.DepositRequest) (*models.DepositResponse, error) {
	return &models.DepositResponse{DepositID: "dep-1", UserID: userID, Amount: req.Amount, Status: "processing", CreatedAt: time.Now().UTC()}, nil
}
func (s *stubWalletRepo) CreatePendingDeposit(_ context.Context, userID string, req *models.DepositRequest) (*models.DepositResponse, error) {
	s.createPendingDepositCalled = true
	return &models.DepositResponse{DepositID: "dep-pending-1", UserID: userID, Amount: req.Amount, Status: "PENDING", CreatedAt: time.Now().UTC()}, nil
}
func (s *stubWalletRepo) CreateWithdrawal(_ context.Context, userID string, req *models.WithdrawalRequest) (*models.WithdrawalResponse, error) {
	return &models.WithdrawalResponse{WithdrawalID: "wd-1", UserID: userID, Amount: req.Amount, Status: "pending_approval", CreatedAt: time.Now().UTC()}, nil
}
func (s *stubWalletRepo) CreatePendingWithdrawal(_ context.Context, userID string, req *models.WithdrawalRequest) (*models.WithdrawalResponse, error) {
	s.createPendingWithdrawalCalled = true
	return &models.WithdrawalResponse{WithdrawalID: "wd-pending-1", UserID: userID, Amount: req.Amount, Status: "PENDING", CreatedAt: time.Now().UTC()}, nil
}
func (s *stubWalletRepo) CreateAdminFundsCredit(_ context.Context, actorUserID, userID string, req *models.AdminFundsMutationRequest) (*models.PaymentTransactionDetailsResponse, error) {
	s.createAdminFundsCreditCalled = true
	return &models.PaymentTransactionDetailsResponse{TransactionID: "txn-credit-1", Status: "SUCCEEDED", Direction: "Deposit", Amount: req.Amount.Amount, Currency: req.Amount.Currency, Reference: req.Details, Metadata: map[string]any{"reason": req.Reason, "actor_user_id": actorUserID}, CreatedAt: time.Now().UTC()}, nil
}
func (s *stubWalletRepo) CreateAdminFundsDebit(_ context.Context, actorUserID, userID string, req *models.AdminFundsMutationRequest) (*models.PaymentTransactionDetailsResponse, error) {
	s.createAdminFundsDebitCalled = true
	return &models.PaymentTransactionDetailsResponse{TransactionID: "txn-debit-1", Status: "SUCCEEDED", Direction: "Withdrawal", Amount: req.Amount.Amount, Currency: req.Amount.Currency, Reference: req.Details, Metadata: map[string]any{"reason": req.Reason, "actor_user_id": actorUserID}, CreatedAt: time.Now().UTC()}, nil
}
func (s *stubWalletRepo) HandlePaymentStateChanged(_ context.Context, notification *models.PaymentStateChangedNotification) (*models.PaymentStateChangedNotificationResponse, error) {
	return &models.PaymentStateChangedNotificationResponse{Status: "OK", TransactionID: notification.MerchantTransactionID}, nil
}
func (s *stubWalletRepo) VerifyCashDeposit(_ context.Context, req *models.CashDepositVerificationRequest) (*models.CashDepositVerificationResponse, error) {
	return &models.CashDepositVerificationResponse{Status: "OK", Valid: true, TransactionID: req.MerchantTransactionID}, nil
}
func (s *stubWalletRepo) ListTransactions(_ context.Context, userID, txType, product string, page, limit int, startDate, endDate *time.Time) (*models.TransactionListResponse, error) {
	return &models.TransactionListResponse{Data: []models.WalletTransaction{{TransactionID: "txn-1", WalletID: "wallet-1", UserID: userID, Type: txType, Product: product, Currency: "USD", Status: "PENDING", Amount: decimal.RequireFromString("12.34"), BalanceBefore: decimal.RequireFromString("50.00"), BalanceAfter: decimal.RequireFromString("37.66"), ProviderRef: "ext-1", Provider: "card", CreatedAt: time.Now().UTC()}}, Pagination: models.Pagination{Page: page, Limit: limit, Total: 1}}, nil
}
func (s *stubWalletRepo) GetTransactionDetails(_ context.Context, userID, transactionID string) (*models.PaymentTransactionDetailsResponse, error) {
	return &models.PaymentTransactionDetailsResponse{TransactionID: transactionID, Status: "SUCCEEDED", Direction: "Deposit", Amount: decimal.RequireFromString("10.00"), Currency: "USD", CreatedAt: time.Now().UTC()}, nil
}
func (s *stubWalletRepo) ListAdminPaymentTransactions(_ context.Context, userID, txType, status, provider, assignedTo string, page, limit int) (*models.TransactionListResponse, error) {
	return &models.TransactionListResponse{Data: []models.WalletTransaction{{TransactionID: "txn-1", UserID: userID, Type: txType, Status: status, Provider: provider, AssignedTo: assignedTo}}, Pagination: models.Pagination{Page: page, Limit: limit, Total: 1}}, nil
}
func (s *stubWalletRepo) ListAdminPaymentSummary(_ context.Context, userID, provider, assignedTo string) (*models.PaymentTransactionSummaryResponse, error) {
	s.listAdminSummaryCalled = true
	return &models.PaymentTransactionSummaryResponse{Data: []models.PaymentTransactionSummaryItem{{Provider: provider, Type: "deposit", Status: "ACTION_REQUIRED", AssignedTo: assignedTo, Count: 2, TotalAmount: decimal.RequireFromString("15.00"), LastUpdatedAt: time.Now().UTC()}}}, nil
}
func (s *stubWalletRepo) ListAdminReconciliationQueue(_ context.Context, userID, provider, assignedTo string, page, limit int) (*models.TransactionListResponse, error) {
	s.listReconciliationQueueCalled = true
	return &models.TransactionListResponse{Data: []models.WalletTransaction{{TransactionID: "txn-rq-1", UserID: userID, Type: "deposit", Status: "PENDING_REVIEW", Provider: provider, AssignedTo: assignedTo}}, Pagination: models.Pagination{Page: page, Limit: limit, Total: 1}}, nil
}
func (s *stubWalletRepo) GetAdminPaymentTransactionDetails(_ context.Context, transactionID string) (*models.PaymentTransactionDetailsResponse, error) {
	return &models.PaymentTransactionDetailsResponse{TransactionID: transactionID, Status: "PROCESSING", Direction: "Deposit", Amount: decimal.RequireFromString("10.00"), Currency: "USD", CreatedAt: time.Now().UTC()}, nil
}
func (s *stubWalletRepo) GetAdminPaymentTransactionDetailsByProviderReference(_ context.Context, providerReference string) (*models.PaymentTransactionDetailsResponse, error) {
	return &models.PaymentTransactionDetailsResponse{TransactionID: "txn-from-provider-ref", Status: "PROCESSING", Direction: "Deposit", Amount: decimal.RequireFromString("10.00"), Currency: "USD", ProviderRef: providerReference, CreatedAt: time.Now().UTC()}, nil
}
func (s *stubWalletRepo) ListAdminPaymentTransactionEvents(_ context.Context, transactionID string) (*models.PaymentTransactionEventListResponse, error) {
	return &models.PaymentTransactionEventListResponse{Data: []models.PaymentTransactionEvent{{ID: "evt-1", TransactionID: transactionID, Status: "PENDING", Source: "system", CreatedAt: time.Now().UTC()}}}, nil
}
func (s *stubWalletRepo) ListAdminPaymentTransactionEventsByProviderReference(_ context.Context, providerReference string) (*models.PaymentTransactionEventListResponse, error) {
	return &models.PaymentTransactionEventListResponse{Data: []models.PaymentTransactionEvent{{ID: "evt-from-provider-ref", TransactionID: "txn-from-provider-ref", Status: "PENDING_REVIEW", Source: "provider", ProviderRef: providerReference, CreatedAt: time.Now().UTC()}}}, nil
}
func (s *stubWalletRepo) CancelProviderRequest(_ context.Context, actorUserID string, req *models.ProviderCancelRequest) (*models.ProviderCancelResponse, error) {
	s.cancelProviderCalled = true
	s.lastProviderCancelActorUserID = actorUserID
	copyReq := *req
	s.lastProviderCancelReq = &copyReq
	return &models.ProviderCancelResponse{
		State:        "cancelled",
		Adapter:      req.Adapter,
		Attempts:     1,
		RetryCount:   0,
		FallbackUsed: false,
		LastError:    "",
		UpdatedAt:    time.Now().UTC().Format(time.RFC3339),
	}, nil
}
func (s *stubWalletRepo) PreviewAdminPaymentReconciliation(_ context.Context, req *models.AdminPaymentReconciliationRequest) (*models.PaymentTransactionReconciliationPreviewResponse, error) {
	s.previewReconcileCalled = true
	transactionID := req.MerchantTransactionID
	if transactionID == "" {
		transactionID = "txn-1"
	}
	return &models.PaymentTransactionReconciliationPreviewResponse{
		TransactionID:        transactionID,
		ProviderReference:    req.ProviderReference,
		Direction:            "Deposit",
		CurrentStatus:        "PENDING",
		RequestedStatus:      req.State,
		NormalizedStatus:     "SUCCEEDED",
		Action:               "complete_pending_deposit",
		Allowed:              true,
		CurrentBalance:       decimal.RequireFromString("50.00"),
		ProjectedBalance:     decimal.RequireFromString("60.00"),
		RequiresReservation:  false,
		ReservationSatisfied: true,
	}, nil
}
func (s *stubWalletRepo) UpdateAdminPaymentTransactionStatus(_ context.Context, transactionID string, req *models.PaymentTransactionStatusUpdateRequest) (*models.PaymentTransactionDetailsResponse, error) {
	s.updateAdminStatusCalled = true
	return &models.PaymentTransactionDetailsResponse{TransactionID: transactionID, Status: req.Status, Direction: "Deposit", Amount: decimal.RequireFromString("10.00"), Currency: "USD", ProviderRef: req.ProviderRef, CreatedAt: time.Now().UTC()}, nil
}
func (s *stubWalletRepo) ReconcileAdminPaymentTransaction(_ context.Context, req *models.AdminPaymentReconciliationRequest) (*models.PaymentTransactionDetailsResponse, error) {
	s.reconcileAdminCalled = true
	transactionID := req.MerchantTransactionID
	if transactionID == "" {
		transactionID = "txn-1"
	}
	return &models.PaymentTransactionDetailsResponse{
		TransactionID: transactionID,
		Status:        req.State,
		Direction:     "Deposit",
		Amount:        decimal.RequireFromString("10.00"),
		Currency:      "USD",
		ProviderRef:   req.ProviderReference,
		CreatedAt:     time.Now().UTC(),
	}, nil
}
func (s *stubWalletRepo) RefundAdminPaymentTransaction(_ context.Context, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	s.refundAdminCalled = true
	return &models.PaymentTransactionDetailsResponse{TransactionID: transactionID, Status: "REFUNDED", Direction: "Deposit", Amount: decimal.RequireFromString("10.00"), Currency: "USD", ProviderRef: req.ProviderRef, CreatedAt: time.Now().UTC()}, nil
}
func (s *stubWalletRepo) ReverseAdminPaymentTransaction(_ context.Context, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	s.reverseAdminCalled = true
	return &models.PaymentTransactionDetailsResponse{TransactionID: transactionID, Status: "REVERSED", Direction: "Withdrawal", Amount: decimal.RequireFromString("10.00"), Currency: "USD", ProviderRef: req.ProviderRef, CreatedAt: time.Now().UTC()}, nil
}
func (s *stubWalletRepo) ChargebackAdminPaymentTransaction(_ context.Context, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	s.chargebackAdminCalled = true
	return &models.PaymentTransactionDetailsResponse{TransactionID: transactionID, Status: "CHARGEBACK", Direction: "Deposit", Amount: decimal.RequireFromString("10.00"), Currency: "USD", ProviderRef: req.ProviderRef, CreatedAt: time.Now().UTC()}, nil
}
func (s *stubWalletRepo) RetryAdminPaymentTransaction(_ context.Context, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	s.retryAdminCalled = true
	return &models.PaymentTransactionDetailsResponse{TransactionID: transactionID, Status: "RETRYING", Direction: "Deposit", Amount: decimal.RequireFromString("10.00"), Currency: "USD", ProviderRef: req.ProviderRef, CreatedAt: time.Now().UTC()}, nil
}
func (s *stubWalletRepo) ApproveAdminPaymentTransaction(_ context.Context, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	s.approveAdminCalled = true
	return &models.PaymentTransactionDetailsResponse{TransactionID: transactionID, Status: "PROCESSING", Direction: "Deposit", Amount: decimal.RequireFromString("10.00"), Currency: "USD", ProviderRef: req.ProviderRef, CreatedAt: time.Now().UTC()}, nil
}
func (s *stubWalletRepo) DeclineAdminPaymentTransaction(_ context.Context, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	s.declineAdminCalled = true
	return &models.PaymentTransactionDetailsResponse{TransactionID: transactionID, Status: "DECLINED", Direction: "Deposit", Amount: decimal.RequireFromString("10.00"), Currency: "USD", ProviderRef: req.ProviderRef, CreatedAt: time.Now().UTC()}, nil
}
func (s *stubWalletRepo) SettleAdminPaymentTransaction(_ context.Context, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	s.settleAdminCalled = true
	return &models.PaymentTransactionDetailsResponse{TransactionID: transactionID, Status: "SUCCEEDED", Direction: "Deposit", Amount: decimal.RequireFromString("10.00"), Currency: "USD", ProviderRef: req.ProviderRef, CreatedAt: time.Now().UTC()}, nil
}
func (s *stubWalletRepo) AssignAdminPaymentTransaction(_ context.Context, transactionID, assignedTo, reason string) (*models.PaymentTransactionDetailsResponse, error) {
	s.assignAdminCalled = true
	now := time.Now().UTC()
	return &models.PaymentTransactionDetailsResponse{TransactionID: transactionID, Status: "PENDING_REVIEW", Direction: "Deposit", Amount: decimal.RequireFromString("10.00"), Currency: "USD", AssignedTo: assignedTo, AssignedAt: &now, CreatedAt: now}, nil
}
func (s *stubWalletRepo) AddAdminPaymentTransactionNote(_ context.Context, transactionID, note, actor string) (*models.PaymentTransactionEventListResponse, error) {
	s.noteAdminCalled = true
	return &models.PaymentTransactionEventListResponse{Data: []models.PaymentTransactionEvent{{ID: "evt-note-1", TransactionID: transactionID, Status: "PENDING_REVIEW", Source: "admin-note", Reason: note, Payload: map[string]any{"actor_user_id": actor}, CreatedAt: time.Now().UTC()}}}, nil
}
func (s *stubWalletRepo) ApplyReferralReward(_ context.Context, userID, referralCode string) (*models.ApplyReferralRewardResponse, error) {
	return &models.ApplyReferralRewardResponse{UserID: userID, RewardAmount: decimal.RequireFromString("10.00"), NewBalance: decimal.RequireFromString("60.00"), ReferrerID: "ref-1", AppliedAt: time.Now().UTC()}, nil
}
func (s *stubWalletRepo) ReserveFunds(_ context.Context, userID string, req *models.ReserveFundsRequest) (*models.ReserveFundsResponse, error) {
	return &models.ReserveFundsResponse{UserID: userID, ReservedAmount: req.Amount, AvailableBalance: decimal.RequireFromString("40.00"), ReservationID: "res-1"}, nil
}
func (s *stubWalletRepo) ReleaseReservedFunds(_ context.Context, userID string, req *models.ReleaseReserveRequest) (*models.ReleaseReserveResponse, error) {
	return &models.ReleaseReserveResponse{UserID: userID, ReleasedAmount: req.Amount, NewAvailableBalance: decimal.RequireFromString("50.00")}, nil
}

func TestCreateDepositValidation(t *testing.T) {
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, &stubWalletRepo{})
	_, err := svc.CreateDeposit(context.Background(), models.AuthClaims{UserID: "user-1", Role: "user"}, "user-1", &models.DepositRequest{Amount: decimal.Zero, Currency: "USD"})
	if err == nil {
		t.Fatalf("CreateDeposit() expected validation error")
	}
}

func TestGetWalletSummaryForbidden(t *testing.T) {
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, &stubWalletRepo{})
	_, err := svc.GetWalletSummary(context.Background(), models.AuthClaims{UserID: "user-2", Role: "user"}, "user-1")
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("GetWalletSummary() error = %v, want %v", err, ErrForbidden)
	}
}

func TestGetFinancialSummaryAllowsWalletReviewRoles(t *testing.T) {
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, &stubWalletRepo{})
	_, err := svc.GetFinancialSummary(context.Background(), models.AuthClaims{UserID: "user-2", Role: "user"}, "user-1")
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("GetFinancialSummary() error = %v, want %v", err, ErrForbidden)
	}

	for _, actor := range []models.AuthClaims{
		{UserID: "admin-1", Role: "admin"},
		{UserID: "operator-1", Role: "operator"},
		{UserID: "internal-1", Role: "internal"},
	} {
		response, err := svc.GetFinancialSummary(context.Background(), actor, "user-1")
		if err != nil {
			t.Fatalf("GetFinancialSummary() role=%s error = %v", actor.Role, err)
		}
		if !response.OpenedBets.Equal(decimal.RequireFromString("12.00")) {
			t.Fatalf("GetFinancialSummary() role=%s opened bets = %s", actor.Role, response.OpenedBets)
		}
	}
}

func TestCreateAdminFundsCreditAllowsOperator(t *testing.T) {
	repo := &stubWalletRepo{}
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, repo)
	response, err := svc.CreateAdminFundsCredit(context.Background(), models.AuthClaims{UserID: "operator-1", Role: "operator"}, "user-1", &models.AdminFundsMutationRequest{
		Amount:  models.AdminFundsMutationAmount{Amount: decimal.RequireFromString("15.00")},
		Details: "Manual correction",
	})
	if err != nil {
		t.Fatalf("CreateAdminFundsCredit() error = %v", err)
	}
	if !repo.createAdminFundsCreditCalled {
		t.Fatalf("CreateAdminFundsCredit() repo call was not triggered")
	}
	if response.Currency != "USD" {
		t.Fatalf("CreateAdminFundsCredit() currency = %s, want USD", response.Currency)
	}
	if response.Metadata["reason"] != "DEPOSIT" {
		t.Fatalf("CreateAdminFundsCredit() reason = %v, want DEPOSIT", response.Metadata["reason"])
	}
}

func TestCancelProviderRequestAllowsProviderOpsRoles(t *testing.T) {
	repo := &stubWalletRepo{}
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, repo)

	response, err := svc.CancelProviderRequest(context.Background(), models.AuthClaims{UserID: " operator-1 ", Role: "operator"}, &models.ProviderCancelRequest{
		Adapter:   " pxp ",
		PlayerID:  " user-1 ",
		BetID:     " bet-1 ",
		RequestID: " req-1 ",
	})
	if err != nil {
		t.Fatalf("CancelProviderRequest() error = %v", err)
	}
	if !repo.cancelProviderCalled {
		t.Fatalf("CancelProviderRequest() repo call was not triggered")
	}
	if repo.lastProviderCancelReq == nil {
		t.Fatalf("CancelProviderRequest() repo request was not captured")
	}
	if repo.lastProviderCancelActorUserID != "operator-1" {
		t.Fatalf("CancelProviderRequest() actor user id = %q", repo.lastProviderCancelActorUserID)
	}
	if repo.lastProviderCancelReq.Adapter != "pxp" || repo.lastProviderCancelReq.PlayerID != "user-1" || repo.lastProviderCancelReq.BetID != "bet-1" || repo.lastProviderCancelReq.RequestID != "req-1" {
		t.Fatalf("CancelProviderRequest() normalized request = %+v", repo.lastProviderCancelReq)
	}
	if repo.lastProviderCancelReq.Reason != "manual provider cancel" {
		t.Fatalf("CancelProviderRequest() reason = %q", repo.lastProviderCancelReq.Reason)
	}
	if response.State != "cancelled" || response.Adapter != "pxp" {
		t.Fatalf("CancelProviderRequest() response = %+v", response)
	}
}

func TestCancelProviderRequestRejectsUnauthorizedRole(t *testing.T) {
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, &stubWalletRepo{})
	_, err := svc.CancelProviderRequest(context.Background(), models.AuthClaims{UserID: "user-1", Role: "user"}, &models.ProviderCancelRequest{
		Adapter:   "pxp",
		PlayerID:  "user-1",
		BetID:     "bet-1",
		RequestID: "req-1",
	})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("CancelProviderRequest() error = %v, want %v", err, ErrForbidden)
	}
}

func TestCreateAdminFundsDebitRejectsUnauthorizedRole(t *testing.T) {
	repo := &stubWalletRepo{}
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, repo)
	_, err := svc.CreateAdminFundsDebit(context.Background(), models.AuthClaims{UserID: "user-2", Role: "user"}, "user-1", &models.AdminFundsMutationRequest{
		Amount:  models.AdminFundsMutationAmount{Amount: decimal.RequireFromString("5.00"), Currency: "USD"},
		Details: "Manual debit",
	})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("CreateAdminFundsDebit() error = %v, want %v", err, ErrForbidden)
	}
	if repo.createAdminFundsDebitCalled {
		t.Fatalf("CreateAdminFundsDebit() repo should not be called for forbidden actors")
	}
}

func TestCreateAdminFundsDebitRequiresDetails(t *testing.T) {
	repo := &stubWalletRepo{}
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, repo)
	_, err := svc.CreateAdminFundsDebit(context.Background(), models.AuthClaims{UserID: "operator-1", Role: "operator"}, "user-1", &models.AdminFundsMutationRequest{
		Amount: models.AdminFundsMutationAmount{Amount: decimal.RequireFromString("5.00"), Currency: "USD"},
	})
	if err == nil || err.Error() != "details is required" {
		t.Fatalf("CreateAdminFundsDebit() error = %v, want details is required", err)
	}
}

func TestListTransactionsNormalizesTransactionType(t *testing.T) {
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, &stubWalletRepo{})
	response, err := svc.ListTransactions(context.Background(), models.AuthClaims{UserID: "user-1", Role: "user"}, "user-1", "bet_placed", "", 1, 20, nil, nil)
	if err != nil {
		t.Fatalf("ListTransactions() error = %v", err)
	}
	if got := response.Data[0].Type; got != "bet_place" {
		t.Fatalf("ListTransactions() type = %s, want bet_place", got)
	}
}

func TestListTransactionsNormalizesProduct(t *testing.T) {
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, &stubWalletRepo{})
	response, err := svc.ListTransactions(context.Background(), models.AuthClaims{UserID: "user-1", Role: "user"}, "user-1", "", "prediction", 1, 20, nil, nil)
	if err != nil {
		t.Fatalf("ListTransactions() error = %v", err)
	}
	if got := response.Data[0].Product; got != "PREDICTION" {
		t.Fatalf("ListTransactions() product = %s, want PREDICTION", got)
	}
}

func TestListAdminUserTransactionsAllowsOperatorAndMapsLegacyShape(t *testing.T) {
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, &stubWalletRepo{})
	response, err := svc.ListAdminUserTransactions(context.Background(), models.AuthClaims{UserID: "operator-1", Role: "operator"}, "user-1", "deposit", "sportsbook", 2, 25, nil, nil)
	if err != nil {
		t.Fatalf("ListAdminUserTransactions() error = %v", err)
	}
	if response.CurrentPage != 2 || response.ItemsPerPage != 25 || response.TotalCount != 1 {
		t.Fatalf("unexpected pagination = %+v", response)
	}
	if len(response.Data) != 1 {
		t.Fatalf("data len = %d, want 1", len(response.Data))
	}
	item := response.Data[0]
	if item.Category != "DEPOSIT" {
		t.Fatalf("category = %s, want DEPOSIT", item.Category)
	}
	if item.Status != "PENDING" {
		t.Fatalf("status = %s, want PENDING", item.Status)
	}
	if item.TransactionAmount.Currency != "USD" || item.ExternalID != "ext-1" {
		t.Fatalf("unexpected mapped item = %+v", item)
	}
}

func TestListAdminUserTransactionsRejectsUnauthorizedViewer(t *testing.T) {
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, &stubWalletRepo{})
	_, err := svc.ListAdminUserTransactions(context.Background(), models.AuthClaims{UserID: "user-1", Role: "user"}, "user-1", "", "", 1, 20, nil, nil)
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("ListAdminUserTransactions() error = %v, want %v", err, ErrForbidden)
	}
}

func TestExportAdminPaymentTransactionsCSVIncludesHeaderAndRows(t *testing.T) {
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, &stubWalletRepo{})
	data, err := svc.ExportAdminPaymentTransactionsCSV(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, "user-1", "deposit", "PENDING_REVIEW", "pxp", "operator-7")
	if err != nil {
		t.Fatalf("ExportAdminPaymentTransactionsCSV() error = %v", err)
	}
	rows, err := csv.NewReader(bytes.NewReader(data)).ReadAll()
	if err != nil {
		t.Fatalf("read csv: %v", err)
	}
	if len(rows) != 2 {
		t.Fatalf("row count = %d, want 2", len(rows))
	}
	if rows[0][0] != "transaction_id" {
		t.Fatalf("header first column = %s", rows[0][0])
	}
	if rows[1][0] != "txn-1" || rows[1][3] != "PENDING_REVIEW" || rows[1][7] != "operator-7" {
		t.Fatalf("unexpected csv row = %#v", rows[1])
	}
}

func TestExportAdminPaymentTransactionsCSVAdminOnly(t *testing.T) {
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, &stubWalletRepo{})
	_, err := svc.ExportAdminPaymentTransactionsCSV(context.Background(), models.AuthClaims{UserID: "user-1", Role: "user"}, "user-1", "", "", "", "")
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("ExportAdminPaymentTransactionsCSV() error = %v, want %v", err, ErrForbidden)
	}
}

func TestExportAdminReconciliationQueueCSVIncludesHeaderAndRows(t *testing.T) {
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, &stubWalletRepo{})
	data, err := svc.ExportAdminReconciliationQueueCSV(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, "user-1", "pxp", "operator-7")
	if err != nil {
		t.Fatalf("ExportAdminReconciliationQueueCSV() error = %v", err)
	}
	rows, err := csv.NewReader(bytes.NewReader(data)).ReadAll()
	if err != nil {
		t.Fatalf("read csv: %v", err)
	}
	if len(rows) != 2 {
		t.Fatalf("row count = %d, want 2", len(rows))
	}
	if rows[0][0] != "transaction_id" {
		t.Fatalf("header first column = %s", rows[0][0])
	}
	if rows[1][0] != "txn-rq-1" || rows[1][3] != "PENDING_REVIEW" || rows[1][5] != "pxp" || rows[1][7] != "operator-7" {
		t.Fatalf("unexpected csv row = %#v", rows[1])
	}
}

func TestExportAdminReconciliationQueueCSVAdminOnly(t *testing.T) {
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, &stubWalletRepo{})
	_, err := svc.ExportAdminReconciliationQueueCSV(context.Background(), models.AuthClaims{UserID: "user-1", Role: "user"}, "user-1", "", "")
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("ExportAdminReconciliationQueueCSV() error = %v, want %v", err, ErrForbidden)
	}
}

func TestGetTransactionDetailsForbidden(t *testing.T) {
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, &stubWalletRepo{})
	_, err := svc.GetTransactionDetails(context.Background(), models.AuthClaims{UserID: "user-2", Role: "user"}, "user-1", "txn-1")
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("GetTransactionDetails() error = %v, want %v", err, ErrForbidden)
	}
}

func TestCreateDepositUsesPendingFlowWhenProviderModeEnabled(t *testing.T) {
	repo := &stubWalletRepo{}
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{PaymentProviderMode: "provider"}, repo)
	response, err := svc.CreateDeposit(context.Background(), models.AuthClaims{UserID: "user-1", Role: "user"}, "user-1", &models.DepositRequest{Amount: decimal.RequireFromString("10.00"), Currency: "USD"})
	if err != nil {
		t.Fatalf("CreateDeposit() error = %v", err)
	}
	if !repo.createPendingDepositCalled {
		t.Fatalf("expected pending deposit flow to be used")
	}
	if response.Status != "PENDING" {
		t.Fatalf("CreateDeposit() status = %s, want PENDING", response.Status)
	}
}

func TestCreateWithdrawalUsesPendingFlowWhenProviderModeEnabled(t *testing.T) {
	repo := &stubWalletRepo{}
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{PaymentProviderMode: "provider"}, repo)
	response, err := svc.CreateWithdrawal(context.Background(), models.AuthClaims{UserID: "user-1", Role: "user"}, "user-1", &models.WithdrawalRequest{Amount: decimal.RequireFromString("10.00"), Currency: "USD"})
	if err != nil {
		t.Fatalf("CreateWithdrawal() error = %v", err)
	}
	if !repo.createPendingWithdrawalCalled {
		t.Fatalf("expected pending withdrawal flow to be used")
	}
	if response.Status != "PENDING" {
		t.Fatalf("CreateWithdrawal() status = %s, want PENDING", response.Status)
	}
}

func TestListAdminPaymentTransactionsAdminOnly(t *testing.T) {
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, &stubWalletRepo{})
	_, err := svc.ListAdminPaymentTransactions(context.Background(), models.AuthClaims{UserID: "user-1", Role: "user"}, "", "deposit", "PENDING", "pxp", "", 1, 20)
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("ListAdminPaymentTransactions() error = %v, want %v", err, ErrForbidden)
	}
}

func TestListAdminPaymentSummaryAdminOnly(t *testing.T) {
	repo := &stubWalletRepo{}
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, repo)
	_, err := svc.ListAdminPaymentSummary(context.Background(), models.AuthClaims{UserID: "user-1", Role: "user"}, "", "pxp", "")
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("ListAdminPaymentSummary() error = %v, want %v", err, ErrForbidden)
	}
	response, err := svc.ListAdminPaymentSummary(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, "user-1", "pxp", "operator-1")
	if err != nil {
		t.Fatalf("ListAdminPaymentSummary() admin error = %v", err)
	}
	if !repo.listAdminSummaryCalled || len(response.Data) != 1 || response.Data[0].Status != "ACTION_REQUIRED" || response.Data[0].AssignedTo != "operator-1" {
		t.Fatalf("ListAdminPaymentSummary() unexpected response = %+v", response)
	}
}

func TestAssignAdminPaymentTransactionAdminOnly(t *testing.T) {
	repo := &stubWalletRepo{}
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, repo)
	_, err := svc.AssignAdminPaymentTransaction(context.Background(), models.AuthClaims{UserID: "user-1", Role: "user"}, "txn-1", &models.PaymentTransactionAssignmentRequest{AssignedTo: "admin-2"})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("AssignAdminPaymentTransaction() error = %v, want %v", err, ErrForbidden)
	}
	response, err := svc.AssignAdminPaymentTransaction(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, "txn-1", &models.PaymentTransactionAssignmentRequest{AssignedTo: "admin-2"})
	if err != nil {
		t.Fatalf("AssignAdminPaymentTransaction() admin error = %v", err)
	}
	if !repo.assignAdminCalled {
		t.Fatalf("expected assign admin repo path to be called")
	}
	if response.AssignedTo != "admin-2" {
		t.Fatalf("AssignAdminPaymentTransaction() assigned to = %s", response.AssignedTo)
	}
}

func TestAddAdminPaymentTransactionNoteRequiresReason(t *testing.T) {
	repo := &stubWalletRepo{}
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, repo)
	_, err := svc.AddAdminPaymentTransactionNote(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, "txn-1", &models.PaymentTransactionActionRequest{})
	if err == nil {
		t.Fatalf("AddAdminPaymentTransactionNote() expected validation error")
	}
	response, err := svc.AddAdminPaymentTransactionNote(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, "txn-1", &models.PaymentTransactionActionRequest{Reason: "reviewed manually"})
	if err != nil {
		t.Fatalf("AddAdminPaymentTransactionNote() error = %v", err)
	}
	if !repo.noteAdminCalled {
		t.Fatalf("expected add note repo path to be called")
	}
	if len(response.Data) != 1 || response.Data[0].Reason != "reviewed manually" {
		t.Fatalf("AddAdminPaymentTransactionNote() unexpected response = %+v", response.Data)
	}
}

func TestListAdminReconciliationQueueAdminOnly(t *testing.T) {
	repo := &stubWalletRepo{}
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, repo)
	_, err := svc.ListAdminReconciliationQueue(context.Background(), models.AuthClaims{UserID: "user-1", Role: "user"}, "", "pxp", "", 1, 20)
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("ListAdminReconciliationQueue() error = %v, want %v", err, ErrForbidden)
	}
	response, err := svc.ListAdminReconciliationQueue(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, "user-1", "pxp", "", 1, 20)
	if err != nil {
		t.Fatalf("ListAdminReconciliationQueue() admin error = %v", err)
	}
	if !repo.listReconciliationQueueCalled || len(response.Data) != 1 || response.Data[0].Status != "PENDING_REVIEW" {
		t.Fatalf("ListAdminReconciliationQueue() unexpected response = %+v", response)
	}
}

func TestListAdminPaymentTransactionEventsAdminOnly(t *testing.T) {
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, &stubWalletRepo{})
	_, err := svc.ListAdminPaymentTransactionEvents(context.Background(), models.AuthClaims{UserID: "user-1", Role: "user"}, "txn-1")
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("ListAdminPaymentTransactionEvents() error = %v, want %v", err, ErrForbidden)
	}
	response, err := svc.ListAdminPaymentTransactionEvents(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, "txn-1")
	if err != nil {
		t.Fatalf("ListAdminPaymentTransactionEvents() admin error = %v", err)
	}
	if len(response.Data) != 1 || response.Data[0].TransactionID != "txn-1" {
		t.Fatalf("ListAdminPaymentTransactionEvents() unexpected response = %+v", response)
	}
}

func TestListAdminPaymentTransactionEventsByProviderReferenceAdminOnly(t *testing.T) {
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, &stubWalletRepo{})
	_, err := svc.ListAdminPaymentTransactionEventsByProviderReference(context.Background(), models.AuthClaims{UserID: "user-1", Role: "user"}, "pxp_123")
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("ListAdminPaymentTransactionEventsByProviderReference() error = %v, want %v", err, ErrForbidden)
	}
	response, err := svc.ListAdminPaymentTransactionEventsByProviderReference(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, "pxp_123")
	if err != nil {
		t.Fatalf("ListAdminPaymentTransactionEventsByProviderReference() admin error = %v", err)
	}
	if len(response.Data) != 1 || response.Data[0].ProviderRef != "pxp_123" {
		t.Fatalf("ListAdminPaymentTransactionEventsByProviderReference() unexpected response = %+v", response)
	}
}

func TestGetAdminPaymentTransactionDetailsAdminOnly(t *testing.T) {
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, &stubWalletRepo{})
	_, err := svc.GetAdminPaymentTransactionDetails(context.Background(), models.AuthClaims{UserID: "user-1", Role: "user"}, "txn-1")
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("GetAdminPaymentTransactionDetails() error = %v, want %v", err, ErrForbidden)
	}
	response, err := svc.GetAdminPaymentTransactionDetails(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, "txn-1")
	if err != nil {
		t.Fatalf("GetAdminPaymentTransactionDetails() admin error = %v", err)
	}
	if response.TransactionID != "txn-1" {
		t.Fatalf("GetAdminPaymentTransactionDetails() transaction = %s, want txn-1", response.TransactionID)
	}
}

func TestGetAdminPaymentTransactionDetailsByProviderReferenceAdminOnly(t *testing.T) {
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, &stubWalletRepo{})
	_, err := svc.GetAdminPaymentTransactionDetailsByProviderReference(context.Background(), models.AuthClaims{UserID: "user-1", Role: "user"}, "pxp_123")
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("GetAdminPaymentTransactionDetailsByProviderReference() error = %v, want %v", err, ErrForbidden)
	}
	response, err := svc.GetAdminPaymentTransactionDetailsByProviderReference(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, "pxp_123")
	if err != nil {
		t.Fatalf("GetAdminPaymentTransactionDetailsByProviderReference() admin error = %v", err)
	}
	if response.ProviderRef != "pxp_123" {
		t.Fatalf("GetAdminPaymentTransactionDetailsByProviderReference() provider ref = %s, want pxp_123", response.ProviderRef)
	}
}

func TestUpdateAdminPaymentTransactionStatus(t *testing.T) {
	repo := &stubWalletRepo{}
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, repo)
	response, err := svc.UpdateAdminPaymentTransactionStatus(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, "txn-1", &models.PaymentTransactionStatusUpdateRequest{Status: "SUCCEEDED", ProviderRef: "pxp-1"})
	if err != nil {
		t.Fatalf("UpdateAdminPaymentTransactionStatus() error = %v", err)
	}
	if !repo.updateAdminStatusCalled {
		t.Fatalf("expected admin status update flow to be used")
	}
	if response.Status != "SUCCEEDED" {
		t.Fatalf("UpdateAdminPaymentTransactionStatus() status = %s, want SUCCEEDED", response.Status)
	}
}

func TestPreviewAdminPaymentReconciliationAdminOnly(t *testing.T) {
	repo := &stubWalletRepo{}
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, repo)
	_, err := svc.PreviewAdminPaymentReconciliation(context.Background(), models.AuthClaims{UserID: "user-1", Role: "user"}, &models.AdminPaymentReconciliationRequest{MerchantTransactionID: "txn-1", State: "SUCCEEDED"})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("PreviewAdminPaymentReconciliation() error = %v, want %v", err, ErrForbidden)
	}
	response, err := svc.PreviewAdminPaymentReconciliation(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, &models.AdminPaymentReconciliationRequest{MerchantTransactionID: "txn-1", State: "SUCCEEDED"})
	if err != nil {
		t.Fatalf("PreviewAdminPaymentReconciliation() admin error = %v", err)
	}
	if !repo.previewReconcileCalled || !response.Allowed || response.Action != "complete_pending_deposit" {
		t.Fatalf("PreviewAdminPaymentReconciliation() unexpected response = %+v", response)
	}
}

func TestUpdateAdminPaymentTransactionStatusByProviderReference(t *testing.T) {
	repo := &stubWalletRepo{}
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, repo)
	_, err := svc.UpdateAdminPaymentTransactionStatusByProviderReference(context.Background(), models.AuthClaims{UserID: "user-1", Role: "user"}, "pxp-1", &models.PaymentTransactionStatusUpdateRequest{Status: "SUCCEEDED"})
	if !errors.Is(err, ErrForbidden) {
		t.Fatalf("UpdateAdminPaymentTransactionStatusByProviderReference() error = %v, want %v", err, ErrForbidden)
	}
	response, err := svc.UpdateAdminPaymentTransactionStatusByProviderReference(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, "pxp-1", &models.PaymentTransactionStatusUpdateRequest{Status: "SUCCEEDED", ProviderRef: "pxp-1"})
	if err != nil {
		t.Fatalf("UpdateAdminPaymentTransactionStatusByProviderReference() admin error = %v", err)
	}
	if !repo.updateAdminStatusCalled {
		t.Fatalf("expected admin status update flow to be used")
	}
	if response.TransactionID != "txn-from-provider-ref" {
		t.Fatalf("UpdateAdminPaymentTransactionStatusByProviderReference() transaction_id = %s, want txn-from-provider-ref", response.TransactionID)
	}
	if response.Status != "SUCCEEDED" {
		t.Fatalf("UpdateAdminPaymentTransactionStatusByProviderReference() status = %s, want SUCCEEDED", response.Status)
	}
}

func TestApproveAdminPaymentTransactionByProviderReference(t *testing.T) {
	repo := &stubWalletRepo{}
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, repo)
	response, err := svc.ApproveAdminPaymentTransactionByProviderReference(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, "pxp-r4", &models.PaymentTransactionActionRequest{})
	if err != nil {
		t.Fatalf("ApproveAdminPaymentTransactionByProviderReference() error = %v", err)
	}
	if !repo.approveAdminCalled {
		t.Fatalf("expected approve admin flow to be used")
	}
	if response.Status != "PROCESSING" {
		t.Fatalf("ApproveAdminPaymentTransactionByProviderReference() status = %s, want PROCESSING", response.Status)
	}
}

func TestRefundAdminPaymentTransactionByProviderReference(t *testing.T) {
	repo := &stubWalletRepo{}
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, repo)
	response, err := svc.RefundAdminPaymentTransactionByProviderReference(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, "pxp-r1", &models.PaymentTransactionActionRequest{})
	if err != nil {
		t.Fatalf("RefundAdminPaymentTransactionByProviderReference() error = %v", err)
	}
	if !repo.refundAdminCalled {
		t.Fatalf("expected refund admin flow to be used")
	}
	if response.Status != "REFUNDED" {
		t.Fatalf("RefundAdminPaymentTransactionByProviderReference() status = %s, want REFUNDED", response.Status)
	}
}

func TestReconcileAdminPaymentTransaction(t *testing.T) {
	repo := &stubWalletRepo{}
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, repo)
	response, err := svc.ReconcileAdminPaymentTransaction(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, &models.AdminPaymentReconciliationRequest{
		MerchantTransactionID: "txn-1",
		State:                 "SUCCEEDED",
		ProviderReference:     "pxp-r0",
		PaymentMethod:         "card",
	})
	if err != nil {
		t.Fatalf("ReconcileAdminPaymentTransaction() error = %v", err)
	}
	if !repo.reconcileAdminCalled {
		t.Fatalf("expected reconcile admin flow to be used")
	}
	if response.Status != "SUCCEEDED" {
		t.Fatalf("ReconcileAdminPaymentTransaction() status = %s, want SUCCEEDED", response.Status)
	}
}

func TestRefundAdminPaymentTransaction(t *testing.T) {
	repo := &stubWalletRepo{}
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, repo)
	response, err := svc.RefundAdminPaymentTransaction(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, "txn-1", &models.PaymentTransactionActionRequest{ProviderRef: "pxp-r1"})
	if err != nil {
		t.Fatalf("RefundAdminPaymentTransaction() error = %v", err)
	}
	if !repo.refundAdminCalled {
		t.Fatalf("expected refund admin flow to be used")
	}
	if response.Status != "REFUNDED" {
		t.Fatalf("RefundAdminPaymentTransaction() status = %s, want REFUNDED", response.Status)
	}
}

func TestReverseAdminPaymentTransaction(t *testing.T) {
	repo := &stubWalletRepo{}
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, repo)
	response, err := svc.ReverseAdminPaymentTransaction(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, "txn-1", &models.PaymentTransactionActionRequest{ProviderRef: "pxp-r2"})
	if err != nil {
		t.Fatalf("ReverseAdminPaymentTransaction() error = %v", err)
	}
	if !repo.reverseAdminCalled {
		t.Fatalf("expected reverse admin flow to be used")
	}
	if response.Status != "REVERSED" {
		t.Fatalf("ReverseAdminPaymentTransaction() status = %s, want REVERSED", response.Status)
	}
}

func TestChargebackAdminPaymentTransaction(t *testing.T) {
	repo := &stubWalletRepo{}
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, repo)

	response, err := svc.ChargebackAdminPaymentTransaction(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, "txn-1", &models.PaymentTransactionActionRequest{ProviderRef: "pxp-cb-1"})
	if err != nil {
		t.Fatalf("ChargebackAdminPaymentTransaction() error = %v", err)
	}
	if !repo.chargebackAdminCalled {
		t.Fatalf("expected chargeback admin action to be delegated")
	}
	if response.Status != "CHARGEBACK" {
		t.Fatalf("ChargebackAdminPaymentTransaction() status = %s, want CHARGEBACK", response.Status)
	}
}

func TestRetryAdminPaymentTransaction(t *testing.T) {
	repo := &stubWalletRepo{}
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, repo)
	response, err := svc.RetryAdminPaymentTransaction(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, "txn-1", &models.PaymentTransactionActionRequest{ProviderRef: "pxp-r3"})
	if err != nil {
		t.Fatalf("RetryAdminPaymentTransaction() error = %v", err)
	}
	if !repo.retryAdminCalled {
		t.Fatalf("expected retry admin flow to be used")
	}
	if response.Status != "RETRYING" {
		t.Fatalf("RetryAdminPaymentTransaction() status = %s, want RETRYING", response.Status)
	}
}

func TestApproveAdminPaymentTransaction(t *testing.T) {
	repo := &stubWalletRepo{}
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, repo)
	response, err := svc.ApproveAdminPaymentTransaction(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, "txn-1", &models.PaymentTransactionActionRequest{ProviderRef: "pxp-r4"})
	if err != nil {
		t.Fatalf("ApproveAdminPaymentTransaction() error = %v", err)
	}
	if !repo.approveAdminCalled {
		t.Fatalf("expected approve admin flow to be used")
	}
	if response.Status != "PROCESSING" {
		t.Fatalf("ApproveAdminPaymentTransaction() status = %s, want PROCESSING", response.Status)
	}
}

func TestDeclineAdminPaymentTransaction(t *testing.T) {
	repo := &stubWalletRepo{}
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, repo)
	response, err := svc.DeclineAdminPaymentTransaction(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, "txn-1", &models.PaymentTransactionActionRequest{ProviderRef: "pxp-r5"})
	if err != nil {
		t.Fatalf("DeclineAdminPaymentTransaction() error = %v", err)
	}
	if !repo.declineAdminCalled {
		t.Fatalf("expected decline admin flow to be used")
	}
	if response.Status != "DECLINED" {
		t.Fatalf("DeclineAdminPaymentTransaction() status = %s, want DECLINED", response.Status)
	}
}

func TestSettleAdminPaymentTransaction(t *testing.T) {
	repo := &stubWalletRepo{}
	svc := NewWalletService(slog.New(slog.NewTextHandler(io.Discard, nil)), &config.Config{}, repo)
	response, err := svc.SettleAdminPaymentTransaction(context.Background(), models.AuthClaims{UserID: "admin-1", Role: "admin"}, "txn-1", &models.PaymentTransactionActionRequest{ProviderRef: "pxp-r6"})
	if err != nil {
		t.Fatalf("SettleAdminPaymentTransaction() error = %v", err)
	}
	if !repo.settleAdminCalled {
		t.Fatalf("expected settle admin flow to be used")
	}
	if response.Status != "SUCCEEDED" {
		t.Fatalf("SettleAdminPaymentTransaction() status = %s, want SUCCEEDED", response.Status)
	}
}
