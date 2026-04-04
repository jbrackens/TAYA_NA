# ADR-002: Canonical Event Contracts for Prediction Runtime

- Status: Accepted
- Date: 2026-03-02
- Owners: Phoenix Platform Team

## Context

The pivot depends on deterministic replay and bot-friendly streaming semantics.
Current eventing in the platform is mixed and not standardized for bot-first
execution guarantees.

## Decision

Adopt canonical event types and envelope across prediction services:

- Event types:
  - `market.created`
  - `market.suspended`
  - `order.accepted`
  - `order.rejected`
  - `trade.executed`
  - `market.resolved`
  - `payout.booked`
- Required envelope fields:
  - `eventId` (UUID)
  - `eventType`
  - `aggregateType`
  - `aggregateId`
  - `sequenceNo` (monotonic per aggregate)
  - `occurredAt` (UTC)
  - `payload` (JSON)
  - `schemaVersion`

Persist all canonical events in `audit_event_log` and expose stream output
through ordered sequence numbers.

## Consequences

- Positive:
  - Replay and incident reconstruction become first-class.
  - Bot clients get deterministic stream ordering and idempotent processing.
- Negative:
  - Additional write overhead from persistent event logging.
  - Requires versioning discipline for payload schema evolution.

## Implementation Notes

- `audit_event_log` unique key: `(aggregate_type, aggregate_id, sequence_no)`.
- Bot stream payload must include sequence and checksum/signature fields.
