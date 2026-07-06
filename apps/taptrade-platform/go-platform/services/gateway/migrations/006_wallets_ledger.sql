-- +goose Up
CREATE TABLE wallets (
    id VARCHAR(255) PRIMARY KEY,
    punter_id VARCHAR(255) NOT NULL UNIQUE REFERENCES punters(id) ON DELETE CASCADE,
    balance_cents BIGINT NOT NULL DEFAULT 0,
    bonus_balance_cents BIGINT NOT NULL DEFAULT 0,
    currency_code VARCHAR(3) NOT NULL DEFAULT 'GBP',
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ledger_entries (
    id VARCHAR(255) PRIMARY KEY,
    wallet_id VARCHAR(255) NOT NULL REFERENCES wallets(id) ON DELETE CASCADE,
    punter_id VARCHAR(255) NOT NULL REFERENCES punters(id) ON DELETE CASCADE,
    transaction_type VARCHAR(50) NOT NULL,
    amount_cents BIGINT NOT NULL,
    bonus_amount_cents BIGINT DEFAULT 0,
    balance_before_cents BIGINT NOT NULL,
    balance_after_cents BIGINT NOT NULL,
    reference_type VARCHAR(50),
    reference_id VARCHAR(255),
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_wallets_punter_id ON wallets(punter_id);
CREATE INDEX idx_ledger_wallet_id ON ledger_entries(wallet_id);
CREATE INDEX idx_ledger_punter_id ON ledger_entries(punter_id);
CREATE INDEX idx_ledger_transaction_type ON ledger_entries(transaction_type);
CREATE INDEX idx_ledger_created_at ON ledger_entries(created_at);
CREATE INDEX idx_ledger_reference ON ledger_entries(reference_type, reference_id);

-- +goose Down
DROP TABLE IF EXISTS ledger_entries;
DROP TABLE IF EXISTS wallets;
