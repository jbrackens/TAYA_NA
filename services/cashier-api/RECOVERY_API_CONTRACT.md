# Recovery API Contract

**Status:** Draft.
**Date:** 2026-05-25.

Recovery APIs are internal/operator-only. They must not ship without operator auth,
role checks, immutable audit logging, and two-person approval above beta caps.

## `GET /v1/admin/recovery-cases`

Filters:

- `status`
- `reason`
- `userId`
- `depositIntentId`
- `sourceTxHash`
- `providerRequestId`

## `POST /v1/admin/recovery-cases/:id/decisions`

Required body:

- decision: `settle_to_smart_wallet`, `refund_to_user_controlled_address`,
  `quarantine`, `deny`
- evidence hash
- operator note
- destination address when refunding

Rules:

- No screenshot-only decisions.
- Refund destination must be user-controlled.
- CEX source-address refunds are denied unless ownership is proven.
- Two-person review above cap.
- Every decision writes `compliance_decisions` and `cashier_audit_events`.

## `POST /v1/admin/recovery-cases/:id/retry-provider`

Re-fetches provider status and writes bridge events only through the normal watcher
state machine. It must not directly mutate balances.

## `POST /v1/admin/recovery-cases/:id/retry-chain-evidence`

Re-fetches source/destination chain evidence and writes bridge events only through
the normal watcher state machine. It must not directly mutate balances.
