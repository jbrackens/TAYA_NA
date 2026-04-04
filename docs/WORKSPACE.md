# PhoenixBotRevival — Go Sportsbook Rebuild

This is the root index for the Phoenix Go sportsbook rebuild workspace.

Last updated: 2026-04-02

## Mission

Rewrite the legacy Phoenix sportsbook (Scala/Python/Java/Node) as Go microservices. Deliver a private investor demo running the real Go backend, the real player frontend, and the real Talon backoffice with zero legacy dependency.

## Directory Map

| Path | Purpose | Status |
|---|---|---|
| `apps/Phoenix-Sportsbook-Combined/` | Player frontend, Talon backoffice, Scala backend (reference), scripts | ACTIVE |
| `services/codex-prep/` | All Go microservices, migrations, docker-compose, demo scripts, parity docs | ACTIVE |
| `libs/phoenix-core/` | Historical sportsbook repos retained for extraction and Go parity reference | REFERENCE |
| `review/gmx-infrastructure/` | NiFi bridge, Traefik, token exchange — kept for infra patterns | REFERENCE |
| `review/gmx-streaming/` | Kafka streaming modules — kept for event/streaming patterns | REFERENCE |
| `docs/` | Architecture plan, Codex instructions, platform audit, gap mapping | ACTIVE |
| `configs/workspace/` | Service registry (services.yaml) | ACTIVE |
| `archive/` | Prediction platform v2 materials, legacy review repos, superseded strategy docs, session history | ARCHIVED |

## Active Frontends

| App | Path | Stack |
|---|---|---|
| Player frontend | `apps/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg/` | TypeScript/React, migrated to Go API |
| Talon backoffice | `apps/Phoenix-Sportsbook-Combined/talon-backoffice/` | React/Next.js, partially migrated to Go API |

## Go Backend Services (services/codex-prep/)

| Service | Port | Domain |
|---|---|---|
| phoenix-gateway | 8080 | API gateway, auth, routing, rate limiting |
| phoenix-user | 8001 | Users, auth, KYC, MFA, sessions, profiles |
| phoenix-wallet | 8002 | Wallets, transactions, deposits, withdrawals, provider orchestration |
| phoenix-market-engine | 8003 | Market creation, odds, pricing, lifecycle |
| phoenix-betting-engine | 8004 | Bet placement, parlays, cashout, settlement |
| phoenix-events | 8005 | Event catalog, sports data, fixtures |
| phoenix-retention | 8006 | Promotions, bonuses, free bets, loyalty |
| phoenix-social | 8007 | Leaderboards, profiles, feeds |
| phoenix-compliance | 8008 | Responsible gaming, AML, GeoComply, limits |
| phoenix-analytics | 8009 | Reporting, dashboards, risk analytics, provider ops |
| phoenix-settlement | 8010 | Batch settlement, payout reconciliation |
| phoenix-notification | 8011 | Email, push, SMS dispatch |
| phoenix-cms | 8012 | Content management, brand content |
| stella-engagement | 8013 | Achievements, engagement scoring (Go/Kafka) |
| phoenix-audit | 8015 | Audit logs, CSV export |
| phoenix-support-notes | 8016 | Operator notes, user timeline |
| phoenix-config | 8017 | Terms admin, config management |
| phoenix-realtime | 8018 | WebSocket fanout (market/fixture/bet/wallet) |
| phoenix-common | — | Shared library (models, middleware, utilities) |
| phoenix-demo-web | — | Static demo UI (reference only) |

## Key Documents

| Document | Location | Purpose |
|---|---|---|
| CURRENT_STATUS.md | `services/codex-prep/` | Where the rebuild stands right now and what's next |
| IMPLEMENTATION_STATUS.md | `services/codex-prep/` | Detailed per-service delivery status |
| INVESTOR_DEMO_READINESS_BOARD.md | `services/codex-prep/` | Wave-by-wave investor demo progress |
| SERVICE_CONTRACTS.md | `services/codex-prep/` | REST and Kafka API contracts |
| BACKEND_PARITY_EXECUTION_PLAN.md | `services/codex-prep/` | Scala-to-Go parity closing plan |
| KAFKA_TOPIC_REGISTRY.md | `services/codex-prep/` | 21 Kafka event topics |
| Phoenix_Definitive_Architecture_Plan.docx | `docs/` | Canonical architecture: 7 directives, Go-only, 36-week timeline |
| Phoenix_Codex_Instructions.docx | `docs/` | Codex execution framework for AI-assisted porting |

## Archived Materials

All prediction platform v2 work, superseded strategy docs, legacy review repos, and historical session handoffs have been moved to `archive/`. Nothing was deleted. Subdirectories:

| Archive | Contents |
|---|---|
| `archive/v2-prediction/` | North Star, prediction strategy/execution docs, pivot ADRs, phoenix-prediction service, extraction docs |
| `archive/legacy-review/` | idefix-backoffice, gmx-waysun, gmx-services, sbtech-integration, gmx-data-apis |
| `archive/strategy-superseded/` | Strategy Rethink, AI-First Resurrection, Strategy Alignment, Competitive Readiness Audit |
| `archive/session-history/` | Session handoffs, overnight work logs, M3 assessment docs, Target B docs |
| `archive/stale-runtime/` | Old backend-live-session.log (791 MB), stale PID files |
