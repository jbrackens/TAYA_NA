> **ARCHIVED 2026-09-06.** Historical record only — this does not describe the current system.
> Reversed by the 2026-05-27 custodial decision and then by the points-only launch; no non-custodial boundary was ever built.
> See `CLAUDE.md` for current architecture.

# ADR-001: Non-Custodial Cashier Boundary

**Status:** SUPERSEDED 2026-09-06 — was "Accepted."; reversed by the 2026-05-27 custodial decision in `README.md`, then made moot by the points-only launch.
**Date:** 2026-05-25.

## Context

TapTrade originally explored a custodial BSC cashier because the legacy Go stack
already had payments, wallet ledger, and deposit-watcher primitives. The product
direction has changed back to a Polymarket-like posture: users should control their
funds through an EVM wallet, while TapTrade abstracts funding, gas, and recovery.

## Decision

The V1 cashier source of truth is non-custodial:

- User funds live in user-controlled smart wallets or market/collateral contracts.
- TapTrade services may index, route, sponsor, and recover, but they must not own
  the primary user-fund private keys.
- The existing Go `internal/payments` crypto rail is prototype/reference code only.
- Production must fail closed if legacy custodial crypto rail env vars are set.
- Crypto UI must not offer an amount-submit deposit action or expose old custodial
  deposit addresses.

## Consequences

This raises implementation complexity: wallet provisioning, bridge tracking,
contract audits, relayers, paymasters, and recovery flows become required before
mainnet. It materially reduces custody risk and keeps the product closer to a
prediction-market trading venue than a centralized sportsbook wallet.

## Non-Goals

- No HD deposit-address derivation for V1.
- No KMS withdrawal signer for V1.
- No `wallet.Credit` as the production crypto source of truth.
