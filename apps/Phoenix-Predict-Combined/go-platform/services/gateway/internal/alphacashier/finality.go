package alphacashier

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"

	"phoenix-revival/gateway/internal/wallet"
)

// Audit A2-03: alphacashier credits a deposit after a fixed confirmation count
// and never re-checks it. A deep chain reorg can orphan an already-credited
// transaction, leaving the user holding an internal balance backed by funds
// that are no longer in the canonical chain. This file adds (1) a finality
// re-check that detects a reorg, and (2) a fail-closed freeze of the credited
// amount when one is found. The periodic scheduler that walks credited
// deposits is a thin worker (same shape as MarketCloser) that calls
// CheckDepositFinality + FreezeReorgedDeposit; the safety logic and its tests
// live here. The production-grade watcher is services/bridge-watcher (P3-09);
// this is the interim guard so the live custodial rail is not blind to reorgs.

// FinalityStatus is the outcome of re-checking a credited deposit.
type FinalityStatus string

const (
	// FinalityPending — the tx is still canonical but not yet finality-deep.
	FinalityPending FinalityStatus = "pending"
	// FinalityFinalized — the tx is canonical and at/beyond the finality depth.
	FinalityFinalized FinalityStatus = "finalized"
	// FinalityReorged — the tx is gone from the canonical chain, or re-mined
	// into a different block: the credit is no longer backed.
	FinalityReorged FinalityStatus = "reorged"
)

// FinalityConfirmations returns the depth at which a deposit is considered
// final. Defaults to a conservative 64 blocks; configurable so a chain with
// different finality can tune it.
func (c Config) FinalityConfirmations() int64 {
	if c.FinalityConfirmationsValue > 0 {
		return c.FinalityConfirmationsValue
	}
	return 64
}

// CheckDepositFinality re-verifies a credited deposit's transaction. creditedTx
// is the chain evidence recorded at credit time (block number + hash). A reorg
// is detected when the receipt has vanished from the canonical chain
// (NotFound) or now sits in a different block than the one we credited from.
func CheckDepositFinality(ctx context.Context, client EVMClient, creditedTx ChainTransaction, finalityConfs int64) (FinalityStatus, error) {
	if client == nil {
		return "", fmt.Errorf("evm client required for finality check")
	}
	receipt, err := client.TransactionReceipt(ctx, common.HexToHash(creditedTx.TxHash))
	if err != nil {
		if errors.Is(err, ethereum.NotFound) {
			// Tx dropped from the canonical chain — orphaned by a reorg.
			return FinalityReorged, nil
		}
		return "", fmt.Errorf("fetch receipt: %w", err)
	}
	// Re-mined into a different block ⇒ the original credit's block was
	// reorged out. Compare against the block hash recorded at credit time.
	if creditedTx.BlockHash != "" &&
		!strings.EqualFold(receipt.BlockHash.Hex(), creditedTx.BlockHash) {
		return FinalityReorged, nil
	}
	latest, err := client.BlockNumber(ctx)
	if err != nil {
		return "", fmt.Errorf("fetch block number: %w", err)
	}
	mined := receipt.BlockNumber.Uint64()
	if latest < mined {
		// Node is behind our recorded block; treat as not-yet-final.
		return FinalityPending, nil
	}
	confirmations := int64(latest-mined) + 1
	if confirmations >= finalityConfs {
		return FinalityFinalized, nil
	}
	return FinalityPending, nil
}

// FreezeReorgedDeposit places an idempotent hold on the credited amount of a
// reorged deposit so the (now unbacked) balance cannot be withdrawn, and audits
// it for back-office recovery. Idempotent by deposit id: a repeated detection
// re-asserts the same hold rather than stacking holds.
func (s *Service) FreezeReorgedDeposit(ctx context.Context, depositID, userID string, amountCents int64) error {
	if s.ledger == nil {
		return ErrWalletLedgerMissing
	}
	holdKey := "alpha-cashier:reorg:" + strings.TrimSpace(depositID)
	_, err := s.ledger.Hold(wallet.HoldRequest{
		UserID:        userID,
		AmountCents:   amountCents,
		ReferenceType: "alpha_cashier_reorg_freeze",
		ReferenceID:   holdKey,
		ExpiresIn:     reorgFreezeTTL,
	})
	if err != nil {
		return fmt.Errorf("freeze reorged deposit hold: %w", err)
	}
	slog.ErrorContext(ctx, "alpha cashier: REORG detected on credited deposit — funds frozen pending review",
		"deposit_id", depositID, "user_id", userID, "amount_cents", amountCents)
	_ = s.recordAudit(ctx, "deposit_intent", depositID, "alpha_cashier.deposit.reorg_frozen", "system", "alpha-cashier", map[string]any{
		"userId":      userID,
		"amountCents": amountCents,
		"holdKey":     holdKey,
	})
	return nil
}
