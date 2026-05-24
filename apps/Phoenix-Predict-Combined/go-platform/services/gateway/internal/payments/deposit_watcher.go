package payments

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"strings"

	"phoenix-revival/gateway/internal/wallet"
)

// LedgerCrediter is the slice of wallet.Service the watcher needs, so it can be
// tested with a fake. *wallet.Service satisfies it.
type LedgerCrediter interface {
	Credit(req wallet.MutationRequest) (wallet.LedgerEntry, error)
}

// WatcherConfig fixes the token and finality rules the watcher operates under.
type WatcherConfig struct {
	ChainID       int64
	Network       string
	Asset         string
	TokenContract string
	TokenDecimals int
	Confirmations int
}

// DepositWatcher detects ERC-20 transfers to user deposit addresses and credits
// the cents ledger exactly once, after finality. Fail-closed: it credits only
// transfers it has fully verified (decoded, mapped to a known deposit address,
// converted), and crediting is idempotent on crypto_deposit:<chainId>:<tx>:<log>.
type DepositWatcher struct {
	cfg    WatcherConfig
	chain  ChainReader
	store  *CryptoDepositStore
	ledger LedgerCrediter
}

func NewDepositWatcher(cfg WatcherConfig, chain ChainReader, store *CryptoDepositStore, ledger LedgerCrediter) *DepositWatcher {
	return &DepositWatcher{cfg: cfg, chain: chain, store: store, ledger: ledger}
}

// Sync runs one detect+credit cycle over [fromBlock, head] and returns the next
// cursor (head+1). Callers drive it on a ticker and persist the cursor.
func (w *DepositWatcher) Sync(ctx context.Context, fromBlock int64) (int64, error) {
	head, err := w.chain.BlockNumber(ctx)
	if err != nil {
		return fromBlock, fmt.Errorf("head block: %w", err)
	}
	if head < fromBlock {
		return fromBlock, nil
	}
	owners, err := w.store.DepositAddressOwners(ctx, w.cfg.Network, w.cfg.Asset)
	if err != nil {
		return fromBlock, fmt.Errorf("deposit owners: %w", err)
	}
	if len(owners) > 0 {
		logs, err := w.chain.GetLogs(ctx, LogFilter{
			FromBlock: fromBlock,
			ToBlock:   head,
			Address:   w.cfg.TokenContract,
			Topics:    []any{erc20TransferTopic, nil, addressTopics(owners)},
		})
		if err != nil {
			return fromBlock, fmt.Errorf("get logs: %w", err)
		}
		w.recordTransfers(ctx, logs, owners)
	}
	w.creditFinalized(ctx, head)
	return head + 1, nil
}

func (w *DepositWatcher) recordTransfers(ctx context.Context, logs []Log, owners map[string]string) {
	for _, l := range logs {
		tr, err := DecodeERC20Transfer(l)
		if err != nil {
			continue // not a well-formed Transfer
		}
		userID, ok := owners[strings.ToLower(tr.To)]
		if !ok {
			continue // not one of our deposit addresses
		}
		id := depositID(w.cfg.ChainID, l.TxHash, l.LogIndex, l.BlockHash)
		if l.Removed {
			// The block carrying this transfer left the canonical chain.
			_ = w.store.MarkReorged(ctx, id)
			continue
		}
		cents, dust, err := TokenUnitsToCents(tr.Amount, w.cfg.TokenDecimals)
		if err != nil {
			slog.Error("crypto deposit: amount conversion failed", "tx", l.TxHash, "err", err)
			continue
		}
		if _, err := w.store.RecordDeposit(ctx, CryptoDeposit{
			ID: id, UserID: userID, Network: w.cfg.Network, Asset: w.cfg.Asset, ChainID: w.cfg.ChainID,
			TxHash: l.TxHash, LogIndex: l.LogIndex, BlockHash: l.BlockHash, BlockNumber: l.BlockNumber,
			FromAddress: strings.ToLower(tr.From), ToAddress: strings.ToLower(tr.To),
			AmountBase: tr.Amount, AmountCents: cents, DustBase: dust,
		}); err != nil {
			slog.Error("crypto deposit: record failed", "tx", l.TxHash, "err", err)
		}
	}
}

func (w *DepositWatcher) creditFinalized(ctx context.Context, head int64) {
	pending, err := w.store.ListPendingDeposits(ctx, w.cfg.Network, w.cfg.Asset, 500)
	if err != nil {
		slog.Error("crypto deposit: list pending failed", "err", err)
		return
	}
	for _, d := range pending {
		if head-d.BlockNumber+1 < int64(w.cfg.Confirmations) {
			continue // not yet final
		}
		if d.AmountCents <= 0 {
			// Pure sub-cent dust: nothing creditable. Terminal, no ledger movement.
			_ = w.store.MarkCredited(ctx, d.ID, "")
			continue
		}
		key := creditIdempotencyKey(d.ChainID, d.TxHash, d.LogIndex)
		entry, err := w.ledger.Credit(wallet.MutationRequest{
			UserID:         d.UserID,
			AmountCents:    d.AmountCents,
			IdempotencyKey: key,
			Reason:         fmt.Sprintf("%s deposit %s", strings.ToUpper(d.Asset), d.TxHash),
		})
		if err != nil && !errors.Is(err, wallet.ErrIdempotencyConflict) {
			slog.Error("crypto deposit: credit failed", "tx", d.TxHash, "err", err)
			continue // transient; stays pending, retried next cycle
		}
		// Either the credit just happened or it already had under this key; the
		// transfer is credited, so finalize the bookkeeping.
		if mErr := w.store.MarkCredited(ctx, d.ID, entry.EntryID); mErr != nil && !errors.Is(mErr, ErrDepositAlreadyCredited) {
			slog.Error("crypto deposit: mark credited failed", "tx", d.TxHash, "err", mErr)
		}
	}
}

func depositID(chainID int64, txHash string, logIndex int, blockHash string) string {
	return fmt.Sprintf("%d:%s:%d:%s", chainID, strings.ToLower(txHash), logIndex, strings.ToLower(blockHash))
}

func creditIdempotencyKey(chainID int64, txHash string, logIndex int) string {
	return fmt.Sprintf("crypto_deposit:%d:%s:%d", chainID, strings.ToLower(txHash), logIndex)
}

// addressTopics renders deposit addresses as left-padded 32-byte log topics for
// the eth_getLogs `to` filter.
func addressTopics(owners map[string]string) []string {
	topics := make([]string, 0, len(owners))
	for addr := range owners {
		topics = append(topics, addressToTopic(addr))
	}
	return topics
}

func addressToTopic(addr string) string {
	a := strings.ToLower(strings.TrimPrefix(strings.TrimPrefix(addr, "0x"), "0X"))
	if len(a) > 64 {
		a = a[len(a)-64:]
	}
	return "0x" + strings.Repeat("0", 64-len(a)) + a
}
