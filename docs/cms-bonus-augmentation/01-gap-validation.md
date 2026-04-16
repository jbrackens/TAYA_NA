# 01 — Gap Validation: Capability x Status Matrix

**Purpose:** Validate every capability claim from the EEG legacy analysis against the actual TAYA_NA repo. Each row is grounded in specific file paths.

**Date:** 2026-04-16
**Branch:** main
**Commit:** e65befce
**Reference:** `docs/legacy-analysis/EEG_LEGACY_CMS_BONUS_RECONSTRUCTION.md`

---

## Methodology

Every capability below is classified as:

| Status | Definition |
|---|---|
| **Exists** | Production-ready implementation with service code, HTTP handlers, and DB schema |
| **Partial** | Some code exists but incomplete — missing key features or disconnected from primary app |
| **Missing** | No implementation found in any codebase path |

**Two code sources are cataloged:**
- **PRIMARY:** `apps/Phoenix-Sportsbook-Combined/go-platform/` (active gateway monolith)
- **CODEX-PREP:** `services/codex-prep/` (disconnected microservices, different architecture)

When both sources have code, the PRIMARY status takes precedence for planning.

---

## 1. CMS Capabilities

| # | Sub-capability | Status | Primary Evidence | Codex-Prep Evidence | EEG Claim Validated? |
|---|---|---|---|---|---|
| 1.1 | Content authoring | Missing | No content creation UI or API in gateway | `phoenix-cms/internal/handlers/handlers.go` — POST endpoints for pages/promotions/banners | EEG claims Strapi CMS — **CONTRADICTED**, no Strapi in TAYA_NA; codex-prep has basic REST CRUD |
| 1.2 | Typed content model | Missing | No content type definitions in gateway | `phoenix-cms/internal/models/models.go` — Page, Promotion, Banner structs; `migrations/016_create_cms.sql` — DB schema with UUID PKs, slugs, JSONB rules | EEG claims 15 Strapi content types — **CONTRADICTED**, codex-prep has 3 types only |
| 1.3 | Page composition (blocks) | Missing | No block/component system | Pages have flat `content TEXT` field only — no dynamic zones or block assembly | EEG claims Strapi dynamic zones — **CONTRADICTED**, not present in TAYA_NA |
| 1.4 | Media management | Missing | No media upload/storage | Banners accept `image_url` TEXT field (external URLs only) — no S3, no upload handler | EEG claims S3 media provider — **CONTRADICTED**, codex-prep uses URL refs only |
| 1.5 | Localization | Missing | No CMS localization | No language fields in CMS schema | EEG claims Strapi i18n plugin — **CONTRADICTED**, not present |
| 1.6 | Draft/publish lifecycle | Missing | No draft/publish in gateway | `phoenix-cms/internal/repository/repository.go` — `published` boolean + `published_at` timestamp on pages; binary state only | EEG claims `draftAndPublish: true` — **PARTIALLY VALIDATED**, binary flag exists in codex-prep |
| 1.7 | Scheduling | Missing | No scheduling in gateway | `phoenix-cms/internal/repository/repository.go` — `promotionStatus()` computes "scheduled" from `start_date`/`end_date` window; no cron auto-publish | EEG claims scheduling via date fields — **VALIDATED** for promotions in codex-prep |
| 1.8 | Preview | Missing | No preview API | No preview mode in codex-prep either | EEG claims Strapi draft preview — **CONTRADICTED** |
| 1.9 | Delivery API contracts | Missing | No content delivery endpoints in gateway | `phoenix-cms/cmd/server/main.go` — public `GET /api/v1/pages/{id}`, `GET /api/v1/promotions`, `GET /api/v1/banners?position=X`; Kafka event publishing | EEG claims `GET /api/cms/{path}` — **CONTRADICTED** (that's EEG's idefix, not TAYA_NA), but codex-prep has equivalent REST |
| 1.10 | Backoffice/editor flows | Missing | No CMS admin pages in backoffice | No editor UI in any frontend | EEG claims Strapi admin UI — **CONTRADICTED**, no Strapi deployed |

**CMS Summary:** All 10 sub-capabilities are **Missing** in the primary gateway. Codex-prep has a foundation (typed models, REST API, draft/publish, scheduling) but lacks editor UI, media management, localization, preview, and page composition. The EEG analysis claims about Strapi are from the EEG legacy repo, NOT from TAYA_NA — this is the most significant contradiction.

---

## 2. Bonus Engine Capabilities

| # | Sub-capability | Status | Primary Evidence | Codex-Prep Evidence | EEG Claim Validated? |
|---|---|---|---|---|---|
| 2.1 | Campaigns | Partial | Freebet/OddsBoost structs reference `CampaignID` (`canonical/v1/types.go:253-295`); loyalty has `LoyaltyAccrualRule` with activation (`loyalty/service.go:134-143`) | `phoenix-retention/internal/models/models.go:69-83` — `CreateCampaignRequest` struct | EEG claims gstech-campaignserver — **CONTRADICTED**, no full campaign service in TAYA_NA |
| 2.2 | Audience/eligibility rules | Partial | Freebet filters by sport/tournament (`types.go:260-261`); OddsBoost validates market/selection match (`oddsboosts/service.go:233`); Loyalty tiers gate by `MinLifetimePoints` (`types.go:368-376`) | No general eligibility engine | EEG claims campaign audience rules — **NOT VALIDATED**, only per-bonus-type checks exist |
| 2.3 | Reward rule definitions | Partial | Freebet: amount, min odds, expiry (`types.go:252-266`); OddsBoost: original/boosted odds (`types.go:277-295`); Loyalty accrual: multiplier + qualifiers (`types.go:378-390`) | No deposit match, no cash bonus definitions | EEG claims reward definitions (bonus, playerPromotion, reward) — **PARTIALLY VALIDATED**, freebets and odds boosts exist but no deposit-match or cash bonus |
| 2.4 | Reward ledger | Exists | `loyalty/service.go:317-335` — full `LoyaltyLedgerEntry` with entry types (accrual, referral, adjustment), persistent storage via `loyalty/persist.go:48-79`, HTTP endpoint `GET /api/v1/loyalty/ledger` | — | EEG claims reward ledger in rewardserver — **VALIDATED** equivalent exists in loyalty service |
| 2.5 | Player bonus state machine | Exists | Freebet states: Available → Reserved → Consumed/Expired/Cancelled (`types.go:242-250`, `freebets/service.go:146-229`); OddsBoost states: Available → Accepted/Expired/Cancelled (`types.go:268-275`) | — | EEG claims PlayerBonus state machine (active/completed/expired/forfeited) — **PARTIALLY VALIDATED**, per-bonus-type state machines exist but no unified PlayerBonus entity |
| 2.6 | Wagering contribution tracking | Missing | No wagering contribution code found anywhere in primary gateway. Loyalty `SettlementAccrualRequest` updates loyalty points only, not bonus progress (`loyalty/service.go:523-585`) | — | EEG claims wagering contribution in rewardserver — **NOT VALIDATED**, completely absent |
| 2.7 | Progress tracking | Partial | Loyalty tier progress: `PointsToNextTier`, `NextTier` fields (`types.go:346-347`); tier advancement logic (`loyalty/service.go:739-766`) | — | EEG claims progress tracking — **PARTIALLY VALIDATED**, exists for loyalty tiers but not for bonus wagering |
| 2.8 | Expiry/forfeiture | Partial | Freebet/OddsBoost check `ExpiresAt` on access and auto-transition to expired (`freebets/service.go:179-186`, `oddsboosts/service.go:178-186`). No scheduled background expiry job. | — | EEG claims expiry/forfeiture — **PARTIALLY VALIDATED**, time-check expiry exists but no batch scanner |
| 2.9 | Admin workflows | Partial | Loyalty adjustment: `POST /api/v1/admin/loyalty/adjustments` (`loyalty_handlers.go:203-232`); tier management: `PUT /api/v1/admin/loyalty/tiers/{tierCode}` (`loyalty_handlers.go:273-308`); rule CRUD (`loyalty_handlers.go:310-387`) | — | EEG claims admin workflows — **PARTIALLY VALIDATED**, loyalty admin exists but no freebet/oddsboost grant endpoint |
| 2.10 | Audit trail | Partial | Loyalty ledger entries with `CreatedBy`, `Metadata`, source tracking (`types.go:353-366`); idempotency keys for all mutations (`loyalty/service.go:537-540`) | — | EEG claims audit trail — **PARTIALLY VALIDATED**, loyalty-only audit; no freebet/oddsboost operation logging |

**Bonus Engine Summary:** 1 Exists, 7 Partial, 2 Missing. The primary gateway has real freebet and odds boost implementations with state machines, plus a mature loyalty engine. But there is no campaign lifecycle, no wagering contribution tracking, no unified bonus entity, and no batch expiry scanner. The EEG's gstech quartet architecture is NOT present — TAYA_NA has simpler per-bonus-type services.

---

## 3. Wallet Capabilities

| # | Sub-capability | Status | Primary Evidence | EEG Claim Validated? |
|---|---|---|---|---|
| 3.1 | Wallet data model | Exists | `wallet/service.go:1372-1377` — `wallet_balances` table with `balance_cents BIGINT`, `bonus_balance_cents BIGINT`; `wallet_ledger` table with `fund_type TEXT DEFAULT 'real'` (`service.go:1382-1392`); `wallet_reservations` table (`service.go:1393-1403`) | EEG claims wallet data model needed — **CONTRADICTED**, already exists |
| 3.2 | Funds segregation (real vs bonus) | Exists | `BalanceBreakdown` struct: `RealMoneyCents`, `BonusFundCents`, `TotalCents` (`service.go:282-286`); `BalanceWithBreakdown()` queries both columns (`service.go:288-310`); `fund_type` column in ledger distinguishes real vs bonus entries | EEG claims segregation needed — **CONTRADICTED**, already exists at DB and service level |
| 3.3 | Promo credit support | Partial | `CreditBonus()` method adds to `bonus_balance_cents` (`service.go:313-319`); `applyBonusMutationDB()` writes ledger entries with `fund_type='bonus'` (`service.go:321-395`) | EEG claims promo credit needed — **PARTIALLY CONTRADICTED**, credit exists but no debit |
| 3.4 | Bet debit priority/drawdown rules | Missing | All debits hit `balance_cents` only (`applyMutationTx` at `service.go:972-1050`). No logic to choose between real and bonus balance for bet placement. | EEG claims drawdown rules needed — **VALIDATED**, genuinely missing |
| 3.5 | Settlement with bonus funds | Missing | Settlement credits go to `balance_cents` only. No logic to handle bonus-funded bet winnings differently (e.g., restricted withdrawal). | EEG claims bonus settlement behavior needed — **VALIDATED** |
| 3.6 | Conversion/expiry/reversal | Missing | No bonus-to-real conversion method. No `ExpireBonus()` or `ForfeitBonus()`. No bonus reversal logic. `CreditBonus()` is one-directional. | EEG claims conversion mechanics needed — **VALIDATED** |
| 3.7 | Reconciliation and reporting | Exists | `ReconciliationSummary()` with credit/debit totals, net movement, entry count (`service.go:693-736`); DB version with SQL aggregation (`service.go:1098-1140`); `ScanCorrectionTasks()` detects negative balances and ledger drift (`service.go:1208-1260`) | EEG claims reconciliation needed — **CONTRADICTED**, already production-ready |
| 3.8 | Reservation system | Exists | `Hold()` creates fund reservation with expiry (`service.go:455-549`); `Capture()` converts to real debit atomically (`service.go:555-620`); `Release()` cancels hold (`service.go:625-646`); `ExpireStaleReservations()` batch cleanup (`service.go:650-666`); idempotent by reference_type+reference_id | N/A — EEG doesn't discuss reservations |
| 3.9 | Idempotency | Exists | 24h TTL with background eviction (`service.go:110, 225-244`); DB-level unique constraint on `(entry_type, user_id, idempotency_key)` (`service.go:1390`); conflict detection with amount/reason validation (`service.go:867-870`) | N/A |
| 3.10 | Admin corrections | Exists | `CorrectionTask` with open/resolved lifecycle (`service.go:82-99`); `CreateManualCorrectionTask()`, `ResolveCorrectionTask()` (`service.go:791-855`); automated scan for negative balances and ledger drift (`service.go:738-790`) | N/A |

**Wallet Summary:** 5 Exists, 1 Partial, 4 Missing. The wallet is MORE CAPABLE than the EEG analysis suggests — it already has real/bonus segregation, reservations, reconciliation, and admin corrections. The genuine gaps are drawdown order logic, bonus debit, settlement with bonus funds, and conversion/expiry/reversal mechanics. This is an extension task, not a rebuild.

---

## 4. Parlay Capabilities

| # | Sub-capability | Status | Primary Evidence | Codex-Prep Evidence | EEG Claim Validated? |
|---|---|---|---|---|---|
| 4.1 | Parlay implementation | Partial | `bets/service.go:181-212` — Bet struct with `Legs []BetLeg` supporting multi-leg; frontend `BetslipProvider.tsx` has parlay mode toggle with odds multiplication; `betting-client.ts` `placeParlay()` sends `items[]` array | `phoenix-betting-engine/internal/service/service.go:418-460` — `PlaceParlay()` with leg validation and combined odds calculation | EEG doesn't specifically address parlays — **NEW FINDING**, partial implementation exists in both |
| 4.2 | Parlay qualification logic | Missing | No minimum leg count, no qualifying odds thresholds, no same-game restrictions | Basic `validateSingleSelection()` per leg in codex-prep but no parlay-specific rules | N/A |
| 4.3 | Parlay settlement flow | Partial | Settlement resolvers exist (`canonical/v1/settlement.go:14-37`) with per-market grading; `applySettlementTransition()` (`bets/service.go:2266-2402`) handles dead heat factor | `phoenix-settlement/internal/service/service.go:19-26` — batch settlement by market with `WinningOutcomes` | Parlay settlement is aggregation of per-leg outcomes — no parlay-specific settlement logic |
| 4.4 | Void/push/reduced-leg handling | Partial | Void: `SettlementOutcomeVoid` enum (`settlement.go:79`), stake refund on void (`bets/service.go:2313-2321`); Push: `SettlementOutcomePush` (`settlement.go:80`), stake return (`bets/service.go:2337-2361`) | — | **GAP:** No reduced-leg logic — voiding one leg of a 4-leg parlay should recalculate as 3-leg, not void entire bet |
| 4.5 | Bonus/free bet interaction with parlays | Partial | Freebet `ApplyToBet()` works on any bet type including parlays (`freebets/service.go:146-230`); `MinOddsDecimal` enforced on combined odds (`freebets/service.go:190-195`) | `PlaceParlayRequest` includes `FreebetID` and `OddsBoostID` (`models.go:59-66`) | No parlay-specific bonus restrictions or different treatment |
| 4.6 | Wagering contribution (singles vs parlays) | Missing | No wagering contribution logic anywhere | — | N/A — completely absent |

**Parlay Summary:** 0 Exists, 4 Partial, 2 Missing. Basic parlay placement works (frontend + backend), but settlement edge cases (reduced-leg, void handling), qualification rules, and wagering contribution differences are all missing.

---

## 5. Eventing Capabilities

| # | Sub-capability | Status | Primary Evidence | Codex-Prep Evidence |
|---|---|---|---|---|
| 5.1 | Message bus/queue | Missing | No Kafka, NATS, or RabbitMQ in primary gateway. No event bus. | `phoenix-events/` uses Kafka outbox pattern; `phoenix-common/pkg/outbox/` shared outbox worker |
| 5.2 | Real-time event delivery | Exists | WebSocket hub at `gateway/internal/ws/` — publish/subscribe pattern for markets, fixtures, wallets, bets. Channel-based handlers. | — |
| 5.3 | Bet/deposit/settlement propagation | Partial | Settlement events come from provider feed adapters (`gateway/internal/provider/`); wallet credits happen synchronously in bet settlement; no async event propagation | Kafka outbox for CMS events (`phoenix.cms.page-published`), settlement events |
| 5.4 | Event schema patterns | Exists | `canonical/v1/types.go` — full entity types (Fixture, Market, Selection, Bet, Settlement, CashoutQuote, Freebet, OddsBoost, Leaderboard, Loyalty). `StreamDelta`, `StreamSettlement`, `StreamSnapshot` change types. | Avro schemas in `gmx-streaming-data-idefix-internal-model` (EEG legacy only) |
| 5.5 | Background jobs/schedulers | Partial | `wallet/service.go:225-244` — idempotency key eviction (5min ticker); `wallet/service.go:650-666` — stale reservation expiry. No general scheduler. | — |

**Eventing Summary:** 1 Exists (WebSocket), 2 Partial, 2 Missing. The primary app uses synchronous processing with WebSocket for real-time delivery. No async message bus. Background jobs are ad-hoc goroutine tickers, not a scheduler framework.

---

## EEG Contradiction Summary

| EEG Claim | Repo Reality | Impact |
|---|---|---|
| "Wallet needs real/bonus segregation from scratch" | `wallet_balances.bonus_balance_cents` exists, `BalanceWithBreakdown()` implemented, `CreditBonus()` works | Wallet plan is EXTENSION, not rebuild |
| "Strapi CMS is the model" | No Strapi anywhere in TAYA_NA; codex-prep has simple REST CMS | CMS plan uses lean gateway module, not Strapi |
| "Gstech quartet (4 services) is the model" | TAYA_NA has per-type services (freebets, oddsboosts, loyalty) in one gateway | Bonus plan uses single module, not 4 services |
| "15 Strapi content types" | Codex-prep has 3 types (pages, promotions, banners) | CMS scope is narrower than EEG suggests |
| "Kafka event bus between all services" | No Kafka in primary gateway; WebSocket + sync processing only | Event plan uses WebSocket + goroutine jobs, not Kafka |
| "Multi-brand platform (7 brands)" | TAYA_NA is single-brand | No brand abstraction layer needed |
| "Content versioning via Strapi plugin" | No versioning anywhere in TAYA_NA | Versioning is NOT MVP scope |

---

## File Path Index

All paths relative to repo root (`/Users/john/Sandbox/TAYA_NA/`):

**Gateway wallet:**
1. `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/internal/wallet/service.go`

**Gateway bets/settlement:**
2. `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/internal/bets/service.go`
3. `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/internal/bets/cashout.go`

**Gateway bonus services:**
4. `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/internal/freebets/service.go`
5. `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/internal/oddsboosts/service.go`
6. `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/internal/loyalty/service.go`
7. `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/internal/loyalty/persist.go`

**Gateway HTTP handlers:**
8. `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/internal/http/loyalty_handlers.go`
9. `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/internal/http/freebet_handlers.go`
10. `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/internal/http/odds_boost_handlers.go`

**Canonical types:**
11. `apps/Phoenix-Sportsbook-Combined/go-platform/modules/platform/canonical/v1/types.go`
12. `apps/Phoenix-Sportsbook-Combined/go-platform/modules/platform/canonical/v1/settlement.go`

**Migrations:**
13. `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/migrations/006_wallets_ledger.sql`
14. `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/migrations/007_freebets_oddsboosts.sql`

**Codex-prep CMS:**
15. `services/codex-prep/phoenix-cms/internal/models/models.go`
16. `services/codex-prep/phoenix-cms/internal/repository/repository.go`
17. `services/codex-prep/phoenix-cms/cmd/server/main.go`
18. `services/codex-prep/migrations/016_create_cms.sql`

**Codex-prep betting/settlement:**
19. `services/codex-prep/phoenix-betting-engine/internal/service/service.go`
20. `services/codex-prep/phoenix-settlement/internal/service/service.go`

**Frontend:**
21. `apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/app/app/lib/api/wallet-client.ts`
22. `apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/app/app/lib/api/betting-client.ts`
23. `apps/Phoenix-Sportsbook-Combined/talon-backoffice/packages/app/app/components/BetslipProvider.tsx`

**WebSocket:**
24. `apps/Phoenix-Sportsbook-Combined/go-platform/services/gateway/internal/ws/handler.go`
