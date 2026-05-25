# Hula Na! Cashier Security Threat Model

**Status:** Draft gate for Phase 8.
**Date:** 2026-05-25.

## Assets

- User smart-wallet funds.
- Provider API keys and webhook secrets.
- Paymaster/relayer balances and credentials.
- Deposit-intent and bridge-event database rows.
- Compliance decisions and recovery actions.
- Market collateral contracts.

## Trust Boundaries

- Browser to `cashier-api`.
- `cashier-api` to wallet provider.
- `cashier-api` to bridge provider.
- Bridge provider callbacks to `cashier-api`.
- `bridge-watcher` to provider and chain RPCs.
- `relayer` to account-abstraction provider/paymaster.
- Operator console to recovery/compliance actions.

## Top Risks

| Risk | Control |
|---|---|
| Forged provider callback credits funds | Verify signatures on raw body before parsing into state transitions |
| Duplicate callback double-settles | Idempotency key on provider + chain + tx/log/request id |
| Provider status and chain evidence disagree | Quarantine, do not credit |
| Relayer submits unauthorized withdrawal | Require user authorization hash, domain separation, nonce, and policy decision |
| Old custodial BSC rail enabled by config | Production startup guard blocks legacy `CRYPTO_*` env |
| User sends wrong token/chain | Recovery queue, no automatic credit |
| CEX sender refund loses funds | No refund-to-sender unless sender ownership is proven |
| Paymaster key compromise | Low hot-wallet limits, allowlisted calldata, emergency pause |
| Operator abuse in recovery | Two-person approval, immutable audit log, cap-based review |
| Settlement contract bug | External audit, beta caps, pause/recovery drills |

## Required Security Reviews

1. Contract review and external audit.
2. Relayer calldata-policy review.
3. Provider callback signature verification review.
4. Recovery/admin authorization review.
5. Secret-management and rotation review.
6. Reconciliation and audit-log tamper-resistance review.

## Game Days

- Provider sends duplicate callback storm.
- Bridge provider marks failed after destination tx is seen.
- RPC outage during high-volume deposit window.
- Paymaster depleted mid-trade.
- Operator accidentally attempts refund to exchange hot wallet.
- Sanctioned address deposits below minimum.
