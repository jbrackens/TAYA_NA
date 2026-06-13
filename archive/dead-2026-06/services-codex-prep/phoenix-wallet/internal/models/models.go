package models

import (
	"time"

	"github.com/shopspring/decimal"
)

type Wallet struct {
	ID        string          `json:"id" db:"id"`
	UserID    string          `json:"user_id" db:"user_id"`
	Balance   decimal.Decimal `json:"balance" db:"balance"`
	Currency  string          `json:"currency" db:"currency"`
	Status    string          `json:"status" db:"status"`
	CreatedAt time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt time.Time       `json:"updated_at" db:"updated_at"`
}

type WalletSummary struct {
	UserID      string          `json:"user_id"`
	Balance     decimal.Decimal `json:"balance"`
	Currency    string          `json:"currency"`
	Reserved    decimal.Decimal `json:"reserved"`
	Available   decimal.Decimal `json:"available"`
	LastUpdated time.Time       `json:"last_updated"`
}

type ProductExposureSummary struct {
	OpenExposure decimal.Decimal `json:"open_exposure"`
}

type PredictionProductSummary struct {
	OpenExposure    decimal.Decimal `json:"open_exposure"`
	OpenOrders      int             `json:"open_orders"`
	SettledOrders   int             `json:"settled_orders"`
	CancelledOrders int             `json:"cancelled_orders"`
}

type FinancialSummaryProductBreakdown struct {
	Sportsbook ProductExposureSummary   `json:"sportsbook"`
	Prediction PredictionProductSummary `json:"prediction"`
}

type FinancialSummaryResponse struct {
	CurrentBalance      decimal.Decimal                  `json:"current_balance"`
	OpenedBets          decimal.Decimal                  `json:"opened_bets"`
	PendingWithdrawals  decimal.Decimal                  `json:"pending_withdrawals"`
	LifetimeDeposits    decimal.Decimal                  `json:"lifetime_deposits"`
	LifetimeWithdrawals decimal.Decimal                  `json:"lifetime_withdrawals"`
	NetCash             decimal.Decimal                  `json:"net_cash"`
	ProductBreakdown    FinancialSummaryProductBreakdown `json:"product_breakdown"`
}

type WalletTransaction struct {
	TransactionID string          `json:"transaction_id"`
	WalletID      string          `json:"wallet_id"`
	UserID        string          `json:"user_id"`
	Type          string          `json:"type"`
	Status        string          `json:"status,omitempty"`
	Product       string          `json:"product,omitempty"`
	Currency      string          `json:"currency,omitempty"`
	Amount        decimal.Decimal `json:"amount"`
	BalanceBefore decimal.Decimal `json:"balance_before"`
	BalanceAfter  decimal.Decimal `json:"balance_after"`
	Description   string          `json:"description,omitempty"`
	Reference     string          `json:"reference,omitempty"`
	Provider      string          `json:"provider,omitempty"`
	ProviderRef   string          `json:"provider_reference,omitempty"`
	AssignedTo    string          `json:"assigned_to,omitempty"`
	AssignedAt    *time.Time      `json:"assigned_at,omitempty"`
	Metadata      map[string]any  `json:"metadata,omitempty"`
	CreatedAt     time.Time       `json:"timestamp"`
}

type DepositRequest struct {
	Amount        decimal.Decimal `json:"amount"`
	PaymentMethod string          `json:"payment_method"`
	PaymentToken  string          `json:"payment_token"`
	Currency      string          `json:"currency"`
}

type DepositResponse struct {
	DepositID     string          `json:"deposit_id"`
	TransactionID string          `json:"transaction_id,omitempty"`
	UserID        string          `json:"user_id"`
	Amount        decimal.Decimal `json:"amount"`
	Status        string          `json:"status"`
	CreatedAt     time.Time       `json:"created_at"`
}

type WithdrawalRequest struct {
	Amount        decimal.Decimal `json:"amount"`
	BankAccountID string          `json:"bank_account_id"`
	Currency      string          `json:"currency"`
}

type WithdrawalResponse struct {
	WithdrawalID  string          `json:"withdrawal_id"`
	TransactionID string          `json:"transaction_id,omitempty"`
	UserID        string          `json:"user_id"`
	Amount        decimal.Decimal `json:"amount"`
	Status        string          `json:"status"`
	CreatedAt     time.Time       `json:"created_at"`
}

type TransactionListResponse struct {
	Data       []WalletTransaction `json:"data"`
	Pagination Pagination          `json:"pagination"`
}

type LegacyWalletAmount struct {
	Amount   decimal.Decimal `json:"amount"`
	Currency string          `json:"currency"`
}

type LegacyWalletPaymentMethod struct {
	AdminPunterID string `json:"adminPunterId,omitempty"`
	Details       string `json:"details,omitempty"`
	Type          string `json:"type,omitempty"`
}

type LegacyWalletHistoryItem struct {
	WalletID               string                     `json:"walletId"`
	TransactionID          string                     `json:"transactionId"`
	CreatedAt              time.Time                  `json:"createdAt"`
	Status                 string                     `json:"status"`
	Product                string                     `json:"product,omitempty"`
	Category               string                     `json:"category"`
	ExternalID             string                     `json:"externalId,omitempty"`
	PaymentMethod          *LegacyWalletPaymentMethod `json:"paymentMethod,omitempty"`
	TransactionAmount      LegacyWalletAmount         `json:"transactionAmount"`
	PreTransactionBalance  LegacyWalletAmount         `json:"preTransactionBalance"`
	PostTransactionBalance LegacyWalletAmount         `json:"postTransactionBalance"`
}

type LegacyWalletHistoryResponse struct {
	Data         []LegacyWalletHistoryItem `json:"data"`
	CurrentPage  int                       `json:"currentPage"`
	ItemsPerPage int                       `json:"itemsPerPage"`
	TotalCount   int                       `json:"totalCount"`
}

type PaymentTransactionSummaryItem struct {
	Provider      string          `json:"provider,omitempty"`
	Type          string          `json:"type"`
	Status        string          `json:"status"`
	AssignedTo    string          `json:"assigned_to,omitempty"`
	Count         int             `json:"count"`
	TotalAmount   decimal.Decimal `json:"total_amount"`
	LastUpdatedAt time.Time       `json:"last_updated_at"`
}

type PaymentTransactionSummaryResponse struct {
	Data []PaymentTransactionSummaryItem `json:"data"`
}

type PaymentTransactionDetailsResponse struct {
	TransactionID     string          `json:"transaction_id"`
	Status            string          `json:"status"`
	Direction         string          `json:"direction"`
	Amount            decimal.Decimal `json:"amount"`
	Currency          string          `json:"currency"`
	PaymentMethod     string          `json:"payment_method,omitempty"`
	Provider          string          `json:"provider,omitempty"`
	ProviderRef       string          `json:"provider_reference,omitempty"`
	Reference         string          `json:"reference,omitempty"`
	ProviderUpdatedAt *time.Time      `json:"provider_updated_at,omitempty"`
	AssignedTo        string          `json:"assigned_to,omitempty"`
	AssignedAt        *time.Time      `json:"assigned_at,omitempty"`
	Metadata          map[string]any  `json:"metadata,omitempty"`
	CreatedAt         time.Time       `json:"created_at"`
}

type PaymentTransactionStatusUpdateRequest struct {
	Status      string `json:"status"`
	ProviderRef string `json:"provider_reference,omitempty"`
	Reason      string `json:"reason,omitempty"`
}

type PaymentTransactionActionRequest struct {
	ProviderRef string `json:"provider_reference,omitempty"`
	Reason      string `json:"reason,omitempty"`
}

type ProviderCancelRequest struct {
	Adapter   string `json:"adapter"`
	PlayerID  string `json:"playerId"`
	BetID     string `json:"betId"`
	RequestID string `json:"requestId"`
	Reason    string `json:"reason,omitempty"`
}

type ProviderCancelResponse struct {
	State        string `json:"state,omitempty"`
	Adapter      string `json:"adapter,omitempty"`
	Attempts     int    `json:"attempts,omitempty"`
	RetryCount   int    `json:"retryCount,omitempty"`
	FallbackUsed bool   `json:"fallbackUsed,omitempty"`
	LastError    string `json:"lastError,omitempty"`
	UpdatedAt    string `json:"updatedAt,omitempty"`
}

type AdminFundsMutationAmount struct {
	Amount   decimal.Decimal `json:"amount"`
	Currency string          `json:"currency"`
}

type AdminFundsMutationRequest struct {
	Amount  AdminFundsMutationAmount `json:"amount"`
	Details string                   `json:"details,omitempty"`
	Reason  string                   `json:"reason,omitempty"`
}

type PaymentTransactionAssignmentRequest struct {
	AssignedTo string `json:"assigned_to"`
	Reason     string `json:"reason,omitempty"`
}

type AdminPaymentReconciliationRequest struct {
	MerchantTransactionID string `json:"merchantTransactionId,omitempty"`
	ProviderReference     string `json:"providerReference,omitempty"`
	State                 string `json:"state"`
	PaymentMethod         string `json:"paymentMethod,omitempty"`
	Reason                string `json:"reason,omitempty"`
}

type PaymentTransactionReconciliationPreviewResponse struct {
	TransactionID        string          `json:"transaction_id"`
	Provider             string          `json:"provider,omitempty"`
	ProviderReference    string          `json:"provider_reference,omitempty"`
	Direction            string          `json:"direction"`
	CurrentStatus        string          `json:"current_status"`
	RequestedStatus      string          `json:"requested_status"`
	NormalizedStatus     string          `json:"normalized_status"`
	Action               string          `json:"action"`
	Allowed              bool            `json:"allowed"`
	BlockingReason       string          `json:"blocking_reason,omitempty"`
	CurrentBalance       decimal.Decimal `json:"current_balance"`
	ProjectedBalance     decimal.Decimal `json:"projected_balance"`
	ReservationID        string          `json:"reservation_id,omitempty"`
	RequiresReservation  bool            `json:"requires_reservation"`
	ReservationSatisfied bool            `json:"reservation_satisfied"`
}

type PaymentTransactionEvent struct {
	ID            string         `json:"id"`
	TransactionID string         `json:"transaction_id"`
	Status        string         `json:"status"`
	Source        string         `json:"source"`
	Reason        string         `json:"reason,omitempty"`
	Provider      string         `json:"provider,omitempty"`
	ProviderRef   string         `json:"provider_reference,omitempty"`
	Payload       map[string]any `json:"payload,omitempty"`
	CreatedAt     time.Time      `json:"created_at"`
}

type PaymentTransactionEventListResponse struct {
	Data []PaymentTransactionEvent `json:"data"`
}

type Pagination struct {
	Page  int `json:"page"`
	Limit int `json:"limit"`
	Total int `json:"total"`
}

type ApplyReferralRewardRequest struct {
	ReferralCode string `json:"referral_code"`
}

type ApplyReferralRewardResponse struct {
	UserID       string          `json:"user_id"`
	RewardAmount decimal.Decimal `json:"reward_amount"`
	NewBalance   decimal.Decimal `json:"new_balance"`
	ReferrerID   string          `json:"referrer_id"`
	AppliedAt    time.Time       `json:"applied_at"`
}

type ReserveFundsRequest struct {
	Amount        decimal.Decimal `json:"amount"`
	ReferenceID   string          `json:"reference_id"`
	ReferenceType string          `json:"reference_type"`
}

type ReserveFundsResponse struct {
	UserID           string          `json:"user_id"`
	ReservedAmount   decimal.Decimal `json:"reserved_amount"`
	AvailableBalance decimal.Decimal `json:"available_balance"`
	ReservationID    string          `json:"reservation_id"`
}

type ReleaseReserveRequest struct {
	ReservationID string          `json:"reservation_id"`
	Amount        decimal.Decimal `json:"amount"`
}

type ReleaseReserveResponse struct {
	UserID              string          `json:"user_id"`
	ReleasedAmount      decimal.Decimal `json:"released_amount"`
	NewAvailableBalance decimal.Decimal `json:"new_available_balance"`
}

type ReservationEvent struct {
	ReservationID string          `json:"reservation_id"`
	Amount        decimal.Decimal `json:"amount"`
	ReferenceID   string          `json:"reference_id,omitempty"`
	ReferenceType string          `json:"reference_type,omitempty"`
	Action        string          `json:"action"`
}

type AuthClaims struct {
	UserID string `json:"user_id"`
	Role   string `json:"role"`
}

type PaymentStateChangedNotification struct {
	MerchantTransactionID string `xml:"merchantTransactionId" json:"merchantTransactionId"`
	ProviderReference     string `xml:"providerReference" json:"providerReference"`
	State                 string `xml:"state" json:"state"`
	PaymentMethod         string `xml:"paymentMethod" json:"paymentMethod"`
	Reason                string `xml:"reason" json:"reason,omitempty"`
	ProviderDecision      string `xml:"providerDecision" json:"providerDecision,omitempty"`
	ProviderMessage       string `xml:"providerMessage" json:"providerMessage,omitempty"`
	RequiredAction        string `xml:"requiredAction" json:"requiredAction,omitempty"`
	NextRetryAt           string `xml:"nextRetryAt" json:"nextRetryAt,omitempty"`
}

type PaymentStateChangedNotificationResponse struct {
	Status        string `xml:"status" json:"status"`
	TransactionID string `xml:"transactionId,omitempty" json:"transactionId,omitempty"`
}

type CashDepositVerificationRequest struct {
	MerchantTransactionID string `xml:"merchantTransactionId" json:"merchantTransactionId"`
}

type CashDepositVerificationResponse struct {
	Status        string `xml:"status" json:"status"`
	Valid         bool   `xml:"valid" json:"valid"`
	TransactionID string `xml:"transactionId,omitempty" json:"transactionId,omitempty"`
}
