-- +goose Up
-- 030_alpha_cashier.sql
-- Closed Alpha custodial USDC cashier:
-- MetaMask wallet ownership -> exact ERC-20 transfer intent -> verified chain
-- evidence -> existing internal wallet ledger credit. Withdrawals are
-- manual-review only in Stage 1.

CREATE TABLE alpha_wallet_challenges (
    nonce          TEXT PRIMARY KEY,
    user_id        TEXT NOT NULL,
    chain_id       BIGINT NOT NULL,
    wallet_address TEXT NOT NULL,
    message        TEXT NOT NULL,
    expires_at     TIMESTAMPTZ NOT NULL,
    consumed_at    TIMESTAMPTZ,
    created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alpha_wallet_challenges_user_time
    ON alpha_wallet_challenges (user_id, created_at DESC);

CREATE TABLE alpha_wallet_connections (
    id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id            TEXT NOT NULL,
    chain_type         TEXT NOT NULL DEFAULT 'evm'
        CHECK (chain_type IN ('evm')),
    chain_id           BIGINT NOT NULL,
    wallet_address     TEXT NOT NULL,
    normalized_address TEXT NOT NULL,
    signature          TEXT NOT NULL,
    message            TEXT NOT NULL,
    nonce              TEXT NOT NULL REFERENCES alpha_wallet_challenges(nonce),
    verified_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_seen_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, chain_id, normalized_address)
);

CREATE INDEX idx_alpha_wallet_connections_address
    ON alpha_wallet_connections (normalized_address);
CREATE INDEX idx_alpha_wallet_connections_user_seen
    ON alpha_wallet_connections (user_id, last_seen_at DESC);

CREATE TABLE alpha_deposit_intents (
    id                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                  TEXT NOT NULL,
    wallet_connection_id     UUID REFERENCES alpha_wallet_connections(id),
    chain_id                 BIGINT NOT NULL,
    chain_name               TEXT NOT NULL,
    token_symbol             TEXT NOT NULL,
    token_address            TEXT NOT NULL,
    token_decimals           INT NOT NULL CHECK (token_decimals >= 0 AND token_decimals <= 30),
    treasury_address         TEXT NOT NULL,
    from_address             TEXT NOT NULL,
    amount_cents             BIGINT NOT NULL CHECK (amount_cents > 0),
    amount_units             NUMERIC(78,0) NOT NULL CHECK (amount_units > 0),
    status                   TEXT NOT NULL
        CHECK (status IN ('created','submitted','confirmed','credited','expired','failed','quarantined')),
    tx_hash                  TEXT,
    credited_wallet_entry_id TEXT,
    failure_reason           TEXT,
    idempotency_key          TEXT NOT NULL,
    expires_at               TIMESTAMPTZ NOT NULL,
    submitted_at             TIMESTAMPTZ,
    confirmed_at             TIMESTAMPTZ,
    credited_at              TIMESTAMPTZ,
    created_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, idempotency_key)
);

CREATE UNIQUE INDEX idx_alpha_deposit_intents_tx_hash
    ON alpha_deposit_intents (chain_id, tx_hash)
    WHERE tx_hash IS NOT NULL;
CREATE INDEX idx_alpha_deposit_intents_user_time
    ON alpha_deposit_intents (user_id, created_at DESC);
CREATE INDEX idx_alpha_deposit_intents_status_time
    ON alpha_deposit_intents (status, created_at DESC);

CREATE TABLE alpha_chain_transactions (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    deposit_intent_id UUID REFERENCES alpha_deposit_intents(id),
    chain_id          BIGINT NOT NULL,
    tx_hash           TEXT NOT NULL,
    log_index         BIGINT NOT NULL,
    block_number      BIGINT NOT NULL,
    block_hash        TEXT NOT NULL,
    token_address     TEXT NOT NULL,
    from_address      TEXT NOT NULL,
    to_address        TEXT NOT NULL,
    amount_units      NUMERIC(78,0) NOT NULL,
    confirmations     INT NOT NULL,
    receipt_status    TEXT NOT NULL,
    raw_log           JSONB NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (chain_id, tx_hash, log_index)
);

CREATE INDEX idx_alpha_chain_transactions_intent
    ON alpha_chain_transactions (deposit_intent_id);
CREATE INDEX idx_alpha_chain_transactions_from_time
    ON alpha_chain_transactions (from_address, created_at DESC);
CREATE INDEX idx_alpha_chain_transactions_to_time
    ON alpha_chain_transactions (to_address, created_at DESC);

CREATE TABLE alpha_withdrawal_requests (
    id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id               TEXT NOT NULL,
    chain_id              BIGINT NOT NULL,
    token_symbol          TEXT NOT NULL,
    token_address         TEXT NOT NULL,
    destination_address   TEXT NOT NULL,
    amount_cents          BIGINT NOT NULL CHECK (amount_cents > 0),
    amount_units          NUMERIC(78,0) NOT NULL CHECK (amount_units > 0),
    status                TEXT NOT NULL
        CHECK (status IN ('requested','under_review','approved','rejected','broadcasted','completed','failed','cancelled')),
    wallet_reservation_id TEXT,
    requested_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    reviewed_at           TIMESTAMPTZ,
    reviewed_by           TEXT,
    review_note           TEXT,
    broadcast_tx_hash     TEXT,
    completed_at          TIMESTAMPTZ,
    failure_reason        TEXT,
    idempotency_key       TEXT NOT NULL,
    created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (user_id, idempotency_key)
);

CREATE INDEX idx_alpha_withdrawal_requests_status_time
    ON alpha_withdrawal_requests (status, created_at DESC);
CREATE INDEX idx_alpha_withdrawal_requests_user_time
    ON alpha_withdrawal_requests (user_id, created_at DESC);

CREATE TABLE alpha_cashier_audit_events (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_type  TEXT NOT NULL,
    subject_id    TEXT NOT NULL,
    event_type    TEXT NOT NULL,
    actor_type    TEXT NOT NULL,
    actor_id      TEXT,
    event_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alpha_cashier_audit_subject
    ON alpha_cashier_audit_events (subject_type, subject_id, created_at DESC);
CREATE INDEX idx_alpha_cashier_audit_event_time
    ON alpha_cashier_audit_events (event_type, created_at DESC);
CREATE INDEX idx_alpha_cashier_audit_actor
    ON alpha_cashier_audit_events (actor_type, actor_id, created_at DESC);

-- Alpha cashier admin permissions. Migration 027 seeded RBAC before this
-- cashier surface existed, so this migration appends the operator permissions
-- and grants them to the system roles that need Stage 1 treasury visibility.
INSERT INTO permissions (id, description, category) VALUES
    ('cashier:read',  'View alpha cashier deposits, withdrawals, reconciliation, and audit trail', 'finance'),
    ('cashier:write', 'Approve and complete alpha cashier withdrawal requests',                    'finance')
ON CONFLICT (id) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id) VALUES
    ('super-admin', 'cashier:read'),
    ('super-admin', 'cashier:write'),
    ('operations-manager', 'cashier:read'),
    ('operations-manager', 'cashier:write'),
    ('customer-support', 'cashier:read')
ON CONFLICT (role_id, permission_id) DO NOTHING;

-- +goose Down

DELETE FROM permissions WHERE id IN ('cashier:read', 'cashier:write');

DROP INDEX IF EXISTS idx_alpha_cashier_audit_actor;
DROP INDEX IF EXISTS idx_alpha_cashier_audit_event_time;
DROP INDEX IF EXISTS idx_alpha_cashier_audit_subject;
DROP TABLE IF EXISTS alpha_cashier_audit_events;

DROP INDEX IF EXISTS idx_alpha_withdrawal_requests_user_time;
DROP INDEX IF EXISTS idx_alpha_withdrawal_requests_status_time;
DROP TABLE IF EXISTS alpha_withdrawal_requests;

DROP INDEX IF EXISTS idx_alpha_chain_transactions_to_time;
DROP INDEX IF EXISTS idx_alpha_chain_transactions_from_time;
DROP INDEX IF EXISTS idx_alpha_chain_transactions_intent;
DROP TABLE IF EXISTS alpha_chain_transactions;

DROP INDEX IF EXISTS idx_alpha_deposit_intents_status_time;
DROP INDEX IF EXISTS idx_alpha_deposit_intents_user_time;
DROP INDEX IF EXISTS idx_alpha_deposit_intents_tx_hash;
DROP TABLE IF EXISTS alpha_deposit_intents;

DROP INDEX IF EXISTS idx_alpha_wallet_connections_user_seen;
DROP INDEX IF EXISTS idx_alpha_wallet_connections_address;
DROP TABLE IF EXISTS alpha_wallet_connections;

DROP INDEX IF EXISTS idx_alpha_wallet_challenges_user_time;
DROP TABLE IF EXISTS alpha_wallet_challenges;
