# 11 — Risks and Deviations from EEG Legacy

**Date:** 2026-04-16

---

## What We Are NOT Copying from EEG (and Why)

### 1. Strapi CMS Platform

**EEG approach:** Deploy `idefix-strapi-cms` with 15 content types, versioning plugin, DeepL auto-translation, S3 media, Azure AD editor auth.

**Our approach:** Lean content module inside the gateway with 3 content types (pages, banners, content blocks), PostgreSQL persistence, URL-based media references.

**Why deviate:**
- TAYA_NA is a single-brand sportsbook, not a 7-brand platform like EEG
- Sportsbook CMS scope is narrow: promotions, banners, rules pages, FAQs
- Strapi adds a separate Node.js runtime, PostgreSQL instance, S3 bucket, and admin UI to maintain
- The gateway already has PostgreSQL, admin handlers, and auth — reuse these
- Content versioning, DeepL translation, and dynamic zones are not MVP requirements
- If CMS needs grow beyond the lean module, Strapi or a headless CMS can be adopted later with clean migration (content_pages table → Strapi import)

### 2. Four-Service Bonus Architecture (gstech quartet)

**EEG approach:** `gstech-campaignserver` + `gstech-rewardserver` + `gstech-backend` (bonus module) + `gstech-walletserver` — four services communicating via Kafka.

**Our approach:** Single `bonus/` package inside the gateway with Campaign + PlayerBonus + WageringProgress entities.

**Why deviate:**
- The gstech quartet was designed for 7+ brands with shared infrastructure
- TAYA_NA is one brand — the service isolation overhead (Kafka, service discovery, distributed transactions) provides no benefit
- The bonus concepts are the same (campaign → eligibility → grant → wagering → completion/expiry), just consolidated into one package
- The gateway wallet already has `bonus_balance_cents` and `CreditBonus()` — extending it is simpler than building a separate wallet service
- Extraction to microservices is possible later — the package has its own models, repository, and service layer

### 3. Kafka Event Bus

**EEG approach:** Kafka as the backbone for all inter-service communication. Outbox pattern in every service.

**Our approach:** In-process event bus (Go channels/callbacks) + WebSocket for client push.

**Why deviate:**
- Single gateway instance — no distributed messaging needed
- Adding Kafka requires ZooKeeper/KRaft, broker management, monitoring, topic configuration
- Current volume (single-brand, early launch) doesn't justify the infrastructure
- In-process bus is sufficient and orders of magnitude simpler
- Extraction point: swap bus implementation to Kafka producer/consumer when horizontal scaling is needed

### 4. Multi-Brand Content and Configuration

**EEG approach:** `brandserver-backend` with per-brand lobbies, banners, navigation, localization across 7 brands.

**Our approach:** Single-brand content. No brand abstraction layer.

**Why deviate:**
- TAYA_NA serves one brand in one market
- Brand abstraction adds complexity to every query (WHERE brand_id = X)
- If multi-brand is needed later, it's an additive change (add brand_id column + filter)

### 5. Waysun/Stella Gamification Engine

**EEG approach:** Flink stream processing + Akka event-sourced wallet + generic rules engine.

**Our approach:** Existing loyalty service with simple point accrual + tier progression.

**Why deviate:**
- Waysun is a generic gamification platform, not a sportsbook bonus engine
- It doesn't model deposit match, wagering multipliers, or bonus-money segregation
- The existing loyalty service is sufficient for points/tiers
- If a gamification layer is needed later, it can be added on top of the bonus engine

---

## Service Sprawl Risk Assessment

**Current gateway package count:** 12 internal packages
**Proposed addition:** 3 new packages (content, bonus, events/jobs)
**Total:** 15 packages

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Gateway binary too large | Low | Low | Go compiles to single binary efficiently; 15 packages is normal |
| Startup time increase | Low | Low | New packages add DB queries (schema ensure, campaign load); <1s impact |
| Memory pressure | Medium | Medium | Bonus state + content cache in memory; mitigated by DB-backed storage |
| Development complexity | Medium | Medium | Clear package boundaries; each package is independently testable |
| Single point of failure | Medium | High | If gateway crashes, everything is down; same risk as today |
| Testing complexity | Low | Low | Each package has unit tests; integration tests via HTTP handlers |

**Gateway size benchmark:** The gateway is already a substantial monolith (wallet, bets, loyalty, compliance, payments, provider, WebSocket, leaderboards). Adding 3 more packages is incremental, not transformational.

**Extraction triggers — when to split:**
1. When a single package's request volume justifies independent scaling
2. When a team needs to deploy a component independently
3. When a package's data model needs a separate database
4. When adding horizontal gateway instances and in-process event bus is insufficient

---

## Wallet Changes — Invasiveness Assessment

| Change | Invasiveness | Why It's Safe |
|---|---|---|
| Add `DebitBonus()` | Low | Symmetric to existing `CreditBonus()`, same transaction pattern |
| Add `DrawdownDebit()` | Medium | New method, but operates on existing columns; no schema change |
| Add `ConvertBonusToReal()` | Low | Calls existing `DebitBonus()` + `Credit()` in one transaction |
| Add `ForfeitBonus()` | Low | Calls existing `DebitBonus()` with reason |
| Add `RecordWageringContribution()` | Low | Writes to new table, reads existing `player_bonuses` |
| Extend reconciliation scanner | Low | Additive checks, no change to existing reconciliation |

**What we are NOT changing in the wallet:**
- `Credit()` / `Debit()` / `Balance()` — unchanged, operate on real balance only
- `applyMutationDB()` / `applyMutationTx()` — unchanged core logic
- `Hold()` / `Capture()` / `Release()` — unchanged reservation system
- Ledger schema — unchanged (fund_type column already supports 'bonus')
- Idempotency mechanism — unchanged
- Metrics — extended with new counters, no removals

---

## Parlay Rules — MVP Simplifications

### What we simplify at launch vs full scope:

| Feature | MVP | Full Scope |
|---|---|---|
| Same-game parlays | Blocked (MaxSameFixture = 1) | Supported with correlation modeling |
| System bets | Not supported | Combinations (Trixie, Yankee, etc.) |
| Parlay chains (live add) | Not supported | Add legs to placed parlay |
| Correlated leg detection | Fixture uniqueness check only | Statistical correlation engine |
| Odds boost on parlays | Single-leg boost only | Full parlay boost promotion |
| Partial cashout | Full cashout only | Per-leg or percentage cashout |

**Why these simplifications are safe:**
- Same-game parlays require correlation modeling (complex, error-prone, abuse-friendly)
- System bets add combinatorial complexity to settlement
- Parlay chains require live-parlay state management
- All of these can be added incrementally without architectural changes

---

## Minimum Viable Implementation Path

```
Minimum for launch:
  1. Wallet: DebitBonus + DrawdownDebit + ForfeitBonus
  2. Bonus: Campaign CRUD + PlayerBonus state machine + basic wagering tracking
  3. Content: Pages + banners (no blocks)
  4. Parlay: Qualification rules + reduced-leg settlement
  5. Frontend: Wallet breakdown + active bonuses display

Can defer without blocking launch:
  - Content blocks (pages work with flat content field)
  - Bonus-to-real conversion (can be manual admin action initially)
  - Campaign scheduling (admin activates manually)
  - Wagering contribution for parlays (track for singles first)
  - Odds boost interaction with bonus qualification
  - Parlay boost promotions
```

---

## Recommended Tradeoffs

| Tradeoff | Decision | Reversibility |
|---|---|---|
| In-process events vs Kafka | In-process | HIGH — swap bus implementation |
| Single bonus module vs microservices | Single module | HIGH — extract package to service |
| Lean CMS vs Strapi | Lean CMS | MEDIUM — migration to Strapi possible |
| DB-backed bonus vs in-memory | DB-backed | N/A — must be DB for production |
| Real-first drawdown vs configurable | Real-first default, configurable | HIGH — flag in campaign rules |
| Winnings to real vs split | Always to real | HIGH — rule change |

All major decisions are reversible with reasonable effort. The plan optimizes for smallest blast radius first, with clean extraction points defined for every component.

---

## File Path References

1. `services/gateway/internal/wallet/service.go` — wallet package being extended (not rebuilt)
2. `services/gateway/internal/freebets/service.go` — existing freebet pattern (not replaced)
3. `services/gateway/internal/oddsboosts/service.go` — existing odds boost pattern (not replaced)
4. `services/gateway/internal/loyalty/service.go` — existing loyalty (not replaced, extended)
5. `services/gateway/cmd/gateway/main.go` — service initialization (new packages registered here)
6. `services/codex-prep/` — disconnected services (not integrated, domain logic referenced only)
7. `docs/legacy-analysis/EEG_LEGACY_CMS_BONUS_RECONSTRUCTION.md` — EEG analysis being deviated from
8. `modules/platform/canonical/v1/types.go` — entity types (extended, not replaced)
9. `services/gateway/internal/ws/handler.go` — WebSocket (extended, not replaced)
10. `services/gateway/internal/bets/service.go` — bet service (extended for parlay settlement)
