-- +goose Up
-- 020_wallet_partial_capture.sql
-- Add captured_amount_cents to wallet_reservations to support partial capture.
-- The exchange engine needs to capture cash from a single order's reservation
-- in pieces as the order partial-fills over multiple trades. The existing
-- Capture() flow only supports capturing the whole reservation at once.
--
-- Note on table ownership: wallet_reservations is created at runtime by
-- wallet.Service.ensureSchema() (see internal/wallet/service.go:1404), which
-- predates goose for this table. This migration is defensive: it CREATEs the
-- table if it doesn't already exist (fresh install path), then adds the new
-- column. On existing installs, the CREATE is a no-op and only the ALTERs run.

CREATE TABLE IF NOT EXISTS wallet_reservations (
    id              BIGSERIAL PRIMARY KEY,
    user_id         TEXT NOT NULL,
    amount_cents    BIGINT NOT NULL CHECK (amount_cents > 0),
    reference_type  TEXT NOT NULL,
    reference_id    TEXT NOT NULL,
    status          TEXT NOT NULL DEFAULT 'held'
        CHECK (status IN ('held','captured','released','expired')),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expires_at      TIMESTAMPTZ NOT NULL,
    resolved_at     TIMESTAMPTZ,
    UNIQUE (reference_type, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_reservations_user_status
    ON wallet_reservations (user_id, status);

ALTER TABLE wallet_reservations
    ADD COLUMN IF NOT EXISTS captured_amount_cents BIGINT NOT NULL DEFAULT 0;

-- The CHECK constraint is added separately (PG has no ADD CONSTRAINT IF NOT
-- EXISTS). If the constraint already exists, this migration will fail loudly,
-- which is the right behavior — goose tracks migrations and won't re-run.
ALTER TABLE wallet_reservations
    ADD CONSTRAINT wallet_reservations_capture_le_amount_check
    CHECK (captured_amount_cents >= 0 AND captured_amount_cents <= amount_cents);

-- +goose Down

ALTER TABLE wallet_reservations
    DROP CONSTRAINT IF EXISTS wallet_reservations_capture_le_amount_check;
ALTER TABLE wallet_reservations
    DROP COLUMN IF EXISTS captured_amount_cents;
