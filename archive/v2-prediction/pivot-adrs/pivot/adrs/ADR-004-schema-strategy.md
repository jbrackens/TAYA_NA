# ADR-004: Schema Strategy for Pivot (Parallel Schema + Strangler Cutover)

- Status: Accepted
- Date: 2026-03-02
- Owners: Phoenix Platform Team

## Context

Phoenix has an established sportsbook schema with live dependencies. A direct
table mutation strategy would create high migration risk and rollback complexity.

## Decision

Use a parallel schema strategy:

- Keep sportsbook tables intact.
- Introduce prediction tables under the same DB migration stream (`V48_*` onward).
- Begin with write isolation (prediction writes only to prediction tables).
- Dual-write canonical lifecycle events to `audit_event_log`.
- Cut over route-by-route and market-type-by-market-type.

## Consequences

- Positive:
  - Safer rollback path.
  - Limits blast radius during early prediction releases.
  - Clear data ownership between sportsbook and prediction runtime.
- Negative:
  - Temporary data duplication and reconciliation overhead.
  - Requires explicit migration bookkeeping and telemetry.

## Implementation Notes

- First migration wave includes:
  - market definition tables
  - execution tables
  - settlement tables
  - bot identity tables
  - feed/audit/ops tables
- Cutover guardrail: no deletion of sportsbook tables until prediction runtime
  meets beta reliability gates for 2 continuous release cycles.
