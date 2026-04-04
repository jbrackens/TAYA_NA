package repository

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/shopspring/decimal"

	"github.com/phoenixbot/phoenix-wallet/internal/models"
)

var ErrNotFound = errors.New("not found")

const (
	providerCancelAuditEntityType = "provider_cancel"
	providerCancelSucceededAction = "provider.cancel.succeeded"
	providerCancelFailedAction    = "provider.cancel.failed"
)

type auditLogEntry struct {
	ActorID    string
	Action     string
	EntityType string
	EntityID   string
	OldValue   any
	NewValue   any
	IPAddress  string
	CreatedAt  time.Time
}

type WalletRepository interface {
	CreateWallet(ctx context.Context, userID, currency string) (*models.Wallet, error)
	GetWalletByUserID(ctx context.Context, userID string) (*models.Wallet, error)
	GetWalletByID(ctx context.Context, walletID string) (*models.Wallet, error)
	GetWalletSummary(ctx context.Context, userID string) (*models.WalletSummary, error)
	GetFinancialSummary(ctx context.Context, userID string) (*models.FinancialSummaryResponse, error)
	CreateDeposit(ctx context.Context, userID string, req *models.DepositRequest) (*models.DepositResponse, error)
	CreatePendingDeposit(ctx context.Context, userID string, req *models.DepositRequest) (*models.DepositResponse, error)
	CreateWithdrawal(ctx context.Context, userID string, req *models.WithdrawalRequest) (*models.WithdrawalResponse, error)
	CreatePendingWithdrawal(ctx context.Context, userID string, req *models.WithdrawalRequest) (*models.WithdrawalResponse, error)
	CreateAdminFundsCredit(ctx context.Context, actorUserID, userID string, req *models.AdminFundsMutationRequest) (*models.PaymentTransactionDetailsResponse, error)
	CreateAdminFundsDebit(ctx context.Context, actorUserID, userID string, req *models.AdminFundsMutationRequest) (*models.PaymentTransactionDetailsResponse, error)
	HandlePaymentStateChanged(ctx context.Context, notification *models.PaymentStateChangedNotification) (*models.PaymentStateChangedNotificationResponse, error)
	VerifyCashDeposit(ctx context.Context, req *models.CashDepositVerificationRequest) (*models.CashDepositVerificationResponse, error)
	ListTransactions(ctx context.Context, userID, txType, product string, page, limit int, startDate, endDate *time.Time) (*models.TransactionListResponse, error)
	GetTransactionDetails(ctx context.Context, userID, transactionID string) (*models.PaymentTransactionDetailsResponse, error)
	ListAdminPaymentTransactions(ctx context.Context, userID, txType, status, provider, assignedTo string, page, limit int) (*models.TransactionListResponse, error)
	ListAdminPaymentSummary(ctx context.Context, userID, provider, assignedTo string) (*models.PaymentTransactionSummaryResponse, error)
	ListAdminReconciliationQueue(ctx context.Context, userID, provider, assignedTo string, page, limit int) (*models.TransactionListResponse, error)
	GetAdminPaymentTransactionDetails(ctx context.Context, transactionID string) (*models.PaymentTransactionDetailsResponse, error)
	GetAdminPaymentTransactionDetailsByProviderReference(ctx context.Context, providerReference string) (*models.PaymentTransactionDetailsResponse, error)
	ListAdminPaymentTransactionEvents(ctx context.Context, transactionID string) (*models.PaymentTransactionEventListResponse, error)
	ListAdminPaymentTransactionEventsByProviderReference(ctx context.Context, providerReference string) (*models.PaymentTransactionEventListResponse, error)
	CancelProviderRequest(ctx context.Context, actorUserID string, req *models.ProviderCancelRequest) (*models.ProviderCancelResponse, error)
	PreviewAdminPaymentReconciliation(ctx context.Context, req *models.AdminPaymentReconciliationRequest) (*models.PaymentTransactionReconciliationPreviewResponse, error)
	UpdateAdminPaymentTransactionStatus(ctx context.Context, transactionID string, req *models.PaymentTransactionStatusUpdateRequest) (*models.PaymentTransactionDetailsResponse, error)
	ReconcileAdminPaymentTransaction(ctx context.Context, req *models.AdminPaymentReconciliationRequest) (*models.PaymentTransactionDetailsResponse, error)
	SettleAdminPaymentTransaction(ctx context.Context, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error)
	RefundAdminPaymentTransaction(ctx context.Context, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error)
	ReverseAdminPaymentTransaction(ctx context.Context, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error)
	ChargebackAdminPaymentTransaction(ctx context.Context, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error)
	RetryAdminPaymentTransaction(ctx context.Context, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error)
	ApproveAdminPaymentTransaction(ctx context.Context, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error)
	DeclineAdminPaymentTransaction(ctx context.Context, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error)
	AssignAdminPaymentTransaction(ctx context.Context, transactionID, assignedTo, reason string) (*models.PaymentTransactionDetailsResponse, error)
	AddAdminPaymentTransactionNote(ctx context.Context, transactionID, note, actor string) (*models.PaymentTransactionEventListResponse, error)
	ApplyReferralReward(ctx context.Context, userID, referralCode string) (*models.ApplyReferralRewardResponse, error)
	ReserveFunds(ctx context.Context, userID string, req *models.ReserveFundsRequest) (*models.ReserveFundsResponse, error)
	ReleaseReservedFunds(ctx context.Context, userID string, req *models.ReleaseReserveRequest) (*models.ReleaseReserveResponse, error)
}

type postgresWalletRepository struct {
	pool *pgxpool.Pool
}

type referralCodeRecord struct {
	ID        string
	UserID    string
	Code      string
	UsesCount int
}

func NewWalletRepository(pool *pgxpool.Pool) WalletRepository {
	return &postgresWalletRepository{pool: pool}
}

func (r *postgresWalletRepository) CreateWallet(ctx context.Context, userID, currency string) (*models.Wallet, error) {
	return r.getOrCreateWallet(ctx, userID, strings.ToUpper(strings.TrimSpace(currency)))
}

func (r *postgresWalletRepository) GetWalletByUserID(ctx context.Context, userID string) (*models.Wallet, error) {
	const query = `SELECT id, user_id, balance, currency, status, created_at, updated_at FROM wallets WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`
	return r.scanWallet(r.pool.QueryRow(ctx, query, userID))
}

func (r *postgresWalletRepository) GetWalletByID(ctx context.Context, walletID string) (*models.Wallet, error) {
	const query = `SELECT id, user_id, balance, currency, status, created_at, updated_at FROM wallets WHERE id = $1`
	return r.scanWallet(r.pool.QueryRow(ctx, query, walletID))
}

func (r *postgresWalletRepository) GetWalletSummary(ctx context.Context, userID string) (*models.WalletSummary, error) {
	wallet, err := r.GetWalletByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	reserved, err := r.getReservedBalance(ctx, wallet.ID)
	if err != nil {
		return nil, err
	}
	return &models.WalletSummary{
		UserID:      wallet.UserID,
		Balance:     wallet.Balance,
		Currency:    wallet.Currency,
		Reserved:    reserved,
		Available:   wallet.Balance.Sub(reserved),
		LastUpdated: wallet.UpdatedAt,
	}, nil
}

func (r *postgresWalletRepository) GetFinancialSummary(ctx context.Context, userID string) (*models.FinancialSummaryResponse, error) {
	wallet, err := r.GetWalletByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}

	var (
		lifetimeDeposits    decimal.Decimal
		lifetimeWithdrawals decimal.Decimal
		sportsbookExposure  decimal.Decimal
		predictionExposure  decimal.Decimal
		openPrediction      int
		settledPrediction   int
		cancelledPrediction int
	)

	if err := r.pool.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(CASE WHEN wt.type = 'deposit' THEN wt.amount ELSE 0 END), 0),
			COALESCE(SUM(CASE WHEN wt.type = 'withdrawal' THEN ABS(wt.amount) ELSE 0 END), 0)
		FROM wallet_transactions wt
		JOIN wallets w ON w.id = wt.wallet_id
		WHERE w.user_id = $1
	`, userID).Scan(&lifetimeDeposits, &lifetimeWithdrawals); err != nil {
		return nil, err
	}

	if err := r.pool.QueryRow(ctx, `
		SELECT COALESCE(SUM(stake), 0)
		FROM bets
		WHERE user_id = $1 AND status = 'pending'
	`, userID).Scan(&sportsbookExposure); err != nil {
		return nil, err
	}

	if err := r.pool.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(stake_usd) FILTER (WHERE status = 'open'), 0),
			COUNT(*) FILTER (WHERE status = 'open'),
			COUNT(*) FILTER (WHERE status NOT IN ('open', 'cancelled')),
			COUNT(*) FILTER (WHERE status = 'cancelled')
		FROM prediction_orders
		WHERE user_id = $1
	`, userID).Scan(&predictionExposure, &openPrediction, &settledPrediction, &cancelledPrediction); err != nil {
		return nil, err
	}

	return &models.FinancialSummaryResponse{
		CurrentBalance:      wallet.Balance,
		OpenedBets:          sportsbookExposure.Add(predictionExposure),
		PendingWithdrawals:  lifetimeWithdrawals,
		LifetimeDeposits:    lifetimeDeposits,
		LifetimeWithdrawals: lifetimeWithdrawals,
		NetCash:             lifetimeDeposits.Sub(lifetimeWithdrawals),
		ProductBreakdown: models.FinancialSummaryProductBreakdown{
			Sportsbook: models.ProductExposureSummary{OpenExposure: sportsbookExposure},
			Prediction: models.PredictionProductSummary{
				OpenExposure:    predictionExposure,
				OpenOrders:      openPrediction,
				SettledOrders:   settledPrediction,
				CancelledOrders: cancelledPrediction,
			},
		},
	}, nil
}

func (r *postgresWalletRepository) CreateDeposit(ctx context.Context, userID string, req *models.DepositRequest) (*models.DepositResponse, error) {
	wallet, err := r.getOrCreateWallet(ctx, userID, req.Currency)
	if err != nil {
		return nil, err
	}
	_, txRecord, err := r.applyBalanceMutation(ctx, wallet.ID, mutationInput{
		transactionType: "deposit",
		status:          "SUCCEEDED",
		amount:          req.Amount,
		reference:       req.PaymentMethod,
		provider:        paymentProviderFor(req.PaymentMethod),
		providerRef:     uuid.NewString(),
		metadata:        map[string]any{"payment_token": req.PaymentToken, "payment_method": req.PaymentMethod, "orchestration_mode": "inline"},
		eventType:       "WalletDepositCreated",
		outboxTopic:     "phoenix.wallet.transactions",
	})
	if err != nil {
		return nil, err
	}
	return &models.DepositResponse{
		DepositID:     txRecord.TransactionID,
		TransactionID: txRecord.TransactionID,
		UserID:        userID,
		Amount:        req.Amount,
		Status:        "SUCCEEDED",
		CreatedAt:     txRecord.CreatedAt,
	}, nil
}

func (r *postgresWalletRepository) CreatePendingDeposit(ctx context.Context, userID string, req *models.DepositRequest) (*models.DepositResponse, error) {
	wallet, err := r.getOrCreateWallet(ctx, userID, req.Currency)
	if err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	transactionID := uuid.NewString()
	provider := paymentProviderFor(req.PaymentMethod)
	providerRef := transactionID
	metadataBytes, _ := json.Marshal(map[string]any{
		"payment_token":      req.PaymentToken,
		"payment_method":     req.PaymentMethod,
		"orchestration_mode": "provider",
	})
	_, err = r.pool.Exec(ctx, `
		INSERT INTO wallet_transactions (
			id, wallet_id, type, status, amount, balance_before, balance_after, reference, provider, provider_reference, provider_updated_at, metadata, created_at
		)
		VALUES ($1, $2, 'deposit', 'PENDING', $3, $4, $4, NULLIF($5, ''), NULLIF($6, ''), $7, $8, $9, $8)
	`, transactionID, wallet.ID, req.Amount, wallet.Balance, req.PaymentMethod, provider, providerRef, now, metadataBytes)
	if err != nil {
		return nil, err
	}
	if err := r.recordPaymentTransactionEvent(ctx, transactionID, "PENDING", "system", "provider_pending_created", provider, providerRef, map[string]any{
		"payment_method":   req.PaymentMethod,
		"transaction_type": "deposit",
	}); err != nil {
		return nil, err
	}
	return &models.DepositResponse{
		DepositID:     transactionID,
		TransactionID: transactionID,
		UserID:        userID,
		Amount:        req.Amount,
		Status:        "PENDING",
		CreatedAt:     now,
	}, nil
}

func (r *postgresWalletRepository) CreateWithdrawal(ctx context.Context, userID string, req *models.WithdrawalRequest) (*models.WithdrawalResponse, error) {
	wallet, err := r.GetWalletByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	reserved, err := r.getReservedBalance(ctx, wallet.ID)
	if err != nil {
		return nil, err
	}
	available := wallet.Balance.Sub(reserved)
	if available.LessThan(req.Amount) {
		return nil, fmt.Errorf("insufficient available balance")
	}
	_, txRecord, err := r.applyBalanceMutation(ctx, wallet.ID, mutationInput{
		transactionType: "withdrawal",
		status:          "PENDING",
		amount:          req.Amount.Neg(),
		reference:       req.BankAccountID,
		provider:        paymentProviderFor(req.BankAccountID),
		providerRef:     uuid.NewString(),
		metadata:        map[string]any{"bank_account_id": req.BankAccountID, "payment_method": req.BankAccountID, "orchestration_mode": "inline"},
		eventType:       "WalletWithdrawalCreated",
		outboxTopic:     "phoenix.wallet.transactions",
	})
	if err != nil {
		return nil, err
	}
	return &models.WithdrawalResponse{
		WithdrawalID:  txRecord.TransactionID,
		TransactionID: txRecord.TransactionID,
		UserID:        userID,
		Amount:        req.Amount,
		Status:        "PENDING",
		CreatedAt:     txRecord.CreatedAt,
	}, nil
}

func (r *postgresWalletRepository) CreatePendingWithdrawal(ctx context.Context, userID string, req *models.WithdrawalRequest) (*models.WithdrawalResponse, error) {
	wallet, err := r.GetWalletByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	reserved, err := r.getReservedBalance(ctx, wallet.ID)
	if err != nil {
		return nil, err
	}
	available := wallet.Balance.Sub(reserved)
	if available.LessThan(req.Amount) {
		return nil, fmt.Errorf("insufficient available balance")
	}
	reservationID := uuid.NewString()
	if err := r.appendReservationEvent(ctx, wallet.ID, "WalletFundsReserved", map[string]any{
		"reservation_id": reservationID,
		"amount":         req.Amount.String(),
		"reference_id":   reservationID,
		"reference_type": "withdrawal",
		"action":         "reserve",
	}); err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	transactionID := uuid.NewString()
	provider := paymentProviderFor(req.BankAccountID)
	providerRef := transactionID
	metadataBytes, _ := json.Marshal(map[string]any{
		"bank_account_id":    req.BankAccountID,
		"payment_method":     req.BankAccountID,
		"orchestration_mode": "provider",
		"reservation_id":     reservationID,
	})
	_, err = r.pool.Exec(ctx, `
		INSERT INTO wallet_transactions (
			id, wallet_id, type, status, amount, balance_before, balance_after, reference, provider, provider_reference, provider_updated_at, metadata, created_at
		)
		VALUES ($1, $2, 'withdrawal', 'PENDING', $3, $4, $4, NULLIF($5, ''), NULLIF($6, ''), $7, $8, $9, $8)
	`, transactionID, wallet.ID, req.Amount.Neg(), wallet.Balance, req.BankAccountID, provider, providerRef, now, metadataBytes)
	if err != nil {
		return nil, err
	}
	if err := r.recordPaymentTransactionEvent(ctx, transactionID, "PENDING", "system", "provider_pending_created", provider, providerRef, map[string]any{
		"payment_method":   req.BankAccountID,
		"transaction_type": "withdrawal",
		"reservation_id":   reservationID,
	}); err != nil {
		return nil, err
	}
	return &models.WithdrawalResponse{
		WithdrawalID:  transactionID,
		TransactionID: transactionID,
		UserID:        userID,
		Amount:        req.Amount,
		Status:        "PENDING",
		CreatedAt:     now,
	}, nil
}

func (r *postgresWalletRepository) CreateAdminFundsCredit(ctx context.Context, actorUserID, userID string, req *models.AdminFundsMutationRequest) (*models.PaymentTransactionDetailsResponse, error) {
	wallet, err := r.getOrCreateWallet(ctx, userID, normalizeAdminFundsCurrency(req.Amount.Currency))
	if err != nil {
		return nil, err
	}
	wallet, txRecord, err := r.applyBalanceMutation(ctx, wallet.ID, mutationInput{
		transactionType: "deposit",
		status:          "SUCCEEDED",
		amount:          req.Amount.Amount,
		reference:       strings.TrimSpace(req.Details),
		provider:        adminFundsProvider(req.Reason),
		metadata: map[string]any{
			"details":       strings.TrimSpace(req.Details),
			"reason":        strings.TrimSpace(req.Reason),
			"actor_user_id": strings.TrimSpace(actorUserID),
			"operation":     "manual_credit",
		},
		eventType:   "WalletManualCreditApplied",
		outboxTopic: "phoenix.wallet.transactions",
	})
	if err != nil {
		return nil, err
	}
	return adminFundsResponse(txRecord, wallet.Currency, "Deposit"), nil
}

func (r *postgresWalletRepository) CreateAdminFundsDebit(ctx context.Context, actorUserID, userID string, req *models.AdminFundsMutationRequest) (*models.PaymentTransactionDetailsResponse, error) {
	wallet, err := r.GetWalletByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	reserved, err := r.getReservedBalance(ctx, wallet.ID)
	if err != nil {
		return nil, err
	}
	available := wallet.Balance.Sub(reserved)
	if available.LessThan(req.Amount.Amount) {
		return nil, fmt.Errorf("insufficient available balance")
	}
	wallet, txRecord, err := r.applyBalanceMutation(ctx, wallet.ID, mutationInput{
		transactionType: "withdrawal",
		status:          "SUCCEEDED",
		amount:          req.Amount.Amount.Neg(),
		reference:       strings.TrimSpace(req.Details),
		provider:        adminFundsProvider(req.Reason),
		metadata: map[string]any{
			"details":       strings.TrimSpace(req.Details),
			"reason":        strings.TrimSpace(req.Reason),
			"actor_user_id": strings.TrimSpace(actorUserID),
			"operation":     "manual_debit",
		},
		eventType:   "WalletManualDebitApplied",
		outboxTopic: "phoenix.wallet.transactions",
	})
	if err != nil {
		return nil, err
	}
	return adminFundsResponse(txRecord, wallet.Currency, "Withdrawal"), nil
}

func (r *postgresWalletRepository) ListTransactions(ctx context.Context, userID, txType, product string, page, limit int, startDate, endDate *time.Time) (*models.TransactionListResponse, error) {
	offset := (page - 1) * limit
	filters := []string{"w.user_id = $1"}
	args := []any{userID}
	argIndex := 2
	if txType == "bet_settlement" {
		filters = append(filters, "wt.type = ANY($2)")
		args = append(args, []string{"bet_win", "bet_refund"})
		argIndex++
	} else if txType != "" {
		filters = append(filters, fmt.Sprintf("wt.type = $%d", argIndex))
		args = append(args, txType)
		argIndex++
	}
	if product == "PREDICTION" {
		filters = append(filters, "po.id IS NOT NULL")
	} else if product == "SPORTSBOOK" {
		filters = append(filters, "po.id IS NULL")
	}
	if startDate != nil {
		filters = append(filters, fmt.Sprintf("wt.created_at >= $%d", argIndex))
		args = append(args, *startDate)
		argIndex++
	}
	if endDate != nil {
		filters = append(filters, fmt.Sprintf("wt.created_at <= $%d", argIndex))
		args = append(args, *endDate)
		argIndex++
	}
	whereClause := strings.Join(filters, " AND ")
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM wallet_transactions wt
		JOIN wallets w ON w.id = wt.wallet_id
		LEFT JOIN prediction_orders po ON po.id::text = wt.reference AND po.user_id = w.user_id::uuid
		WHERE %s
	`, whereClause)
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, err
	}
	args = append(args, limit, offset)
	query := fmt.Sprintf(`
		SELECT wt.id, wt.wallet_id, w.user_id, wt.type, COALESCE(wt.status, ''), CASE WHEN po.id IS NOT NULL THEN 'PREDICTION' ELSE 'SPORTSBOOK' END AS product, w.currency, wt.amount, wt.balance_before, wt.balance_after, COALESCE(wt.reference, ''), COALESCE(wt.provider, ''), COALESCE(wt.provider_reference, ''), wt.assigned_operator_id, wt.assigned_at, COALESCE(wt.metadata, '{}'::jsonb)::text, wt.created_at
		FROM wallet_transactions wt
		JOIN wallets w ON w.id = wt.wallet_id
		LEFT JOIN prediction_orders po ON po.id::text = wt.reference AND po.user_id = w.user_id::uuid
		WHERE %s
		ORDER BY wt.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIndex, argIndex+1)
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	data := make([]models.WalletTransaction, 0, limit)
	for rows.Next() {
		var tx models.WalletTransaction
		var reference *string
		var assignedTo *string
		var assignedAt *time.Time
		var metadataBytes []byte
		if err := rows.Scan(&tx.TransactionID, &tx.WalletID, &tx.UserID, &tx.Type, &tx.Status, &tx.Product, &tx.Currency, &tx.Amount, &tx.BalanceBefore, &tx.BalanceAfter, &reference, &tx.Provider, &tx.ProviderRef, &assignedTo, &assignedAt, &metadataBytes, &tx.CreatedAt); err != nil {
			return nil, err
		}
		if reference != nil {
			tx.Reference = *reference
		}
		if assignedTo != nil {
			tx.AssignedTo = *assignedTo
		}
		tx.AssignedAt = assignedAt
		if len(metadataBytes) > 0 {
			_ = json.Unmarshal(metadataBytes, &tx.Metadata)
		}
		tx.Type = externalTransactionType(tx.Type)
		tx.Description = describeTransaction(tx.Type, tx.Reference)
		data = append(data, tx)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return &models.TransactionListResponse{Data: data, Pagination: models.Pagination{Page: page, Limit: limit, Total: total}}, nil
}

func (r *postgresWalletRepository) GetTransactionDetails(ctx context.Context, userID, transactionID string) (*models.PaymentTransactionDetailsResponse, error) {
	const query = `
		SELECT wt.id, wt.type, COALESCE(wt.status, ''), wt.amount, w.currency, wt.reference, COALESCE(wt.provider, ''), COALESCE(wt.provider_reference, ''), wt.provider_updated_at, wt.assigned_operator_id, wt.assigned_at, wt.metadata, wt.created_at
		FROM wallet_transactions wt
		JOIN wallets w ON w.id = wt.wallet_id
		WHERE w.user_id = $1 AND wt.id = $2
		LIMIT 1
	`
	var (
		txType            string
		status            string
		amount            decimal.Decimal
		currency          string
		reference         *string
		provider          string
		providerRef       string
		providerUpdatedAt *time.Time
		assignedTo        *string
		assignedAt        *time.Time
		metadataBytes     []byte
		createdAt         time.Time
	)
	if err := r.pool.QueryRow(ctx, query, userID, transactionID).Scan(&transactionID, &txType, &status, &amount, &currency, &reference, &provider, &providerRef, &providerUpdatedAt, &assignedTo, &assignedAt, &metadataBytes, &createdAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	var metadata map[string]any
	if len(metadataBytes) > 0 {
		_ = json.Unmarshal(metadataBytes, &metadata)
	}
	paymentMethod := ""
	if metadata != nil {
		if raw, ok := metadata["payment_method"].(string); ok {
			paymentMethod = raw
		} else if raw, ok := metadata["bank_account_id"].(string); ok {
			paymentMethod = raw
		}
	}
	ref := ""
	if reference != nil {
		ref = *reference
	}
	response := &models.PaymentTransactionDetailsResponse{
		TransactionID:     transactionID,
		Status:            transactionStatusFor(txType, status),
		Direction:         transactionDirectionFor(txType),
		Amount:            amount.Abs(),
		Currency:          currency,
		PaymentMethod:     paymentMethod,
		Provider:          provider,
		ProviderRef:       providerRef,
		Reference:         ref,
		ProviderUpdatedAt: providerUpdatedAt,
		AssignedAt:        assignedAt,
		Metadata:          metadata,
		CreatedAt:         createdAt,
	}
	if assignedTo != nil {
		response.AssignedTo = *assignedTo
	}
	return response, nil
}

func (r *postgresWalletRepository) getTransactionDetailsByID(ctx context.Context, transactionID string) (*models.PaymentTransactionDetailsResponse, error) {
	const query = `
		SELECT wt.id, wt.type, COALESCE(wt.status, ''), wt.amount, w.currency, wt.reference, COALESCE(wt.provider, ''), COALESCE(wt.provider_reference, ''), wt.provider_updated_at, wt.assigned_operator_id, wt.assigned_at, wt.metadata, wt.created_at, w.user_id
		FROM wallet_transactions wt
		JOIN wallets w ON w.id = wt.wallet_id
		WHERE wt.id = $1
		LIMIT 1
	`
	var userID string
	var (
		txType            string
		status            string
		amount            decimal.Decimal
		currency          string
		reference         *string
		provider          string
		providerRef       string
		providerUpdatedAt *time.Time
		assignedTo        *string
		assignedAt        *time.Time
		metadataBytes     []byte
		createdAt         time.Time
	)
	if err := r.pool.QueryRow(ctx, query, transactionID).Scan(&transactionID, &txType, &status, &amount, &currency, &reference, &provider, &providerRef, &providerUpdatedAt, &assignedTo, &assignedAt, &metadataBytes, &createdAt, &userID); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return r.GetTransactionDetails(ctx, userID, transactionID)
}

func (r *postgresWalletRepository) ListAdminPaymentTransactions(ctx context.Context, userID, txType, status, provider, assignedTo string, page, limit int) (*models.TransactionListResponse, error) {
	offset := (page - 1) * limit
	filters := []string{"wt.type IN ('deposit', 'withdrawal')"}
	args := make([]any, 0, 7)
	argIndex := 1
	if userID != "" {
		filters = append(filters, fmt.Sprintf("w.user_id = $%d", argIndex))
		args = append(args, userID)
		argIndex++
	}
	if txType != "" {
		filters = append(filters, fmt.Sprintf("wt.type = $%d", argIndex))
		args = append(args, txType)
		argIndex++
	}
	if status != "" {
		filters = append(filters, fmt.Sprintf("COALESCE(wt.status, '') = $%d", argIndex))
		args = append(args, strings.ToUpper(status))
		argIndex++
	}
	if provider != "" {
		filters = append(filters, fmt.Sprintf("COALESCE(wt.provider, '') = $%d", argIndex))
		args = append(args, strings.TrimSpace(provider))
		argIndex++
	}
	if strings.EqualFold(strings.TrimSpace(assignedTo), "unassigned") {
		filters = append(filters, "wt.assigned_operator_id IS NULL")
	} else if strings.TrimSpace(assignedTo) != "" {
		filters = append(filters, fmt.Sprintf("wt.assigned_operator_id = $%d::uuid", argIndex))
		args = append(args, strings.TrimSpace(assignedTo))
		argIndex++
	}
	whereClause := strings.Join(filters, " AND ")
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM wallet_transactions wt JOIN wallets w ON w.id = wt.wallet_id WHERE %s`, whereClause)
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, err
	}
	args = append(args, limit, offset)
	query := fmt.Sprintf(`
		SELECT wt.id, wt.wallet_id, w.user_id, wt.type, COALESCE(wt.status, ''), wt.amount, wt.balance_before, wt.balance_after, wt.reference, COALESCE(wt.provider, ''), COALESCE(wt.provider_reference, ''), COALESCE(wt.assigned_operator_id::text, ''), wt.assigned_at, wt.metadata, wt.created_at
		FROM wallet_transactions wt
		JOIN wallets w ON w.id = wt.wallet_id
		WHERE %s
		ORDER BY wt.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIndex, argIndex+1)
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	data := make([]models.WalletTransaction, 0, limit)
	for rows.Next() {
		var txRecord models.WalletTransaction
		var metadataJSON string
		if err := rows.Scan(&txRecord.TransactionID, &txRecord.WalletID, &txRecord.UserID, &txRecord.Type, &txRecord.Status, &txRecord.Amount, &txRecord.BalanceBefore, &txRecord.BalanceAfter, &txRecord.Reference, &txRecord.Provider, &txRecord.ProviderRef, &txRecord.AssignedTo, &txRecord.AssignedAt, &metadataJSON, &txRecord.CreatedAt); err != nil {
			return nil, err
		}
		if strings.TrimSpace(metadataJSON) != "" {
			_ = json.Unmarshal([]byte(metadataJSON), &txRecord.Metadata)
		}
		txRecord.Type = externalTransactionType(txRecord.Type)
		txRecord.Description = describeTransaction(txRecord.Type, txRecord.Reference)
		data = append(data, txRecord)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return &models.TransactionListResponse{Data: data, Pagination: models.Pagination{Page: page, Limit: limit, Total: total}}, nil
}

func (r *postgresWalletRepository) ListAdminReconciliationQueue(ctx context.Context, userID, provider, assignedTo string, page, limit int) (*models.TransactionListResponse, error) {
	offset := (page - 1) * limit
	filters := []string{"wt.type IN ('deposit', 'withdrawal')", "COALESCE(wt.status, '') = ANY($1)"}
	args := []any{reconciliationQueueStatuses()}
	argIndex := 2
	if userID != "" {
		filters = append(filters, fmt.Sprintf("w.user_id = $%d", argIndex))
		args = append(args, userID)
		argIndex++
	}
	if provider != "" {
		filters = append(filters, fmt.Sprintf("COALESCE(wt.provider, '') = $%d", argIndex))
		args = append(args, strings.TrimSpace(provider))
		argIndex++
	}
	if strings.EqualFold(strings.TrimSpace(assignedTo), "unassigned") {
		filters = append(filters, "wt.assigned_operator_id IS NULL")
	} else if strings.TrimSpace(assignedTo) != "" {
		filters = append(filters, fmt.Sprintf("wt.assigned_operator_id = $%d", argIndex))
		args = append(args, strings.TrimSpace(assignedTo))
		argIndex++
	}
	whereClause := strings.Join(filters, " AND ")
	countQuery := fmt.Sprintf(`SELECT COUNT(*) FROM wallet_transactions wt JOIN wallets w ON w.id = wt.wallet_id WHERE %s`, whereClause)
	var total int
	if err := r.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, err
	}
	args = append(args, limit, offset)
	query := fmt.Sprintf(`
		SELECT wt.id, wt.wallet_id, w.user_id, wt.type, COALESCE(wt.status, ''), wt.amount, wt.balance_before, wt.balance_after, wt.reference, COALESCE(wt.provider, ''), COALESCE(wt.provider_reference, ''), COALESCE(wt.assigned_operator_id::text, ''), wt.assigned_at, wt.metadata, wt.created_at
		FROM wallet_transactions wt
		JOIN wallets w ON w.id = wt.wallet_id
		WHERE %s
		ORDER BY wt.provider_updated_at DESC NULLS LAST, wt.created_at DESC
		LIMIT $%d OFFSET $%d
	`, whereClause, argIndex, argIndex+1)
	rows, err := r.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	data := make([]models.WalletTransaction, 0, limit)
	for rows.Next() {
		var txRecord models.WalletTransaction
		var metadataJSON string
		if err := rows.Scan(&txRecord.TransactionID, &txRecord.WalletID, &txRecord.UserID, &txRecord.Type, &txRecord.Status, &txRecord.Amount, &txRecord.BalanceBefore, &txRecord.BalanceAfter, &txRecord.Reference, &txRecord.Provider, &txRecord.ProviderRef, &txRecord.AssignedTo, &txRecord.AssignedAt, &metadataJSON, &txRecord.CreatedAt); err != nil {
			return nil, err
		}
		if strings.TrimSpace(metadataJSON) != "" {
			_ = json.Unmarshal([]byte(metadataJSON), &txRecord.Metadata)
		}
		txRecord.Type = externalTransactionType(txRecord.Type)
		txRecord.Description = describeTransaction(txRecord.Type, txRecord.Reference)
		data = append(data, txRecord)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return &models.TransactionListResponse{Data: data, Pagination: models.Pagination{Page: page, Limit: limit, Total: total}}, nil
}

func (r *postgresWalletRepository) ListAdminPaymentSummary(ctx context.Context, userID, provider, assignedTo string) (*models.PaymentTransactionSummaryResponse, error) {
	filters := []string{"wt.type IN ('deposit', 'withdrawal')"}
	args := make([]any, 0, 3)
	argIndex := 1
	if userID != "" {
		filters = append(filters, fmt.Sprintf("w.user_id = $%d", argIndex))
		args = append(args, userID)
		argIndex++
	}
	if provider != "" {
		filters = append(filters, fmt.Sprintf("COALESCE(wt.provider, '') = $%d", argIndex))
		args = append(args, strings.TrimSpace(provider))
		argIndex++
	}
	if strings.EqualFold(strings.TrimSpace(assignedTo), "unassigned") {
		filters = append(filters, "wt.assigned_operator_id IS NULL")
	} else if strings.TrimSpace(assignedTo) != "" {
		filters = append(filters, fmt.Sprintf("wt.assigned_operator_id = $%d::uuid", argIndex))
		args = append(args, strings.TrimSpace(assignedTo))
		argIndex++
	}
	whereClause := strings.Join(filters, " AND ")
	rows, err := r.pool.Query(ctx, fmt.Sprintf(`
		SELECT
			COALESCE(wt.provider, ''),
			wt.type,
			COALESCE(wt.status, ''),
			COALESCE(wt.assigned_operator_id::text, ''),
			COUNT(*),
			COALESCE(SUM(ABS(wt.amount)), 0),
			MAX(COALESCE(wt.provider_updated_at, wt.created_at))
		FROM wallet_transactions wt
		JOIN wallets w ON w.id = wt.wallet_id
		WHERE %s
		GROUP BY COALESCE(wt.provider, ''), wt.type, COALESCE(wt.status, ''), COALESCE(wt.assigned_operator_id::text, '')
		ORDER BY MAX(COALESCE(wt.provider_updated_at, wt.created_at)) DESC, COALESCE(wt.provider, ''), wt.type, COALESCE(wt.status, ''), COALESCE(wt.assigned_operator_id::text, '')
	`, whereClause), args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	data := make([]models.PaymentTransactionSummaryItem, 0, 8)
	for rows.Next() {
		var item models.PaymentTransactionSummaryItem
		if err := rows.Scan(&item.Provider, &item.Type, &item.Status, &item.AssignedTo, &item.Count, &item.TotalAmount, &item.LastUpdatedAt); err != nil {
			return nil, err
		}
		item.Type = externalTransactionType(item.Type)
		data = append(data, item)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return &models.PaymentTransactionSummaryResponse{Data: data}, nil
}

func (r *postgresWalletRepository) GetAdminPaymentTransactionDetails(ctx context.Context, transactionID string) (*models.PaymentTransactionDetailsResponse, error) {
	return r.getTransactionDetailsByID(ctx, transactionID)
}

func (r *postgresWalletRepository) GetAdminPaymentTransactionDetailsByProviderReference(ctx context.Context, providerReference string) (*models.PaymentTransactionDetailsResponse, error) {
	record, err := r.getTransactionForProviderLookup(ctx, strings.TrimSpace(providerReference), strings.TrimSpace(providerReference))
	if err != nil {
		return nil, err
	}
	return r.getTransactionDetailsByID(ctx, record.TransactionID)
}

func (r *postgresWalletRepository) ListAdminPaymentTransactionEvents(ctx context.Context, transactionID string) (*models.PaymentTransactionEventListResponse, error) {
	rows, err := r.pool.Query(ctx, `
		SELECT id, transaction_id, status, source, COALESCE(reason, ''), COALESCE(provider, ''), COALESCE(provider_reference, ''), payload, created_at
		FROM payment_transaction_events
		WHERE transaction_id = $1
		ORDER BY created_at DESC, id DESC
	`, transactionID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	data := make([]models.PaymentTransactionEvent, 0, 8)
	for rows.Next() {
		var event models.PaymentTransactionEvent
		var payloadBytes []byte
		if err := rows.Scan(&event.ID, &event.TransactionID, &event.Status, &event.Source, &event.Reason, &event.Provider, &event.ProviderRef, &payloadBytes, &event.CreatedAt); err != nil {
			return nil, err
		}
		if len(payloadBytes) > 0 {
			_ = json.Unmarshal(payloadBytes, &event.Payload)
		}
		data = append(data, event)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return &models.PaymentTransactionEventListResponse{Data: data}, nil
}

func (r *postgresWalletRepository) ListAdminPaymentTransactionEventsByProviderReference(ctx context.Context, providerReference string) (*models.PaymentTransactionEventListResponse, error) {
	record, err := r.getTransactionForProviderLookup(ctx, strings.TrimSpace(providerReference), strings.TrimSpace(providerReference))
	if err != nil {
		return nil, err
	}
	return r.ListAdminPaymentTransactionEvents(ctx, record.TransactionID)
}

func (r *postgresWalletRepository) CancelProviderRequest(ctx context.Context, actorUserID string, req *models.ProviderCancelRequest) (*models.ProviderCancelResponse, error) {
	actorID := strings.TrimSpace(actorUserID)
	adapter := strings.TrimSpace(req.Adapter)
	playerID := strings.TrimSpace(req.PlayerID)
	betID := strings.TrimSpace(req.BetID)
	reason := strings.TrimSpace(req.Reason)
	requestID := strings.TrimSpace(req.RequestID)

	failedAudit := func(entityID string, err error, extra map[string]any) {
		if err == nil {
			return
		}
		newValue := map[string]any{
			"actor_user_id": actorID,
			"adapter":       adapter,
			"player_id":     playerID,
			"bet_id":        betID,
			"request_id":    requestID,
			"reason":        reason,
			"error":         err.Error(),
		}
		for key, value := range extra {
			newValue[key] = value
		}
		_ = r.writeAuditLog(ctx, auditLogEntry{
			ActorID:    actorID,
			Action:     providerCancelFailedAction,
			EntityType: providerCancelAuditEntityType,
			EntityID:   firstNonEmpty(strings.TrimSpace(entityID), requestID),
			NewValue:   newValue,
			CreatedAt:  time.Now().UTC(),
		})
	}

	if requestID == "" {
		err := fmt.Errorf("request id is required")
		failedAudit(requestID, err, nil)
		return nil, err
	}

	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	record, err := r.getTransactionForProviderUpdate(ctx, tx, requestID, requestID)
	if err != nil {
		failedAudit(requestID, err, nil)
		return nil, err
	}
	if record.Type != "deposit" && record.Type != "withdrawal" {
		err := fmt.Errorf("transaction is not a payment transaction")
		failedAudit(record.TransactionID, err, map[string]any{
			"transaction_type": record.Type,
		})
		return nil, err
	}

	if adapter != "" && strings.TrimSpace(record.Provider) != "" && !strings.EqualFold(adapter, record.Provider) {
		err := fmt.Errorf("adapter does not match provider")
		failedAudit(record.TransactionID, err, map[string]any{
			"transaction_provider": strings.TrimSpace(record.Provider),
		})
		return nil, err
	}
	if playerID != "" && strings.TrimSpace(record.UserID) != "" && playerID != strings.TrimSpace(record.UserID) {
		err := fmt.Errorf("player id does not match provider request")
		failedAudit(record.TransactionID, err, map[string]any{
			"transaction_user_id": strings.TrimSpace(record.UserID),
		})
		return nil, err
	}

	wallet, err := r.scanWallet(tx.QueryRow(ctx, `SELECT id, user_id, balance, currency, status, created_at, updated_at FROM wallets WHERE id = $1 FOR UPDATE`, record.WalletID))
	if err != nil {
		failedAudit(record.TransactionID, err, map[string]any{
			"wallet_id": record.WalletID,
		})
		return nil, err
	}

	provider := firstNonEmpty(strings.TrimSpace(record.Provider), adapter)
	providerRef := firstNonEmpty(strings.TrimSpace(record.ProviderRef), requestID, record.TransactionID)
	now := time.Now().UTC()
	if err := r.applyPaymentStatusTransitionTx(ctx, tx, wallet, record, "CANCELLED", "provider-cancel", reason, provider, providerRef, now, map[string]any{
		"action":     "provider_cancel",
		"adapter":    adapter,
		"player_id":  playerID,
		"bet_id":     betID,
		"request_id": requestID,
	}); err != nil {
		failedAudit(record.TransactionID, err, map[string]any{
			"transaction_id":     record.TransactionID,
			"wallet_id":          wallet.ID,
			"user_id":            record.UserID,
			"provider":           provider,
			"provider_reference": providerRef,
		})
		return nil, err
	}

	if err := r.writeAuditLogTx(ctx, tx, auditLogEntry{
		ActorID:    actorID,
		Action:     providerCancelSucceededAction,
		EntityType: providerCancelAuditEntityType,
		EntityID:   record.TransactionID,
		OldValue: map[string]any{
			"status": strings.ToUpper(strings.TrimSpace(record.Status)),
		},
		NewValue: map[string]any{
			"status":             "CANCELLED",
			"actor_user_id":      actorID,
			"adapter":            adapter,
			"player_id":          playerID,
			"bet_id":             betID,
			"request_id":         requestID,
			"reason":             reason,
			"transaction_id":     record.TransactionID,
			"wallet_id":          wallet.ID,
			"user_id":            record.UserID,
			"provider":           provider,
			"provider_reference": providerRef,
		},
		CreatedAt: now,
	}); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		failedAudit(record.TransactionID, err, map[string]any{
			"transaction_id": record.TransactionID,
			"wallet_id":      wallet.ID,
			"user_id":        record.UserID,
		})
		return nil, err
	}

	return &models.ProviderCancelResponse{
		State:        "cancelled",
		Adapter:      firstNonEmpty(adapter, provider),
		Attempts:     1,
		RetryCount:   0,
		FallbackUsed: false,
		LastError:    "",
		UpdatedAt:    now.Format(time.RFC3339),
	}, nil
}

func (r *postgresWalletRepository) PreviewAdminPaymentReconciliation(ctx context.Context, req *models.AdminPaymentReconciliationRequest) (*models.PaymentTransactionReconciliationPreviewResponse, error) {
	merchantTransactionID := strings.TrimSpace(req.MerchantTransactionID)
	providerReference := strings.TrimSpace(req.ProviderReference)
	if merchantTransactionID == "" && providerReference == "" {
		return nil, fmt.Errorf("merchant transaction id or provider reference is required")
	}

	record, err := r.getTransactionForProviderLookup(ctx, merchantTransactionID, providerReference)
	if err != nil {
		return nil, err
	}
	if record.Type != "deposit" && record.Type != "withdrawal" {
		return nil, fmt.Errorf("transaction is not a payment transaction")
	}
	wallet, err := r.GetWalletByID(ctx, record.WalletID)
	if err != nil {
		return nil, err
	}

	nextStatus := normalizeProviderStatus(req.State)
	if nextStatus == "UNKNOWN" {
		return nil, fmt.Errorf("unsupported status")
	}

	reservationID := metadataString(record.Metadata, "reservation_id")
	reservationRequired := record.Type == "withdrawal" && (nextStatus == "SUCCEEDED" || nextStatus == "FAILED" || nextStatus == "CANCELLED" || nextStatus == "DECLINED" || nextStatus == "EXPIRED")
	reservationSatisfied := true
	if reservationRequired && reservationID != "" {
		ledger, err := r.getReservationLedger(ctx, wallet.ID)
		if err != nil {
			return nil, err
		}
		requiredAmount := record.Amount.Abs()
		reservedAmount, ok := ledger[reservationID]
		reservationSatisfied = ok && !reservedAmount.LessThan(requiredAmount)
	}

	preview := &models.PaymentTransactionReconciliationPreviewResponse{
		TransactionID:        record.TransactionID,
		Provider:             firstNonEmpty(paymentProviderFor(req.PaymentMethod), strings.TrimSpace(record.Provider)),
		ProviderReference:    firstNonEmpty(providerReference, strings.TrimSpace(record.ProviderRef)),
		Direction:            transactionDirectionFor(record.Type),
		CurrentStatus:        strings.ToUpper(strings.TrimSpace(record.Status)),
		RequestedStatus:      strings.TrimSpace(req.State),
		NormalizedStatus:     nextStatus,
		CurrentBalance:       wallet.Balance,
		ProjectedBalance:     wallet.Balance,
		ReservationID:        reservationID,
		RequiresReservation:  reservationRequired,
		ReservationSatisfied: reservationSatisfied,
	}

	preview.Action, preview.Allowed, preview.BlockingReason, preview.ProjectedBalance = previewReconciliationOutcome(
		record,
		wallet.Balance,
		nextStatus,
		reservationSatisfied,
	)

	return preview, nil
}

func (r *postgresWalletRepository) UpdateAdminPaymentTransactionStatus(ctx context.Context, transactionID string, req *models.PaymentTransactionStatusUpdateRequest) (*models.PaymentTransactionDetailsResponse, error) {
	return r.applyAdminPaymentAction(ctx, transactionID, normalizeProviderStatus(req.Status), "admin", req.Reason, req.ProviderRef, map[string]any{
		"request_status": req.Status,
	})
}

func (r *postgresWalletRepository) ReconcileAdminPaymentTransaction(ctx context.Context, req *models.AdminPaymentReconciliationRequest) (*models.PaymentTransactionDetailsResponse, error) {
	merchantTransactionID := strings.TrimSpace(req.MerchantTransactionID)
	providerReference := strings.TrimSpace(req.ProviderReference)
	if merchantTransactionID == "" && providerReference == "" {
		return nil, fmt.Errorf("merchant transaction id or provider reference is required")
	}

	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	record, err := r.getTransactionForProviderUpdate(ctx, tx, merchantTransactionID, providerReference)
	if err != nil {
		return nil, err
	}
	if record.Type != "deposit" && record.Type != "withdrawal" {
		return nil, fmt.Errorf("transaction is not a payment transaction")
	}
	wallet, err := r.scanWallet(tx.QueryRow(ctx, `SELECT id, user_id, balance, currency, status, created_at, updated_at FROM wallets WHERE id = $1 FOR UPDATE`, record.WalletID))
	if err != nil {
		return nil, err
	}

	nextStatus := normalizeProviderStatus(req.State)
	if nextStatus == "UNKNOWN" {
		return nil, fmt.Errorf("unsupported status")
	}
	provider := paymentProviderFor(req.PaymentMethod)
	if provider == "" {
		provider = strings.TrimSpace(record.Provider)
	}
	providerRef := firstNonEmpty(providerReference, strings.TrimSpace(record.ProviderRef), merchantTransactionID, record.TransactionID)
	now := time.Now().UTC()
	if err := r.applyPaymentStatusTransitionTx(ctx, tx, wallet, record, nextStatus, "admin-reconcile", strings.TrimSpace(req.Reason), provider, providerRef, now, map[string]any{
		"merchant_transaction_id": merchantTransactionID,
		"provider_reference":      providerReference,
		"payment_method":          strings.TrimSpace(req.PaymentMethod),
		"provider_state":          strings.TrimSpace(req.State),
		"reconciliation_reason":   strings.TrimSpace(req.Reason),
	}); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.getTransactionDetailsByID(ctx, record.TransactionID)
}

func (r *postgresWalletRepository) SettleAdminPaymentTransaction(ctx context.Context, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	return r.applyAdminPaymentAction(ctx, transactionID, "SUCCEEDED", "admin-settle", req.Reason, req.ProviderRef, map[string]any{
		"action": "settle",
	})
}

func (r *postgresWalletRepository) RefundAdminPaymentTransaction(ctx context.Context, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	return r.applyAdminPaymentAction(ctx, transactionID, "REFUNDED", "admin-refund", req.Reason, req.ProviderRef, map[string]any{
		"action": "refund",
	})
}

func (r *postgresWalletRepository) ReverseAdminPaymentTransaction(ctx context.Context, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	return r.applyAdminPaymentAction(ctx, transactionID, "REVERSED", "admin-reverse", req.Reason, req.ProviderRef, map[string]any{
		"action": "reverse",
	})
}

func (r *postgresWalletRepository) ChargebackAdminPaymentTransaction(ctx context.Context, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	return r.applyAdminPaymentAction(ctx, transactionID, "CHARGEBACK", "admin-chargeback", req.Reason, req.ProviderRef, map[string]any{
		"action": "chargeback",
	})
}

func (r *postgresWalletRepository) RetryAdminPaymentTransaction(ctx context.Context, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	return r.applyAdminPaymentAction(ctx, transactionID, "RETRYING", "admin-retry", req.Reason, req.ProviderRef, map[string]any{
		"action": "retry",
	})
}

func (r *postgresWalletRepository) ApproveAdminPaymentTransaction(ctx context.Context, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	return r.applyAdminPaymentReviewDecision(ctx, transactionID, "PROCESSING", "admin-approve", req.Reason, req.ProviderRef, map[string]any{
		"action": "approve",
	})
}

func (r *postgresWalletRepository) DeclineAdminPaymentTransaction(ctx context.Context, transactionID string, req *models.PaymentTransactionActionRequest) (*models.PaymentTransactionDetailsResponse, error) {
	return r.applyAdminPaymentReviewDecision(ctx, transactionID, "DECLINED", "admin-decline", req.Reason, req.ProviderRef, map[string]any{
		"action": "decline",
	})
}

func (r *postgresWalletRepository) AssignAdminPaymentTransaction(ctx context.Context, transactionID, assignedTo, reason string) (*models.PaymentTransactionDetailsResponse, error) {
	transactionID = strings.TrimSpace(transactionID)
	assignedTo = strings.TrimSpace(assignedTo)
	now := time.Now().UTC()
	commandTag, err := r.pool.Exec(ctx, `
		UPDATE wallet_transactions
		SET assigned_operator_id = NULLIF($1, '')::uuid,
			assigned_at = CASE WHEN NULLIF($1, '') IS NULL THEN NULL ELSE $2 END
		WHERE id = $3
	`, assignedTo, now, transactionID)
	if err != nil {
		return nil, err
	}
	if commandTag.RowsAffected() == 0 {
		return nil, ErrNotFound
	}
	if err := r.recordPaymentTransactionEvent(ctx, transactionID, "ASSIGNED", "admin-assign", strings.TrimSpace(reason), "", "", map[string]any{
		"assigned_to": assignedTo,
	}); err != nil {
		return nil, err
	}
	return r.getTransactionDetailsByID(ctx, transactionID)
}

func (r *postgresWalletRepository) AddAdminPaymentTransactionNote(ctx context.Context, transactionID, note, actor string) (*models.PaymentTransactionEventListResponse, error) {
	transactionID = strings.TrimSpace(transactionID)
	note = strings.TrimSpace(note)
	if note == "" {
		return nil, fmt.Errorf("note is required")
	}
	record, err := r.getTransactionForProviderLookup(ctx, transactionID, "")
	if err != nil {
		return nil, err
	}
	if err := r.recordPaymentTransactionEvent(ctx, record.TransactionID, strings.ToUpper(strings.TrimSpace(record.Status)), "admin-note", note, strings.TrimSpace(record.Provider), strings.TrimSpace(record.ProviderRef), map[string]any{
		"actor_user_id": strings.TrimSpace(actor),
		"note":          note,
	}); err != nil {
		return nil, err
	}
	return r.ListAdminPaymentTransactionEvents(ctx, record.TransactionID)
}

func (r *postgresWalletRepository) applyAdminPaymentAction(ctx context.Context, transactionID, requestedStatus, source, reason, providerRef string, payload map[string]any) (*models.PaymentTransactionDetailsResponse, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	record, err := r.getTransactionForProviderUpdate(ctx, tx, transactionID, providerRef)
	if err != nil {
		return nil, err
	}
	if record.Type != "deposit" && record.Type != "withdrawal" {
		return nil, fmt.Errorf("transaction is not a payment transaction")
	}
	wallet, err := r.scanWallet(tx.QueryRow(ctx, `SELECT id, user_id, balance, currency, status, created_at, updated_at FROM wallets WHERE id = $1 FOR UPDATE`, record.WalletID))
	if err != nil {
		return nil, err
	}

	nextStatus := normalizeProviderStatus(requestedStatus)
	if nextStatus == "UNKNOWN" {
		return nil, fmt.Errorf("unsupported status")
	}
	provider := strings.TrimSpace(record.Provider)
	providerRef = firstNonEmpty(providerRef, strings.TrimSpace(record.ProviderRef), record.TransactionID)
	now := time.Now().UTC()
	if err := r.applyPaymentStatusTransitionTx(ctx, tx, wallet, record, nextStatus, source, reason, provider, providerRef, now, payload); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.getTransactionDetailsByID(ctx, transactionID)
}

func (r *postgresWalletRepository) applyAdminPaymentReviewDecision(ctx context.Context, transactionID, nextStatus, source, reason, providerRef string, payload map[string]any) (*models.PaymentTransactionDetailsResponse, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	record, err := r.getTransactionForProviderUpdate(ctx, tx, transactionID, providerRef)
	if err != nil {
		return nil, err
	}
	if record.Type != "deposit" && record.Type != "withdrawal" {
		return nil, fmt.Errorf("transaction is not a payment transaction")
	}
	currentStatus := strings.ToUpper(strings.TrimSpace(record.Status))
	if !isAdminReviewableProviderStatus(currentStatus) {
		return nil, fmt.Errorf("transaction is not awaiting provider review")
	}
	wallet, err := r.scanWallet(tx.QueryRow(ctx, `SELECT id, user_id, balance, currency, status, created_at, updated_at FROM wallets WHERE id = $1 FOR UPDATE`, record.WalletID))
	if err != nil {
		return nil, err
	}

	provider := strings.TrimSpace(record.Provider)
	providerRef = firstNonEmpty(providerRef, strings.TrimSpace(record.ProviderRef), record.TransactionID)
	now := time.Now().UTC()
	if payload == nil {
		payload = map[string]any{}
	}
	payload["previous_status"] = currentStatus
	if err := r.applyPaymentStatusTransitionTx(ctx, tx, wallet, record, nextStatus, source, reason, provider, providerRef, now, payload); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return r.getTransactionDetailsByID(ctx, record.TransactionID)
}

func (r *postgresWalletRepository) HandlePaymentStateChanged(ctx context.Context, notification *models.PaymentStateChangedNotification) (*models.PaymentStateChangedNotificationResponse, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	record, err := r.getTransactionForProviderUpdate(ctx, tx, strings.TrimSpace(notification.MerchantTransactionID), strings.TrimSpace(notification.ProviderReference))
	if err != nil {
		return nil, err
	}
	wallet, err := r.scanWallet(tx.QueryRow(ctx, `SELECT id, user_id, balance, currency, status, created_at, updated_at FROM wallets WHERE id = $1 FOR UPDATE`, record.WalletID))
	if err != nil {
		return nil, err
	}

	nextStatus := normalizeProviderStatus(notification.State)
	provider := paymentProviderFor(notification.PaymentMethod)
	if provider == "" {
		provider = strings.TrimSpace(record.Provider)
	}
	providerRef := firstNonEmpty(strings.TrimSpace(notification.ProviderReference), strings.TrimSpace(record.ProviderRef), strings.TrimSpace(notification.MerchantTransactionID))
	now := time.Now().UTC()
	if err := r.applyPaymentStatusTransitionTx(ctx, tx, wallet, record, nextStatus, "provider", strings.TrimSpace(notification.State), provider, providerRef, now, map[string]any{
		"merchant_transaction_id": strings.TrimSpace(notification.MerchantTransactionID),
		"provider_reference":      strings.TrimSpace(notification.ProviderReference),
		"payment_method":          strings.TrimSpace(notification.PaymentMethod),
		"provider_state":          strings.TrimSpace(notification.State),
		"provider_reason":         strings.TrimSpace(notification.Reason),
		"provider_decision":       strings.TrimSpace(notification.ProviderDecision),
		"provider_message":        strings.TrimSpace(notification.ProviderMessage),
		"required_action":         strings.TrimSpace(notification.RequiredAction),
		"next_retry_at":           strings.TrimSpace(notification.NextRetryAt),
	}); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &models.PaymentStateChangedNotificationResponse{Status: "OK", TransactionID: record.TransactionID}, nil
}

func (r *postgresWalletRepository) VerifyCashDeposit(ctx context.Context, req *models.CashDepositVerificationRequest) (*models.CashDepositVerificationResponse, error) {
	record, err := r.getTransactionForProviderLookup(ctx, strings.TrimSpace(req.MerchantTransactionID), "")
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			return &models.CashDepositVerificationResponse{Status: "OK", Valid: false}, nil
		}
		return nil, err
	}
	return &models.CashDepositVerificationResponse{
		Status:        "OK",
		Valid:         strings.EqualFold(record.Type, "deposit"),
		TransactionID: record.TransactionID,
	}, nil
}

func (r *postgresWalletRepository) ApplyReferralReward(ctx context.Context, userID, referralCode string) (*models.ApplyReferralRewardResponse, error) {
	const rewardAmount = "10.00"
	amount, _ := decimal.NewFromString(rewardAmount)
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	codeRecord, err := r.getReferralCode(ctx, tx, referralCode)
	if err != nil {
		return nil, err
	}
	if codeRecord.UserID == userID {
		return nil, fmt.Errorf("cannot apply own referral code")
	}
	relationshipID, err := r.ensureReferralRelationship(ctx, tx, codeRecord, userID)
	if err != nil {
		return nil, err
	}
	wallet, err := r.getOrCreateWalletTx(ctx, tx, userID, "USD")
	if err != nil {
		return nil, err
	}
	updatedWallet, _, err := r.applyBalanceMutationTx(ctx, tx, wallet, mutationInput{
		transactionType: "referral_reward",
		amount:          amount,
		reference:       strings.ToUpper(strings.TrimSpace(referralCode)),
		metadata:        map[string]any{"referrer_id": codeRecord.UserID},
		eventType:       "WalletReferralRewardApplied",
		outboxTopic:     "phoenix.referral.reward_applied",
	})
	if err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO referral_commissions (id, referral_relationship_id, amount, type, status, created_at, paid_at) VALUES ($1, $2, $3, 'fixed', 'paid', $4, $4)`, uuid.NewString(), relationshipID, amount, time.Now().UTC()); err != nil {
		return nil, err
	}
	if _, err := tx.Exec(ctx, `UPDATE referral_codes SET uses_count = uses_count + 1 WHERE id = $1`, codeRecord.ID); err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return &models.ApplyReferralRewardResponse{UserID: userID, RewardAmount: amount, NewBalance: updatedWallet.Balance, ReferrerID: codeRecord.UserID, AppliedAt: time.Now().UTC()}, nil
}

func (r *postgresWalletRepository) ReserveFunds(ctx context.Context, userID string, req *models.ReserveFundsRequest) (*models.ReserveFundsResponse, error) {
	wallet, err := r.GetWalletByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	reserved, err := r.getReservedBalance(ctx, wallet.ID)
	if err != nil {
		return nil, err
	}
	available := wallet.Balance.Sub(reserved)
	if available.LessThan(req.Amount) {
		return nil, fmt.Errorf("insufficient available balance")
	}
	reservationID := uuid.NewString()
	if err := r.appendReservationEvent(ctx, wallet.ID, "WalletFundsReserved", map[string]any{
		"reservation_id": reservationID,
		"amount":         req.Amount.String(),
		"reference_id":   req.ReferenceID,
		"reference_type": req.ReferenceType,
		"action":         "reserve",
	}); err != nil {
		return nil, err
	}
	return &models.ReserveFundsResponse{UserID: userID, ReservedAmount: req.Amount, AvailableBalance: available.Sub(req.Amount), ReservationID: reservationID}, nil
}

func (r *postgresWalletRepository) ReleaseReservedFunds(ctx context.Context, userID string, req *models.ReleaseReserveRequest) (*models.ReleaseReserveResponse, error) {
	wallet, err := r.GetWalletByUserID(ctx, userID)
	if err != nil {
		return nil, err
	}
	reservationAmounts, err := r.getReservationLedger(ctx, wallet.ID)
	if err != nil {
		return nil, err
	}
	reservedAmount, ok := reservationAmounts[req.ReservationID]
	if !ok || reservedAmount.LessThan(req.Amount) {
		return nil, fmt.Errorf("reservation not found or insufficient reserved amount")
	}
	if err := r.appendReservationEvent(ctx, wallet.ID, "WalletFundsReleased", map[string]any{
		"reservation_id": req.ReservationID,
		"amount":         req.Amount.String(),
		"action":         "release",
	}); err != nil {
		return nil, err
	}
	reserved, err := r.getReservedBalance(ctx, wallet.ID)
	if err != nil {
		return nil, err
	}
	return &models.ReleaseReserveResponse{UserID: userID, ReleasedAmount: req.Amount, NewAvailableBalance: wallet.Balance.Sub(reserved)}, nil
}

func (r *postgresWalletRepository) getOrCreateWallet(ctx context.Context, userID, currency string) (*models.Wallet, error) {
	wallet, err := r.GetWalletByUserID(ctx, userID)
	if err == nil {
		return wallet, nil
	}
	if !errors.Is(err, ErrNotFound) {
		return nil, err
	}
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)
	wallet, err = r.getOrCreateWalletTx(ctx, tx, userID, currency)
	if err != nil {
		return nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return wallet, nil
}

func (r *postgresWalletRepository) getOrCreateWalletTx(ctx context.Context, tx pgx.Tx, userID, currency string) (*models.Wallet, error) {
	wallet, err := r.scanWallet(tx.QueryRow(ctx, `SELECT id, user_id, balance, currency, status, created_at, updated_at FROM wallets WHERE user_id = $1 ORDER BY created_at ASC LIMIT 1`, userID))
	if err == nil {
		return wallet, nil
	}
	if !errors.Is(err, ErrNotFound) {
		return nil, err
	}
	if err := ensureUserExists(ctx, tx, userID); err != nil {
		return nil, err
	}
	now := time.Now().UTC()
	wallet = &models.Wallet{ID: uuid.NewString(), UserID: userID, Balance: decimal.Zero, Currency: defaultCurrency(currency), Status: "active", CreatedAt: now, UpdatedAt: now}
	if _, err := tx.Exec(ctx, `INSERT INTO wallets (id, user_id, balance, currency, status, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)`, wallet.ID, wallet.UserID, wallet.Balance, wallet.Currency, wallet.Status, wallet.CreatedAt, wallet.UpdatedAt); err != nil {
		return nil, err
	}
	return wallet, nil
}

func ensureUserExists(ctx context.Context, tx pgx.Tx, userID string) error {
	var exists bool
	if err := tx.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM users WHERE id = $1)`, userID).Scan(&exists); err != nil {
		return err
	}
	if !exists {
		return ErrNotFound
	}
	return nil
}

type mutationInput struct {
	transactionType string
	status          string
	amount          decimal.Decimal
	reference       string
	provider        string
	providerRef     string
	metadata        map[string]any
	eventType       string
	outboxTopic     string
}

func (r *postgresWalletRepository) applyBalanceMutation(ctx context.Context, walletID string, input mutationInput) (*models.Wallet, *models.WalletTransaction, error) {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return nil, nil, err
	}
	defer tx.Rollback(ctx)
	wallet, err := r.scanWallet(tx.QueryRow(ctx, `SELECT id, user_id, balance, currency, status, created_at, updated_at FROM wallets WHERE id = $1 FOR UPDATE`, walletID))
	if err != nil {
		return nil, nil, err
	}
	wallet, transaction, err := r.applyBalanceMutationTx(ctx, tx, wallet, input)
	if err != nil {
		return nil, nil, err
	}
	if err := tx.Commit(ctx); err != nil {
		return nil, nil, err
	}
	return wallet, transaction, nil
}

func (r *postgresWalletRepository) applyBalanceMutationTx(ctx context.Context, tx pgx.Tx, wallet *models.Wallet, input mutationInput) (*models.Wallet, *models.WalletTransaction, error) {
	balanceBefore := wallet.Balance
	balanceAfter := wallet.Balance.Add(input.amount)
	if balanceAfter.IsNegative() {
		return nil, nil, fmt.Errorf("insufficient balance")
	}
	metadataBytes, _ := json.Marshal(input.metadata)
	now := time.Now().UTC()
	status := strings.ToUpper(strings.TrimSpace(input.status))
	if status == "" {
		status = transactionStatusFor(input.transactionType, "")
	}
	transaction := &models.WalletTransaction{
		TransactionID: uuid.NewString(),
		WalletID:      wallet.ID,
		UserID:        wallet.UserID,
		Type:          externalTransactionType(input.transactionType),
		Status:        status,
		Amount:        input.amount,
		BalanceBefore: balanceBefore,
		BalanceAfter:  balanceAfter,
		Reference:     input.reference,
		Provider:      input.provider,
		ProviderRef:   input.providerRef,
		Metadata:      input.metadata,
		CreatedAt:     now,
	}
	if _, err := tx.Exec(ctx, `UPDATE wallets SET balance = $1, updated_at = $2 WHERE id = $3`, balanceAfter, now, wallet.ID); err != nil {
		return nil, nil, err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO wallet_transactions (id, wallet_id, type, status, amount, balance_before, balance_after, reference, provider, provider_reference, provider_updated_at, metadata, created_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NULLIF($9, ''), NULLIF($10, ''), $11, $12, $11)`, transaction.TransactionID, wallet.ID, input.transactionType, status, input.amount, balanceBefore, balanceAfter, nullableString(input.reference), input.provider, input.providerRef, now, metadataBytes); err != nil {
		return nil, nil, err
	}
	if err := r.appendWalletEventTx(ctx, tx, wallet.ID, input.eventType, map[string]any{"transaction_id": transaction.TransactionID, "type": input.transactionType, "amount": input.amount.String(), "balance_before": balanceBefore.String(), "balance_after": balanceAfter.String(), "reference": input.reference}); err != nil {
		return nil, nil, err
	}
	wallet.Balance = balanceAfter
	wallet.UpdatedAt = now
	return wallet, transaction, nil
}

func adminFundsProvider(reason string) string {
	normalizedReason := strings.ToLower(strings.TrimSpace(reason))
	if normalizedReason == "" {
		normalizedReason = "manual"
	}
	return "backoffice-manual-" + normalizedReason
}

func normalizeAdminFundsCurrency(currency string) string {
	normalizedCurrency := strings.ToUpper(strings.TrimSpace(currency))
	if normalizedCurrency == "" {
		return "USD"
	}
	return normalizedCurrency
}

func adminFundsResponse(txRecord *models.WalletTransaction, currency, direction string) *models.PaymentTransactionDetailsResponse {
	return &models.PaymentTransactionDetailsResponse{
		TransactionID: txRecord.TransactionID,
		Status:        txRecord.Status,
		Direction:     direction,
		Amount:        txRecord.Amount.Abs(),
		Currency:      normalizeAdminFundsCurrency(currency),
		Provider:      txRecord.Provider,
		Reference:     txRecord.Reference,
		Metadata:      txRecord.Metadata,
		CreatedAt:     txRecord.CreatedAt,
	}
}

func (r *postgresWalletRepository) appendReservationEvent(ctx context.Context, walletID, eventType string, payload map[string]any) error {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err := r.appendWalletEventTx(ctx, tx, walletID, eventType, payload); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *postgresWalletRepository) appendWalletEventTx(ctx context.Context, tx pgx.Tx, aggregateID, eventType string, payload map[string]any) error {
	var version int
	if err := tx.QueryRow(ctx, `SELECT COALESCE(MAX(version), 0) + 1 FROM event_store WHERE aggregate_type = 'wallet' AND aggregate_id = $1`, aggregateID).Scan(&version); err != nil {
		return err
	}
	payloadBytes, _ := json.Marshal(payload)
	metadataBytes, _ := json.Marshal(map[string]any{"source": "phoenix-wallet"})
	if _, err := tx.Exec(ctx, `INSERT INTO event_store (aggregate_type, aggregate_id, event_type, version, payload, metadata) VALUES ('wallet', $1, $2, $3, $4, $5)`, aggregateID, eventType, version, payloadBytes, metadataBytes); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `INSERT INTO event_outbox (aggregate_type, aggregate_id, event_type, payload, kafka_topic, kafka_key) VALUES ('wallet', $1, $2, $3, $4, $5)`, aggregateID, eventType, payloadBytes, walletTopicForEvent(eventType), aggregateID); err != nil {
		return err
	}
	return nil
}

func (r *postgresWalletRepository) getReservedBalance(ctx context.Context, walletID string) (decimal.Decimal, error) {
	ledger, err := r.getReservationLedger(ctx, walletID)
	if err != nil {
		return decimal.Zero, err
	}
	total := decimal.Zero
	for _, amount := range ledger {
		total = total.Add(amount)
	}
	return total, nil
}

func (r *postgresWalletRepository) getReservationLedger(ctx context.Context, walletID string) (map[string]decimal.Decimal, error) {
	rows, err := r.pool.Query(ctx, `SELECT event_type, payload FROM event_store WHERE aggregate_type = 'wallet' AND aggregate_id = $1 AND event_type IN ('WalletFundsReserved', 'WalletFundsReleased') ORDER BY version ASC`, walletID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ledger := map[string]decimal.Decimal{}
	for rows.Next() {
		var eventType string
		var payloadBytes []byte
		if err := rows.Scan(&eventType, &payloadBytes); err != nil {
			return nil, err
		}
		var payload map[string]any
		if err := json.Unmarshal(payloadBytes, &payload); err != nil {
			return nil, err
		}
		reservationID, _ := payload["reservation_id"].(string)
		amountStr, _ := payload["amount"].(string)
		amount, err := decimal.NewFromString(amountStr)
		if err != nil {
			return nil, err
		}
		switch eventType {
		case "WalletFundsReserved":
			ledger[reservationID] = ledger[reservationID].Add(amount)
		case "WalletFundsReleased":
			ledger[reservationID] = ledger[reservationID].Sub(amount)
			if !ledger[reservationID].IsPositive() {
				delete(ledger, reservationID)
			}
		}
	}
	return ledger, rows.Err()
}

func (r *postgresWalletRepository) getReferralCode(ctx context.Context, tx pgx.Tx, code string) (*referralCodeRecord, error) {
	record := &referralCodeRecord{}
	err := tx.QueryRow(ctx, `SELECT id, user_id, code, uses_count FROM referral_codes WHERE code = $1 AND is_active = TRUE`, strings.ToUpper(strings.TrimSpace(code))).Scan(&record.ID, &record.UserID, &record.Code, &record.UsesCount)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return record, nil
}

func (r *postgresWalletRepository) ensureReferralRelationship(ctx context.Context, tx pgx.Tx, code *referralCodeRecord, referredID string) (string, error) {
	var id string
	err := tx.QueryRow(ctx, `SELECT id FROM referral_relationships WHERE referrer_id = $1 AND referred_id = $2`, code.UserID, referredID).Scan(&id)
	if err == nil {
		return id, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return "", err
	}
	id = uuid.NewString()
	if _, err := tx.Exec(ctx, `INSERT INTO referral_relationships (id, referrer_id, referred_id, referral_code_id, bonus_paid, created_at) VALUES ($1, $2, $3, $4, $5, $6)`, id, code.UserID, referredID, code.ID, decimal.Zero, time.Now().UTC()); err != nil {
		return "", err
	}
	return id, nil
}

func (r *postgresWalletRepository) scanWallet(scanner pgx.Row) (*models.Wallet, error) {
	wallet := &models.Wallet{}
	if err := scanner.Scan(&wallet.ID, &wallet.UserID, &wallet.Balance, &wallet.Currency, &wallet.Status, &wallet.CreatedAt, &wallet.UpdatedAt); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return wallet, nil
}

func externalTransactionType(value string) string {
	switch value {
	case "bet_place":
		return "bet_placed"
	default:
		return value
	}
}

func transactionStatusFor(value, status string) string {
	if normalized := strings.ToUpper(strings.TrimSpace(status)); normalized != "" {
		return normalized
	}
	switch value {
	case "withdrawal":
		return "PENDING"
	default:
		return "SUCCEEDED"
	}
}

func transactionDirectionFor(value string) string {
	switch value {
	case "withdrawal":
		return "Withdrawal"
	default:
		return "Deposit"
	}
}

func describeTransaction(txType, reference string) string {
	switch txType {
	case "bet_placed":
		if reference != "" {
			return fmt.Sprintf("Bet %s placed", reference)
		}
		return "Bet placed"
	case "deposit":
		return "Deposit"
	case "withdrawal":
		return "Withdrawal"
	case "referral_reward":
		return "Referral reward"
	default:
		return strings.ReplaceAll(txType, "_", " ")
	}
}

func walletTopicForEvent(eventType string) string {
	switch eventType {
	case "WalletReferralRewardApplied":
		return "phoenix.referral.reward_applied"
	default:
		return "phoenix.wallet.balance-updated"
	}
}

func nullableString(value string) any {
	if strings.TrimSpace(value) == "" {
		return nil
	}
	return value
}

func defaultCurrency(currency string) string {
	currency = strings.ToUpper(strings.TrimSpace(currency))
	if currency == "" {
		return "USD"
	}
	return currency
}

func paymentProviderFor(value string) string {
	switch strings.ToLower(strings.TrimSpace(value)) {
	case "", "card", "bank-transfer", "bank_account", "cash", "cheque", "inline":
		return "pxp"
	default:
		return strings.ToLower(strings.TrimSpace(value))
	}
}

func normalizeProviderStatus(value string) string {
	switch strings.ToUpper(strings.TrimSpace(value)) {
	case "APPROVED", "SUCCESS", "SUCCEEDED", "COMPLETED", "SETTLED":
		return "SUCCEEDED"
	case "PROCESSING", "IN_PROGRESS":
		return "PROCESSING"
	case "PENDING_REVIEW", "AWAITING_REVIEW", "MANUAL_REVIEW":
		return "PENDING_REVIEW"
	case "PENDING_APPROVAL", "AWAITING_APPROVAL":
		return "PENDING_APPROVAL"
	case "ACTION_REQUIRED", "REQUIRES_ACTION", "AWAITING_CONFIRMATION", "PENDING_CUSTOMER_ACTION":
		return "ACTION_REQUIRED"
	case "PENDING_SETTLEMENT", "SETTLEMENT_PENDING":
		return "PENDING_SETTLEMENT"
	case "CANCELLED", "CANCELED", "VOIDED":
		return "CANCELLED"
	case "REFUND_PENDING", "REFUND_IN_PROGRESS":
		return "REFUND_PENDING"
	case "REFUNDED", "REFUND", "RETURNED":
		return "REFUNDED"
	case "REFUND_FAILED":
		return "REFUND_FAILED"
	case "REVERSED", "REVERSAL":
		return "REVERSED"
	case "CHARGEBACK_REVIEW", "CHARGEBACK_PENDING", "DISPUTED", "UNDER_REVIEW":
		return "CHARGEBACK_REVIEW"
	case "CHARGEBACK", "CHARGED_BACK":
		return "CHARGEBACK"
	case "RETRYING", "RETRY", "QUEUED_FOR_RETRY":
		return "RETRYING"
	case "DECLINED", "FAILED", "REJECTED", "ERROR":
		return "FAILED"
	default:
		return "PENDING"
	}
}

func reconciliationQueueStatuses() []string {
	return []string{"PENDING_APPROVAL", "PENDING_REVIEW", "RETRYING", "ACTION_REQUIRED", "CHARGEBACK_REVIEW", "REFUND_PENDING"}
}

func isAdminReviewableProviderStatus(status string) bool {
	switch strings.ToUpper(strings.TrimSpace(status)) {
	case "PENDING_APPROVAL", "PENDING_REVIEW", "RETRYING", "ACTION_REQUIRED", "CHARGEBACK_REVIEW", "REFUND_PENDING":
		return true
	default:
		return false
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func previewReconciliationOutcome(transaction *models.WalletTransaction, currentBalance decimal.Decimal, nextStatus string, reservationSatisfied bool) (string, bool, string, decimal.Decimal) {
	currentStatus := strings.ToUpper(strings.TrimSpace(transaction.Status))
	projectedBalance := currentBalance

	switch transaction.Type {
	case "deposit":
		switch nextStatus {
		case "SUCCEEDED":
			if currentStatus == "SUCCEEDED" {
				return "update_provider_status", true, "", projectedBalance
			}
			return "complete_pending_deposit", true, "", currentBalance.Add(transaction.Amount)
		case "FAILED", "CANCELLED", "DECLINED", "EXPIRED":
			if currentStatus == "SUCCEEDED" {
				return "invalid_transition", false, fmt.Sprintf("cannot transition succeeded deposit to %s", strings.ToLower(nextStatus)), projectedBalance
			}
			return "fail_pending_deposit", true, "", projectedBalance
		case "REFUNDED", "REVERSED", "CHARGEBACK":
			if currentStatus != "SUCCEEDED" {
				return "invalid_transition", false, fmt.Sprintf("cannot %s non-succeeded deposit", strings.ToLower(nextStatus)), projectedBalance
			}
			projectedBalance = currentBalance.Sub(transaction.Amount.Abs())
			if projectedBalance.IsNegative() {
				return "reverse_succeeded_deposit", false, "insufficient balance to reverse deposit", currentBalance
			}
			return "reverse_succeeded_deposit", true, "", projectedBalance
		case "PROCESSING", "PENDING", "PENDING_APPROVAL", "PENDING_REVIEW", "RETRYING", "ACTION_REQUIRED", "PENDING_SETTLEMENT":
			if currentStatus == "SUCCEEDED" || currentStatus == "REFUNDED" || currentStatus == "REVERSED" || currentStatus == "CHARGEBACK" {
				return "invalid_transition", false, fmt.Sprintf("cannot transition finalized deposit to %s", strings.ToLower(nextStatus)), projectedBalance
			}
			return "update_provider_status", true, "", projectedBalance
		case "CHARGEBACK_REVIEW", "REFUND_PENDING", "REFUND_FAILED":
			if currentStatus == "REFUNDED" || currentStatus == "REVERSED" || currentStatus == "CHARGEBACK" {
				return "invalid_transition", false, fmt.Sprintf("cannot transition finalized deposit to %s", strings.ToLower(nextStatus)), projectedBalance
			}
			return "update_provider_status", true, "", projectedBalance
		}
	case "withdrawal":
		switch nextStatus {
		case "SUCCEEDED":
			if currentStatus == "SUCCEEDED" {
				return "update_provider_status", true, "", projectedBalance
			}
			if !reservationSatisfied {
				return "complete_pending_withdrawal", false, "reservation not found or insufficient reserved amount", projectedBalance
			}
			projectedBalance = currentBalance.Add(transaction.Amount)
			if projectedBalance.IsNegative() {
				return "complete_pending_withdrawal", false, "insufficient balance", currentBalance
			}
			return "complete_pending_withdrawal", true, "", projectedBalance
		case "FAILED", "CANCELLED", "DECLINED", "EXPIRED":
			if currentStatus == "SUCCEEDED" {
				return "invalid_transition", false, fmt.Sprintf("cannot transition succeeded withdrawal to %s", strings.ToLower(nextStatus)), projectedBalance
			}
			if !reservationSatisfied {
				return "fail_pending_withdrawal", false, "reservation not found or insufficient reserved amount", projectedBalance
			}
			return "fail_pending_withdrawal", true, "", projectedBalance
		case "REFUNDED", "REVERSED", "CHARGEBACK":
			if currentStatus != "SUCCEEDED" {
				return "invalid_transition", false, fmt.Sprintf("cannot %s non-succeeded withdrawal", strings.ToLower(nextStatus)), projectedBalance
			}
			return "reverse_succeeded_withdrawal", true, "", currentBalance.Add(transaction.Amount.Abs())
		case "PROCESSING", "PENDING", "PENDING_APPROVAL", "PENDING_REVIEW", "RETRYING", "ACTION_REQUIRED", "PENDING_SETTLEMENT":
			if currentStatus == "SUCCEEDED" || currentStatus == "REFUNDED" || currentStatus == "REVERSED" || currentStatus == "CHARGEBACK" {
				return "invalid_transition", false, fmt.Sprintf("cannot transition finalized withdrawal to %s", strings.ToLower(nextStatus)), projectedBalance
			}
			return "update_provider_status", true, "", projectedBalance
		case "CHARGEBACK_REVIEW", "REFUND_PENDING", "REFUND_FAILED":
			if currentStatus == "REFUNDED" || currentStatus == "REVERSED" || currentStatus == "CHARGEBACK" {
				return "invalid_transition", false, fmt.Sprintf("cannot transition finalized withdrawal to %s", strings.ToLower(nextStatus)), projectedBalance
			}
			return "update_provider_status", true, "", projectedBalance
		}
	}

	return "unsupported_transition", false, "unsupported status transition", currentBalance
}

func (r *postgresWalletRepository) getTransactionForProviderLookup(ctx context.Context, merchantTransactionID, providerReference string) (*models.WalletTransaction, error) {
	return r.scanWalletTransaction(r.pool.QueryRow(ctx, `
		SELECT wt.id, wt.wallet_id, w.user_id, wt.type, COALESCE(wt.status, ''), wt.amount, wt.balance_before, wt.balance_after, COALESCE(wt.reference, ''), COALESCE(wt.provider, ''), COALESCE(wt.provider_reference, ''), COALESCE(wt.assigned_operator_id::text, ''), wt.assigned_at, COALESCE(wt.metadata, '{}'::jsonb)::text, wt.created_at
		FROM wallet_transactions wt
		JOIN wallets w ON w.id = wt.wallet_id
		WHERE wt.id::text = $1 OR wt.provider_reference = $1 OR ($2 <> '' AND (wt.id::text = $2 OR wt.provider_reference = $2))
		ORDER BY wt.created_at DESC
		LIMIT 1
	`, merchantTransactionID, providerReference))
}

func (r *postgresWalletRepository) getTransactionForProviderUpdate(ctx context.Context, tx pgx.Tx, merchantTransactionID, providerReference string) (*models.WalletTransaction, error) {
	return r.scanWalletTransaction(tx.QueryRow(ctx, `
		SELECT wt.id, wt.wallet_id, w.user_id, wt.type, COALESCE(wt.status, ''), wt.amount, wt.balance_before, wt.balance_after, COALESCE(wt.reference, ''), COALESCE(wt.provider, ''), COALESCE(wt.provider_reference, ''), COALESCE(wt.assigned_operator_id::text, ''), wt.assigned_at, COALESCE(wt.metadata, '{}'::jsonb)::text, wt.created_at
		FROM wallet_transactions wt
		JOIN wallets w ON w.id = wt.wallet_id
		WHERE wt.id::text = $1 OR wt.provider_reference = $1 OR ($2 <> '' AND (wt.id::text = $2 OR wt.provider_reference = $2))
		ORDER BY wt.created_at DESC
		LIMIT 1
		FOR UPDATE
	`, merchantTransactionID, providerReference))
}

func (r *postgresWalletRepository) scanWalletTransaction(scanner pgx.Row) (*models.WalletTransaction, error) {
	transaction := &models.WalletTransaction{}
	var metadataJSON string
	if err := scanner.Scan(
		&transaction.TransactionID,
		&transaction.WalletID,
		&transaction.UserID,
		&transaction.Type,
		&transaction.Status,
		&transaction.Amount,
		&transaction.BalanceBefore,
		&transaction.BalanceAfter,
		&transaction.Reference,
		&transaction.Provider,
		&transaction.ProviderRef,
		&transaction.AssignedTo,
		&transaction.AssignedAt,
		&metadataJSON,
		&transaction.CreatedAt,
	); err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	if strings.TrimSpace(metadataJSON) != "" {
		_ = json.Unmarshal([]byte(metadataJSON), &transaction.Metadata)
	}
	return transaction, nil
}

func (r *postgresWalletRepository) completePendingDepositTx(ctx context.Context, tx pgx.Tx, wallet *models.Wallet, transaction *models.WalletTransaction, provider, providerRef string, now time.Time) error {
	balanceBefore := wallet.Balance
	balanceAfter := wallet.Balance.Add(transaction.Amount)
	if _, err := tx.Exec(ctx, `UPDATE wallets SET balance = $1, updated_at = $2 WHERE id = $3`, balanceAfter, now, wallet.ID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		UPDATE wallet_transactions
		SET status = 'SUCCEEDED',
			provider = NULLIF($1, ''),
			provider_reference = NULLIF($2, ''),
			provider_updated_at = $3,
			balance_before = $4,
			balance_after = $5
		WHERE id = $6
	`, provider, providerRef, now, balanceBefore, balanceAfter, transaction.TransactionID); err != nil {
		return err
	}
	return r.appendWalletEventTx(ctx, tx, wallet.ID, "WalletDepositCompleted", map[string]any{
		"transaction_id": transaction.TransactionID,
		"type":           "deposit",
		"amount":         transaction.Amount.String(),
		"balance_before": balanceBefore.String(),
		"balance_after":  balanceAfter.String(),
		"reference":      transaction.Reference,
		"provider":       provider,
		"provider_ref":   providerRef,
	})
}

func (r *postgresWalletRepository) completePendingWithdrawalTx(ctx context.Context, tx pgx.Tx, wallet *models.Wallet, transaction *models.WalletTransaction, provider, providerRef string, now time.Time) error {
	reservationID := metadataString(transaction.Metadata, "reservation_id")
	if reservationID != "" {
		ledger, err := r.getReservationLedgerTx(ctx, tx, wallet.ID)
		if err != nil {
			return err
		}
		reservedAmount, ok := ledger[reservationID]
		if !ok || reservedAmount.LessThan(transaction.Amount.Abs()) {
			return fmt.Errorf("reservation not found or insufficient reserved amount")
		}
	}
	balanceBefore := wallet.Balance
	balanceAfter := wallet.Balance.Add(transaction.Amount)
	if balanceAfter.IsNegative() {
		return fmt.Errorf("insufficient balance")
	}
	if _, err := tx.Exec(ctx, `UPDATE wallets SET balance = $1, updated_at = $2 WHERE id = $3`, balanceAfter, now, wallet.ID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		UPDATE wallet_transactions
		SET status = 'SUCCEEDED',
			provider = NULLIF($1, ''),
			provider_reference = NULLIF($2, ''),
			provider_updated_at = $3,
			balance_before = $4,
			balance_after = $5
		WHERE id = $6
	`, provider, providerRef, now, balanceBefore, balanceAfter, transaction.TransactionID); err != nil {
		return err
	}
	if err := r.appendWalletEventTx(ctx, tx, wallet.ID, "WalletWithdrawalCompleted", map[string]any{
		"transaction_id": transaction.TransactionID,
		"type":           "withdrawal",
		"amount":         transaction.Amount.Abs().String(),
		"balance_before": balanceBefore.String(),
		"balance_after":  balanceAfter.String(),
		"reference":      transaction.Reference,
		"provider":       provider,
		"provider_ref":   providerRef,
	}); err != nil {
		return err
	}
	if reservationID != "" {
		return r.appendWalletEventTx(ctx, tx, wallet.ID, "WalletFundsReleased", map[string]any{
			"reservation_id": reservationID,
			"amount":         transaction.Amount.Abs().String(),
			"action":         "release",
		})
	}
	return nil
}

func (r *postgresWalletRepository) failPendingWithdrawalTx(ctx context.Context, tx pgx.Tx, walletID string, transaction *models.WalletTransaction, nextStatus, provider, providerRef string, now time.Time) error {
	if _, err := tx.Exec(ctx, `
		UPDATE wallet_transactions
		SET status = $1,
			provider = NULLIF($2, ''),
			provider_reference = NULLIF($3, ''),
			provider_updated_at = $4
		WHERE id = $5
	`, nextStatus, provider, providerRef, now, transaction.TransactionID); err != nil {
		return err
	}
	reservationID := metadataString(transaction.Metadata, "reservation_id")
	if reservationID != "" {
		return r.appendWalletEventTx(ctx, tx, walletID, "WalletFundsReleased", map[string]any{
			"reservation_id": reservationID,
			"amount":         transaction.Amount.Abs().String(),
			"action":         "release",
		})
	}
	return nil
}

func (r *postgresWalletRepository) reverseSucceededDepositTx(ctx context.Context, tx pgx.Tx, wallet *models.Wallet, transaction *models.WalletTransaction, nextStatus, provider, providerRef string, now time.Time) error {
	balanceBefore := wallet.Balance
	balanceAfter := wallet.Balance.Sub(transaction.Amount.Abs())
	if balanceAfter.IsNegative() {
		return fmt.Errorf("insufficient balance to reverse deposit")
	}
	if _, err := tx.Exec(ctx, `UPDATE wallets SET balance = $1, updated_at = $2 WHERE id = $3`, balanceAfter, now, wallet.ID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		UPDATE wallet_transactions
		SET status = $1,
			provider = NULLIF($2, ''),
			provider_reference = NULLIF($3, ''),
			provider_updated_at = $4,
			balance_before = $5,
			balance_after = $6
		WHERE id = $7
	`, nextStatus, provider, providerRef, now, balanceBefore, balanceAfter, transaction.TransactionID); err != nil {
		return err
	}
	return r.appendWalletEventTx(ctx, tx, wallet.ID, "WalletDepositReversed", map[string]any{
		"transaction_id": transaction.TransactionID,
		"type":           "deposit",
		"amount":         transaction.Amount.Abs().String(),
		"balance_before": balanceBefore.String(),
		"balance_after":  balanceAfter.String(),
		"reference":      transaction.Reference,
		"provider":       provider,
		"provider_ref":   providerRef,
		"status":         nextStatus,
	})
}

func (r *postgresWalletRepository) reverseSucceededWithdrawalTx(ctx context.Context, tx pgx.Tx, wallet *models.Wallet, transaction *models.WalletTransaction, nextStatus, provider, providerRef string, now time.Time) error {
	balanceBefore := wallet.Balance
	balanceAfter := wallet.Balance.Add(transaction.Amount.Abs())
	if _, err := tx.Exec(ctx, `UPDATE wallets SET balance = $1, updated_at = $2 WHERE id = $3`, balanceAfter, now, wallet.ID); err != nil {
		return err
	}
	if _, err := tx.Exec(ctx, `
		UPDATE wallet_transactions
		SET status = $1,
			provider = NULLIF($2, ''),
			provider_reference = NULLIF($3, ''),
			provider_updated_at = $4,
			balance_before = $5,
			balance_after = $6
		WHERE id = $7
	`, nextStatus, provider, providerRef, now, balanceBefore, balanceAfter, transaction.TransactionID); err != nil {
		return err
	}
	return r.appendWalletEventTx(ctx, tx, wallet.ID, "WalletWithdrawalReversed", map[string]any{
		"transaction_id": transaction.TransactionID,
		"type":           "withdrawal",
		"amount":         transaction.Amount.Abs().String(),
		"balance_before": balanceBefore.String(),
		"balance_after":  balanceAfter.String(),
		"reference":      transaction.Reference,
		"provider":       provider,
		"provider_ref":   providerRef,
		"status":         nextStatus,
	})
}

func (r *postgresWalletRepository) updateProviderStatusTx(ctx context.Context, tx pgx.Tx, transactionID, status, provider, providerRef string, now time.Time) error {
	_, err := tx.Exec(ctx, `
		UPDATE wallet_transactions
		SET status = $1,
			provider = NULLIF($2, ''),
			provider_reference = NULLIF($3, ''),
			provider_updated_at = $4
		WHERE id = $5
	`, status, provider, providerRef, now, transactionID)
	return err
}

func (r *postgresWalletRepository) applyPaymentStatusTransitionTx(ctx context.Context, tx pgx.Tx, wallet *models.Wallet, transaction *models.WalletTransaction, nextStatus, source, reason, provider, providerRef string, now time.Time, payload map[string]any) error {
	currentStatus := strings.ToUpper(strings.TrimSpace(transaction.Status))
	nextStatus = strings.ToUpper(strings.TrimSpace(nextStatus))
	if nextStatus == "" {
		nextStatus = "PENDING"
	}

	switch transaction.Type {
	case "deposit":
		switch nextStatus {
		case "SUCCEEDED":
			if currentStatus == "SUCCEEDED" {
				if err := r.updateProviderStatusTx(ctx, tx, transaction.TransactionID, "SUCCEEDED", provider, providerRef, now); err != nil {
					return err
				}
			} else if err := r.completePendingDepositTx(ctx, tx, wallet, transaction, provider, providerRef, now); err != nil {
				return err
			}
		case "FAILED", "CANCELLED", "DECLINED", "EXPIRED":
			if currentStatus == "SUCCEEDED" {
				return fmt.Errorf("cannot transition succeeded deposit to %s", strings.ToLower(nextStatus))
			}
			if err := r.updateProviderStatusTx(ctx, tx, transaction.TransactionID, nextStatus, provider, providerRef, now); err != nil {
				return err
			}
		case "REFUNDED", "REVERSED", "CHARGEBACK":
			if currentStatus != "SUCCEEDED" {
				return fmt.Errorf("cannot %s non-succeeded deposit", strings.ToLower(nextStatus))
			}
			if err := r.reverseSucceededDepositTx(ctx, tx, wallet, transaction, nextStatus, provider, providerRef, now); err != nil {
				return err
			}
		case "PROCESSING", "PENDING", "PENDING_APPROVAL", "PENDING_REVIEW", "RETRYING", "ACTION_REQUIRED", "PENDING_SETTLEMENT":
			if currentStatus == "SUCCEEDED" || currentStatus == "REFUNDED" || currentStatus == "REVERSED" || currentStatus == "CHARGEBACK" {
				return fmt.Errorf("cannot transition finalized deposit to %s", strings.ToLower(nextStatus))
			}
			targetStatus := nextStatus
			if targetStatus == "PENDING" && currentStatus == "PROCESSING" {
				targetStatus = "PROCESSING"
			}
			if err := r.updateProviderStatusTx(ctx, tx, transaction.TransactionID, targetStatus, provider, providerRef, now); err != nil {
				return err
			}
		case "CHARGEBACK_REVIEW", "REFUND_PENDING", "REFUND_FAILED":
			if currentStatus == "REFUNDED" || currentStatus == "REVERSED" || currentStatus == "CHARGEBACK" {
				return fmt.Errorf("cannot transition finalized deposit to %s", strings.ToLower(nextStatus))
			}
			if err := r.updateProviderStatusTx(ctx, tx, transaction.TransactionID, nextStatus, provider, providerRef, now); err != nil {
				return err
			}
		default:
			return fmt.Errorf("unsupported status transition")
		}
	case "withdrawal":
		switch nextStatus {
		case "SUCCEEDED":
			if currentStatus == "SUCCEEDED" {
				if err := r.updateProviderStatusTx(ctx, tx, transaction.TransactionID, "SUCCEEDED", provider, providerRef, now); err != nil {
					return err
				}
			} else if err := r.completePendingWithdrawalTx(ctx, tx, wallet, transaction, provider, providerRef, now); err != nil {
				return err
			}
		case "FAILED", "CANCELLED", "DECLINED", "EXPIRED":
			if currentStatus == "SUCCEEDED" {
				return fmt.Errorf("cannot transition succeeded withdrawal to %s", strings.ToLower(nextStatus))
			}
			if currentStatus != nextStatus {
				if err := r.failPendingWithdrawalTx(ctx, tx, wallet.ID, transaction, nextStatus, provider, providerRef, now); err != nil {
					return err
				}
			} else if err := r.updateProviderStatusTx(ctx, tx, transaction.TransactionID, nextStatus, provider, providerRef, now); err != nil {
				return err
			}
		case "REFUNDED", "REVERSED", "CHARGEBACK":
			if currentStatus != "SUCCEEDED" {
				return fmt.Errorf("cannot %s non-succeeded withdrawal", strings.ToLower(nextStatus))
			}
			if err := r.reverseSucceededWithdrawalTx(ctx, tx, wallet, transaction, nextStatus, provider, providerRef, now); err != nil {
				return err
			}
		case "PROCESSING", "PENDING", "PENDING_APPROVAL", "PENDING_REVIEW", "RETRYING", "ACTION_REQUIRED", "PENDING_SETTLEMENT":
			if currentStatus == "SUCCEEDED" || currentStatus == "REFUNDED" || currentStatus == "REVERSED" || currentStatus == "CHARGEBACK" {
				return fmt.Errorf("cannot transition finalized withdrawal to %s", strings.ToLower(nextStatus))
			}
			targetStatus := nextStatus
			if targetStatus == "PENDING" && currentStatus == "PROCESSING" {
				targetStatus = "PROCESSING"
			}
			if err := r.updateProviderStatusTx(ctx, tx, transaction.TransactionID, targetStatus, provider, providerRef, now); err != nil {
				return err
			}
		case "CHARGEBACK_REVIEW", "REFUND_PENDING", "REFUND_FAILED":
			if currentStatus == "REFUNDED" || currentStatus == "REVERSED" || currentStatus == "CHARGEBACK" {
				return fmt.Errorf("cannot transition finalized withdrawal to %s", strings.ToLower(nextStatus))
			}
			if err := r.updateProviderStatusTx(ctx, tx, transaction.TransactionID, nextStatus, provider, providerRef, now); err != nil {
				return err
			}
		default:
			return fmt.Errorf("unsupported status transition")
		}
	default:
		if err := r.updateProviderStatusTx(ctx, tx, transaction.TransactionID, nextStatus, provider, providerRef, now); err != nil {
			return err
		}
	}

	return r.recordPaymentTransactionEventTx(ctx, tx, transaction.TransactionID, nextStatus, source, reason, provider, providerRef, payload)
}

func (r *postgresWalletRepository) recordPaymentTransactionEvent(ctx context.Context, transactionID, status, source, reason, provider, providerRef string, payload map[string]any) error {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err := r.recordPaymentTransactionEventTx(ctx, tx, transactionID, status, source, reason, provider, providerRef, payload); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *postgresWalletRepository) recordPaymentTransactionEventTx(ctx context.Context, tx pgx.Tx, transactionID, status, source, reason, provider, providerRef string, payload map[string]any) error {
	if payload == nil {
		payload = map[string]any{}
	}
	payloadBytes, err := json.Marshal(payload)
	if err != nil {
		return err
	}
	_, err = tx.Exec(ctx, `
		INSERT INTO payment_transaction_events (
			id, transaction_id, status, source, reason, provider, provider_reference, payload, created_at
		) VALUES ($1, $2, $3, $4, NULLIF($5, ''), NULLIF($6, ''), NULLIF($7, ''), $8::jsonb, $9)
	`, uuid.NewString(), transactionID, strings.ToUpper(strings.TrimSpace(status)), strings.TrimSpace(source), strings.TrimSpace(reason), strings.TrimSpace(provider), strings.TrimSpace(providerRef), payloadBytes, time.Now().UTC())
	return err
}

func (r *postgresWalletRepository) writeAuditLog(ctx context.Context, entry auditLogEntry) error {
	tx, err := r.pool.BeginTx(ctx, pgx.TxOptions{})
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)
	if err := r.writeAuditLogTx(ctx, tx, entry); err != nil {
		return err
	}
	return tx.Commit(ctx)
}

func (r *postgresWalletRepository) writeAuditLogTx(ctx context.Context, tx pgx.Tx, entry auditLogEntry) error {
	var oldValue any
	var newValue any
	if entry.OldValue != nil {
		payload, err := json.Marshal(entry.OldValue)
		if err != nil {
			return err
		}
		oldValue = payload
	}
	if entry.NewValue != nil {
		payload, err := json.Marshal(entry.NewValue)
		if err != nil {
			return err
		}
		newValue = payload
	}
	_, err := tx.Exec(ctx, `
		INSERT INTO audit_log (id, user_id, action, entity_type, entity_id, old_value, new_value, ip_address, created_at)
		VALUES ($1, NULLIF($2,'')::uuid, $3, $4, NULLIF($5,''), $6, $7, NULLIF($8,'')::inet, $9)
	`, uuid.NewString(), normalizeAuditActorID(entry.ActorID), entry.Action, entry.EntityType, strings.TrimSpace(entry.EntityID), oldValue, newValue, strings.TrimSpace(entry.IPAddress), entry.CreatedAt.UTC())
	return err
}

func (r *postgresWalletRepository) getReservationLedgerTx(ctx context.Context, tx pgx.Tx, walletID string) (map[string]decimal.Decimal, error) {
	rows, err := tx.Query(ctx, `SELECT event_type, payload FROM event_store WHERE aggregate_type = 'wallet' AND aggregate_id = $1 AND event_type IN ('WalletFundsReserved', 'WalletFundsReleased') ORDER BY version ASC`, walletID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	ledger := map[string]decimal.Decimal{}
	for rows.Next() {
		var eventType string
		var payloadBytes []byte
		if err := rows.Scan(&eventType, &payloadBytes); err != nil {
			return nil, err
		}
		var payload map[string]any
		if err := json.Unmarshal(payloadBytes, &payload); err != nil {
			return nil, err
		}
		reservationID, _ := payload["reservation_id"].(string)
		amountStr, _ := payload["amount"].(string)
		amount, err := decimal.NewFromString(amountStr)
		if err != nil {
			return nil, err
		}
		switch eventType {
		case "WalletFundsReserved":
			ledger[reservationID] = ledger[reservationID].Add(amount)
		case "WalletFundsReleased":
			ledger[reservationID] = ledger[reservationID].Sub(amount)
			if !ledger[reservationID].IsPositive() {
				delete(ledger, reservationID)
			}
		}
	}
	return ledger, rows.Err()
}

func metadataString(metadata map[string]any, key string) string {
	if metadata == nil {
		return ""
	}
	if value, ok := metadata[key].(string); ok {
		return strings.TrimSpace(value)
	}
	return ""
}

func normalizeAuditActorID(actorID string) string {
	actorID = strings.TrimSpace(actorID)
	if actorID == "" {
		return ""
	}
	if _, err := uuid.Parse(actorID); err != nil {
		return ""
	}
	return actorID
}
