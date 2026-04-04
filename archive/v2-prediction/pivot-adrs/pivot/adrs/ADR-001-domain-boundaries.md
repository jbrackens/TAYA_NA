# ADR-001: Domain Boundaries for Prediction Pivot

- Status: Accepted
- Date: 2026-03-02
- Owners: Phoenix Platform Team

## Context

Phoenix currently models sportsbook-specific bounded contexts (`markets`, `bets`,
`wallets`, `punters`) with strong coupling to sportsbook semantics. The pivot
requires objective prediction markets and bot-first flows without breaking the
existing sportsbook runtime during migration.

## Decision

Introduce new prediction-focused bounded contexts in parallel:

- `prediction.markets`: market templates, market instances, outcomes, lifecycle
- `prediction.orders`: order intake, validation, trade execution, positions
- `prediction.settlement`: source snapshots, settlement events, payouts
- `prediction.botauth`: bot identity, API keys, nonce/replay controls

Keep existing sportsbook contexts live and isolate new prediction routes and
tables behind feature flags by market type.

## Consequences

- Positive:
  - Enables strangler migration without big-bang rewrite.
  - Preserves sportsbook operations while prediction runtime stabilizes.
  - Clarifies ownership and deploy risk by domain.
- Negative:
  - Temporary domain duplication and dual operational load.
  - Requires explicit anti-corruption layers when crossing old/new contexts.

## Implementation Notes

- Add new schemas/tables in Phoenix migrations starting at `V48_*`.
- Keep prediction APIs under a new namespace (`/v1/...`) with bot-first
  contracts.
- No direct writes from prediction services to sportsbook `bets` tables.
