# Hula Na! Cashier Beta Launch and Reconciliation

**Status:** Draft gate for Phase 9-10.
**Date:** 2026-05-25.

## Launch Mode

- Invite-only.
- Low caps.
- Manual support coverage during deposit and withdrawal windows.
- Daily reconciliation until metrics are boring.
- No cap increase without written review.

## Daily Reconciliation

For each settlement chain and provider:

1. Export deposit intents by status.
2. Export provider requests by status.
3. Export source-chain txs by deposit address or request id.
4. Export destination-chain txs by smart-wallet/collateral address.
5. Compare settled amount, decimals, destination wallet, and user id.
6. Confirm every terminal failure has a recovery or denial record.
7. Confirm no provider request is older than SLA without operator state.

Fixture contract:

- `services/cashier-api/fixtures/reconciliation-report.daily-ok.json`

SDK helper:

- `summarizeReconciliationReport` returns matched/mismatch counts by status for
  dashboards and launch gate checks.

## Canary Metrics

- Deposit success rate.
- Median and p95 time to source detection.
- Median and p95 time to settlement.
- Duplicate callback count.
- Recovery queue age.
- Manual review queue age.
- Relayer submission failure rate.
- Paymaster balance and runway.
- RPC/provider error rate.

## Phase 10 Cap Increase Criteria

All must hold for at least two consecutive weeks:

- No unreconciled settled deposits.
- No double credits.
- No unauthorized relayer submissions.
- Recovery p95 age within SLA.
- Support tickets per deposit below agreed threshold.
- Provider SLA meets launch target.
- External audit issues closed or explicitly risk-accepted.
