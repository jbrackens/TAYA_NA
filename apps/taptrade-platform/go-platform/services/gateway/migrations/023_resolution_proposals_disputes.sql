-- +goose Up
-- 023_resolution_proposals_disputes.sql
-- ADR-0003/0004 foundation: the propose -> finalize resolution seam.
-- A market can carry a PROPOSED result (with source attestation evidence) and a
-- challenge window before payouts finalize, plus user-facing disputes. Payouts
-- only credit at FinalizeResolution, never at propose -- which eliminates
-- clawbacks. Append-only: does not edit 014/019.

-- Widen the market status CHECK to admit the two new lifecycle states.
ALTER TABLE prediction_markets DROP CONSTRAINT IF EXISTS prediction_markets_status_check;
ALTER TABLE prediction_markets ADD CONSTRAINT prediction_markets_status_check
    CHECK (status IN (
        'unopened','open','halted','closed',
        'proposed_resolution','disputed',
        'settled','voided'
    ));

-- A pending proposed resolution, awaiting the challenge window / dispute review.
-- One active proposal per market (UNIQUE market_id); it becomes a
-- prediction_settlements row at finalize.
CREATE TABLE prediction_resolution_proposals (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id           UUID NOT NULL REFERENCES prediction_markets(id) UNIQUE,
    result              TEXT NOT NULL CHECK (result IN ('yes','no')),
    status              TEXT NOT NULL DEFAULT 'proposed'
        CHECK (status IN ('proposed','finalized','voided','disputed')),
    attestation_source  TEXT NOT NULL,
    attestation_id      TEXT,
    attestation_digest  TEXT,
    attestation_data    JSONB,
    proposed_by         TEXT,
    challenge_ends_at   TIMESTAMPTZ NOT NULL,
    proposed_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
    finalized_at        TIMESTAMPTZ
);

CREATE INDEX idx_resolution_proposals_status ON prediction_resolution_proposals(status);
CREATE INDEX idx_resolution_proposals_challenge_ends_at ON prediction_resolution_proposals(challenge_ends_at);

-- User-facing disputes against a proposed resolution.
CREATE TABLE prediction_disputes (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    market_id           UUID NOT NULL REFERENCES prediction_markets(id),
    user_id             VARCHAR(255) NOT NULL,
    reason              TEXT NOT NULL,
    status              TEXT NOT NULL DEFAULT 'open'
        CHECK (status IN ('open','upheld','rejected','withdrawn')),
    resolution_note     TEXT,
    bond_cents          BIGINT NOT NULL DEFAULT 0 CHECK (bond_cents >= 0),
    created_at          TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at         TIMESTAMPTZ,
    resolved_by         TEXT
);

CREATE INDEX idx_disputes_market_id ON prediction_disputes(market_id);
CREATE INDEX idx_disputes_status ON prediction_disputes(status);
-- Anti-abuse: at most one OPEN dispute per (market, user).
CREATE UNIQUE INDEX idx_disputes_one_open_per_user_market
    ON prediction_disputes(market_id, user_id) WHERE status = 'open';

-- +goose Down
DROP TABLE IF EXISTS prediction_disputes;
DROP TABLE IF EXISTS prediction_resolution_proposals;
ALTER TABLE prediction_markets DROP CONSTRAINT IF EXISTS prediction_markets_status_check;
ALTER TABLE prediction_markets ADD CONSTRAINT prediction_markets_status_check
    CHECK (status IN ('unopened','open','halted','closed','settled','voided'));
