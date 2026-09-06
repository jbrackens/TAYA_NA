> **ARCHIVED 2026-09-06.** Historical record only — this does not describe the current system.
> The canaries and dashboards described here were fixture-backed only and were never deployed.
> See `CLAUDE.md` for current architecture.

# TapTrade Cashier Observability and Canaries

**Status:** SUPERSEDED 2026-09-06 — abandoned workstream (was: "Draft gate for Phase 9.").
**Date:** 2026-05-25.

## Golden Signals

- Deposit intent creation rate.
- Deposit address issuance failures.
- Source detection latency p50/p95/p99.
- Destination settlement latency p50/p95/p99.
- Provider callback invalid-signature rate.
- Duplicate callback rate.
- Recovery queue size and oldest age.
- Recovery approval/denial count by operator role.
- Compliance quarantine count.
- Runtime flag changes.
- Reconciliation mismatch count.
- Relayer queued/submitted/included counts.
- Relayer failure rate.
- Paymaster balance/runway.
- Provider API error rate.
- RPC error rate by chain.

Machine-readable event contract:

- `services/cashier-api/observability-events.json`

CI/local guard:

- `scripts/check-cashier-observability.mjs`

## Alerts

Page immediately:

- Any unauthorized relayer submission attempt.
- Any double-settlement prevention violation.
- Invalid callback spike above threshold.
- Paymaster runway below threshold.
- Provider status and chain evidence conflict.
- Recovery queue oldest age exceeds SLA.

Ticket during business hours:

- Provider p95 settlement latency degradation.
- RPC error rate above baseline.
- Manual review queue growth.
- Deposit address creation error rate above baseline.

## Canary Flow

Run every 30 minutes in beta:

1. Create test user/wallet in non-production or canary cohort.
2. Create deposit intent on configured testnet route.
3. Verify address/route returned.
4. Submit provider sandbox/testnet deposit when supported.
5. Verify source detection and destination settlement.
6. Submit gasless no-op or mock trade.
7. Submit withdrawal dry run or policy-only validation.

Canary must never use unrestricted mainnet funds.

Fixture contract:

- `services/cashier-api/fixtures/canary-result.ok.json`
