# Codex Agent Prompt — Phoenix Platform Rebuild

> Copy everything below this line and paste into Codex.

---

You are building the Phoenix Platform — a bot-first prediction market exchange. The entire backend is being rebuilt in Go microservices. Extensive prep work has already been completed: business logic has been extracted from 118 legacy repos, Go scaffolds are built, shared libraries exist, PostgreSQL migrations are ready, and infrastructure is configured.

## Entry Points (read these first)

1. `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/README.md` — Master index of everything in the prep package
2. `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/CODEX_PREP_MANIFEST.md` — Maps all 118 legacy repos to 14 target Go microservices
3. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix_Codex_Instructions.docx` — Full strategic plan with phased timeline

## What's Already Built (in codex-prep/)

- **Business logic extractions** (171KB): Pre-analyzed endpoints, models, Kafka topics, and auth patterns from legacy Scala, Python, Java, and Node.js code:
  - `stella_extraction.md` — 13 Scala repos: 120+ API endpoints, 50+ domain models, 10+ Kafka topics
  - `stella_translation_quick_ref.md` — Side-by-side Scala→Go code patterns
  - `rmx_wallet_extraction.md` — 11 Python repos: 100+ REST endpoints, 50+ Django ORM models
  - `storm_gstech_extraction.md` — Java Storm topologies, Node.js routes, game provider interfaces

- **Go scaffolds** for 4 priority services (phoenix-gateway, phoenix-user, phoenix-wallet, phoenix-market-engine) — each with cmd/server/main.go, handlers, services, repositories, models, middleware, Dockerfile, Makefile

- **Shared Go library** (`phoenix-common/`): Domain models, Kafka producer/consumer, JWT auth middleware, error types, health checks, config — import as `github.com/philcali-phoenix/phoenix-common`

- **PostgreSQL migrations** (`migrations/`): 10 SQL files creating 18+ tables, 16 enum types, 50+ indexes, plus a full event sourcing schema (event_store, event_snapshots, event_outbox)

- **Docker Compose**: PostgreSQL 16, Kafka (KRaft mode), Redis 7, Kafka UI — `docker-compose up -d`

- **Service contracts**: `SERVICE_CONTRACTS.md` — REST API specs for all 14 services

- **Kafka topic registry**: `KAFKA_TOPIC_REGISTRY.md` — 21 topics with schemas, producers, consumers

## Legacy Source Code

All Phase 4 repos: `/Users/johnb/Desktop/Phase 4/`
15 groups: Stella (Scala), RMX (Python), ggCircuit (TypeScript), GSTech (Node.js), Storm (Java), EGL (PHP), etc.

## Architecture — Non-Negotiable Constraints

1. **ALL backend services in Go. No exceptions.** This includes Stella engagement — Flink streaming is replaced with Go Kafka consumers + goroutine pipelines + Redis.
2. **PostgreSQL-backed event sourcing** for all stateful/financial services (replaces Akka Persistence). See `migrations/010_create_event_store.sql` — append-only events table, snapshots, transactional outbox.
3. **Chi v5** for HTTP routing (not Gin, not Echo)
4. **pgx** for PostgreSQL (not GORM, not sqlx)
5. **confluent-kafka-go** for Kafka
6. **go-redis** for caching
7. **slog** for structured logging
8. **shopspring/decimal** for ALL financial calculations
9. **Interface-based repository pattern** — every service follows handler → service → repository layers
10. **Table-driven tests** for all business logic

## 14 Target Microservices

| Service | Port | Purpose |
|---------|------|---------|
| phoenix-gateway | 8080 | API gateway, auth, rate limiting, reverse proxy |
| phoenix-user | 8001 | User management, auth, OIDC, KYC |
| phoenix-wallet | 8002 | Wallet, transactions, deposits, referrals |
| phoenix-market-engine | 8003 | Markets, odds, lifecycle management |
| phoenix-betting-engine | 8004 | Bets, validation, cashout, parlays |
| phoenix-events | 8005 | External data feeds, sports, live scores |
| phoenix-retention | 8006 | Achievements, leaderboards, gamification |
| phoenix-social | 8007 | Profiles, following, feeds, chat |
| phoenix-compliance | 8008 | Responsible gaming, self-exclusion, AML |
| phoenix-analytics | 8009 | Event tracking, dashboards, reporting |
| phoenix-settlement | 8010 | Batch settlement, payout calculations |
| phoenix-notification | 8011 | Email, push, SMS dispatch |
| phoenix-cms | 8012 | Content management, promotions |
| stella-engagement | 8013 | Real-time engagement engine (Go + Kafka + Redis) |

## Build Order

- **Phase 1 (Weeks 1-4)**: phoenix-gateway — scaffold exists, flesh it out
- **Phase 2 (Weeks 5-12)**: phoenix-user + phoenix-wallet — scaffolds exist
- **Phase 3 (Weeks 13-20)**: phoenix-market-engine + phoenix-betting-engine — market-engine scaffold exists
- **Phase 4 (Weeks 21-28)**: phoenix-events + phoenix-retention + phoenix-social
- **Phase 5 (Weeks 29-36)**: remaining services including stella-engagement

## 6-Step Porting Pipeline

For each piece of business logic:
1. **Extract** — Find the logic in the extraction docs (stella_extraction.md, rmx_wallet_extraction.md, etc.)
2. **Specify** — Write Go interface/contract
3. **Translate** — Port to Go using patterns from stella_translation_quick_ref.md
4. **Test** — Write table-driven tests
5. **Integrate** — Wire into handler → service → repository chain
6. **Document** — Update the service README

## Your First Task

Start with Phase 1: implement phoenix-gateway. The scaffold exists at `codex-prep/phoenix-gateway/`. Read `stella_extraction.md` for auth patterns and `SERVICE_CONTRACTS.md` for the gateway's API contract. Implement the full gateway with chi router, JWT validation, rate limiting, and reverse proxy routing to downstream services.

When complete, move to Phase 2 (phoenix-user and phoenix-wallet).

## Output Location

All work goes to: `/Users/johnb/Desktop/PhoenixBotRevival/`
