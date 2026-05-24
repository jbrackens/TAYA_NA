package payments

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"math/big"

	"github.com/lib/pq"
)

// crypto_deposits records on-chain token transfers detected by the deposit
// watcher and tracks them through to a ledger credit. It is self-managed by the
// rail (CREATE TABLE IF NOT EXISTS via EnsureCryptoSchema), matching the
// existing crypto_deposit_addresses table.
//
// Two unique indexes carry the money-correctness invariant:
//
//   - uq_crypto_deposits_log (chain_id, tx_hash, log_index, block_hash):
//     detection dedupe. One transfer log in one block is one row. A reorg that
//     re-mines the same (tx, log) under a different block is a DISTINCT row, so
//     the orphaned original can be marked 'reorged' independently.
//   - uq_crypto_deposits_credit (chain_id, tx_hash, log_index) WHERE
//     status='credited': at most ONE credited row per logical transfer,
//     enforced by the database regardless of reorg/replay races. This is the
//     backstop behind wallet.Credit's own idempotency key.
var cryptoDepositsDDL = []string{
	`CREATE TABLE IF NOT EXISTS crypto_deposits (
  id              TEXT PRIMARY KEY,
  user_id         TEXT NOT NULL,
  network         TEXT NOT NULL,
  asset           TEXT NOT NULL,
  chain_id        BIGINT NOT NULL,
  tx_hash         TEXT NOT NULL,
  log_index       INTEGER NOT NULL,
  block_hash      TEXT NOT NULL,
  block_number    BIGINT NOT NULL,
  from_address    TEXT NOT NULL,
  to_address      TEXT NOT NULL,
  amount_base     NUMERIC(78,0) NOT NULL,
  amount_cents    BIGINT NOT NULL,
  dust_base       NUMERIC(78,0) NOT NULL DEFAULT 0,
  status          TEXT NOT NULL DEFAULT 'pending',
  ledger_entry_id TEXT,
  detected_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  credited_at     TIMESTAMPTZ,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
)`,
	`CREATE UNIQUE INDEX IF NOT EXISTS uq_crypto_deposits_log ON crypto_deposits (chain_id, tx_hash, log_index, block_hash)`,
	`CREATE UNIQUE INDEX IF NOT EXISTS uq_crypto_deposits_credit ON crypto_deposits (chain_id, tx_hash, log_index) WHERE status = 'credited'`,
	`CREATE INDEX IF NOT EXISTS idx_crypto_deposits_user ON crypto_deposits (user_id)`,
	`CREATE INDEX IF NOT EXISTS idx_crypto_deposits_status ON crypto_deposits (status)`,
}

func ensureCryptoDepositsSchema(ctx context.Context, db *sql.DB) error {
	for _, stmt := range cryptoDepositsDDL {
		if _, err := db.ExecContext(ctx, stmt); err != nil {
			return fmt.Errorf("crypto_deposits schema: %w", err)
		}
	}
	return nil
}

// Deposit lifecycle states.
const (
	DepositPending  = "pending"
	DepositCredited = "credited"
	DepositReorged  = "reorged"
)

var (
	// ErrDepositAlreadyCredited means a credited row already exists for this
	// logical transfer (chain_id, tx_hash, log_index) — the DB invariant blocked
	// a second credit. Treat as success/no-op by the caller, never as a retry.
	ErrDepositAlreadyCredited = errors.New("crypto deposit already credited for this transfer")
	// ErrDepositNotPending means the row was not in 'pending' status (already
	// credited, reorged, or missing) so the transition did not apply.
	ErrDepositNotPending = errors.New("crypto deposit not in pending status")
)

// CryptoDeposit is one detected on-chain transfer to a user's deposit address.
type CryptoDeposit struct {
	ID            string
	UserID        string
	Network       string
	Asset         string
	ChainID       int64
	TxHash        string
	LogIndex      int
	BlockHash     string
	BlockNumber   int64
	FromAddress   string
	ToAddress     string
	AmountBase    *big.Int // raw on-chain base units (e.g. 18-dec USDT wei)
	AmountCents   int64    // truncated credit amount (TokenUnitsToCents)
	DustBase      *big.Int // sub-cent remainder, retained not credited
	Status        string
	LedgerEntryID string
}

// CryptoDepositStore is the data-access layer for crypto_deposits.
type CryptoDepositStore struct {
	db *sql.DB
}

func NewCryptoDepositStore(db *sql.DB) *CryptoDepositStore {
	return &CryptoDepositStore{db: db}
}

// RecordDeposit inserts a detected transfer, deduped on
// (chain_id, tx_hash, log_index, block_hash). It returns inserted=false when the
// exact log was already seen, so the watcher can no-op on replays.
func (s *CryptoDepositStore) RecordDeposit(ctx context.Context, d CryptoDeposit) (inserted bool, err error) {
	ctx, cancel := context.WithTimeout(ctx, paymentDBTimeout)
	defer cancel()
	res, err := s.db.ExecContext(ctx, `
INSERT INTO crypto_deposits
  (id, user_id, network, asset, chain_id, tx_hash, log_index, block_hash, block_number,
   from_address, to_address, amount_base, amount_cents, dust_base, status)
VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,'pending')
ON CONFLICT (chain_id, tx_hash, log_index, block_hash) DO NOTHING`,
		d.ID, d.UserID, d.Network, d.Asset, d.ChainID, d.TxHash, d.LogIndex, d.BlockHash, d.BlockNumber,
		d.FromAddress, d.ToAddress, bigToNumeric(d.AmountBase), d.AmountCents, bigToNumeric(d.DustBase))
	if err != nil {
		return false, err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return false, err
	}
	return n > 0, nil
}

// MarkCredited transitions a pending deposit to credited, recording the ledger
// entry. The partial unique index makes a second credit for the same logical
// transfer fail with ErrDepositAlreadyCredited even across reorg-duplicate rows.
func (s *CryptoDepositStore) MarkCredited(ctx context.Context, id, ledgerEntryID string) error {
	ctx, cancel := context.WithTimeout(ctx, paymentDBTimeout)
	defer cancel()
	res, err := s.db.ExecContext(ctx, `
UPDATE crypto_deposits
SET status = 'credited', ledger_entry_id = $2, credited_at = NOW(), updated_at = NOW()
WHERE id = $1 AND status = 'pending'`, id, ledgerEntryID)
	if err != nil {
		if isUniqueViolation(err) {
			return ErrDepositAlreadyCredited
		}
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrDepositNotPending
	}
	return nil
}

// MarkReorged transitions a pending deposit to reorged (its block left the
// canonical chain before finality). Only pending rows transition.
func (s *CryptoDepositStore) MarkReorged(ctx context.Context, id string) error {
	ctx, cancel := context.WithTimeout(ctx, paymentDBTimeout)
	defer cancel()
	res, err := s.db.ExecContext(ctx, `
UPDATE crypto_deposits
SET status = 'reorged', updated_at = NOW()
WHERE id = $1 AND status = 'pending'`, id)
	if err != nil {
		return err
	}
	n, err := res.RowsAffected()
	if err != nil {
		return err
	}
	if n == 0 {
		return ErrDepositNotPending
	}
	return nil
}

// GetByID loads a deposit by id.
func (s *CryptoDepositStore) GetByID(ctx context.Context, id string) (CryptoDeposit, error) {
	ctx, cancel := context.WithTimeout(ctx, paymentDBTimeout)
	defer cancel()
	return scanCryptoDeposit(s.db.QueryRowContext(ctx,
		`SELECT `+cryptoDepositColumns+` FROM crypto_deposits WHERE id = $1`, id))
}

// bigToNumeric renders a *big.Int as the decimal string Postgres NUMERIC accepts
// (nil -> "0").
func bigToNumeric(x *big.Int) string {
	if x == nil {
		return "0"
	}
	return x.String()
}

func isUniqueViolation(err error) bool {
	var pqErr *pq.Error
	if errors.As(err, &pqErr) {
		return pqErr.Code == "23505"
	}
	return false
}
