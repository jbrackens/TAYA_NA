# ADR-003: Settlement Source Policy (Objective Markets Only)

- Status: Accepted
- Date: 2026-03-02
- Owners: Phoenix Platform Team

## Context

Prediction markets require deterministic, dispute-minimized outcomes. Legacy
sportsbook settlement paths are not enough for cross-asset prediction products.

## Decision

Each prediction market must declare settlement inputs at creation time:

- `settlementSourceKey`
- `settlementCutoffAt`
- `fallbackSourceKey`
- `resolutionRule`

Resolution workflow:
1. Capture source snapshot at cutoff.
2. Validate payload signature/shape.
3. Store snapshot in `prediction_settlement_events`.
4. Resolve market deterministically into `prediction_settlements`.
5. Trigger payouts and emit `payout.booked`.

No market may be listed without an objective settlement source configuration.

## Consequences

- Positive:
  - Strong auditability and lower ambiguity in outcomes.
  - Enables full automation of settlement and payouts.
- Negative:
  - Additional integration work for source reliability/fallbacks.
  - Operations must monitor feed health continuously.

## Implementation Notes

- For each market type (crypto/sports/stocks), at least one canonical source
  and one fallback source must be preconfigured.
- Manual overrides must be recorded in `ops_overrides` with reason and actor.
