# Tiangge Cashier Launch Blockers

**Status:** Active.
**Date:** 2026-05-25.

These are hard blockers for public beta or mainnet funds.

## Provider Credentials and Evidence

- Relay or selected provider credentials.
- Provider sandbox/mainnet-safe test accounts.
- Provider transcript for TRC-20 USDT deposit-address route.
- Callback signing-key verification transcript.
- Duplicate callback replay transcript.
- Provider reindex/retry transcript.

## Wallet and Settlement Decisions

- Embedded wallet provider selected.
- Smart account pattern selected.
- Settlement chain selected.
- Gas sponsorship provider/paymaster selected.
- Market/collateral contract integration selected.

## Testnet Evidence

- 10/10 TRC-20 deposit testnet run.
- Restart tests for `cashier-api` and `bridge-watcher`.
- Wrong token, wrong chain, under-minimum, expired quote, destination mismatch,
  and invalid signature cases demonstrated.
- Gasless withdrawal testnet run.
- Relayer policy-denial tests against service implementation.

## Security and Compliance

- External contract audit.
- Relayer threat-model review.
- Provider callback verification review.
- Recovery/admin authorization review.
- Address screening provider selected.
- Geo policy approved by counsel/compliance.
- Secret-management and rotation runbook approved.

## Operations

- Canary path implemented.
- Dashboards and alerts created.
- Recovery queue implemented locally; still needs deployed operator-flow proof.
- Operator auth and two-person approval implemented locally; still needs deployed
  operator-flow proof.
- Incident kill switches implemented.
- Daily reconciliation export implemented locally; still needs live
  provider/chain evidence.

No item in this document may be waived silently. Any waiver needs owner, date,
reason, compensating control, and explicit launch-risk acceptance.

Use `docs/cashier/RISK_ACCEPTANCE_TEMPLATE.md` for any explicit waiver.

Machine-readable status:

- `docs/cashier/LAUNCH_READINESS_MATRIX.json`
- `scripts/check-cashier-launch-readiness.mjs`
