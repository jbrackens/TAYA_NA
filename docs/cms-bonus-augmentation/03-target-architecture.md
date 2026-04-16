# 03 — Target Architecture

**Date:** 2026-04-16

---

## Design Decision: Extend the Gateway

All new capabilities are added as internal packages within the existing Go gateway at `services/gateway/`. No new services. Rationale: proven patterns (wallet, freebets, loyalty already work this way), single deployment, no Kafka dependency, smallest blast radius.

---

## Current vs Target Architecture Diff

```
CURRENT GATEWAY                          TARGET GATEWAY
services/gateway/internal/               services/gateway/internal/
├── bets/                                ├── bets/
│   ├── service.go                       │   ├── service.go          (EXTEND: parlay settlement)
│   ├── cashout.go                       │   ├── cashout.go          (EXTEND: bonus-aware cashout)
│   ├── bet_builder.go                   │   ├── bet_builder.go
│   ├── fixed_exotics.go                 │   ├── fixed_exotics.go
│   └── alternative_offers.go           │   ├── alternative_offers.go
│                                        │   ├── parlay_settlement.go (NEW: reduced-leg, void rules)
│                                        │   └── parlay_rules.go     (NEW: qualification logic)
├── wallet/                              ├── wallet/
│   └── service.go                       │   ├── service.go          (EXTEND: DebitBonus, drawdown)
│                                        │   ├── bonus_ops.go        (NEW: convert, expire, forfeit)
│                                        │   └── wagering.go         (NEW: contribution tracking)
├── freebets/                            ├── freebets/
│   └── service.go                       │   └── service.go          (EXTEND: campaign integration)
├── oddsboosts/                          ├── oddsboosts/
│   └── service.go                       │   └── service.go          (EXTEND: campaign integration)
├── loyalty/                             ├── loyalty/
│   ├── service.go                       │   ├── service.go          (EXTEND: bonus point accrual)
│   └── persist.go                       │   └── persist.go
├── compliance/                          ├── compliance/             (NO CHANGE)
├── payments/                            ├── payments/               (NO CHANGE)
├── domain/                              ├── domain/                 (NO CHANGE)
├── cache/                               ├── cache/                  (NO CHANGE)
├── provider/                            ├── provider/               (NO CHANGE)
├── ws/                                  ├── ws/                     (EXTEND: bonus channels)
├── leaderboards/                        ├── leaderboards/           (NO CHANGE)
│                                        ├── content/                (NEW PACKAGE)
│                                        │   ├── service.go          Content CRUD + delivery
│                                        │   ├── models.go           Page, Banner, ContentBlock
│                                        │   └── repository.go       PostgreSQL persistence
│                                        ├── bonus/                  (NEW PACKAGE)
│                                        │   ├── service.go          Campaign + PlayerBonus lifecycle
│                                        │   ├── models.go           Campaign, PlayerBonus, WageringProgress
│                                        │   ├── campaign_rules.go   Eligibility + trigger rules
│                                        │   └── repository.go       PostgreSQL persistence
└── http/                                └── http/
    ├── handlers.go                          ├── handlers.go          (EXTEND: register new routes)
    ├── bet_handlers.go                      ├── bet_handlers.go      (EXTEND: parlay endpoints)
    ├── wallet_handlers.go                   ├── wallet_handlers.go   (EXTEND: breakdown endpoint)
    ├── loyalty_handlers.go                  ├── loyalty_handlers.go  (NO CHANGE)
    ├── freebet_handlers.go                  ├── freebet_handlers.go  (NO CHANGE)
    ├── odds_boost_handlers.go               ├── odds_boost_handlers.go (NO CHANGE)
    │                                        ├── content_handlers.go  (NEW: CMS delivery + admin)
    │                                        └── bonus_handlers.go    (NEW: campaign + bonus admin)
```

---

## Service Interaction Diagram

```
                    ┌─────────────────────────────────┐
                    │         HTTP Request              │
                    └──────────┬──────────────────────┘
                               │
                    ┌──────────▼──────────────────────┐
                    │      Middleware Stack             │
                    │  (Auth, CSRF, Rate Limit, etc.)  │
                    └──────────┬──────────────────────┘
                               │
         ┌─────────────────────┼─────────────────────────┐
         │                     │                           │
         ▼                     ▼                           ▼
  ┌──────────────┐   ┌──────────────────┐   ┌─────────────────┐
  │   content/   │   │     bonus/       │   │     bets/       │
  │              │   │                  │   │                 │
  │ Pages        │   │ Campaigns        │   │ PlaceBet        │
  │ Banners      │   │ PlayerBonuses    │   │ PlaceParlay     │
  │ ContentBlocks│   │ WageringProgress │   │ Settle          │
  │              │   │ CampaignRules    │   │ Cashout         │
  └──────────────┘   └────────┬─────────┘   └───────┬─────────┘
                              │                      │
                    ┌─────────▼──────────────────────▼────────┐
                    │              wallet/                      │
                    │                                          │
                    │  Credit / Debit / CreditBonus            │
                    │  DebitBonus (NEW)                         │
                    │  DrawdownDebit (NEW: real-first or bonus) │
                    │  Hold / Capture / Release                 │
                    │  ConvertBonusToReal (NEW)                 │
                    │  ExpireBonus (NEW)                        │
                    │  WageringContribution (NEW)               │
                    │                                          │
                    │  BalanceWithBreakdown (EXISTS)            │
                    │  Reconciliation (EXISTS)                  │
                    │  CorrectionTasks (EXISTS)                 │
                    └────────────┬─────────────────────────────┘
                                 │
                    ┌────────────▼─────────────────────────────┐
                    │           PostgreSQL                      │
                    │                                          │
                    │  wallet_balances (real + bonus)           │
                    │  wallet_ledger (fund_type: real/bonus)    │
                    │  wallet_reservations                      │
                    │  campaigns (NEW)                          │
                    │  campaign_rules (NEW)                     │
                    │  player_bonuses (NEW)                     │
                    │  wagering_progress (NEW)                  │
                    │  content_pages (NEW)                      │
                    │  banners (NEW)                            │
                    │  content_blocks (NEW)                     │
                    │  bet_legs (NEW)                           │
                    └──────────────────────────────────────────┘
```

---

## Cross-Cutting Concerns

### Bonus ↔ Wallet Interaction

```
Bonus grants reward:
  bonus/service.go → wallet.CreditBonus(amount, campaignRef)
                   → Creates PlayerBonus record (status: active)

Player places bet:
  bets/service.go  → wallet.DrawdownDebit(amount, drawdownOrder)
                   → Drawdown deducts from real first, then bonus (configurable)
                   → Bonus-funded portion tracked in bet metadata

Bet settles (win):
  bets/service.go  → wallet.Credit(winnings to real balance)
                   → bonus/WageringContribution(betStake, betOdds, bonusID)
                   → If wagering complete: wallet.ConvertBonusToReal(bonusID)

Bonus expires:
  Background job   → bonus/ExpirePlayerBonuses()
                   → wallet.ForfeitBonus(userID, bonusID)
                   → Zeroes bonus_balance_cents with ledger entry
```

### Parlay ↔ Bonus Interaction

```
Player builds parlay with freebet:
  1. BetslipProvider checks freebet eligibility (min odds, sport filter)
  2. placeParlay() attaches FreebetID
  3. FreebetService.ApplyToBet() validates combined odds >= MinOddsDecimal
  4. Wallet holds remaining stake (if partial freebet)

Parlay settles with voided leg:
  1. Per-leg settlement resolves each market
  2. Voided leg → odds = 1.0 (neutral, remove from multiplication)
  3. Remaining legs determine outcome at reduced combined odds
  4. If freebet: winnings-only payout (stake not returned)
  5. Wagering contribution: full settled amount counts toward progress
```

---

## New Packages — Responsibility Boundaries

| Package | Owns | Does NOT Own |
|---|---|---|
| `content/` | Pages, banners, content blocks, delivery API, admin CRUD | Media storage (URL refs only for MVP), localization, versioning |
| `bonus/` | Campaigns, campaign rules, PlayerBonus state machine, eligibility checks | Wallet mutations (delegates to wallet/), freebet/oddsboost lifecycle (those stay in their packages) |
| `wallet/` (extended) | Balance accounting (real+bonus), drawdown, conversion, expiry, wagering contribution | Campaign business logic (delegates to bonus/) |
| `bets/` (extended) | Parlay settlement rules, reduced-leg handling, bonus-aware payout | Campaign eligibility (delegates to bonus/), wallet mutations (delegates to wallet/) |

---

## What We Reuse vs What We Build

### Reuse (no changes needed)

| Asset | Path | How It's Reused |
|---|---|---|
| `BalanceBreakdown` struct | `wallet/service.go:282` | Expose via new API endpoint |
| `CreditBonus()` method | `wallet/service.go:313` | Called by bonus/ when granting rewards |
| `Hold/Capture/Release` | `wallet/service.go:455-666` | Used for bonus-funded bet reservations |
| `Reconciliation` | `wallet/service.go:693` | Extended to detect bonus balance drift |
| Freebet state machine | `freebets/service.go` | Connected to campaigns via CampaignID field |
| OddsBoost validation | `oddsboosts/service.go` | Connected to campaigns via CampaignID field |
| Loyalty accrual | `loyalty/service.go` | Extended to accrue bonus completion points |
| WebSocket hub | `ws/handler.go` | New channels for bonus/content updates |
| Auth middleware | `middleware.go` | No changes — new endpoints use existing auth |
| i18n namespace structure | `public/static/locales/en/` | New namespace files for bonus/content |

### Build (new code)

| Component | Package | Why It Can't Be Reused |
|---|---|---|
| `DebitBonus()` | `wallet/` | Symmetric to CreditBonus, doesn't exist yet |
| `DrawdownDebit()` | `wallet/` | Real-first vs bonus-first ordering logic |
| `ConvertBonusToReal()` | `wallet/` | Wagering completion transfer |
| `ForfeitBonus()` | `wallet/` | Expiry/admin forfeiture with ledger |
| `WageringContribution()` | `wallet/` | Per-bet contribution tracking |
| Campaign service | `bonus/` | No campaign lifecycle exists anywhere in gateway |
| PlayerBonus state machine | `bonus/` | Unified bonus entity (not per-type like freebets) |
| CampaignRules evaluator | `bonus/` | Eligibility + trigger + reward rule engine |
| Content service | `content/` | No CMS in gateway today |
| Parlay settlement rules | `bets/` | Reduced-leg, void-in-parlay logic |

---

## No New Services Justification

The gateway currently hosts 12 internal packages. Adding 2 new packages (`content/`, `bonus/`) brings it to 14. This is within the monolith's manageable complexity because:

1. Each package has a single responsibility with clean interfaces
2. The wallet is the only shared dependency (content/ doesn't touch wallet)
3. No circular dependencies (bonus → wallet → DB, content → DB)
4. All packages share the same middleware, auth, and DB connection
5. The extraction boundary is clean: if bonus/ or content/ ever needs to be a separate service, it already has its own models, repository, and service layer — just add an HTTP server

---

## File Path References

1. `services/gateway/cmd/gateway/main.go` — route registration, middleware stack
2. `services/gateway/internal/wallet/service.go` — existing wallet with bonus columns
3. `services/gateway/internal/bets/service.go` — bet placement and settlement
4. `services/gateway/internal/freebets/service.go` — freebet state machine
5. `services/gateway/internal/oddsboosts/service.go` — odds boost service
6. `services/gateway/internal/loyalty/service.go` — loyalty engine
7. `services/gateway/internal/ws/handler.go` — WebSocket hub
8. `services/gateway/internal/http/handlers.go` — route registration
9. `modules/platform/transport/httpx/middleware.go` — auth middleware
10. `modules/platform/canonical/v1/types.go` — entity type definitions
11. `modules/platform/canonical/v1/settlement.go` — settlement resolvers
12. `services/gateway/migrations/006_wallets_ledger.sql` — wallet schema
13. `services/gateway/migrations/007_freebets_oddsboosts.sql` — bonus tables
