CREATE TABLE IF NOT EXISTS payment_transaction_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL REFERENCES wallet_transactions(id) ON DELETE CASCADE,
    status TEXT NOT NULL,
    source TEXT NOT NULL,
    reason TEXT,
    provider TEXT,
    provider_reference TEXT,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_transaction_events_transaction_id_created_at
    ON payment_transaction_events(transaction_id, created_at DESC);
