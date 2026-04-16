# Loyalty Domain Spec

## Status
Proposed implementation spec for sportsbook-native loyalty integration.

## Goal
Introduce a sportsbook-native loyalty system inside the existing Go + Next platform that rewards qualifying user activity, exposes visible progression to players, and gives operators full auditability and adjustment controls.

This system replaces the need to integrate the legacy RMX services directly. It borrows the useful business concepts from the RMX rewards ecosystem while remaining aligned with the current sportsbook architecture.

## Product Intent
The loyalty domain should do five things well:

1. Award points from qualifying sportsbook activity.
2. Maintain an auditable points ledger and current balance.
3. Compute visible tier progression for players.
4. Support manual operator adjustments with explicit audit trails.
5. Provide an extensible foundation for referrals, promo boosts, and future redemption mechanics.

## Non-Goals For MVP
The first implementation should explicitly avoid:

- virtual shop or merchandise redemption
- mission/quest systems
- achievement badges
- casino cross-product accrual logic
- direct reuse of RMX Django, RabbitMQ, Kafka, or OIDC services
- direct reuse of the AngularJS Reward Matrix portal

## Legacy Reference Inputs
The following concepts are worth porting from the RMX codebase:

- stake-based points accrual
- wallet-line or ledger-entry accounting model
- explicit operation types and subtypes
- period aggregates like lifetime, 7-day, 30-day, and current month
- referral bonus issuance into the same ledger
- backoffice visibility into historical adjustments and account state

The following legacy aspects should not be ported directly:

- Django service boundaries
- `*.local.rewardsmatrix.com` endpoint contracts
- RMX token exchange / OIDC assumptions
- RabbitMQ/Kafka coupling for core correctness
- legacy admin UI and AngularJS player portal

## Domain Model

### LoyaltyAccount
Represents the current loyalty state for a punter.

Suggested fields:

- `accountId`
- `punterId`
- `pointsBalance`
- `pointsEarnedLifetime`
- `pointsEarned7d`
- `pointsEarned30d`
- `pointsEarnedCurrentMonth`
- `currentTier`
- `currentTierAssignedAt`
- `lastAccrualAt`
- `createdAt`
- `updatedAt`

Notes:
- There should be exactly one loyalty account per punter.
- The aggregate values are derived-state conveniences and may be recomputed from ledger state if required.

### LoyaltyLedgerEntry
Immutable accounting event for all points movement.

Suggested fields:

- `entryId`
- `punterId`
- `accountId`
- `entryType`
- `entrySubtype`
- `sourceType`
- `sourceId`
- `pointsDelta`
- `balanceAfter`
- `metadata`
- `createdBy`
- `createdAt`

Entry type examples:

- `accrual`
- `adjustment`
- `referral_bonus`
- `promo_bonus`
- `reversal`
- `expiration`
- `redemption`

Source type examples:

- `bet_settlement`
- `admin_manual`
- `referral`
- `campaign`
- `system_recalc`

Rules:
- Ledger entries must be append-only.
- Every balance change must have exactly one ledger entry.
- `balanceAfter` should be stored for fast audit readability.

### LoyaltyTier
Represents visible progression bands for players.

Suggested fields:

- `tierCode`
- `displayName`
- `rank`
- `minLifetimePoints`
- `minRolling30dPoints`
- `benefits`
- `active`

Initial default tiers:

- `bronze`
- `silver`
- `gold`
- `vip`

MVP recommendation:
- Drive tiering from lifetime points first.
- Keep rolling-window eligibility as a later extension unless product explicitly needs decay/maintenance.

### LoyaltyAccrualRule
Configurable rule describing how qualifying activity produces points.

Suggested fields:

- `ruleId`
- `name`
- `sourceType`
- `active`
- `multiplier`
- `minQualifiedStakeCents`
- `eligibleSports`
- `eligibleBetTypes`
- `maxPointsPerEvent`
- `effectiveFrom`
- `effectiveTo`

MVP recommendation:
- Start with one default settlement rule and optional sport-specific overrides later.

### ReferralReward
Represents reward issuance connected to referred-user behavior.

Suggested fields:

- `referralId`
- `referrerPunterId`
- `referredPunterId`
- `qualificationState`
- `qualifiedAt`
- `ledgerEntryId`
- `createdAt`
- `updatedAt`

## Accrual Model

### Trigger Point
Points should be awarded on **qualified bet settlement**, not on placement.

Why:
- prevents awarding on cancelled or voided bets
- aligns with existing settlement-based accounting patterns in the sportsbook
- reduces promo abuse surface

### MVP Qualification Rule
A settled bet qualifies if:

- it belongs to the punter receiving points
- it reaches a terminal settlement state
- it is not void or cancelled
- its stake is positive
- it has not already produced a loyalty ledger entry for that settlement event

### Initial Formula
Recommended initial formula:

- `qualifiedStake = stakeCents`
- `points = floor((qualifiedStake / 100.0) * multiplier)`

Default multiplier:
- `1.0 point per 1 currency unit staked`

This should be configurable, but the initial rollout should prefer a simple rule that is easy to explain and audit.

### Idempotency
Accrual must be idempotent on settlement event.

Recommended idempotency key shape:
- `loyalty:bet_settlement:{betId}:{settlementVersion}`

If settlement versions are unavailable, use a deterministic source key derived from the terminal settlement transition and ensure service-level duplication guards.

## Tier Evaluation

### MVP Tier Logic
Use lifetime points for first launch.

Example thresholds:

- Bronze: `0+`
- Silver: `1,000+`
- Gold: `5,000+`
- VIP: `20,000+`

Tier is recomputed whenever:

- a positive accrual lands
- an operator adjustment changes total earned points materially
- a maintenance recompute runs

### Player-Facing Progress
Player surfaces should show:

- current points balance
- current tier
- points to next tier
- recent points activity

## Admin Controls
Operators need the following capabilities:

- view loyalty accounts
- inspect loyalty ledger history
- issue manual positive or negative adjustments
- view referral-linked rewards
- inspect applicable accrual rules

Manual adjustment requirements:

- mandatory reason
- explicit operator identity
- immutable ledger entry
- audit event emitted in admin audit log

## API Contract Recommendations

### Player APIs
- `GET /api/v1/loyalty`
  - returns account summary, tier, and progress
- `GET /api/v1/loyalty/ledger`
  - paginated ledger entries
- `GET /api/v1/loyalty/tiers`
  - active tier definitions for UI explanation

### Admin APIs
- `GET /api/v1/admin/loyalty/accounts`
- `GET /api/v1/admin/loyalty/accounts/:id`
- `POST /api/v1/admin/loyalty/adjustments`
- `GET /api/v1/admin/loyalty/config`
- `PUT /api/v1/admin/loyalty/tiers/:tierCode`
- `PUT /api/v1/admin/loyalty/rules/:ruleId`

## Shipped MVP Notes

The current sportsbook-native MVP now includes:

- seeded loyalty accounts and ledger activity for local QA
- player hub rewards summary and recent activity
- player bet-history `points earned` callouts for settled bets
- backoffice loyalty account list and account detail
- backoffice loyalty settings UI for tier thresholds and accrual rules

### Post-MVP Shipped (2026-04-10)

- standalone `/rewards` Rewards Center: tier ladder, how-you-earn, 20-entry ledger, referral program, heatmap, competitions
- bet analytics dashboard at `/bets/analytics`: ROI, win rate, P&L, stake distribution charts via `GET /api/v1/bets/analytics`
- shareable bet cards: "Share this win" on settled winners, Canvas PNG with TAYA NA! branding
- betting heatmap (7×4 day/time grid) on account and rewards pages
- betslip estimated rewards preview
- office rule creation form + `POST /api/v1/admin/loyalty/rules` endpoint
- office tier benefits editor (key-value pairs)
- office referral visibility on player detail
- user profile endpoint `GET /api/v1/users/{userId}/profile`
- office dev-mode auth bypass for local gateway tokens
- performance: parallel market fetching, batched fixture lookups, 10s market cache, 15s poll fallback, sports catalog caching, gzip

Still intentionally deferred:

- redemption flows
- campaign shops
- automatic rolling-window decay logic
- full audit-log integration for configuration edits
- sport/league breakdown in analytics (requires fixture join)
- parlay-specific analytics

### Admin APIs (current)
- `GET /api/v1/admin/loyalty/accounts`
- `GET /api/v1/admin/loyalty/accounts/:id`
- `POST /api/v1/admin/loyalty/adjustments`
- `POST /api/v1/admin/loyalty/referrals`
- `GET /api/v1/admin/loyalty/config`
- `PUT /api/v1/admin/loyalty/tiers/:tierCode`
- `POST /api/v1/admin/loyalty/rules`
- `PUT /api/v1/admin/loyalty/rules/:ruleId`

## Storage Recommendations
Implement as a new sportsbook-native domain in Go.

Suggested new tables:

### `loyalty_accounts`
- `account_id`
- `punter_id` unique
- `points_balance`
- `points_earned_lifetime`
- `points_earned_7d`
- `points_earned_30d`
- `points_earned_current_month`
- `current_tier`
- `current_tier_assigned_at`
- `last_accrual_at`
- `created_at`
- `updated_at`

### `loyalty_ledger_entries`
- `entry_id`
- `account_id`
- `punter_id`
- `entry_type`
- `entry_subtype`
- `source_type`
- `source_id`
- `points_delta`
- `balance_after`
- `metadata_json`
- `created_by`
- `created_at`

### `loyalty_tiers`
- `tier_code`
- `display_name`
- `rank`
- `min_lifetime_points`
- `min_rolling_30d_points`
- `benefits_json`
- `active`

### `loyalty_accrual_rules`
- `rule_id`
- `name`
- `source_type`
- `active`
- `multiplier`
- `min_qualified_stake_cents`
- `eligible_sports_json`
- `eligible_bet_types_json`
- `max_points_per_event`
- `effective_from`
- `effective_to`

### `referral_rewards`
- `referral_id`
- `referrer_punter_id`
- `referred_punter_id`
- `qualification_state`
- `qualified_at`
- `ledger_entry_id`
- `created_at`
- `updated_at`

## Integration Points In Current Sportsbook
The current sportsbook already has adjacent primitives that loyalty should align with:

- punter identity in the gateway/auth stack
- wallet and ledger patterns in gateway storage
- freebets and odds boosts as promo primitives
- settlement lifecycle in bets services
- player account surfaces in the player app
- operator controls in the office app

Implementation should therefore:

- live inside the Go platform
- reuse existing auth and audit patterns
- avoid adding a second wallet concept
- remain separate from cash balance accounting

Important distinction:
- **cash wallet balance** and **loyalty points balance** are separate domains
- the loyalty system may later *grant* promo artifacts such as freebets, but it should not mutate the cash wallet directly as part of normal accrual

## Failure and Edge Cases
The backend must explicitly define behavior for:

- duplicate settlement delivery
- partial settlements
- voided/cancelled bets
- manual negative adjustment causing low or negative points balance
- tier downgrade policy if negative adjustments occur
- historical recompute after rule changes
- referral abuse and self-referral

MVP recommendation:
- allow negative adjustments only for operator/system correction
- prevent silent negative drift from ordinary recalculation unless explicitly requested
- treat rule changes as forward-only unless an admin-triggered recompute is performed

## Observability
Add first-class operational visibility:

- accrual success/failure counters
- duplicate suppression counters
- adjustment counters by operator and reason
- tier distribution summary
- latency for loyalty summary endpoints

## Security and Abuse Controls
Minimum controls for launch:

- operator-only manual adjustment endpoint
- adjustment reason required and audited
- idempotent accrual write path
- referral rewards gated by qualification conditions
- no client-side authority for points creation

## Rollout Plan
Recommended rollout order:

1. loyalty data model and read APIs
2. settlement-based accrual
3. player account summary UI
4. admin adjustment tooling
5. referral extension
6. rule configurability improvements

## MVP Acceptance Criteria
MVP is complete when:

- a qualified settled bet creates one loyalty ledger entry
- a punter can fetch loyalty summary and history
- tiers are computed and returned with progress information
- an operator can issue manual adjustments with audit trail
- duplicate settlement events do not duplicate points
- loyalty remains isolated from cash wallet accounting

## Open Decisions
These should be confirmed during implementation, but should not block backend scaffolding:

- exact tier thresholds
- whether tiering is lifetime-only or mixed with rolling windows at launch
- whether accumulator/live-bet multipliers should exist in MVP
- whether referral launches in the same milestone or immediately after loyalty MVP
