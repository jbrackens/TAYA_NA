package service

import (
	"bytes"
	"context"
	"encoding/csv"
	"errors"
	"log/slog"
	"strings"
	"time"

	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-wallet/internal/config"
	"github.com/phoenixbot/phoenix-wallet/internal/models"
	"github.com/phoenixbot/phoenix-wallet/internal/repository"
)

var ErrForbidden = errors.New("forbidden")

type WalletService interface {
	GetWalletSummary(ctx context.Context, actor models.AuthClaims, userID string) (*models.WalletSummary, error)
	GetFinancialSummary(ctx context.Context, actor models.AuthClaims, userID string) (*models.FinancialSummaryResponse, error)
	CreateWallet(ctx context.Context, actor models.AuthClaims, userID, currency string) (*models.Wallet, error)
	CreateDeposit(ctx context.Context, actor models.AuthClaims, userID string, req *models.DepositRequest) (*models.DepositResponse, error)
	CreateWithdrawal(ctx context.Context, actor models.AuthClaims, userID string, req *models.WithdrawalRequest) (*models.WithdrawalResponse, error)
	CreateAdminFundsCredit(ctx context.Context, actor models.AuthClaims, userID string, req *models.AdminFundsMutationRequest) (*models.PaymentTransactionDetailsResponse, error)
	CreateAdminFundsDebit(ctx context.Context, actor models.AuthClaims, userID string, req *models.AdminFundsMutationRequest) (*models.PaymentTransactionDetailsResponse, error)
	HandlePaymentStateChanged(ctx context.Context, notification *models.PaymentStateChangedNotification) (*models.PaymentStateChangedNotificationResponse, error)
	VerifyCashDeposit(ctx context.Context, req *models.CashDepositVerificationRequest) (*models.CashDepositVerificationResponse, error)
	ListTransactions(ctx context.Context, actor models.AuthClaims, userID, txType, product string, page, limit int, startDate, endDate *time.Time) (*models.TransactionListResponse, error)
	ListAdminUserTransactions(ctx context.Context, actor models.AuthClaims, userID, txType, product string, page, limit int, startDate, endDate *time.Time) (*models.LegacyWalletHistoryResponse, error)
	GetTransactionDetails(ctx context.Context, actor models.AuthClaims, userID, transactionID string) (*models.PaymentTransactionDetailsResponse, error)
	ListAdminPaymentTransactions(ctx context.Context, actor models.AuthClaims, userID, txType, status, provider, assignedTo string, page, limit int) (*models.TransactionListResponse, error)
	ExportAdminPaymentTransactionsCSV(ctx context.Context, actor models.AuthClaims, userID, txType, status, provider, assignedTo string) ([]byte, error)
	ListAdminPaymentSummary(ctx context.Context, actor models.AuthClaims, userID, provider, assignedTo string) (*models.PaymentTransactionSummaryResponse, error)
	ListAdminReconciliationQueue(ctx context.Context, actor models.AuthClaims, userID, provider, assignedTo string, page, limit int) (*models.TransactionListResponse, error)
	ExportAdminReconciliationQueueCSV(ctx context.Context, actor models.AuthClaims, userID, provider, assignedTo string) ([]byte, error)
	GetAdminPaymentTransactionDetails(ctx context.Context, actor models.AuthClaims, transactionID string) (*models.PaymentTransactionDetailsResponse, error)
	GetAdminPaymentTransactionDetailsByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string) (*models.PaymentTransactionDetailsResponse, error)
	ListAdminPaymentTransactionEvents(ctx context.Context, actor models.AuthClaims, transactionID string) (*models.PaymentTransactionEventListResponse, error)
	ListAdminPaymentTransactionEventsByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string) (*models.PaymentTransactionEventListResponse, error)
	CancelProviderRequest(ctx context.Context, actor models.AuthClaims, req *models.ProviderCancelRequest) (*models.ProviderCancelResponse, error)
	PreviewAdminPaymentReconciliation(ctx context.Context, actor models.AuthClaims, req *models.AdminPaymentReconciliationRequest) (*models.PaymentTransactionReconciliationPreviewResponse, error)
	UpdateAdminPaymentTransactionStatus(ctx context.Context, actor models.AuthClaims, transactionID string, req *models.PaymentTransactionStatusUpdateRequest) (*models.PaymentTransactionDetailsResponse, error)
	UpdateAdminPaymentTransactionStatusByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string, req *models.PaymentTransactionStatusUpdateRequest) (*models.PaymentTransactionDetailsResponse, error)
	ReconcileAdminPaymentTransaction(ctx context.Context, actor models.AuthClaims, req *models.AdminPaymentReconciliationRequest) (*models.PaymentTransactionDetailsResponse, error)
	SettleAdminPaymentTransaction(ctx context.Context, actor models.AuthClaims, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error)
	SettleAdminPaymentTransactionByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error)
	RefundAdminPaymentTransaction(ctx context.Context, actor models.AuthClaims, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error)
	RefundAdminPaymentTransactionByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error)
	ReverseAdminPaymentTransaction(ctx context.Context, actor models.AuthClaims, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error)
	ReverseAdminPaymentTransactionByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error)
	ChargebackAdminPaymentTransaction(ctx context.Context, actor models.AuthClaims, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error)
	ChargebackAdminPaymentTransactionByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error)
	RetryAdminPaymentTransaction(ctx context.Context, actor models.AuthClaims, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error)
	RetryAdminPaymentTransactionByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error)
	ApproveAdminPaymentTransaction(ctx context.Context, actor models.AuthClaims, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error)
	ApproveAdminPaymentTransactionByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error)
	DeclineAdminPaymentTransaction(ctx context.Context, actor models.AuthClaims, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error)
	DeclineAdminPaymentTransactionByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error)
	AssignAdminPaymentTransaction(ctx context.Context, actor models.AuthClaims, transactionID string, req *models.PaymentTransactionAssignmentRequest) (*models.PaymentTransactionDetailsResponse, error)
	AssignAdminPaymentTransactionByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string, req *models.PaymentTransactionAssignmentRequest) (*models.PaymentTransactionDetailsResponse, error)
	AddAdminPaymentTransactionNote(ctx context.Context, actor models.AuthClaims, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionEventListResponse, error)
	AddAdminPaymentTransactionNoteByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionEventListResponse, error)
	ApplyReferralReward(ctx context.Context, actor models.AuthClaims, userID, referralCode string) (*models.ApplyReferralRewardResponse, error)
	ReserveFunds(ctx context.Context, actor models.AuthClaims, userID string, req *models.ReserveFundsRequest) (*models.ReserveFundsResponse, error)
	ReleaseReservedFunds(ctx context.Context, actor models.AuthClaims, userID string, req *models.ReleaseReserveRequest) (*models.ReleaseReserveResponse, error)
}

type walletService struct {
	logger *slog.Logger
	cfg    *config.Config
	repo   repository.WalletRepository
}

func NewWalletService(logger *slog.Logger, cfg *config.Config, repo repository.WalletRepository) WalletService {
	return &walletService{logger: logger, cfg: cfg, repo: repo}
}

func (s *walletService) GetWalletSummary(ctx context.Context, actor models.AuthClaims, userID string) (*models.WalletSummary, error) {
	if !canAccessWallet(actor, userID) {
		return nil, ErrForbidden
	}
	return s.repo.GetWalletSummary(ctx, userID)
}

func (s *walletService) GetFinancialSummary(ctx context.Context, actor models.AuthClaims, userID string) (*models.FinancialSummaryResponse, error) {
	if !canReviewUserWallet(actor) {
		return nil, ErrForbidden
	}
	return s.repo.GetFinancialSummary(ctx, userID)
}

func (s *walletService) CreateWallet(ctx context.Context, actor models.AuthClaims, userID, currency string) (*models.Wallet, error) {
	if !canAccessWallet(actor, userID) {
		return nil, ErrForbidden
	}
	return s.repo.CreateWallet(ctx, userID, currency)
}

func (s *walletService) CreateDeposit(ctx context.Context, actor models.AuthClaims, userID string, req *models.DepositRequest) (*models.DepositResponse, error) {
	if !canAccessWallet(actor, userID) {
		return nil, ErrForbidden
	}
	if req.Amount.LessThanOrEqual(decimal.Zero) {
		return nil, errors.New("amount must be positive")
	}
	if isProviderMode(s.cfg) {
		return s.repo.CreatePendingDeposit(ctx, userID, req)
	}
	return s.repo.CreateDeposit(ctx, userID, req)
}

func (s *walletService) CreateWithdrawal(ctx context.Context, actor models.AuthClaims, userID string, req *models.WithdrawalRequest) (*models.WithdrawalResponse, error) {
	if !canAccessWallet(actor, userID) {
		return nil, ErrForbidden
	}
	if req.Amount.LessThanOrEqual(decimal.Zero) {
		return nil, errors.New("amount must be positive")
	}
	if isProviderMode(s.cfg) {
		return s.repo.CreatePendingWithdrawal(ctx, userID, req)
	}
	return s.repo.CreateWithdrawal(ctx, userID, req)
}

func (s *walletService) CreateAdminFundsCredit(ctx context.Context, actor models.AuthClaims, userID string, req *models.AdminFundsMutationRequest) (*models.PaymentTransactionDetailsResponse, error) {
	if !canReviewUserWallet(actor) {
		return nil, ErrForbidden
	}
	normalizedReq, err := normalizeAdminFundsMutationRequest(req, "DEPOSIT")
	if err != nil {
		return nil, err
	}
	return s.repo.CreateAdminFundsCredit(ctx, actor.UserID, strings.TrimSpace(userID), normalizedReq)
}

func (s *walletService) CreateAdminFundsDebit(ctx context.Context, actor models.AuthClaims, userID string, req *models.AdminFundsMutationRequest) (*models.PaymentTransactionDetailsResponse, error) {
	if !canReviewUserWallet(actor) {
		return nil, ErrForbidden
	}
	normalizedReq, err := normalizeAdminFundsMutationRequest(req, "WITHDRAWAL")
	if err != nil {
		return nil, err
	}
	return s.repo.CreateAdminFundsDebit(ctx, actor.UserID, strings.TrimSpace(userID), normalizedReq)
}

func (s *walletService) HandlePaymentStateChanged(ctx context.Context, notification *models.PaymentStateChangedNotification) (*models.PaymentStateChangedNotificationResponse, error) {
	if strings.TrimSpace(notification.MerchantTransactionID) == "" && strings.TrimSpace(notification.ProviderReference) == "" {
		return nil, errors.New("merchant transaction id or provider reference is required")
	}
	return s.repo.HandlePaymentStateChanged(ctx, notification)
}

func (s *walletService) VerifyCashDeposit(ctx context.Context, req *models.CashDepositVerificationRequest) (*models.CashDepositVerificationResponse, error) {
	if strings.TrimSpace(req.MerchantTransactionID) == "" {
		return nil, errors.New("merchant transaction id is required")
	}
	return s.repo.VerifyCashDeposit(ctx, req)
}

func (s *walletService) ListTransactions(ctx context.Context, actor models.AuthClaims, userID, txType, product string, page, limit int, startDate, endDate *time.Time) (*models.TransactionListResponse, error) {
	if !canAccessWallet(actor, userID) {
		return nil, ErrForbidden
	}
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	return s.repo.ListTransactions(ctx, userID, normalizeTransactionType(txType), normalizeTransactionProduct(product), page, limit, startDate, endDate)
}

func (s *walletService) ListAdminUserTransactions(ctx context.Context, actor models.AuthClaims, userID, txType, product string, page, limit int, startDate, endDate *time.Time) (*models.LegacyWalletHistoryResponse, error) {
	if !canReviewUserWallet(actor) {
		return nil, ErrForbidden
	}
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	response, err := s.repo.ListTransactions(ctx, strings.TrimSpace(userID), normalizeTransactionType(txType), normalizeTransactionProduct(product), page, limit, startDate, endDate)
	if err != nil {
		return nil, err
	}
	items := make([]models.LegacyWalletHistoryItem, 0, len(response.Data))
	for _, tx := range response.Data {
		items = append(items, toLegacyWalletHistoryItem(tx))
	}
	return &models.LegacyWalletHistoryResponse{
		Data:         items,
		CurrentPage:  response.Pagination.Page,
		ItemsPerPage: response.Pagination.Limit,
		TotalCount:   response.Pagination.Total,
	}, nil
}

func (s *walletService) GetTransactionDetails(ctx context.Context, actor models.AuthClaims, userID, transactionID string) (*models.PaymentTransactionDetailsResponse, error) {
	if !canAccessWallet(actor, userID) {
		return nil, ErrForbidden
	}
	if strings.TrimSpace(transactionID) == "" {
		return nil, errors.New("transaction id is required")
	}
	return s.repo.GetTransactionDetails(ctx, userID, strings.TrimSpace(transactionID))
}

func (s *walletService) ListAdminPaymentTransactions(ctx context.Context, actor models.AuthClaims, userID, txType, status, provider, assignedTo string, page, limit int) (*models.TransactionListResponse, error) {
	if !isAdmin(actor) {
		return nil, ErrForbidden
	}
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	return s.repo.ListAdminPaymentTransactions(ctx, strings.TrimSpace(userID), normalizeTransactionType(txType), strings.TrimSpace(status), strings.TrimSpace(provider), strings.TrimSpace(assignedTo), page, limit)
}

func (s *walletService) ExportAdminPaymentTransactionsCSV(ctx context.Context, actor models.AuthClaims, userID, txType, status, provider, assignedTo string) ([]byte, error) {
	if !isAdmin(actor) {
		return nil, ErrForbidden
	}
	const pageSize = 200
	page := 1
	var rows []models.WalletTransaction
	for {
		response, err := s.repo.ListAdminPaymentTransactions(ctx, strings.TrimSpace(userID), normalizeTransactionType(txType), strings.TrimSpace(status), strings.TrimSpace(provider), strings.TrimSpace(assignedTo), page, pageSize)
		if err != nil {
			return nil, err
		}
		rows = append(rows, response.Data...)
		if len(response.Data) == 0 || len(rows) >= response.Pagination.Total {
			break
		}
		page++
	}
	return buildAdminPaymentTransactionsCSV(rows)
}

func (s *walletService) ListAdminPaymentSummary(ctx context.Context, actor models.AuthClaims, userID, provider, assignedTo string) (*models.PaymentTransactionSummaryResponse, error) {
	if !isAdmin(actor) {
		return nil, ErrForbidden
	}
	return s.repo.ListAdminPaymentSummary(ctx, strings.TrimSpace(userID), strings.TrimSpace(provider), strings.TrimSpace(assignedTo))
}

func (s *walletService) ListAdminReconciliationQueue(ctx context.Context, actor models.AuthClaims, userID, provider, assignedTo string, page, limit int) (*models.TransactionListResponse, error) {
	if !isAdmin(actor) {
		return nil, ErrForbidden
	}
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}
	return s.repo.ListAdminReconciliationQueue(ctx, strings.TrimSpace(userID), strings.TrimSpace(provider), strings.TrimSpace(assignedTo), page, limit)
}

func (s *walletService) ExportAdminReconciliationQueueCSV(ctx context.Context, actor models.AuthClaims, userID, provider, assignedTo string) ([]byte, error) {
	if !isAdmin(actor) {
		return nil, ErrForbidden
	}
	const pageSize = 200
	page := 1
	var rows []models.WalletTransaction
	for {
		response, err := s.repo.ListAdminReconciliationQueue(ctx, strings.TrimSpace(userID), strings.TrimSpace(provider), strings.TrimSpace(assignedTo), page, pageSize)
		if err != nil {
			return nil, err
		}
		rows = append(rows, response.Data...)
		if len(response.Data) == 0 || len(rows) >= response.Pagination.Total {
			break
		}
		page++
	}
	return buildAdminPaymentTransactionsCSV(rows)
}

func (s *walletService) GetAdminPaymentTransactionDetails(ctx context.Context, actor models.AuthClaims, transactionID string) (*models.PaymentTransactionDetailsResponse, error) {
	if !isAdmin(actor) {
		return nil, ErrForbidden
	}
	if strings.TrimSpace(transactionID) == "" {
		return nil, errors.New("transaction id is required")
	}
	return s.repo.GetAdminPaymentTransactionDetails(ctx, strings.TrimSpace(transactionID))
}

func (s *walletService) GetAdminPaymentTransactionDetailsByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string) (*models.PaymentTransactionDetailsResponse, error) {
	if !isAdmin(actor) {
		return nil, ErrForbidden
	}
	providerReference = strings.TrimSpace(providerReference)
	if providerReference == "" {
		return nil, errors.New("provider reference is required")
	}
	return s.repo.GetAdminPaymentTransactionDetailsByProviderReference(ctx, providerReference)
}

func (s *walletService) ListAdminPaymentTransactionEvents(ctx context.Context, actor models.AuthClaims, transactionID string) (*models.PaymentTransactionEventListResponse, error) {
	if !isAdmin(actor) {
		return nil, ErrForbidden
	}
	if strings.TrimSpace(transactionID) == "" {
		return nil, errors.New("transaction id is required")
	}
	return s.repo.ListAdminPaymentTransactionEvents(ctx, strings.TrimSpace(transactionID))
}

func (s *walletService) ListAdminPaymentTransactionEventsByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string) (*models.PaymentTransactionEventListResponse, error) {
	if !isAdmin(actor) {
		return nil, ErrForbidden
	}
	providerReference = strings.TrimSpace(providerReference)
	if providerReference == "" {
		return nil, errors.New("provider reference is required")
	}
	return s.repo.ListAdminPaymentTransactionEventsByProviderReference(ctx, providerReference)
}

func (s *walletService) CancelProviderRequest(ctx context.Context, actor models.AuthClaims, req *models.ProviderCancelRequest) (*models.ProviderCancelResponse, error) {
	if !canManageProviderOps(actor) {
		return nil, ErrForbidden
	}
	if req == nil {
		return nil, errors.New("request is required")
	}
	normalized := &models.ProviderCancelRequest{
		Adapter:   strings.TrimSpace(req.Adapter),
		PlayerID:  strings.TrimSpace(req.PlayerID),
		BetID:     strings.TrimSpace(req.BetID),
		RequestID: strings.TrimSpace(req.RequestID),
		Reason:    strings.TrimSpace(req.Reason),
	}
	if normalized.Adapter == "" {
		return nil, errors.New("adapter is required")
	}
	if normalized.PlayerID == "" {
		return nil, errors.New("player id is required")
	}
	if normalized.BetID == "" {
		return nil, errors.New("bet id is required")
	}
	if normalized.RequestID == "" {
		return nil, errors.New("request id is required")
	}
	if normalized.Reason == "" {
		normalized.Reason = "manual provider cancel"
	}
	return s.repo.CancelProviderRequest(ctx, strings.TrimSpace(actor.UserID), normalized)
}

func (s *walletService) PreviewAdminPaymentReconciliation(ctx context.Context, actor models.AuthClaims, req *models.AdminPaymentReconciliationRequest) (*models.PaymentTransactionReconciliationPreviewResponse, error) {
	if !isAdmin(actor) {
		return nil, ErrForbidden
	}
	req.MerchantTransactionID = strings.TrimSpace(req.MerchantTransactionID)
	req.ProviderReference = strings.TrimSpace(req.ProviderReference)
	req.State = strings.TrimSpace(req.State)
	req.PaymentMethod = strings.TrimSpace(req.PaymentMethod)
	req.Reason = strings.TrimSpace(req.Reason)
	if req.MerchantTransactionID == "" && req.ProviderReference == "" {
		return nil, errors.New("merchant transaction id or provider reference is required")
	}
	if req.State == "" {
		return nil, errors.New("state is required")
	}
	return s.repo.PreviewAdminPaymentReconciliation(ctx, req)
}

func (s *walletService) UpdateAdminPaymentTransactionStatus(ctx context.Context, actor models.AuthClaims, transactionID string, req *models.PaymentTransactionStatusUpdateRequest) (*models.PaymentTransactionDetailsResponse, error) {
	if !isAdmin(actor) {
		return nil, ErrForbidden
	}
	if strings.TrimSpace(transactionID) == "" {
		return nil, errors.New("transaction id is required")
	}
	if strings.TrimSpace(req.Status) == "" {
		return nil, errors.New("status is required")
	}
	req.Status = strings.TrimSpace(req.Status)
	req.ProviderRef = strings.TrimSpace(req.ProviderRef)
	req.Reason = strings.TrimSpace(req.Reason)
	return s.repo.UpdateAdminPaymentTransactionStatus(ctx, strings.TrimSpace(transactionID), req)
}

func (s *walletService) UpdateAdminPaymentTransactionStatusByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string, req *models.PaymentTransactionStatusUpdateRequest) (*models.PaymentTransactionDetailsResponse, error) {
	if !isAdmin(actor) {
		return nil, ErrForbidden
	}
	providerReference = strings.TrimSpace(providerReference)
	if providerReference == "" {
		return nil, errors.New("provider reference is required")
	}
	if strings.TrimSpace(req.Status) == "" {
		return nil, errors.New("status is required")
	}
	req.Status = strings.TrimSpace(req.Status)
	req.ProviderRef = strings.TrimSpace(req.ProviderRef)
	req.Reason = strings.TrimSpace(req.Reason)
	details, err := s.repo.GetAdminPaymentTransactionDetailsByProviderReference(ctx, providerReference)
	if err != nil {
		return nil, err
	}
	return s.repo.UpdateAdminPaymentTransactionStatus(ctx, strings.TrimSpace(details.TransactionID), req)
}

func (s *walletService) ReconcileAdminPaymentTransaction(ctx context.Context, actor models.AuthClaims, req *models.AdminPaymentReconciliationRequest) (*models.PaymentTransactionDetailsResponse, error) {
	if !isAdmin(actor) {
		return nil, ErrForbidden
	}
	req.MerchantTransactionID = strings.TrimSpace(req.MerchantTransactionID)
	req.ProviderReference = strings.TrimSpace(req.ProviderReference)
	req.State = strings.TrimSpace(req.State)
	req.PaymentMethod = strings.TrimSpace(req.PaymentMethod)
	req.Reason = strings.TrimSpace(req.Reason)
	if req.MerchantTransactionID == "" && req.ProviderReference == "" {
		return nil, errors.New("merchant transaction id or provider reference is required")
	}
	if req.State == "" {
		return nil, errors.New("state is required")
	}
	return s.repo.ReconcileAdminPaymentTransaction(ctx, req)
}

func (s *walletService) SettleAdminPaymentTransaction(ctx context.Context, actor models.AuthClaims, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	if !isAdmin(actor) {
		return nil, ErrForbidden
	}
	if strings.TrimSpace(transactionID) == "" {
		return nil, errors.New("transaction id is required")
	}
	req.ProviderRef = strings.TrimSpace(req.ProviderRef)
	req.Reason = strings.TrimSpace(req.Reason)
	return s.repo.SettleAdminPaymentTransaction(ctx, strings.TrimSpace(transactionID), req)
}

func (s *walletService) SettleAdminPaymentTransactionByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	return s.applyAdminPaymentActionByProviderReference(ctx, actor, providerReference, req, s.repo.SettleAdminPaymentTransaction)
}

func (s *walletService) RefundAdminPaymentTransaction(ctx context.Context, actor models.AuthClaims, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	if !isAdmin(actor) {
		return nil, ErrForbidden
	}
	if strings.TrimSpace(transactionID) == "" {
		return nil, errors.New("transaction id is required")
	}
	req.ProviderRef = strings.TrimSpace(req.ProviderRef)
	req.Reason = strings.TrimSpace(req.Reason)
	return s.repo.RefundAdminPaymentTransaction(ctx, strings.TrimSpace(transactionID), req)
}

func (s *walletService) RefundAdminPaymentTransactionByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	return s.applyAdminPaymentActionByProviderReference(ctx, actor, providerReference, req, s.repo.RefundAdminPaymentTransaction)
}

func (s *walletService) ReverseAdminPaymentTransaction(ctx context.Context, actor models.AuthClaims, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	if !isAdmin(actor) {
		return nil, ErrForbidden
	}
	if strings.TrimSpace(transactionID) == "" {
		return nil, errors.New("transaction id is required")
	}
	req.ProviderRef = strings.TrimSpace(req.ProviderRef)
	req.Reason = strings.TrimSpace(req.Reason)
	return s.repo.ReverseAdminPaymentTransaction(ctx, strings.TrimSpace(transactionID), req)
}

func (s *walletService) ReverseAdminPaymentTransactionByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	return s.applyAdminPaymentActionByProviderReference(ctx, actor, providerReference, req, s.repo.ReverseAdminPaymentTransaction)
}

func (s *walletService) ChargebackAdminPaymentTransaction(ctx context.Context, actor models.AuthClaims, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	if !isAdmin(actor) {
		return nil, ErrForbidden
	}
	if strings.TrimSpace(transactionID) == "" {
		return nil, errors.New("transaction id is required")
	}
	req.ProviderRef = strings.TrimSpace(req.ProviderRef)
	req.Reason = strings.TrimSpace(req.Reason)
	return s.repo.ChargebackAdminPaymentTransaction(ctx, strings.TrimSpace(transactionID), req)
}

func (s *walletService) ChargebackAdminPaymentTransactionByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	return s.applyAdminPaymentActionByProviderReference(ctx, actor, providerReference, req, s.repo.ChargebackAdminPaymentTransaction)
}

func (s *walletService) RetryAdminPaymentTransaction(ctx context.Context, actor models.AuthClaims, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	if !isAdmin(actor) {
		return nil, ErrForbidden
	}
	if strings.TrimSpace(transactionID) == "" {
		return nil, errors.New("transaction id is required")
	}
	req.ProviderRef = strings.TrimSpace(req.ProviderRef)
	req.Reason = strings.TrimSpace(req.Reason)
	return s.repo.RetryAdminPaymentTransaction(ctx, strings.TrimSpace(transactionID), req)
}

func (s *walletService) RetryAdminPaymentTransactionByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	return s.applyAdminPaymentActionByProviderReference(ctx, actor, providerReference, req, s.repo.RetryAdminPaymentTransaction)
}

func (s *walletService) ApproveAdminPaymentTransaction(ctx context.Context, actor models.AuthClaims, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	if !isAdmin(actor) {
		return nil, ErrForbidden
	}
	if strings.TrimSpace(transactionID) == "" {
		return nil, errors.New("transaction id is required")
	}
	req.ProviderRef = strings.TrimSpace(req.ProviderRef)
	req.Reason = strings.TrimSpace(req.Reason)
	return s.repo.ApproveAdminPaymentTransaction(ctx, strings.TrimSpace(transactionID), req)
}

func (s *walletService) ApproveAdminPaymentTransactionByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	return s.applyAdminPaymentActionByProviderReference(ctx, actor, providerReference, req, s.repo.ApproveAdminPaymentTransaction)
}

func (s *walletService) DeclineAdminPaymentTransaction(ctx context.Context, actor models.AuthClaims, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	if !isAdmin(actor) {
		return nil, ErrForbidden
	}
	if strings.TrimSpace(transactionID) == "" {
		return nil, errors.New("transaction id is required")
	}
	req.ProviderRef = strings.TrimSpace(req.ProviderRef)
	req.Reason = strings.TrimSpace(req.Reason)
	return s.repo.DeclineAdminPaymentTransaction(ctx, strings.TrimSpace(transactionID), req)
}

func (s *walletService) DeclineAdminPaymentTransactionByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	return s.applyAdminPaymentActionByProviderReference(ctx, actor, providerReference, req, s.repo.DeclineAdminPaymentTransaction)
}

func (s *walletService) AssignAdminPaymentTransaction(ctx context.Context, actor models.AuthClaims, transactionID string, req *models.PaymentTransactionAssignmentRequest) (*models.PaymentTransactionDetailsResponse, error) {
	if !isAdmin(actor) {
		return nil, ErrForbidden
	}
	transactionID = strings.TrimSpace(transactionID)
	if transactionID == "" {
		return nil, errors.New("transaction id is required")
	}
	req.AssignedTo = strings.TrimSpace(req.AssignedTo)
	req.Reason = strings.TrimSpace(req.Reason)
	return s.repo.AssignAdminPaymentTransaction(ctx, transactionID, req.AssignedTo, req.Reason)
}

func (s *walletService) AssignAdminPaymentTransactionByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string, req *models.PaymentTransactionAssignmentRequest) (*models.PaymentTransactionDetailsResponse, error) {
	if !isAdmin(actor) {
		return nil, ErrForbidden
	}
	providerReference = strings.TrimSpace(providerReference)
	if providerReference == "" {
		return nil, errors.New("provider reference is required")
	}
	req.AssignedTo = strings.TrimSpace(req.AssignedTo)
	req.Reason = strings.TrimSpace(req.Reason)
	details, err := s.repo.GetAdminPaymentTransactionDetailsByProviderReference(ctx, providerReference)
	if err != nil {
		return nil, err
	}
	return s.repo.AssignAdminPaymentTransaction(ctx, strings.TrimSpace(details.TransactionID), req.AssignedTo, req.Reason)
}

func (s *walletService) AddAdminPaymentTransactionNote(ctx context.Context, actor models.AuthClaims, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionEventListResponse, error) {
	if !isAdmin(actor) {
		return nil, ErrForbidden
	}
	transactionID = strings.TrimSpace(transactionID)
	if transactionID == "" {
		return nil, errors.New("transaction id is required")
	}
	req.Reason = strings.TrimSpace(req.Reason)
	if req.Reason == "" {
		return nil, errors.New("reason is required")
	}
	return s.repo.AddAdminPaymentTransactionNote(ctx, transactionID, req.Reason, actor.UserID)
}

func (s *walletService) AddAdminPaymentTransactionNoteByProviderReference(ctx context.Context, actor models.AuthClaims, providerReference string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionEventListResponse, error) {
	if !isAdmin(actor) {
		return nil, ErrForbidden
	}
	providerReference = strings.TrimSpace(providerReference)
	if providerReference == "" {
		return nil, errors.New("provider reference is required")
	}
	req.Reason = strings.TrimSpace(req.Reason)
	if req.Reason == "" {
		return nil, errors.New("reason is required")
	}
	details, err := s.repo.GetAdminPaymentTransactionDetailsByProviderReference(ctx, providerReference)
	if err != nil {
		return nil, err
	}
	return s.repo.AddAdminPaymentTransactionNote(ctx, strings.TrimSpace(details.TransactionID), req.Reason, actor.UserID)
}

func (s *walletService) ApplyReferralReward(ctx context.Context, actor models.AuthClaims, userID, referralCode string) (*models.ApplyReferralRewardResponse, error) {
	if !canAccessWallet(actor, userID) {
		return nil, ErrForbidden
	}
	if strings.TrimSpace(referralCode) == "" {
		return nil, errors.New("referral_code is required")
	}
	return s.repo.ApplyReferralReward(ctx, userID, referralCode)
}

func (s *walletService) ReserveFunds(ctx context.Context, actor models.AuthClaims, userID string, req *models.ReserveFundsRequest) (*models.ReserveFundsResponse, error) {
	if !canReserve(actor, userID) {
		return nil, ErrForbidden
	}
	if req.Amount.LessThanOrEqual(decimal.Zero) {
		return nil, errors.New("amount must be positive")
	}
	if strings.TrimSpace(req.ReferenceID) == "" || strings.TrimSpace(req.ReferenceType) == "" {
		return nil, errors.New("reference_id and reference_type are required")
	}
	return s.repo.ReserveFunds(ctx, userID, req)
}

func (s *walletService) ReleaseReservedFunds(ctx context.Context, actor models.AuthClaims, userID string, req *models.ReleaseReserveRequest) (*models.ReleaseReserveResponse, error) {
	if !canReserve(actor, userID) {
		return nil, ErrForbidden
	}
	if req.Amount.LessThanOrEqual(decimal.Zero) {
		return nil, errors.New("amount must be positive")
	}
	if strings.TrimSpace(req.ReservationID) == "" {
		return nil, errors.New("reservation_id is required")
	}
	return s.repo.ReleaseReservedFunds(ctx, userID, req)
}

func canAccessWallet(actor models.AuthClaims, userID string) bool {
	return actor.UserID == userID || actor.Role == "admin"
}

func canReviewUserWallet(actor models.AuthClaims) bool {
	role := strings.TrimSpace(strings.ToLower(actor.Role))
	return role == "admin" || role == "operator" || role == "internal"
}

func canManageProviderOps(actor models.AuthClaims) bool {
	role := strings.TrimSpace(strings.ToLower(actor.Role))
	return role == "admin" || role == "operator" || role == "trader"
}

func canReserve(actor models.AuthClaims, userID string) bool {
	return actor.Role == "admin" || actor.UserID == userID || actor.Role == "internal"
}

func isAdmin(actor models.AuthClaims) bool {
	return strings.EqualFold(strings.TrimSpace(actor.Role), "admin")
}

func normalizeTransactionType(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "", "all":
		return ""
	case "deposit":
		return "deposit"
	case "withdrawal":
		return "withdrawal"
	case "bet_placed":
		return "bet_place"
	case "bet_placement":
		return "bet_place"
	case "bet_settlement":
		return "bet_settlement"
	default:
		return value
	}
}

func normalizeTransactionProduct(value string) string {
	switch strings.ToUpper(strings.TrimSpace(value)) {
	case "", "ALL":
		return ""
	case "SPORTSBOOK":
		return "SPORTSBOOK"
	case "PREDICTION":
		return "PREDICTION"
	default:
		return ""
	}
}

func normalizeAdminFundsMutationRequest(req *models.AdminFundsMutationRequest, defaultReason string) (*models.AdminFundsMutationRequest, error) {
	if req == nil {
		return nil, errors.New("request is required")
	}
	if req.Amount.Amount.LessThanOrEqual(decimal.Zero) {
		return nil, errors.New("amount must be positive")
	}
	details := strings.TrimSpace(req.Details)
	if details == "" {
		return nil, errors.New("details is required")
	}
	currency := strings.ToUpper(strings.TrimSpace(req.Amount.Currency))
	if currency == "" {
		currency = "USD"
	}
	return &models.AdminFundsMutationRequest{
		Amount: models.AdminFundsMutationAmount{
			Amount:   req.Amount.Amount,
			Currency: currency,
		},
		Details: details,
		Reason:  normalizeAdminFundsReason(req.Reason, defaultReason),
	}, nil
}

func normalizeAdminFundsReason(value, fallback string) string {
	switch strings.ToUpper(strings.TrimSpace(value)) {
	case "ADJUSTMENT":
		return "ADJUSTMENT"
	case "DEPOSIT":
		return "DEPOSIT"
	case "WITHDRAWAL":
		return "WITHDRAWAL"
	default:
		return strings.ToUpper(strings.TrimSpace(fallback))
	}
}

func toLegacyWalletHistoryItem(tx models.WalletTransaction) models.LegacyWalletHistoryItem {
	currency := strings.TrimSpace(tx.Currency)
	if currency == "" {
		currency = "USD"
	}
	return models.LegacyWalletHistoryItem{
		WalletID:      tx.WalletID,
		TransactionID: tx.TransactionID,
		CreatedAt:     tx.CreatedAt,
		Status:        legacyWalletStatus(tx.Status),
		Product:       normalizeTransactionProduct(tx.Product),
		Category:      legacyWalletCategory(tx),
		ExternalID:    firstNonEmpty(tx.ProviderRef, tx.Reference),
		PaymentMethod: legacyWalletPaymentMethod(tx),
		TransactionAmount: models.LegacyWalletAmount{
			Amount:   tx.Amount,
			Currency: currency,
		},
		PreTransactionBalance: models.LegacyWalletAmount{
			Amount:   tx.BalanceBefore,
			Currency: currency,
		},
		PostTransactionBalance: models.LegacyWalletAmount{
			Amount:   tx.BalanceAfter,
			Currency: currency,
		},
	}
}

func legacyWalletStatus(status string) string {
	switch strings.ToUpper(strings.TrimSpace(status)) {
	case "PENDING", "PENDING_APPROVAL", "PENDING_REVIEW", "PROCESSING", "ACTION_REQUIRED", "RETRYING":
		return "PENDING"
	case "DECLINED", "FAILED", "CANCELLED", "REVERSED", "REFUNDED", "CHARGEBACK":
		return "CANCELLED"
	default:
		return "COMPLETED"
	}
}

func legacyWalletCategory(tx models.WalletTransaction) string {
	switch strings.ToLower(strings.TrimSpace(tx.Type)) {
	case "deposit":
		return "DEPOSIT"
	case "withdrawal":
		return "WITHDRAWAL"
	case "bet_placed", "bet_place":
		return "BET_PLACEMENT"
	case "bet_win", "bet_refund", "bet_settlement":
		return "BET_SETTLEMENT"
	default:
		if tx.Amount.IsNegative() {
			return "ADJUSTMENT_WITHDRAWAL"
		}
		return "ADJUSTMENT_DEPOSIT"
	}
}

func legacyWalletPaymentMethod(tx models.WalletTransaction) *models.LegacyWalletPaymentMethod {
	switch strings.ToLower(strings.TrimSpace(tx.Type)) {
	case "bet_placed", "bet_place", "bet_win", "bet_refund", "bet_settlement":
		return nil
	}
	methodType := "NOT_APPLICABLE_PAYMENT_METHOD"
	kind := strings.ToLower(firstNonEmpty(tx.Provider, tx.Reference, tx.Description))
	details := firstNonEmpty(tx.ProviderRef, tx.Provider, tx.Reference)
	switch {
	case strings.Contains(kind, "cheque"), strings.Contains(kind, "check"):
		methodType = "CHEQUE_WITHDRAWAL_PAYMENT_METHOD"
	case strings.Contains(kind, "cash"):
		methodType = "CASH_WITHDRAWAL_PAYMENT_METHOD"
	case strings.Contains(kind, "card"), strings.Contains(kind, "credit"), strings.Contains(kind, "debit"), tx.ProviderRef != "":
		methodType = "CREDIT_CARD_PAYMENT_METHOD"
	case strings.Contains(kind, "manual"), strings.Contains(kind, "backoffice"), strings.Contains(kind, "adjustment"):
		methodType = "BACKOFFICE_MANUAL_PAYMENT_METHOD"
	}
	if methodType == "BACKOFFICE_MANUAL_PAYMENT_METHOD" && strings.TrimSpace(tx.Reference) != "" {
		details = tx.Reference
	}
	return &models.LegacyWalletPaymentMethod{
		AdminPunterID: tx.UserID,
		Details:       details,
		Type:          methodType,
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if trimmed := strings.TrimSpace(value); trimmed != "" {
			return trimmed
		}
	}
	return ""
}

func buildAdminPaymentTransactionsCSV(rows []models.WalletTransaction) ([]byte, error) {
	var buffer bytes.Buffer
	writer := csv.NewWriter(&buffer)
	if err := writer.Write([]string{
		"transaction_id",
		"user_id",
		"type",
		"status",
		"amount",
		"provider",
		"provider_reference",
		"assigned_to",
		"assigned_at",
		"created_at",
	}); err != nil {
		return nil, err
	}
	for _, row := range rows {
		assignedAt := ""
		if row.AssignedAt != nil {
			assignedAt = row.AssignedAt.UTC().Format(time.RFC3339)
		}
		if err := writer.Write([]string{
			row.TransactionID,
			row.UserID,
			row.Type,
			row.Status,
			row.Amount.String(),
			row.Provider,
			row.ProviderRef,
			row.AssignedTo,
			assignedAt,
			row.CreatedAt.UTC().Format(time.RFC3339),
		}); err != nil {
			return nil, err
		}
	}
	writer.Flush()
	if err := writer.Error(); err != nil {
		return nil, err
	}
	return buffer.Bytes(), nil
}

func isProviderMode(cfg *config.Config) bool {
	if cfg == nil {
		return false
	}
	switch strings.ToLower(strings.TrimSpace(cfg.PaymentProviderMode)) {
	case "provider", "orchestrated", "pxp":
		return true
	default:
		return false
	}
}

func (s *walletService) applyAdminPaymentActionByProviderReference(
	ctx context.Context,
	actor models.AuthClaims,
	providerReference string,
	req *models.PaymentTransactionActionRequest,
	action func(context.Context, string, *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error),
) (*models.PaymentTransactionDetailsResponse, error) {
	if !isAdmin(actor) {
		return nil, ErrForbidden
	}
	providerReference = strings.TrimSpace(providerReference)
	if providerReference == "" {
		return nil, errors.New("provider reference is required")
	}
	req.ProviderRef = strings.TrimSpace(req.ProviderRef)
	req.Reason = strings.TrimSpace(req.Reason)
	details, err := s.repo.GetAdminPaymentTransactionDetailsByProviderReference(ctx, providerReference)
	if err != nil {
		return nil, err
	}
	if req.ProviderRef == "" {
		req.ProviderRef = providerReference
	}
	return action(ctx, strings.TrimSpace(details.TransactionID), req)
}
