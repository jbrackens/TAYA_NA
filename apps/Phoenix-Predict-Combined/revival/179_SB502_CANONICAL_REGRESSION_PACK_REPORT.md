# SB-502 Canonical Regression Pack Report (2026-03-05)

Command: `make qa-regression-pack`

- Result: **pass**
- Artifact: `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/regression_pack_20260305_183130.md`

## Scope

1. Canonical replay ordering/checkpoint invariants.
2. Bet lifecycle transitions (place/settle/resettle/cancel/refund/idempotency).
3. Wallet ledger transitions (credit/debit/idempotency/reconciliation/corrections).
4. HTTP lifecycle/admin parity transitions for settlement and wallet surfaces.

## Gate Policy

1. This pack is a mandatory merge/release gate for SB-502.
2. Any failing suite blocks merge until resolved.
