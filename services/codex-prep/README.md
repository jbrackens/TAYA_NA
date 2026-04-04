# Codex Prep Package — Phoenix Platform Rebuild

**Generated**: 2026-03-10
**Purpose**: Pre-extracted business logic, repo mappings, and Go scaffolds to accelerate Codex agent work on the Phoenix microservices rebuild.

Current delivery status: see [IMPLEMENTATION_STATUS.md](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/IMPLEMENTATION_STATUS.md).
Canonical investor-demo board: see [INVESTOR_DEMO_READINESS_BOARD.md](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/INVESTOR_DEMO_READINESS_BOARD.md).
Current restart/handoff state: see [SESSION_HANDOFF_2026-03-13.md](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/SESSION_HANDOFF_2026-03-13.md).
Investor-demo runbook: see [investor-demo-setup.md](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/investor-demo-setup.md).
CRM/loyalty audit: see [CRM_LOYALTY_GAP_ANALYSIS.md](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/CRM_LOYALTY_GAP_ANALYSIS.md).
Old-vs-new backend parity audit: see [OLD_VS_NEW_BACKEND_GAP_ANALYSIS.md](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/OLD_VS_NEW_BACKEND_GAP_ANALYSIS.md).
Backend parity execution plan: see [BACKEND_PARITY_EXECUTION_PLAN.md](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/BACKEND_PARITY_EXECUTION_PLAN.md).
Frontend migration execution plan: see [FRONTEND_GO_MIGRATION_PLAN.md](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/FRONTEND_GO_MIGRATION_PLAN.md).
Staging rehearsal blocker record: see [staging-rehearsal-status-2026-03-10.md](/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/staging-rehearsal-status-2026-03-10.md).
Current verified state:
- all 14 target services implemented in Go
- dedicated runtime service `phoenix-realtime` implemented for investor-demo websocket fanout
- parity expansion service `phoenix-prediction` implemented in Go
- parity expansion service `phoenix-audit` implemented in Go
- parity expansion service `phoenix-support-notes` implemented in Go
- unified operator user timeline now exposed through `phoenix-support-notes`
- operator timeline now supports server-side filters and CSV export
- parity expansion service `phoenix-config` implemented in Go
- initial Go admin plane implemented for users, bets, markets, prediction ops, audit-log query, and support notes
- regulated account/session parity now includes MFA verification, password lifecycle, and account deletion flows in Go
- responsible-gaming parity now includes legacy limits and RG history aliases in Go
- retention promo parity now includes free bets and odds boosts in Go
- stats-centre parity now includes `GET /api/v1/stats/fixtures/{fixtureID}` in `phoenix-events`
- match-tracker parity now includes `GET /api/v1/match-tracker/fixtures/{fixtureID}` in `phoenix-events`
- regulated account/session and MFA verification parity implemented in `phoenix-user`
- dedicated profile email parity implemented in `phoenix-user` via `PUT /profile/email`
- KBA / IDPV depth in `phoenix-user` now uses a provider-backed adapter seam with persisted provider references for the legacy registration flows
- `phoenix-user` now also exposes admin verification-session history and provider-event history, plus provider-style status updates for IdComply-compatible sessions
- `phoenix-user` now also exposes direct admin verification-session detail reads for support and compliance review tooling
- `phoenix-user` now also exposes direct admin verification-session lookup by provider reference for provider-driven support workflows
- `phoenix-user` provider-authenticated verification callbacks now work by session ID, provider reference, and provider case ID
- `phoenix-user` verification review workflow now includes assignee-aware review queue filtering, flow/status filtering, CSV export, explicit session assignment, operator note capture, and operator-facing human review decisions on verification sessions
- legacy cashier route parity in `phoenix-wallet` now includes provider-oriented lifecycle handling, PXP-style callback compatibility, and richer admin payment operations
- `phoenix-wallet` provider orchestration now persists transaction event history and supports richer provider states plus balance-safe refund/reversal/chargeback transitions
- `phoenix-wallet` admin payment workflow now includes an explicit settle action in addition to review, retry, refund, reversal, and chargeback operations
- `phoenix-wallet` admin payment workflow now also includes direct provider-reference event lookup for operator/provider reconciliation
- `phoenix-wallet` admin payment workflow now also includes direct provider-reference transaction detail lookup for operator/provider reconciliation
- `phoenix-wallet` transaction detail responses now expose provider timestamps and persisted provider metadata for cashier/support tooling
- `phoenix-wallet` admin payment workflow now also includes reconciliation preview before mutation
- `phoenix-wallet` admin payment queue, summary, and reconciliation reads now support `assigned_to` filtering so payment-review ownership can be modeled server-side
- `phoenix-wallet` admin payment workflow now also includes CSV export of the filtered payment queue for cashier handoff/review packs
- `phoenix-betting-engine` now persists optional bet-level promo linkage (`freebet_id`, `freebet_applied_cents`, `odds_boost_id`) for truthful reporting
- `phoenix-analytics` now also exposes a Go-backed provider-ops triage surface for `GET /admin/feed-health`, persisted stream acknowledgements, and acknowledgement SLA settings
- `phoenix-user` verification provider callbacks now normalize richer external IdComply/KBA/IDPV status vocabularies into the internal verification lifecycle
- legacy compliance/account restriction aliases implemented in `phoenix-compliance`
- legacy GeoComply compatibility routes implemented in `phoenix-compliance`
- betting-side geolocation enforcement implemented in `phoenix-betting-engine` behind a configurable `X-Geolocation` requirement
- betslip pre-validation implemented in `phoenix-betting-engine` via `POST /api/v1/bets/precheck`
- batch bet-status polling implemented in `phoenix-betting-engine` via `POST /api/v1/bets/status` and legacy alias `POST /punters/bets/status`
- advanced betting parity now includes persisted bet-builder and fixed-exotics quote/get/accept flows in `phoenix-betting-engine`
- sportsbook websocket parity now includes `GET /api/v1/ws/web-socket` in `phoenix-gateway` for `market`, `fixture`, `bets`, and `wallets` subscriptions
- provider/trading parity now includes `POST /api/v1/providers/events/upsert`, `/admin/fixtures`, `/admin/fixtures/{id}`, `/admin/fixtures/{id}/status`, and `/admin/tournaments` in `phoenix-events`
- supplier adapter parity now includes `POST /api/v1/providers/mockdata/events/sync`, `POST /api/v1/providers/oddin/events/sync`, `POST /api/v1/providers/betgenius/events/sync`, `POST /api/v1/providers/mockdata/markets/sync`, `POST /api/v1/providers/oddin/markets/sync`, and `POST /api/v1/providers/betgenius/markets/sync`
- prediction bot auth parity now includes `POST /v1/bot/keys` and `POST /api/v1/bot/keys` in `phoenix-prediction`
- investor-demo runtime now pivots to the real player frontend plus real Talon backoffice
- investor-demo scripts now support configurable frontend ports plus automatic `docker` vs `host` frontend mode, so local rehearsal no longer hard-blocks on `${HOME}/.npmrc`
- compose-backed happy-path and resilience validation green
- dedicated realtime fanout implemented in `phoenix-realtime` and proxied behind the gateway websocket contract
- live Wave 5 rehearsal artifacts captured for cashier/provider and verification/provider demo flows:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/artifacts/payment_provider_simulator_20260315_181314.md`
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/artifacts/verification_provider_simulator_20260315_181123.md`
- `phoenix-analytics` now also exposes read-only Talon risk-summary routes for promo usage, wallet correction tasks, player risk scores, risk segments, and provider-ops triage reads
- compose-backed settlement failure-path validation green
- compose-backed wallet/betting partial-failure validation green
- compose-backed cashout rollback validation green
- compose-backed settlement transaction rollback validation green
- compose-backed settlement rollback on negative-balance later-bet failure validation green
- compose-backed settlement rollback on invalid later-bet reservation validation green
- compose-backed settlement rollback on partially released later-bet reservation validation green
- compose-backed withdrawal-reserved-balance protection validation green
- compose-backed reservation full-release and exhausted-release guardrail validation green
- compose-backed over-reserve guardrail validation green
- compose-backed outbox retry/recovery validation green
- compose-backed outbox backlog/backpressure validation green
- standalone `phoenix-outbox-worker` implemented
- production env template present
- Kubernetes base manifests and local/staging/production overlays present
- Kustomize overlay render checks green
- release/runbook docs present
- image publish and overlay-promotion workflow scaffolding present
- Docker build verification green across all services and the outbox worker
- legacy thin public demo still exists in `phoenix-demo-web`, but it is no longer the target investor-demo runtime

## What's In This Folder

### 1. Extraction Documents (171KB of analyzed business logic)

| File | Size | Contents |
|------|------|----------|
| `CODEX_PREP_MANIFEST.md` | 10KB | **START HERE** — Maps all 118 Phase 4 repos to 14 target Go microservices |
| `stella_extraction.md` | 30KB | 13 Scala/Flink repos: 120+ API endpoints, 50+ domain models, Kafka topics, auth patterns |
| `stella_translation_quick_ref.md` | 22KB | Side-by-side Scala→Go translation patterns for 7 key patterns |
| `STELLA_README.md` | 11KB | Navigation index for Stella extraction |
| `rmx_wallet_extraction.md` | 47KB | 11 Python repos: 100+ REST endpoints, 50+ Django ORM models, wallet logic, referral trees |
| `rmx_wallet_extraction_index.md` | 11KB | Navigation index for RMX extraction |
| `EXTRACTION_SUMMARY.txt` | 16KB | Executive summary across all extractions |
| `storm_gstech_extraction.md` | 34KB | Java Storm topologies, GSTech Node.js routes, game provider interfaces |

### 2. Go Service Projects

| Service | Port | Purpose | Status |
|---------|------|---------|--------|
| `phoenix-gateway/` | 8080 | API gateway, auth middleware, rate limiting | Implemented |
| `phoenix-user/` | 8001 | User management, auth, KYC, sessions, terms acceptance | Implemented |
| `phoenix-wallet/` | 8002 | Wallet, transactions, deposits, referrals | Implemented |
| `phoenix-market-engine/` | 8003 | Markets, odds, lifecycle management | Implemented |
| `phoenix-betting-engine/` | 8004 | Bet placement, validation, cashout, parlays | Implemented |
| `phoenix-events/` | 8005 | Event ingestion, live scores, sports catalog | Implemented |
| `phoenix-retention/` | 8006 | Achievements, leaderboards, campaigns, loyalty | Implemented |
| `phoenix-social/` | 8007 | Profiles, follows, feeds, direct messaging | Implemented |
| `phoenix-compliance/` | 8008 | Responsible gaming limits, self-exclusion, AML, alerts | Implemented |
| `phoenix-analytics/` | 8009 | Event tracking, user reporting, platform dashboards, cohorts, admin exports, risk-summary reads | Implemented |
| `phoenix-settlement/` | 8010 | Settlement batches, manual payouts, reconciliation | Implemented |
| `phoenix-notification/` | 8011 | Notification queueing, templates, delivery status, user preferences | Implemented |
| `phoenix-cms/` | 8012 | Pages, promotions, banners, content delivery | Implemented |
| `stella-engagement/` | 8013 | Real-time achievements, points, aggregations, websocket streams | Implemented |
| `phoenix-prediction/` | 8014 | Prediction markets, orders, lifecycle, admin oversight | Implemented (parity expansion) |
| `phoenix-audit/` | 8015 | Admin audit-log query surface, support filtering, and CSV export | Implemented (parity expansion) |
| `phoenix-support-notes/` | 8016 | Operator support notes and user timeline entries | Implemented (parity expansion) |
| `phoenix-config/` | 8017 | Terms/config admin surface and public current-terms read | Implemented (parity expansion) |
| `phoenix-realtime/` | 8018 | Dedicated websocket fanout for core sportsbook investor-demo domains | Implemented (runtime expansion) |
| `phoenix-common/` | - | Shared Kafka, outbox, health, config helpers | Implemented |

Each service follows the same Go layout: `cmd/server/main.go`, config, handlers, middleware, models, repository, service layers, Dockerfile, and Makefile.

### 3. Scaffold Index

See `INDEX.md` for detailed scaffold documentation including all API endpoints, domain models, and implementation patterns.

## How Codex Should Use This

### Step 1: Read the manifest
```
Read CODEX_PREP_MANIFEST.md
```
This tells you which Phase 4 repos map to which target microservice and what logic to extract.

### Step 2: Pick a microservice to implement
Follow the build order from Phoenix_Codex_Instructions.docx:
- **Phase 1** (Weeks 1-4): phoenix-gateway
- **Phase 2** (Weeks 5-12): phoenix-user, phoenix-wallet
- **Phase 3** (Weeks 13-20): phoenix-market-engine, phoenix-betting-engine
- **Phase 4** (Weeks 21-28): phoenix-events, phoenix-retention, phoenix-social
- **Phase 5** (Weeks 29-36): remaining services

### Step 3: Use the scaffold as your starting point
The Go scaffold for each service is already here with proper structure, dependencies, and patterns. Flesh it out by translating business logic from the extraction documents.

### Step 3a: Use the compose-backed integration harness for cross-service validation
The gateway module includes a real compose-backed integration flow:

```bash
cd phoenix-gateway
./scripts/run_compose_integration.sh
```

That harness boots PostgreSQL, Redis, Kafka, then runs a real HTTP path through:
- `phoenix-gateway`
- `phoenix-user`
- `GET /punters/current-session`
- persisted `device_id` / `device_fingerprint` in `user_sessions`
- `PUT /terms/accept`
- `GET /profile/me`
- `PUT /profile`
- `phoenix-wallet`
- `phoenix-events`
- `phoenix-market-engine`
- `phoenix-betting-engine`
- `phoenix-social`
- `phoenix-compliance`
- `phoenix-analytics`
- `phoenix-settlement`
- `phoenix-notification`
- `phoenix-cms`
- `stella-engagement`

It also covers resilience checks for:
- gateway auth rate-limit exhaustion and Redis-backed recovery
- downstream social-service outage and recovery through the gateway
- settlement validation and reconciliation permission failures without invalid
  row persistence
- wallet outage during bet placement without invalid bet persistence
- wallet outage during cashout without invalid cashout persistence
- cashout compensation failure branches inside the betting service:
  - reservation restore failure after payout/debit failure
  - reservation update failure after restore
  - rollback withdrawal failure after repository mark failure
- settlement rollback when a later wallet write fails inside the batch
- settlement rollback when a later bet would drive a wallet negative inside the batch
- settlement rollback when a later bet carries an invalid reservation id inside the batch
- settlement rollback when a later bet has already had part of its reservation released before batch settlement
- reconciliation for a missing settlement batch without invalid reconciliation persistence
- manual payout for a missing user without invalid payout or wallet transaction persistence
- withdrawal blocked by reserved funds without invalid withdrawal persistence
- missing-user deposit returns not-found and does not persist wallet state
- invalid reserve release does not emit `WalletFundsReleased` and preserves reserved balance
- full reserve release emits one release event, clears the reservation, and blocks exhausted-reservation releases without duplicate release events
- reserve requests that exceed available balance do not emit extra `WalletFundsReserved` events
- outbox retry and recovery against Kafka
- outbox backlog and retry growth across multiple unpublished rows
- cashout loss-side rollback deposit failure coverage in betting service tests

Notes:
- analytics reporting routes are covered through the gateway
- analytics event ingest remains a direct internal-service call for now because `POST /api/v1/events` is already the public events-ingestion contract for `phoenix-events`
- CMS now owns public pages, banners, and promotions; retention continues to own campaigns, bonuses, and leaderboards
- Stella engagement is covered through the gateway for achievement streaming, point calculations, aggregations, engagement score reads, and websocket stream endpoints

The latest local release rehearsal is recorded in:

- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/release-rehearsal-2026-03-10.md`
- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/artifacts/local_release_rehearsal_20260310_114608.md`

That rehearsal passed with:
- overlay validation
- full compose-backed integration
- outbox retry/recovery coverage

Docker build verification remains a separate green gate via:
- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/verify_docker_builds.sh`

### Step 3e: Use the investor-demo runtime

The canonical investor-demo path now uses:

- real player frontend repo:
  - `/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg`
- real Talon backoffice repo:
  - `/Users/johnb/Desktop/PhoenixBotRevival/apps/Phoenix-Sportsbook-Combined/talon-backoffice`
- demo compose overlay:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docker-compose.demo.yml`
- bootstrap:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/demo-bootstrap.sh`
- reset:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/investor-demo-reset.sh`
- warmup:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/investor-demo-warmup.sh`
- smoke test:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/demo-smoke.sh`
- seeded realtime rehearsal:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/realtime-rehearsal.sh`
- seeded provider rehearsals:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/payment-provider-simulator.sh`
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/verification-provider-simulator.sh`
- seed data:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/demo-seed.sh`
- investor-demo runbook:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/investor-demo-setup.md`

The thin public demo frontend remains in the repo as a fallback-only path:

- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/phoenix-demo-web`

### Step 3b: Verify all container builds

```bash
cd /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep
./scripts/verify_docker_builds.sh
```

This verifies:
- all 19 service Dockerfiles
- the standalone `phoenix-outbox-worker`

Recent parity progress:
- `phoenix-wallet` now exposes a reconciliation queue plus CSV export and explicit `approve` / `decline` review actions for provider transactions
- `phoenix-user` now persists `providerDecision` and `providerCaseId` on verification sessions for deeper admin/provider visibility

### Step 3c: Validate deployment overlays

```bash
kubectl kustomize /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/overlays/local
kubectl kustomize /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/overlays/staging
kubectl kustomize /Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/deploy/k8s/overlays/production
```

### Step 3d: Use the operational runbooks

Operational docs now live under:

- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/local-bootstrap.md`
- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/incident-triage.md`
- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/outbox-replay-recovery.md`
- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/runbooks/rollback.md`
- `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/docs/release-checklist.md`

Automation now exists for:

- overlay render validation:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/validate_k8s_overlays.sh`
- release tag promotion:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/scripts/release/promote_overlay_tags.sh`
- GitHub Actions CI:
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/.github/workflows/platform-verify.yml`
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/.github/workflows/promote-images.yml`
  - `/Users/johnb/Desktop/PhoenixBotRevival/services/codex-prep/.github/workflows/publish-images.yml`

For services that import `phoenix-common` through local module replacement, the
verifier builds from the repo root with explicit Dockerfile paths so Docker sees
both the service module and the shared library.

### Step 4: Reference extraction docs for business logic
- For Stella (Scala) services → `stella_extraction.md` + `stella_translation_quick_ref.md`
- For RMX/Wallet (Python) services → `rmx_wallet_extraction.md`
- For Storm/GSTech (Java/Node) services → `storm_gstech_extraction.md`

### Step 5: Follow the 6-step porting pipeline
For each piece of business logic:
1. **Extract** — Identify the logic from the extraction doc
2. **Specify** — Write Go interface/contract
3. **Translate** — Port to Go using the translation patterns
4. **Test** — Write table-driven tests
5. **Integrate** — Wire into the scaffold's handler→service→repo chain
6. **Document** — Update the service README

## Key Architecture Decisions

- **ALL backend in Go — no exceptions** (replacing Scala/Akka, Python/Django, Java, Node.js)
- **Stella engagement engine also in Go** — Flink streaming logic replaced with Go Kafka consumers + goroutine pipelines
- **PostgreSQL-backed event sourcing** — append-only events table with optimistic concurrency replaces Akka Persistence
- **Chi v5** for HTTP routing
- **pgx** for PostgreSQL
- **confluent-kafka-go** for event streaming
- **go-redis** for caching
- **slog** for structured logging
- **shopspring/decimal** for financial precision
- **Interface-based repository pattern** for testability

## Event Sourcing Pattern (replaces Akka Persistence)

All services handling financial or stateful data (wallet, bets, markets) use PostgreSQL event sourcing:
- Append-only `events` table with aggregate_id, event_type, version, JSONB payload
- Optimistic concurrency via version column (WHERE version = expected_version)
- State rebuilt by replaying events for a given aggregate
- Snapshots table for performance when replay gets slow
- See `migrations/010_create_event_store.sql` for schema

## Phase 4 Source Code Location

All legacy source repos are at: `/Users/johnb/Desktop/Phase 4/`

Organized in 15 groups (Stella, RMX, ggCircuit, GSTech, Storm, etc.) — see `CODEX_PREP_MANIFEST.md` for the complete mapping.
