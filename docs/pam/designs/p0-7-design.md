# P0-7 Design Note — Double-Entry Ledger Migration

Status: DESIGN ONLY. P0-7 is ⚑ PROTECTED CORE (`internal/wallet/*`); no code
is written for it by the autonomous loop. This note is the decision brief for
a human-approved implementation.

## Current state (verified in code, 2026-07-02)

The live money store is runtime-schema'd by `internal/wallet/service.go
ensureSchema` (NOT goose; the goose tables `wallets`/`ledger_entries` from
`006_wallets_ledger.sql` are dead sportsbook legacy — the service never
references them):

- `wallet_balances(user_id PK, balance_cents, bonus_balance_cents, tenant_id,
  updated_at)` — the running balance, one row per user.
- `wallet_ledger(id BIGSERIAL, user_id, entry_type, fund_type DEFAULT 'real',
  amount_cents > 0, balance_cents, idempotency_key, reason, transaction_time,
  UNIQUE(entry_type, user_id, idempotency_key))` — a SINGLE-ENTRY journal:
  each row records one movement plus the post-movement running balance.
  There is no counter-account; house/AMM/fee/promo flows are implicit.
- `wallet_reservations` — holds with `UNIQUE(reference_type, reference_id)`.
- Write path: inside one transaction — `SELECT ... FOR UPDATE` on
  `wallet_balances`, `UPDATE` the balance, `INSERT` the ledger row.
  Idempotent via the unique key; replays return the recorded entry.

Why this fails audit expectations: single-entry books cannot prove
conservation (that every cent a user gained came from somewhere), the house
side of every trade/settlement/bonus is unrecorded, and drift between
`wallet_balances` and the sum of `wallet_ledger` is detectable only by a
bespoke reconciler rather than by the books themselves.

## Target design

Three additive tables (goose migration, since this is a deliberate schema
evolution, unlike the service-owned bootstrap tables):

- `ledger_accounts(id TEXT PK, kind CHECK (kind IN
  ('user_cash','user_bonus','house','amm_liquidity','fees','promo_expense',
  'settlement_clearing')), user_id NULL, tenant_id, created_at)` — one row
  per user cash account, per user bonus account, and a small fixed set of
  house accounts.
- `ledger_transactions(id BIGSERIAL PK, idempotency_key TEXT NOT NULL UNIQUE,
  kind TEXT NOT NULL, reference_type TEXT, reference_id TEXT, reason TEXT,
  created_at TIMESTAMPTZ)` — one per business event (order debit, payout,
  bonus grant, adjustment).
- `ledger_postings(id BIGSERIAL PK, transaction_id FK, account_id FK,
  direction CHECK (direction IN ('debit','credit')), amount_cents BIGINT
  CHECK (amount_cents > 0))` — ≥2 rows per transaction.

Balance invariant: per transaction, SUM(debits) = SUM(credits). Postgres
cannot express a cross-row CHECK; enforce with (a) a CONSTRAINT TRIGGER
DEFERRABLE INITIALLY DEFERRED that verifies the transaction balances at
COMMIT, and (b) the service writing all postings of a transaction in one
INSERT statement. A nightly reconciliation query (already-existing reconciler
seam) asserts per-account balances equal `wallet_balances`.

Idempotency preservation: today's key scope is `(entry_type, user_id,
idempotency_key)`. Map to the new UNIQUE `idempotency_key` by prefixing:
`<entry_type>:<user_id>:<key>` — byte-for-byte reproducible from the existing
call sites (`prediction_order:*`, `prediction_payout:*`, etc.), so replays of
in-flight retries during cutover hit the same uniqueness guarantee.

`wallet_balances` stays, demoted to a cache: updated in the same DB
transaction as the postings insert (same FOR UPDATE discipline), and
re-derivable as SUM(credits) - SUM(debits) per user account.

## Migration strategy (four phases, each independently abort-able)

1. **Additive schema** — goose migration creates the three tables + accounts
   backfill (one user_cash + user_bonus account per `wallet_balances` row,
   fixed house accounts). No behavior change. Down = drop tables.
2. **Dual-write** — the wallet service writes postings alongside
   `wallet_ledger` behind `LEDGER_DOUBLE_ENTRY_MODE=shadow` (default off).
   Every existing single-entry insert maps to a 2-posting transaction whose
   counter-account is chosen by `entry_type` (credit→house→user, debit→user→
   house, bonus→promo_expense→user_bonus, payout→settlement_clearing→user).
   Rollback = flip the flag off.
3. **Backfill + verify** — one-shot job replays historical `wallet_ledger`
   rows (ordered by id) into postings with synthetic transaction ids;
   verification asserts (a) per-user derived balance == `wallet_balances`,
   (b) per-transaction balance, (c) row counts. Runs idempotently (keyed on
   source row id). Abort = truncate postings, rerun.
4. **Cutover** — `LEDGER_DOUBLE_ENTRY_MODE=primary`: reads (history,
   statements, reconciler) move to postings; `wallet_ledger` becomes
   write-frozen legacy. Rollback window: shadow mode kept until two clean
   reconciliation cycles pass.

## Testing gates (all mandatory before any phase ships)

- Table-driven unit tests per entry_type mapping; race tests on concurrent
  debits/credits (the FOR UPDATE discipline must hold for postings too).
- Idempotency replay tests: same key twice → one transaction, identical
  response; interleaved retries under SERIALIZABLE.
- Migration up+down on scratch DB; backfill verification on a seeded copy.
- Reconciler parity: old reconciler vs. postings-derived balances agree on
  the demo dataset.

## Open decisions for the human (blockers)

1. Approve the account taxonomy (list above) — regulator/auditor chart-of-
   accounts expectations may add categories (e.g., segregated player funds).
2. Approve goose vs. service-owned schema for the new tables (this note
   assumes goose for auditability of DDL).
3. Sequencing vs. P1-1 cashier work: deposits/withdrawals should land as
   postings from day one if this migration goes first.
4. Whether `fund_type='bonus'` rows in history backfill to `user_bonus`
   accounts (recommended) or stay merged (loses bonus/real split history).

## Unblock criteria

A human reply approving: account taxonomy, migration mechanism, and phase
sequencing. Implementation then proceeds phase-by-phase (each phase is one
backlog slice with its own gates), still respecting the protected-core rule:
wallet changes reviewed by a human before merge.
