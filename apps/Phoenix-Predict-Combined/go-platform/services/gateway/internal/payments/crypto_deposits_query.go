package payments

import (
	"context"
	"math/big"
	"strings"
)

// cryptoDepositColumns is the canonical SELECT list for a CryptoDeposit. NUMERIC
// columns are cast to text so they scan cleanly into *big.Int via string.
const cryptoDepositColumns = `id, user_id, network, asset, chain_id, tx_hash, log_index, block_hash, block_number, from_address, to_address, amount_base::text, amount_cents, dust_base::text, status, COALESCE(ledger_entry_id, '')`

type rowScanner interface {
	Scan(dest ...any) error
}

func scanCryptoDeposit(sc rowScanner) (CryptoDeposit, error) {
	var d CryptoDeposit
	var amountStr, dustStr string
	if err := sc.Scan(
		&d.ID, &d.UserID, &d.Network, &d.Asset, &d.ChainID, &d.TxHash, &d.LogIndex,
		&d.BlockHash, &d.BlockNumber, &d.FromAddress, &d.ToAddress, &amountStr,
		&d.AmountCents, &dustStr, &d.Status, &d.LedgerEntryID,
	); err != nil {
		return CryptoDeposit{}, err
	}
	d.AmountBase, _ = new(big.Int).SetString(amountStr, 10)
	d.DustBase, _ = new(big.Int).SetString(dustStr, 10)
	return d, nil
}

// ListPendingDeposits returns pending deposits for a (network, asset), oldest
// block first, so the watcher can credit those that have reached finality.
func (s *CryptoDepositStore) ListPendingDeposits(ctx context.Context, network, asset string, limit int) ([]CryptoDeposit, error) {
	ctx, cancel := context.WithTimeout(ctx, paymentDBTimeout)
	defer cancel()
	if limit <= 0 {
		limit = 100
	}
	rows, err := s.db.QueryContext(ctx,
		`SELECT `+cryptoDepositColumns+` FROM crypto_deposits
WHERE network = $1 AND asset = $2 AND status = 'pending'
ORDER BY block_number ASC LIMIT $3`, network, asset, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var out []CryptoDeposit
	for rows.Next() {
		d, err := scanCryptoDeposit(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

// DepositAddressOwners maps lowercased deposit address -> user id for a
// (network, asset). Used to filter on-chain logs and attribute deposits.
func (s *CryptoDepositStore) DepositAddressOwners(ctx context.Context, network, asset string) (map[string]string, error) {
	ctx, cancel := context.WithTimeout(ctx, paymentDBTimeout)
	defer cancel()
	rows, err := s.db.QueryContext(ctx,
		`SELECT LOWER(address), user_id FROM crypto_deposit_addresses WHERE network = $1 AND asset = $2`,
		network, asset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := map[string]string{}
	for rows.Next() {
		var addr, uid string
		if err := rows.Scan(&addr, &uid); err != nil {
			return nil, err
		}
		out[strings.ToLower(addr)] = uid
	}
	return out, rows.Err()
}
