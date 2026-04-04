# PhoenixBotRevival Platform Audit

Date: 2026-03-02  
Location: `/Users/johnb/Desktop/PhoenixBotRevival`

## Executive Summary

This workspace contains multiple historical platforms. The two core operational systems are:

1. Phoenix Sportsbook (core betting platform)
2. Waysun/Stella (engagement, rewards, wallet, event/rule pipeline)

Talon is present as the sportsbook back office/admin platform.

Current day-to-day Phoenix work now lives under:

- `/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined`
- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep`

Historical source platforms remain under `/Users/johnb/Desktop/PhoenixBotRevival/libs` and `/Users/johnb/Desktop/PhoenixBotRevival/review` for extraction, reference, and follow-up classification.

Legacy infra tied to old company environments has been removed from this local workspace where safe.

## Platform Inventory

| Platform | Main Path | What It Does Today | Tech Stack / Language | Current Dependability Without Old Env |
|---|---|---|---|---|
| Phoenix Combined Apps | `/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined` | Current player frontend, Talon frontend, runtime scripts, combined app workspace | Node/Yarn monorepos, React/TS frontend, Go experimental modules | Active day-to-day workspace for current frontend and runtime QA |
| Phoenix Go Rebuild | `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep` | Current Go services, parity docs, demo scripts, backend execution plans | Go, Docker, shell tooling, docs | Active backend rebuild and parity workspace |
| Phoenix Sportsbook Source | `/Users/johnb/Desktop/PhoenixBotRevival/libs/phoenix-core` | Historical betting engine, market/wallet/punter flows, sportsbook backend/frontend source | Scala/Akka/SBT, Java, Python utilities, large TS/JS frontend code | Source is usable; some external feeds/auth/secrets are still needed for full feature parity |
| Talon Backoffice Source | `/Users/johnb/Desktop/PhoenixBotRevival/review/talon-backoffice` | Legacy admin and operational back office source retained for review | Node/Yarn monorepos, React/TS frontend, JS services | Usable as source; runtime still depends on env vars/datastores |
| Waysun/Stella Platform | `/Users/johnb/Desktop/PhoenixBotRevival/review/gmx-waysun` | Event ingestion/validation/aggregation/achievements, wallet, user context, virtual store, Stella frontend | Scala/Flink/Play/SBT, Java services, Python/Django services, Next.js/TS frontend | Substantial reusable core; production wiring relies on missing old env configuration |
| Infra/Bridge (local surviving) | `/Users/johnb/Desktop/PhoenixBotRevival/review/gmx-infrastructure` | Local infra bootstrap and bridge logic (Traefik, NiFi, NiFi REST) | Docker Compose, Python/FastAPI, Java support modules | Partially usable; some components require refactor away from old internal endpoints/package sources |
| SBTech Integration Modules | `/Users/johnb/Desktop/PhoenixBotRevival/review/sbtech-integration` | Feed adapters, rewards point ingestion/transforms, price pump utilities | Python, Java, TS | Mixed; logic reusable, production endpoints/auth must be replaced |
| Shared Service Libraries | `/Users/johnb/Desktop/PhoenixBotRevival/review/gmx-services` | Additional service modules and support capabilities | Scala, Java, Python | Reusable source; likely partial/legacy and env dependent |
| Shared Streaming Modules | `/Users/johnb/Desktop/PhoenixBotRevival/review/gmx-streaming` | Stream processing and internal model mapping jobs | Scala-heavy | Reusable source; requires modernized stream infra |
| Shared Data APIs | `/Users/johnb/Desktop/PhoenixBotRevival/review/gmx-data-apis` | Domain data APIs/models used by platform services | Scala, Java | Reusable source modules |

## Tech Stack Matrix (Current Snapshot)

Language/file counts by top-level platform (rough signal, not runtime guarantee):

| Folder | Scala | Java | Python | TS/JS |
|---|---:|---:|---:|---:|
| `gmx-data-apis` | 106 | 69 | 0 | 0 |
| `gmx-infrastructure` | 0 | 99 | 22 | 2 |
| `gmx-services` | 582 | 128 | 351 | 0 |
| `gmx-streaming` | 640 | 6 | 0 | 0 |
| `gmx-waysun` | 662 | 175 | 278 | 427 |
| `phoenix-core` | 1290 | 121 | 184 | 72341 |
| `sbtech-integration` | 0 | 38 | 58 | 41 |
| `talon-backoffice` | 0 | 0 | 1 | 2250 |

Notes:

- TS/JS counts include vendored and legacy frontend code where present.
- These counts are inventory indicators, not active deployment lists.

## Current "Today" Roles

### 1. Phoenix Sportsbook

- Primary sportsbook platform.
- Betting logic and bounded contexts are here.
- Local run path is documented and mapped in root `Makefile`:
  - `make sportsbook-deps-up`
  - `make sportsbook-run`

### 2. Talon Backoffice

- Operational/admin backoffice associated with sportsbook.
- Key run targets:
  - `make talon-backoffice-run`
  - `make talon-core-run`

### 3. Waysun/Stella

- Separate engagement/reward/event platform (not a Telegram/Discord bot, scraper, or arbitrage bot).
- Includes event ingestor, rule configurator, wallet, and event processing jobs.
- Key run targets:
  - `make waysun-rule-configurator-migrate`
  - `make waysun-rule-configurator-run`
  - `make waysun-wallet-migrate`
  - `make waysun-wallet-run`
  - `make waysun-event-ingestor-run`

### 4. Infra/Bridge

Kept for reuse:

- `gmx-traefik`: local infra bootstrap for Postgres/Redis/Kafka/Traefik.
- `gmx-nifi`: NiFi flow definitions and local NiFi/registry/Kafka compose.
- `gmx-nifi-rest`: bridge logic (token exchange, mapping, top-up publication) with hardcoded legacy dependencies needing refactor.

### 5. SBTech Integration

Kept modules:

- `SbTech-rollup`
- `sbt-price-pump`
- `sbtech-akka-prices-pump`
- `sbtech-data-consumer`
- `sbtech-rewards-point-calculator`

These are generally reusable as logic/components, but external endpoints/auth/config must be redefined.

## Removed During Cleanup (Legacy/Unreliable with Old Env Closed)

### Removed from `gmx-infrastructure`

- `dev-gmx-infra-orchestration`
- `gmx-infra-orchestration-dev`
- `prod-gmx-infra-orchestration`
- `gmx-infra-orchestration-backup`
- `luckydino-infrastructure`
- `luckydino-argocd`
- `gmx-kong`
- `gmx-api-gateway-nginx`
- `gmx-infrastructure-kubernetes`

### Removed from `sbtech-integration`

- `kong-sbtech-token-auth`
- `sbtech-widget-catalog-services`

## Workspace Control Layer (Added)

- Canonical workspace map: `/Users/johnb/Desktop/PhoenixBotRevival/docs/WORKSPACE.md`
- Compatibility workspace map: `/Users/johnb/Desktop/PhoenixBotRevival/WORKSPACE.md`
- Canonical service catalog: `/Users/johnb/Desktop/PhoenixBotRevival/configs/workspace/services.yaml`
- Compatibility service catalog: `/Users/johnb/Desktop/PhoenixBotRevival/workspace/services.yaml`
- Canonical command file: `/Users/johnb/Desktop/PhoenixBotRevival/scripts/Makefile`
- Compatibility command entrypoint: `/Users/johnb/Desktop/PhoenixBotRevival/Makefile`

## Phase 4 Gap Mapping (2026-03-07)

A competitive readiness audit identified 55 capability gaps across 13 dimensions (front-end, back-end, admin/CMS, sportsbook ops, payments/wallet, market management, real-time/live, retention/engagement, compliance/risk, support/ops, analytics/personalization, settlement/auditability, social/competitive). Each gap was mapped against 118 repositories from the Phase 4 codebase (15 platform groups) to determine reuse potential.

### Strategy Rethink (2026-03-07) — Superseded

The original strategy rethink recommended a hybrid approach: deploy 2 platforms (Stella + Strapi), use 3rd party SaaS for 10 gaps, and extract logic for the rest (~107.5 engineer-weeks + $137-300K/yr SaaS). See `Phoenix_Strategy_Rethink.docx` for the original analysis.

### AI-First Resurrection (2026-03-07) — Superseded by Definitive Architecture Plan

The strategy rethink was superseded by an AI-First Resurrection approach that eliminates almost all SaaS dependency. Instead of paying $137-300K/yr for commodity SaaS (Customer.io, PostHog, Zendesk, etc.), business logic from Phase 4 platforms is LLM-ported (via Claude/Codex) into Phoenix's backend stack.

**Key principles:**

1. **LLM-Accelerated Synthetic Porting** — Use Claude/Codex to translate Node.js, Python, and Java business logic into backend services and Next.js components
2. **Deploy + AI-Refactor Stella** — Stella retained as a microservice within the new architecture; use AI tools to modernize patterns and align Kafka schemas
3. **Compliance-First Documentation** — For DGE-regulated modules (AML, State Compliance), LLM generates Logic Mapping documents alongside code showing regulators how old approved logic maps to new code

### Revised Gap Disposition (AI-First)

| Disposition | Count | Description |
|---|---:|---|
| LLM Port to Go | 20 | Translate Node/Python/Java logic into Go microservices via Claude/Codex |
| Deploy + AI Refactor | 5 | Stella/Waysun: deploy and modernize with AI-assisted refactoring |
| Extract Directly | 4 | SBTech Akka code imports directly into Phoenix |
| Deploy As-Is | 1 | Strapi CMS standalone deployment |
| Algorithm Extraction | 1 | Flip leaderboard algorithm only |
| Expand Existing | 6 | Partial coverage exists, needs significant extension |
| Build New | 17 | Greenfield build required |
| Defer | 1 | Play+ prepaid card — defer until user base justifies |
| **Total** | **55** | **~85 engineer-weeks, ~34-week timeline** |

### Platform-by-Platform (AI-First)

| Platform | Approach | Gaps | Effort | SaaS Eliminated |
|---|---|---:|---|---|
| GSTech (Node.js) | LLM Port to Go | 15 | 30-40 wks | $45-175K/yr |
| Stella/Waysun (Scala) | Deploy + AI Refactor | 5 | 12-16 wks | $0 |
| RMX (Python/Django) | LLM Port to Go | 2 | 5-7 wks | $2-12K/yr |
| SBTech (Akka) | Extract + LLM Port | 3 | 14-18 wks | $0 |
| Cloud Infra (K8s) | Extract + Self-Host | 2 | 4-6 wks | $0-20K/yr |
| Strapi CMS | Deploy As-Is | 1 | 2-3 wks | $0 |
| Argyll Video (Flask/Java) | LLM Port orchestration | 1 | 4-6 wks | $0 |
| Flip (Java/Storm) | Algorithm Extraction | 1 | 1-2 wks | $0 |

### Cost Impact

| Metric | Hybrid (Doc 3) | AI-First (Doc 4) | Delta |
|---|---|---|---|
| Engineer-Weeks | 107.5 wks | ~85 wks | -22.5 wks |
| Annual SaaS Cost | $137-300K/yr | $5-25K/yr (video only) | -$132-275K/yr |
| SaaS Eliminated | — | $45-207K/yr | — |
| Platforms to Operate | 2 (Stella + Strapi) | 2 (Stella + Strapi) | Same |
| Tech Stacks | 1.5 (Scala + Strapi) | 1.5 (Go + Strapi) | Go replaces Scala |

### Deliverables

| Document | Date | Description |
|---|---|---|
| `Phoenix_Competitive_Readiness_Audit.docx` | 2026-03-02 | CPO-level competitive readiness audit across 13 dimensions |
| `Phoenix_Phase4_Gap_Mapping.docx` | 2026-03-02 | Gap-by-gap mapping of 55 audit gaps against 118 Phase 4 repositories |
| `Phoenix_Strategy_Rethink.docx` | 2026-03-02 | Build vs. buy analysis (superseded by AI-First Resurrection) |
| `Phoenix_AI_First_Resurrection.docx` | 2026-03-07 | AI-First Resurrection strategy: LLM-accelerated porting with compliance documentation |
| `Phoenix_Strategy_Alignment.docx` | 2026-03-07 | Strategy alignment analysis: overlaps and divergences between AI-First Resurrection and external code-archaeology-to-replatform review |
| `Phoenix_Definitive_Architecture_Plan.docx` | 2026-03-07 | Definitive architecture plan: Go microservices, 7 directives, revised porting methodology, 36-week timeline, Codex-ready execution framework |
| `Phoenix_Codex_Instructions.docx` | 2026-03-07 | Codex-ready agent instructions: mission brief, governing directives, 14 target microservices, source code locations, 15 translation patterns, 6-step porting pipeline, 10-phase build order, compliance documentation, service-by-service quick reference |
| Codex Prep Package | 2026-03-07 | Extracted business logic, Go scaffolds, infrastructure, and service contracts for Phase 4 microservices rebuild |

### Strategy Alignment Analysis (2026-03-07) — External Review Reconciliation

Document 4 (AI-First Resurrection) was compared against an independent strategic review that proposed a "code-archaeology-to-replatform" approach. The alignment analysis identified 10 areas of agreement and 7 divergences, producing a merged strategy recommendation.

**Areas of Agreement (10):**
LLM-accelerated porting methodology, GSTech as source material (not deployment), RMX absorption over SaaS, SBTech Akka code extraction, SGP/liability/exchange as greenfield builds, live chat/support as external buy, Go as primary backend language, compliance documentation generation, Phase 4 as source code not deployment targets, bot-first prediction market architecture.

**Key Divergences Resolved:**

| Area | Severity | Resolution |
|---|---|---|
| Stella Deploy vs Absorb | MAJOR | Hybrid: temporary deploy (Months 1-6), then absorb with hard Month-12 sunset |
| Strapi Permanent vs Temporary | MODERATE | Deploy with 12-month sunset, migrate to Phoenix CMS |
| Observability Self-Host vs Buy | MODERATE | Self-host initially, re-evaluate at Month 6 |
| Customer Support Port vs Buy | MODERATE | Buy at launch, re-evaluate at Month 9 |
| Go as Primary Language | RESOLVED | Go adopted as primary backend language per Directive 5 |
| A/B Testing Port vs Buy | MINOR | Buy initially, port later |
| Synthetic Porting vs Code Archaeology | PHILOSOPHICAL | Use both — let code quality dictate approach per module |

**Timeline Impact:** Merged strategy shifts ~8 weeks of Stella work from near-term to deferred absorption, adding ~4-6 weeks of near-term migration prep but removing permanent operational overhead. Net near-term: ~77-83 engineer-weeks (vs ~85 in Doc 4).

See `Phoenix_Strategy_Alignment.docx` for the full analysis including tradeoff tables, merged strategy matrix, and open questions.

### Definitive Architecture Plan (2026-03-07)

The Strategy Alignment analysis and user's 7 strategic directives were consolidated into a definitive architecture plan (Document 6). This supersedes all prior strategy documents as the execution blueprint.

**7 Directives:**

1. Full microservices architecture — keep Stella as a microservice (not absorbed)
2. Free community Strapi with 6-month sunset goal
3. Observability → buy externally ($0-400/mo)
4. Customer support → buy externally ($50-300/mo)
5. **Go as THE backend language — no exceptions** — replaces Scala/Akka, Python/Django, Java, Node.js across ALL services including Stella engagement
6. A/B Testing → port or use free tier ($0/mo)
7. Use both synthetic porting and code archaeology per module

**Target Architecture: 14 Go Microservices**

| Service | Responsibility |
|---|---|
| phoenix-gateway | API gateway, auth, rate limiting |
| phoenix-market-engine | Market creation, odds, pricing |
| phoenix-betting-engine | Bet placement, settlement, risk |
| phoenix-wallet | Deposits, withdrawals, balances |
| phoenix-user | Registration, KYC, profiles |
| phoenix-events | Event catalog, scheduling, results |
| phoenix-retention | Promotions, bonuses, loyalty |
| phoenix-compliance | AML, responsible gaming, state rules |
| phoenix-analytics | Tracking, reporting, dashboards |
| phoenix-settlement | Bet settlement, reconciliation, audit |
| phoenix-social | Leaderboards, social features |
| phoenix-notification | Email, push, SMS, in-app |
| phoenix-cms | Content management (replaces Strapi) |
| stella-engagement | Event processing, achievements, rewards (Go + Kafka + Redis) |

**Porting Methodology:** 15 translation patterns (Express → Go HTTP, Mongoose → sqlx/pgx, Akka Actors → goroutines+channels, etc.) with a 6-step pipeline: Extract → Specify → Translate → Test → Integrate → Document.

**Timeline:** 36 weeks across 10 phases, ~138-188 engineer-weeks total. Phases run from Foundation (Weeks 1-4) through Launch Readiness (Weeks 33-36).

**Cost Impact vs Prior Documents:**

| Metric | Doc 3 (Hybrid) | Doc 4 (AI-First) | Doc 6 (Definitive) |
|---|---|---|---|
| Engineer-Weeks | 107.5 | ~85 | ~138-188 |
| Annual SaaS | $137-300K/yr | $5-25K/yr | $0.6-8.4K/yr |
| Backend Language | Scala | Scala | Go |

See `Phoenix_Definitive_Architecture_Plan.docx` for the complete plan including microservices decomposition, translation patterns, phase-by-phase timeline, and Codex-ready execution framework.

## Codex Prep Package (2026-03-07)

While the Codex agent was offline, Claude CLI performed extensive prep work on the Phase 4 legacy repositories to accelerate the Go microservices rebuild. All artifacts are saved in `codex-prep/` within this workspace.

**Extraction Artifacts (171KB analyzed business logic):**
- `CODEX_PREP_MANIFEST.md` — Master mapping of 118 Phase 4 repos → 14 target Go microservices
- `stella_extraction.md` — 13 Scala/Flink repos: 120+ API endpoints, 50+ domain models, Kafka topics
- `stella_translation_quick_ref.md` — Side-by-side Scala→Go translation patterns
- `rmx_wallet_extraction.md` — 11 Python repos: 100+ REST endpoints, 50+ Django ORM models
- `storm_gstech_extraction.md` — Java Storm topologies, GSTech Node.js routes, game provider interfaces

**Go Scaffolds (4 priority microservices):**
- `phoenix-gateway/` — API gateway with chi router, auth middleware, rate limiting (port 8080)
- `phoenix-user/` — User management with pgx, JWT, bcrypt, KYC workflow (port 8001)
- `phoenix-wallet/` — Wallet with decimal-precise transactions, Kafka event publishing (port 8002)
- `phoenix-market-engine/` — Markets, odds, settlement with Kafka streaming (port 8003)

**Infrastructure:**
- `docker-compose.yml` — Local dev stack: PostgreSQL 16, Kafka (KRaft), Redis 7, Kafka UI
- `phoenix-common/` — Shared Go library: models, Kafka helpers, middleware, errors, config
- `migrations/` — 9 PostgreSQL migration files covering all core tables

**Service Contracts:**
- `SERVICE_CONTRACTS.md` — REST API contracts for all 14 microservices with inter-service call graph
- `KAFKA_TOPIC_REGISTRY.md` — 21 Kafka topics with schemas, producers, consumers

## Practical Takeaway

Even with old environments closed, this codebase still contains:

1. A viable sportsbook core (Phoenix)
2. A viable backoffice codebase (Talon)
3. A substantial reusable event/rewards platform (Waysun/Stella)
4. Reusable local infra and integration logic, with targeted refactor required around old endpoints, secrets, and package registries
5. Definitive strategy: LLM-port Phase 4 business logic into Go microservices, deploy Stella as a microservice + temporary Strapi, eliminate ~$132-275K/yr in SaaS costs, complete in ~138-188 engineer-weeks across a 36-week timeline
