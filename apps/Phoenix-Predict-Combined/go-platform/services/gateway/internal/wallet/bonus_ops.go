package wallet

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"strings"
)

var (
	ErrInsufficientBonusFunds = errors.New("insufficient bonus funds")
	ErrBonusNotActive         = errors.New("player bonus is not active")
)

// DebitBonus deducts from the user's bonus balance. Symmetric to CreditBonus.
// Used by: bonus forfeiture, bonus expiry, bet placement (when drawdown uses bonus).
func (s *Service) DebitBonus(request MutationRequest) (LedgerEntry, error) {
	if s.db == nil {
		// In memory mode, bonus funds live in regular balance
		return s.applyMutationMemory("debit", request)
	}
	return s.applyBonusDebitDB(request)
}

func (s *Service) applyBonusDebitDB(request MutationRequest) (LedgerEntry, error) {
	if request.UserID == "" || request.AmountCents <= 0 || request.IdempotencyKey == "" {
		return LedgerEntry{}, ErrInvalidMutationRequest
	}

	ctx, cancel := context.WithTimeout(context.Background(), walletDBTimeout)
	defer cancel()

	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return LedgerEntry{}, err
	}
	defer func() { _ = tx.Rollback() }()

	// Idempotency check
	existing, found, err := findExistingMutation(ctx, tx, "debit:bonus", request.UserID, request.IdempotencyKey)
	if err != nil {
		return LedgerEntry{}, err
	}
	if found {
		if existing.AmountCents != request.AmountCents {
			return LedgerEntry{}, ErrIdempotencyConflict
		}
		return existing, nil
	}

	var bonusBalance int64
	if err := tx.QueryRowContext(ctx, `
SELECT bonus_balance_cents FROM wallet_balances WHERE user_id = $1 FOR UPDATE`,
		request.UserID).Scan(&bonusBalance); err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return LedgerEntry{}, ErrInsufficientBonusFunds
		}
		return LedgerEntry{}, err
	}

	if bonusBalance < request.AmountCents {
		return LedgerEntry{}, ErrInsufficientBonusFunds
	}

	bonusBalance -= request.AmountCents

	if _, err := tx.ExecContext(ctx, `
UPDATE wallet_balances SET bonus_balance_cents = $2, updated_at = NOW() WHERE user_id = $1`,
		request.UserID, bonusBalance); err != nil {
		return LedgerEntry{}, err
	}

	var id int64
	var transactionTime string
	err = tx.QueryRowContext(ctx, `
INSERT INTO wallet_ledger (user_id, entry_type, fund_type, amount_cents, balance_cents, idempotency_key, reason, transaction_time)
VALUES ($1, 'debit', 'bonus', $2, $3, $4, $5, NOW())
RETURNING id, CAST(transaction_time AS TEXT)`,
		request.UserID, request.AmountCents, bonusBalance,
		request.IdempotencyKey, normalizeReason(request.Reason)).Scan(&id, &transactionTime)
	if err != nil {
		return LedgerEntry{}, err
	}

	if err := tx.Commit(); err != nil {
		return LedgerEntry{}, err
	}

	return LedgerEntry{
		EntryID:         fmt.Sprintf("le:%d", id),
		UserID:          request.UserID,
		Type:            "debit",
		AmountCents:     request.AmountCents,
		BalanceCents:    bonusBalance,
		IdempotencyKey:  request.IdempotencyKey,
		Reason:          request.Reason,
		TransactionTime: transactionTime,
	}, nil
}

// DrawdownRequest specifies a debit that may span real and bonus balances.
type DrawdownRequest struct {
	UserID         string
	AmountCents    int64
	DrawdownOrder  string // "real_first" (default) or "bonus_first"
	IdempotencyKey string
	Reason         string
}

// DrawdownResult reports how the debit was split across real and bonus balances.
type DrawdownResult struct {
	RealDebitCents  int64        `json:"realDebitCents"`
	BonusDebitCents int64        `json:"bonusDebitCents"`
	TotalDebitCents int64        `json:"totalDebitCents"`
	LedgerEntries   []LedgerEntry `json:"ledgerEntries"`
}

// DrawdownDebit debits the requested amount from the correct balance(s)
// based on drawdown order rules. Real-first is the default and recommended
// for regulatory compliance.
func (s *Service) DrawdownDebit(request DrawdownRequest) (DrawdownResult, error) {
	if request.UserID == "" || request.AmountCents <= 0 || request.IdempotencyKey == "" {
		return DrawdownResult{}, ErrInvalidMutationRequest
	}
	order := strings.ToLower(strings.TrimSpace(request.DrawdownOrder))
	if order == "" {
		order = "real_first"
	}

	if s.db == nil {
		// Memory mode: debit from real only (no bonus tracking)
		entry, err := s.applyMutationMemory("debit", MutationRequest{
			UserID:         request.UserID,
			AmountCents:    request.AmountCents,
			IdempotencyKey: request.IdempotencyKey,
			Reason:         request.Reason,
		})
		if err != nil {
			return DrawdownResult{}, err
		}
		return DrawdownResult{
			RealDebitCents:  request.AmountCents,
			TotalDebitCents: request.AmountCents,
			LedgerEntries:   []LedgerEntry{entry},
		}, nil
	}

	ctx, cancel := context.WithTimeout(context.Background(), walletDBTimeout)
	defer cancel()

	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return DrawdownResult{}, err
	}
	defer func() { _ = tx.Rollback() }()

	// Idempotency: check if this drawdown was already applied
	existingReal, foundReal, err := findExistingMutation(ctx, tx, "debit", request.UserID, request.IdempotencyKey+":real")
	if err != nil {
		return DrawdownResult{}, err
	}
	if foundReal {
		// Already applied — reconstruct result
		existingBonus, _, _ := findExistingMutation(ctx, tx, "debit:bonus", request.UserID, request.IdempotencyKey+":bonus")
		result := DrawdownResult{
			RealDebitCents:  existingReal.AmountCents,
			TotalDebitCents: existingReal.AmountCents,
			LedgerEntries:   []LedgerEntry{existingReal},
		}
		if existingBonus.EntryID != "" {
			result.BonusDebitCents = existingBonus.AmountCents
			result.TotalDebitCents += existingBonus.AmountCents
			result.LedgerEntries = append(result.LedgerEntries, existingBonus)
		}
		return result, nil
	}

	// Lock and read both balances
	var realBalance, bonusBalance int64
	err = tx.QueryRowContext(ctx, `
SELECT balance_cents, bonus_balance_cents FROM wallet_balances WHERE user_id = $1 FOR UPDATE`,
		request.UserID).Scan(&realBalance, &bonusBalance)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return DrawdownResult{}, ErrInsufficientFunds
		}
		return DrawdownResult{}, err
	}

	totalAvailable := realBalance + bonusBalance
	if totalAvailable < request.AmountCents {
		return DrawdownResult{}, ErrInsufficientFunds
	}

	// Calculate split
	var realDebit, bonusDebit int64
	remaining := request.AmountCents

	if order == "bonus_first" {
		bonusDebit = min64(remaining, bonusBalance)
		remaining -= bonusDebit
		realDebit = remaining
	} else {
		// real_first (default)
		realDebit = min64(remaining, realBalance)
		remaining -= realDebit
		bonusDebit = remaining
	}

	var entries []LedgerEntry

	// Apply real debit
	if realDebit > 0 {
		realBalance -= realDebit
		if _, err := tx.ExecContext(ctx, `
UPDATE wallet_balances SET balance_cents = $2, updated_at = NOW() WHERE user_id = $1`,
			request.UserID, realBalance); err != nil {
			return DrawdownResult{}, err
		}

		var id int64
		var txTime string
		err = tx.QueryRowContext(ctx, `
INSERT INTO wallet_ledger (user_id, entry_type, fund_type, amount_cents, balance_cents, idempotency_key, reason, transaction_time)
VALUES ($1, 'debit', 'real', $2, $3, $4, $5, NOW())
RETURNING id, CAST(transaction_time AS TEXT)`,
			request.UserID, realDebit, realBalance,
			request.IdempotencyKey+":real", normalizeReason(request.Reason)).Scan(&id, &txTime)
		if err != nil {
			return DrawdownResult{}, err
		}
		entries = append(entries, LedgerEntry{
			EntryID:         fmt.Sprintf("le:%d", id),
			UserID:          request.UserID,
			Type:            "debit",
			AmountCents:     realDebit,
			BalanceCents:    realBalance,
			IdempotencyKey:  request.IdempotencyKey + ":real",
			Reason:          request.Reason,
			TransactionTime: txTime,
		})
	}

	// Apply bonus debit
	if bonusDebit > 0 {
		bonusBalance -= bonusDebit
		if _, err := tx.ExecContext(ctx, `
UPDATE wallet_balances SET bonus_balance_cents = $2, updated_at = NOW() WHERE user_id = $1`,
			request.UserID, bonusBalance); err != nil {
			return DrawdownResult{}, err
		}

		var id int64
		var txTime string
		err = tx.QueryRowContext(ctx, `
INSERT INTO wallet_ledger (user_id, entry_type, fund_type, amount_cents, balance_cents, idempotency_key, reason, transaction_time)
VALUES ($1, 'debit', 'bonus', $2, $3, $4, $5, NOW())
RETURNING id, CAST(transaction_time AS TEXT)`,
			request.UserID, bonusDebit, bonusBalance,
			request.IdempotencyKey+":bonus", normalizeReason(request.Reason)).Scan(&id, &txTime)
		if err != nil {
			return DrawdownResult{}, err
		}
		entries = append(entries, LedgerEntry{
			EntryID:         fmt.Sprintf("le:%d", id),
			UserID:          request.UserID,
			Type:            "debit",
			AmountCents:     bonusDebit,
			BalanceCents:    bonusBalance,
			IdempotencyKey:  request.IdempotencyKey + ":bonus",
			Reason:          request.Reason,
			TransactionTime: txTime,
		})
	}

	if err := tx.Commit(); err != nil {
		return DrawdownResult{}, err
	}

	return DrawdownResult{
		RealDebitCents:  realDebit,
		BonusDebitCents: bonusDebit,
		TotalDebitCents: realDebit + bonusDebit,
		LedgerEntries:   entries,
	}, nil
}

// ConvertBonusToReal atomically moves funds from bonus balance to real balance.
// Called when wagering requirements are met.
func (s *Service) ConvertBonusToReal(userID string, amountCents int64, idempotencyKey string) (LedgerEntry, error) {
	if s.db == nil {
		// Memory mode: bonus and real are the same pool — no-op
		return LedgerEntry{}, nil
	}
	if userID == "" || amountCents <= 0 || idempotencyKey == "" {
		return LedgerEntry{}, ErrInvalidMutationRequest
	}

	ctx, cancel := context.WithTimeout(context.Background(), walletDBTimeout)
	defer cancel()

	tx, err := s.db.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelSerializable})
	if err != nil {
		return LedgerEntry{}, err
	}
	defer func() { _ = tx.Rollback() }()

	// Idempotency check on the credit side
	existing, found, err := findExistingMutation(ctx, tx, "credit", userID, idempotencyKey+":convert")
	if err != nil {
		return LedgerEntry{}, err
	}
	if found {
		return existing, nil
	}

	var realBalance, bonusBalance int64
	err = tx.QueryRowContext(ctx, `
SELECT balance_cents, bonus_balance_cents FROM wallet_balances WHERE user_id = $1 FOR UPDATE`,
		userID).Scan(&realBalance, &bonusBalance)
	if err != nil {
		return LedgerEntry{}, err
	}

	// Cap at available bonus
	convertAmount := amountCents
	if convertAmount > bonusBalance {
		convertAmount = bonusBalance
	}
	if convertAmount <= 0 {
		return LedgerEntry{}, nil
	}

	// Debit bonus
	bonusBalance -= convertAmount
	if _, err := tx.ExecContext(ctx, `
UPDATE wallet_balances SET bonus_balance_cents = $2, updated_at = NOW() WHERE user_id = $1`,
		userID, bonusBalance); err != nil {
		return LedgerEntry{}, err
	}
	_, err = tx.ExecContext(ctx, `
INSERT INTO wallet_ledger (user_id, entry_type, fund_type, amount_cents, balance_cents, idempotency_key, reason, transaction_time)
VALUES ($1, 'debit', 'bonus', $2, $3, $4, 'bonus conversion debit', NOW())`,
		userID, convertAmount, bonusBalance, idempotencyKey+":convert:debit")
	if err != nil {
		return LedgerEntry{}, err
	}

	// Credit real
	realBalance += convertAmount
	if _, err := tx.ExecContext(ctx, `
UPDATE wallet_balances SET balance_cents = $2, updated_at = NOW() WHERE user_id = $1`,
		userID, realBalance); err != nil {
		return LedgerEntry{}, err
	}

	var creditID int64
	var txTime string
	err = tx.QueryRowContext(ctx, `
INSERT INTO wallet_ledger (user_id, entry_type, fund_type, amount_cents, balance_cents, idempotency_key, reason, transaction_time)
VALUES ($1, 'credit', 'real', $2, $3, $4, 'bonus conversion credit', NOW())
RETURNING id, CAST(transaction_time AS TEXT)`,
		userID, convertAmount, realBalance, idempotencyKey+":convert").Scan(&creditID, &txTime)
	if err != nil {
		return LedgerEntry{}, err
	}

	if err := tx.Commit(); err != nil {
		return LedgerEntry{}, err
	}

	return LedgerEntry{
		EntryID:         fmt.Sprintf("le:%d", creditID),
		UserID:          userID,
		Type:            "credit",
		AmountCents:     convertAmount,
		BalanceCents:    realBalance,
		IdempotencyKey:  idempotencyKey + ":convert",
		Reason:          "bonus conversion credit",
		TransactionTime: txTime,
	}, nil
}

// ForfeitBonus zeroes the bonus-attributable amount for a user. Called on
// bonus expiry or admin forfeiture. The amount forfeited is capped at the
// current bonus balance to handle partial consumption.
func (s *Service) ForfeitBonus(userID string, amountCents int64, reason string, idempotencyKey string) (LedgerEntry, error) {
	if s.db == nil {
		return LedgerEntry{}, nil
	}
	if userID == "" || amountCents <= 0 || idempotencyKey == "" {
		return LedgerEntry{}, ErrInvalidMutationRequest
	}

	// Cap at actual bonus balance
	breakdown := s.BalanceWithBreakdown(userID)
	forfeitAmount := amountCents
	if forfeitAmount > breakdown.BonusFundCents {
		forfeitAmount = breakdown.BonusFundCents
	}
	if forfeitAmount <= 0 {
		return LedgerEntry{}, nil
	}

	return s.DebitBonus(MutationRequest{
		UserID:         userID,
		AmountCents:    forfeitAmount,
		IdempotencyKey: idempotencyKey,
		Reason:         reason,
	})
}

func min64(a, b int64) int64 {
	if a < b {
		return a
	}
	return b
}
