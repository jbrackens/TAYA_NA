package models

import (
	"time"

	"github.com/shopspring/decimal"
)

// TransactionType represents the type of wallet transaction.
type TransactionType string

const (
	// TransactionDeposit represents money deposited into a wallet.
	TransactionDeposit TransactionType = "deposit"
	// TransactionWithdrawal represents money withdrawn from a wallet.
	TransactionWithdrawal TransactionType = "withdrawal"
	// TransactionBetPlace represents a bet stake placed.
	TransactionBetPlace TransactionType = "bet_place"
	// TransactionBetWin represents winnings from a successful bet.
	TransactionBetWin TransactionType = "bet_win"
	// TransactionBetRefund represents a refund for a cancelled or void bet.
	TransactionBetRefund TransactionType = "bet_refund"
	// TransactionBonus represents a promotional bonus credited.
	TransactionBonus TransactionType = "bonus"
	// TransactionReferralReward represents a referral reward.
	TransactionReferralReward TransactionType = "referral_reward"
)

// IsValid checks if the TransactionType is one of the valid types.
func (t TransactionType) IsValid() bool {
	return t == TransactionDeposit || t == TransactionWithdrawal ||
		t == TransactionBetPlace || t == TransactionBetWin ||
		t == TransactionBetRefund || t == TransactionBonus ||
		t == TransactionReferralReward
}

// WalletStatus represents the status of a wallet.
type WalletStatus string

const (
	// WalletActive indicates the wallet is active and can be used.
	WalletActive WalletStatus = "active"
	// WalletFrozen indicates the wallet is frozen and cannot be used.
	WalletFrozen WalletStatus = "frozen"
	// WalletClosed indicates the wallet has been closed.
	WalletClosed WalletStatus = "closed"
)

// IsValid checks if the WalletStatus is one of the valid statuses.
func (w WalletStatus) IsValid() bool {
	return w == WalletActive || w == WalletFrozen || w == WalletClosed
}

// Wallet represents a user's financial wallet.
type Wallet struct {
	// ID is the unique identifier for the wallet.
	ID string `db:"id" json:"id"`
	// UserID is the ID of the user who owns this wallet.
	UserID string `db:"user_id" json:"user_id"`
	// Balance is the current balance in the wallet using high-precision decimal arithmetic.
	Balance decimal.Decimal `db:"balance" json:"balance"`
	// Currency is the currency code (e.g., "USD", "EUR", "BTC").
	Currency string `db:"currency" json:"currency"`
	// Status is the current status of the wallet (active, frozen, closed).
	Status WalletStatus `db:"status" json:"status"`
	// CreatedAt is the timestamp when the wallet was created.
	CreatedAt time.Time `db:"created_at" json:"created_at"`
	// UpdatedAt is the timestamp when the wallet was last updated.
	UpdatedAt time.Time `db:"updated_at" json:"updated_at"`
}

// NewWallet creates a new Wallet instance with sensible defaults.
func NewWallet(id, userID, currency string) *Wallet {
	now := time.Now().UTC()
	return &Wallet{
		ID:        id,
		UserID:    userID,
		Balance:   decimal.Zero,
		Currency:  currency,
		Status:    WalletActive,
		CreatedAt: now,
		UpdatedAt: now,
	}
}

// Deposit adds funds to the wallet.
func (w *Wallet) Deposit(amount decimal.Decimal) {
	w.Balance = w.Balance.Add(amount)
	w.UpdatedAt = time.Now().UTC()
}

// Withdraw subtracts funds from the wallet if sufficient balance exists.
func (w *Wallet) Withdraw(amount decimal.Decimal) bool {
	if w.Balance.LessThan(amount) {
		return false
	}
	w.Balance = w.Balance.Sub(amount)
	w.UpdatedAt = time.Now().UTC()
	return true
}

// CanWithdraw checks if the wallet has sufficient balance for a withdrawal.
func (w *Wallet) CanWithdraw(amount decimal.Decimal) bool {
	return w.Balance.GreaterThanOrEqual(amount)
}

// Transaction represents a single transaction in a wallet's history.
type Transaction struct {
	// ID is the unique identifier for the transaction.
	ID string `db:"id" json:"id"`
	// WalletID is the ID of the wallet this transaction belongs to.
	WalletID string `db:"wallet_id" json:"wallet_id"`
	// Type is the type of transaction (deposit, withdrawal, bet_place, etc.).
	Type TransactionType `db:"type" json:"type"`
	// Amount is the transaction amount using high-precision decimal arithmetic.
	Amount decimal.Decimal `db:"amount" json:"amount"`
	// BalanceBefore is the wallet balance before the transaction.
	BalanceBefore decimal.Decimal `db:"balance_before" json:"balance_before"`
	// BalanceAfter is the wallet balance after the transaction.
	BalanceAfter decimal.Decimal `db:"balance_after" json:"balance_after"`
	// Reference is an optional reference identifier (e.g., bet ID, withdrawal ID).
	Reference string `db:"reference" json:"reference"`
	// CreatedAt is the timestamp when the transaction occurred.
	CreatedAt time.Time `db:"created_at" json:"created_at"`
}

// NewTransaction creates a new Transaction instance.
func NewTransaction(id, walletID string, txType TransactionType, amount,
	balanceBefore, balanceAfter decimal.Decimal, reference string) *Transaction {
	return &Transaction{
		ID:            id,
		WalletID:      walletID,
		Type:          txType,
		Amount:        amount,
		BalanceBefore: balanceBefore,
		BalanceAfter:  balanceAfter,
		Reference:     reference,
		CreatedAt:     time.Now().UTC(),
	}
}
