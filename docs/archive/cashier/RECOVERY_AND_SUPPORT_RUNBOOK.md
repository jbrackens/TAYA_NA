> **ARCHIVED 2026-09-06.** Historical record only — this does not describe the current system.
> The recovery queue this runbook operates was a local prototype only; it never handled a real deposit.
> See `CLAUDE.md` for current architecture.

# TapTrade Cashier Recovery and Support Runbook

**Status:** SUPERSEDED 2026-09-06 — abandoned workstream (was: "Draft gate for Phase 6.").
**Date:** 2026-05-25.

Recovery is part of V1, not a support afterthought. A cashier that accepts crypto
without a recovery queue will train users to lose money.

## Recovery States

| State | Meaning | User copy |
|---|---|---|
| `wrong_token` | Supported address received unsupported token | Deposit needs review |
| `wrong_chain` | Address or provider route received asset on unsupported chain | Deposit needs review |
| `under_minimum` | Provider minimum or gas economics make settlement impossible | Deposit below minimum |
| `expired_quote` | Source arrived after quote/request expiry | Deposit delayed |
| `provider_failed` | Bridge/provider failed or returned inconsistent state | Deposit delayed |
| `ambiguous_source` | Source tx cannot map to exactly one user intent | Deposit needs review |
| `sanctions_review` | Address screening requires quarantine | Deposit under review |

## Operator Rules

- Never manually credit based only on a screenshot.
- Require source tx hash, provider request id when available, destination tx hash
  when available, user id, and smart-wallet address.
- Recovery action must be two-person reviewed above the beta cap.
- Refund-to-sender is forbidden for CEX-style source addresses unless the provider
  proves the sender is user-controlled.
- Every recovery action emits an immutable audit event.

## Queues

1. **Triage:** new recovery events, no operator decision yet.
2. **Waiting on provider:** support ticket or provider reindex/retry pending.
3. **Waiting on user:** user must prove wallet control or provide destination.
4. **Compliance hold:** sanctions/geo/manual-review lock.
5. **Ready for release:** decision approved, settlement/refund queued.
6. **Closed:** settled, refunded, denied, or abandoned.

## Support SLA

- Beta: human review within 24 hours.
- Public launch: first response within 4 business hours for stuck deposits.
- Sanctions review: no promised release timeline.

## Required Tooling

- Lookup by user id, deposit address, source tx hash, provider request id, and
  destination tx hash.
- Re-run provider status fetch.
- Re-run chain evidence fetch.
- Mark duplicate callback as ignored.
- Create manual recovery decision with reason and attachments.
- Export a reconciliation packet for audit.

Operator flow checklists live in `docs/archive/cashier/OPERATOR_CHECKLISTS.md`.
