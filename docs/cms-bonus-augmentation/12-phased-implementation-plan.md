# 12 — Phased Implementation Plan

**Date:** 2026-04-16

---

## Phase Overview

```
Phase A: Foundation ──────────────────── (weeks 1-2)
  Wallet extensions + bonus module + DB migrations
  No frontend changes. Backend only.

Phase B: CMS + Campaigns ────────────── (weeks 2-3, partially parallel with A)
  Content module + campaign CRUD + backoffice admin
  Backoffice UI for content and campaigns.

Phase C: Parlay + Settlement ─────────── (weeks 3-4)
  Parlay rules + reduced-leg settlement + bonus-aware settlement
  Backend betting logic.

Phase D: Frontend Integration ────────── (weeks 4-5)
  Player app bonus UI + content rendering + parlay enhancements
  All player-facing changes.

Phase E: Polish + Launch Readiness ────── (week 5-6)
  Background jobs, reconciliation, edge cases, QA.
```

---

## Phase A: Foundation (Backend Only)

**Goal:** Extend the wallet and create the bonus module. No frontend impact.

### Deliverables

| # | Task | Package | New Files | Changed Files |
|---|---|---|---|---|
| A1 | Migration 012: campaigns + bonuses tables | DB | `migrations/012_campaigns_bonuses.sql` | — |
| A2 | `DebitBonus()` method | `wallet/` | — | `service.go` (add method) |
| A3 | `DrawdownDebit()` method | `wallet/` | — | `service.go` (add method) |
| A4 | `ConvertBonusToReal()` method | `wallet/` | `bonus_ops.go` | — |
| A5 | `ForfeitBonus()` method | `wallet/` | `bonus_ops.go` | — |
| A6 | `RecordWageringContribution()` method | `wallet/` | `wagering.go` | — |
| A7 | Campaign service (CRUD + lifecycle) | `bonus/` | `service.go`, `models.go`, `repository.go` | — |
| A8 | PlayerBonus state machine | `bonus/` | `service.go` (grant, complete, expire, forfeit) | — |
| A9 | Campaign rules evaluator | `bonus/` | `campaign_rules.go` | — |
| A10 | Bonus HTTP handlers | `http/` | `bonus_handlers.go` | `handlers.go` (route registration) |
| A11 | In-process event bus | `events/` | `bus.go` | — |

### Dependencies

```
A1 (migration) → A7 (campaign service needs tables)
A2 (DebitBonus) → A5 (ForfeitBonus calls DebitBonus)
A7 (campaigns) → A9 (rules evaluator needs campaign CRUD)
A8 (PlayerBonus) → A6 (wagering needs PlayerBonus records)
A10 (handlers) → A7, A8 (handlers call service)
```

### Tests

- Unit tests for all new wallet methods (DrawdownDebit edge cases, conversion, forfeiture)
- Unit tests for campaign rules evaluation (eligibility, trigger, reward calculation)
- Unit tests for PlayerBonus state transitions
- Integration test: deposit → campaign triggers → bonus granted → wagering contribution → completion
- HTTP handler tests for all admin endpoints

### Risk

| Risk | Likelihood | Mitigation |
|---|---|---|
| DrawdownDebit race condition | Medium | SERIALIZABLE TX isolation (existing pattern) |
| Wagering contribution double-count | Low | Idempotent by (player_bonus_id, bet_id) unique constraint |
| Campaign rules too rigid | Medium | JSONB rule_config allows flexible extension |

---

## Phase B: CMS + Campaigns (Backoffice)

**Goal:** Content management and campaign administration.

**Partially parallel with Phase A** — content module has no dependency on bonus module.

### Deliverables

| # | Task | Package | New Files | Changed Files |
|---|---|---|---|---|
| B1 | Migration 011: content tables | DB | `migrations/011_content.sql` | — |
| B2 | Content service (CRUD + delivery) | `content/` | `service.go`, `models.go`, `repository.go` | — |
| B3 | Content HTTP handlers | `http/` | `content_handlers.go` | `handlers.go` |
| B4 | Backoffice: content pages admin | `office/` | `(dashboard)/content/pages/`, `(dashboard)/content/banners/` | sidebar navigation |
| B5 | Backoffice: campaign admin | `office/` | `(dashboard)/campaigns/`, `(dashboard)/campaigns/new/` | sidebar navigation |
| B6 | Backoffice: bonus admin | `office/` | `(dashboard)/bonuses/` | sidebar navigation |
| B7 | Backoffice API client extensions | `api-client/` | — | Add content + campaign + bonus methods |

### Dependencies

```
B1 (migration) → B2 (content service needs tables)
B2 → B3 (handlers call service)
B3 → B4 (admin UI calls handlers)
A7 (campaigns from Phase A) → B5 (campaign admin)
A8 (PlayerBonus from Phase A) → B6 (bonus admin)
```

### Tests

- Content CRUD unit tests (create, update, publish/unpublish, delete)
- Banner scheduling tests (start_at/end_at filtering)
- HTTP handler tests for content delivery (public) and admin (auth required)
- Backoffice component tests for campaign wizard validation

---

## Phase C: Parlay + Settlement (Backend)

**Goal:** Proper parlay mechanics and bonus-aware settlement.

**Depends on Phase A** (wagering contribution needs bonus module).

### Deliverables

| # | Task | Package | New Files | Changed Files |
|---|---|---|---|---|
| C1 | Migration 013: bet_legs table | DB | `migrations/013_bet_legs.sql` | — |
| C2 | Parlay qualification rules | `bets/` | `parlay_rules.go` | — |
| C3 | Parlay settlement (reduced-leg, void, push) | `bets/` | `parlay_settlement.go` | `service.go` (Settle() uses new logic) |
| C4 | Bonus-aware bet placement | `bets/` | — | `service.go` (use DrawdownDebit) |
| C5 | Bonus-aware cashout | `bets/` | — | `cashout.go` (credits to real only) |
| C6 | Wagering contribution on settlement | `bets/` | — | `service.go` (call wallet.RecordWageringContribution) |
| C7 | Freebet-on-parlay: stake-return semantics | `freebets/` | — | `service.go` (add stake_return flag) |
| C8 | Connect freebets/oddsboosts to campaigns | `freebets/`, `oddsboosts/` | — | Both `service.go` (campaign_id integration) |

### Dependencies

```
C1 (migration) → C3 (per-leg settlement needs bet_legs table)
A3 (DrawdownDebit) → C4 (bonus-aware bet placement)
A6 (WageringContribution) → C6 (settlement calls wagering)
C2 (parlay rules) → C3 (settlement uses rules for reduced-leg threshold)
```

### Tests

- Parlay qualification unit tests (min legs, min odds, fixture uniqueness)
- Settlement tests: all edge-case matrix rows from doc 09
  - All legs won, one leg lost, void+won, push+won, all void, mix scenarios
  - Dead heat factor on parlay leg
- Bonus-aware placement tests (DrawdownDebit with real+bonus split)
- Cashout tests (always to real balance)
- Freebet on parlay (winnings-only vs stake-return)
- Integration test: place bonus-funded parlay → settle with void leg → verify wagering contribution

### Risk

| Risk | Likelihood | Mitigation |
|---|---|---|
| Reduced-leg odds calculation error | Medium | Comprehensive edge-case test matrix (12 scenarios) |
| Settlement race (bet settles while cashout in progress) | Low | Existing reservation system prevents double-settlement |
| Freebet refund on parlay void | Medium | Clear rules: void entire parlay → restore freebet; partial void → no restore |

---

## Phase D: Frontend Integration

**Goal:** Player-facing UI for bonuses, content, and enhanced parlays.

**Depends on Phases A-C** (backend endpoints must exist).

### Deliverables

| # | Task | Location | New Files | Changed Files |
|---|---|---|---|---|
| D1 | `bonus-client.ts` API client | `app/lib/api/` | `bonus-client.ts` | — |
| D2 | `content-client.ts` API client | `app/lib/api/` | `content-client.ts` | — |
| D3 | `WalletBreakdown` component | `app/components/` | `WalletBreakdown.tsx` | `CurrentBalance.tsx` (replace usage) |
| D4 | `WageringProgress` component | `app/components/` | `WageringProgress.tsx` | — |
| D5 | `BonusBadge` component | `app/components/` | `BonusBadge.tsx` | — |
| D6 | `BannerCarousel` component | `app/components/` | `BannerCarousel.tsx` | — |
| D7 | `ContentPage` component | `app/components/` | `ContentPage.tsx` | — |
| D8 | Update BetslipProvider (bonus eligibility) | `app/components/` | — | `BetslipProvider.tsx` |
| D9 | Update BetslipPanel (freebet selection, bonus info) | `app/components/` | — | `BetslipPanel.tsx` |
| D10 | Update bets page (bonus indicators, per-leg display) | `app/bets/` | — | `page.tsx` |
| D11 | Convert static pages to CMS-driven | `app/` | — | `about/`, `terms/`, `bonus-rules/`, etc. |
| D12 | `bonusSlice.ts` Redux slice | `app/lib/store/` | `bonusSlice.ts` | `index.ts` (register slice) |
| D13 | Bonus WebSocket handler | `app/lib/websocket/` | `bonus-channel-handler.ts` | `channels-map.ts` |
| D14 | i18n: bonus + content namespace files | `public/static/locales/` | `en/bonus.json`, `en/content.json`, `de/bonus.json`, `de/content.json` | `i18n/config.ts` (add namespaces) |

### Dependencies

```
D1, D2 (API clients) → D3-D10 (components call clients)
D12 (Redux slice) → D3, D8, D9 (components read bonus state)
D13 (WebSocket) → D3, D4 (real-time updates)
D14 (i18n) → all components (translation keys)
```

---

## Phase E: Polish + Launch Readiness

**Goal:** Background jobs, reconciliation, QA, edge case handling.

### Deliverables

| # | Task | Location |
|---|---|---|
| E1 | Start background job scheduler | `jobs/scheduler.go`, wire in `main.go` |
| E2 | Bonus expiry scanner (60s) | `bonus/service.go` + `jobs/scheduler.go` |
| E3 | Campaign auto-close (5min) | `bonus/service.go` + `jobs/scheduler.go` |
| E4 | Extended reconciliation (bonus drift detection) | `wallet/service.go` |
| E5 | Audit logging for all admin actions | `http/bonus_handlers.go`, `http/content_handlers.go` |
| E6 | Full QA pass with edge-case test matrix | All components |
| E7 | Load test: concurrent bonus claims + parlay settlements | Integration test |
| E8 | Documentation update: API reference, admin guide | `docs/` |

---

## Dependency Graph

```
     Phase A (Foundation)
       │           │
       │           └──────────────────┐
       │                              │
       ▼                              ▼
  Phase B (CMS + Campaigns)     Phase C (Parlay + Settlement)
       │                              │
       │                              │
       └──────────┬───────────────────┘
                  │
                  ▼
          Phase D (Frontend)
                  │
                  ▼
          Phase E (Polish)
```

**Parallelization:** Phases B and C can run in parallel after Phase A completes. Phase B (CMS) has zero dependency on Phase C (parlay), and vice versa. Only Phase D requires both to be complete.

---

## MVP Definition (What Launches First)

### MVP (Phases A + B + D subset):

- Wallet: `DrawdownDebit`, `ForfeitBonus`
- Bonus: Campaign CRUD, PlayerBonus state machine, basic wagering tracking (singles only)
- Content: Pages + banners (no blocks)
- Frontend: `WalletBreakdown`, active bonuses display, banner carousel
- Backoffice: Campaign admin, bonus admin, content admin
- **NOT included:** Parlay settlement rules, reduced-leg handling, parlay wagering multiplier

### Full Scope (All Phases):

Everything in MVP plus:
- Parlay qualification rules and settlement
- Reduced-leg handling (void/push)
- Parlay-specific wagering contribution (multiplier)
- Freebet-on-parlay with stake-return semantics
- Bonus-aware cashout
- Content blocks
- Background job scheduler
- Extended reconciliation

---

## Risk Items Per Phase

| Phase | Top Risk | Impact | Mitigation |
|---|---|---|---|
| A | DrawdownDebit correctness | Incorrect balance deductions | 100% test coverage on edge cases, SERIALIZABLE TX |
| B | CMS scope creep | Adding versioning/localization/preview delays launch | Strict scope: pages + banners only |
| C | Parlay settlement bugs | Incorrect payouts | 12-scenario edge-case test matrix, manual verification |
| D | Frontend state complexity | Bonus state sync issues | Dedicated Redux slice + WebSocket for real-time updates |
| E | Background job failures | Bonuses not expiring, campaigns not closing | slog alerting on errors, manual fallback via admin API |

---

## Effort Estimates

| Phase | Human Team | CC+gstack | Key Deliverables |
|---|---|---|---|
| A (Foundation) | ~2 weeks | ~4 hours | 11 tasks: wallet methods, bonus module, event bus |
| B (CMS + Campaigns) | ~1.5 weeks | ~3 hours | 7 tasks: content module, backoffice admin |
| C (Parlay + Settlement) | ~2 weeks | ~4 hours | 8 tasks: parlay rules, settlement, freebet |
| D (Frontend) | ~1.5 weeks | ~3 hours | 14 tasks: components, API clients, i18n |
| E (Polish) | ~1 week | ~2 hours | 8 tasks: jobs, reconciliation, QA |
| **Total** | **~8 weeks** | **~16 hours** | **48 tasks** |

---

## File Path References

1. `services/gateway/internal/wallet/service.go` — Phase A foundation
2. `services/gateway/internal/bets/service.go` — Phase C parlay settlement
3. `services/gateway/internal/bets/cashout.go` — Phase C bonus-aware cashout
4. `services/gateway/internal/freebets/service.go` — Phase C campaign integration
5. `services/gateway/internal/loyalty/service.go` — existing pattern for new bonus module
6. `services/gateway/cmd/gateway/main.go` — Phase A route registration, Phase E scheduler start
7. `services/gateway/migrations/` — Phases A, B, C migrations
8. `talon-backoffice/packages/app/app/components/BetslipProvider.tsx` — Phase D betslip extension
9. `talon-backoffice/packages/app/app/components/CurrentBalance.tsx` — Phase D replace with WalletBreakdown
10. `talon-backoffice/packages/office/app/(dashboard)/` — Phase B backoffice admin pages
11. `talon-backoffice/packages/app/app/lib/api/` — Phase D new API clients
12. `talon-backoffice/packages/app/public/static/locales/en/` — Phase D i18n files
