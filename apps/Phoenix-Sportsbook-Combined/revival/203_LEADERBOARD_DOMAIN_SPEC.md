# 203 Leaderboard Domain Spec

## Goal

Build a sportsbook-native leaderboard service inside the Go gateway that can power weekly competitions, staking races, profit leaderboards, and future predictor challenges without depending on the legacy Flip leaderboard stack.

## Legacy Concepts Worth Porting

Borrowed from the legacy Flip implementation:

- admin-managed leaderboard definitions
- event-backed scoring
- ranking modes: `sum`, `min`, `max`
- sort order control: `asc`, `desc`
- public standings vs admin management split

Intentionally not ported:

- Play Framework modules
- Storm or Kafka topology assumptions
- Vagrant or AWS-era deployment model
- old HTML views and server-rendered admin surfaces

## Core Entities

### LeaderboardDefinition

Represents one live or planned competition.

Key fields:

- `leaderboardId`
- `slug`
- `name`
- `description`
- `metricKey`
- `eventType`
- `rankingMode`
- `order`
- `status`
- `currency`
- `prizeSummary`
- `windowStartsAt`
- `windowEndsAt`
- `lastComputedAt`
- `createdBy`
- `createdAt`
- `updatedAt`

### LeaderboardEvent

One scoring event for one player on one leaderboard.

Key fields:

- `eventId`
- `leaderboardId`
- `playerId`
- `score`
- `sourceType`
- `sourceId`
- `idempotencyKey`
- `metadata`
- `recordedAt`

### LeaderboardStanding

Computed aggregate rank output for read APIs.

Key fields:

- `leaderboardId`
- `playerId`
- `rank`
- `score`
- `eventCount`
- `lastEventAt`
- `metadata`

## Ranking Semantics

### `sum`

Use the sum of all qualifying event scores for a player.

Good for:

- weekly staking leaderboard
- weekly profit leaderboard
- referral volume competitions

### `min`

Use the lowest score recorded for a player.

Good for:

- fastest completion time
- lowest loss challenge

### `max`

Use the highest score recorded for a player.

Good for:

- biggest winning slip
- highest single-day profit
- best predictor score

## Sorting

- `desc` means higher scores rank first
- `asc` means lower scores rank first

Ties should break deterministically:

1. better `score`
2. earlier `lastEventAt`
3. lexical `playerId`

## Initial Sportsbook Use Cases

### Phase 1

- weekly staking leaderboard
- weekly profit leaderboard

### Phase 2

- accumulator challenge
- predictor challenge
- referral contest

## API Shape

### Player

- `GET /api/v1/leaderboards`
- `GET /api/v1/leaderboards/:id`
- `GET /api/v1/leaderboards/:id/entries`

### Admin

- `GET /api/v1/admin/leaderboards`
- `POST /api/v1/admin/leaderboards`
- `PUT /api/v1/admin/leaderboards/:id`
- `POST /api/v1/admin/leaderboards/:id/entries`
- `POST /api/v1/admin/leaderboards/:id/recompute`

## Validation Rules

- `name`, `metricKey`, `rankingMode`, and `order` are required on create
- `windowEndsAt` must not be before `windowStartsAt`
- `playerId` is required when recording an event
- `idempotencyKey` should dedupe admin or settlement replays
- closed leaderboards reject new events

## Persistence Strategy

MVP can run with in-memory storage in the gateway, matching the current loyalty bootstrap style.

Future storage can move to SQL tables:

- `leaderboards`
- `leaderboard_events`
- optional materialized `leaderboard_totals`

## Integration Notes

- bet settlement, referrals, or promo systems can emit events into leaderboards later
- leaderboard read APIs should stay aggregate-first so UI never needs to understand event math
- leaderboard events and loyalty ledger entries must remain separate domains
