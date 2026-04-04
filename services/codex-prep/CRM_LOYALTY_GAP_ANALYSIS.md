# CRM and Loyalty Gap Analysis

Date: 2026-03-10

## Scope

This audit uses the implemented Go code as the source of truth.

Primary files inspected:
- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-retention/README.md`
- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-retention/internal/models/models.go`
- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-retention/internal/service/service.go`
- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/stella-engagement/README.md`
- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/stella-engagement/internal/service/service.go`
- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-notification/README.md`
- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-notification/internal/models/models.go`
- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-analytics/README.md`
- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-cms/README.md`
- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/SERVICE_CONTRACTS.md`

## Bottom Line

- Loyalty foundation: implemented
- Engagement foundation: implemented
- CRM-enabling primitives: partially implemented
- Full CRM product: not implemented

The platform now has enough backend surface to support loyalty and some retention workflows, but it does not yet amount to a complete CRM system.

## What Is Built

### Loyalty and Retention

Implemented in `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-retention`:
- achievement unlocks
- user achievement reads
- leaderboard reads
- campaign creation
- loyalty points balance/history
- loyalty points redemption

Concrete contract:
- `POST /api/v1/achievements/{userID}/unlock`
- `GET /api/v1/users/{userID}/achievements`
- `GET /api/v1/leaderboards`
- `POST /api/v1/campaigns`
- `GET /api/v1/users/{userID}/loyalty-points`
- `POST /api/v1/users/{userID}/loyalty-points/redeem`

Implementation facts:
- loyalty balance is modeled as an event-sourced ledger in `event_store`
- leaderboard reads are Redis-cached
- loyalty redemption credits wallet synchronously, then records the point spend
- campaign creation stores metadata and a generic `rules` payload

### Real-Time Engagement

Implemented in `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/stella-engagement`:
- achievement stream ingestion
- points calculation
- aggregation computation
- engagement score reads
- websocket achievement stream
- websocket leaderboard stream

Concrete contract:
- `POST /api/v1/achievements/stream`
- `POST /api/v1/points/calculate`
- `POST /api/v1/aggregations/compute`
- `GET /api/v1/engagement-score/{user_id}`
- `GET /api/v1/stream/achievements/{user_id}`
- `GET /api/v1/stream/leaderboard`

Implementation facts:
- points and achievements persist to PostgreSQL
- leaderboard state is cached in Redis
- websocket fan-out is in-process broadcast

### Notification Foundation

Implemented in `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-notification`:
- queued notifications
- notification templates
- per-channel delivery state
- notification preferences
- quiet-hours persistence

Concrete contract:
- `POST /api/v1/notifications`
- `GET /api/v1/templates`
- `PUT /api/v1/notifications/{notification_id}/status`
- `GET /api/v1/users/{user_id}/notification-preferences`
- `PUT /api/v1/users/{user_id}/notification-preferences`
- `GET /api/v1/notifications/{notification_id}`

Implementation facts:
- notifications are queued durably
- blocked channels are marked `suppressed`
- quiet hours are stored but not enforced as delayed scheduling behavior

### Analytics Foundation

Implemented in `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-analytics`:
- event ingest
- user reports
- platform dashboards
- market reports
- cohorts

Implementation facts:
- PostgreSQL is used in the prep environment, not ClickHouse
- `vip_status` cohorts are inferred from user roles because there is no dedicated VIP tier model
- report reads exist, but there is no saved-audience or segment activation layer

### CMS / Promotional Content

Implemented in `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-cms`:
- pages
- banners
- promotions

Implementation fact:
- CMS owns content/catalog-style promotions
- retention still owns campaigns, bonuses, and leaderboards

## What Is Partial

### CRM Segmentation

Partial only.

Why:
- `phoenix-analytics` can produce cohorts
- `phoenix-user` provides account identity
- `phoenix-notification` can queue messages

Missing:
- saved audiences
- dynamic segment definitions
- audience refresh/exclusion rules
- activation from segment -> campaign/notification execution

### Campaigns

Partial only.

Why:
- `phoenix-retention` supports campaign creation with a `rules` payload

Missing:
- targeting engine
- scheduled execution
- journey progression/state machine
- entry/exit criteria enforcement
- closed-loop measurement tied to execution outcomes

### Loyalty Productization

Good foundation, but partial as a finished system.

Exists:
- event-sourced point ledger
- achievements
- leaderboards
- point redemption

Missing:
- tier model
- VIP ladder
- reward catalog management
- configurable earn rules by operator tooling
- expiration/reservation logic for multiple reward types beyond simple wallet credit

### Engagement Productization

Implemented as runtime mechanics, not full operator tooling.

Exists:
- points calculation
- aggregations
- engagement score
- websocket streams

Missing:
- operator rule management
- replay/backfill workflows
- multi-node real-time distribution beyond in-process broadcaster

### Notification Orchestration

Partial only.

Exists:
- queueing
- templates
- preferences
- delivery state

Missing:
- quiet-hours send-window enforcement
- delayed scheduling
- multi-step journey orchestration
- experimentation / holdout / throttling logic

## What Is Missing Entirely

These do not exist as implemented services/features today:
- customer 360 / CRM profile layer
- audience builder / marketer segmentation studio
- lifecycle journey orchestration
- experiment / holdout framework
- loyalty tier engine
- VIP management model
- churn-risk / reactivation engine
- support-driven CRM workflow layer
- operator-facing CRM automation product

## Practical Answer

If the question is "did we add the CRM and loyalty system?":

- Loyalty system foundation: yes
- Engagement foundation: yes
- Notification foundation: yes
- Full CRM: no

The accurate description is:

The platform has backend building blocks for loyalty and retention, plus some CRM-enabling primitives, but it does not yet have a fully realized CRM product.

## Recommended Next Build Order

1. Add a loyalty tier and VIP model on top of `phoenix-retention` and `phoenix-analytics`
2. Add segment definitions and saved audiences in `phoenix-analytics` or a dedicated CRM service
3. Add campaign execution/journey orchestration that binds segments -> notifications -> outcomes
4. Add operator-facing CRM APIs/UI for campaign management and audience inspection
5. Move quiet-hours and send-window handling from stored preference to runtime behavior
