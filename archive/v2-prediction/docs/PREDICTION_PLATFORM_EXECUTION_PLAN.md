# Phoenix Pivot Execution Plan

Date created: 2026-03-02  
Plan window: 2026-03-02 to 2026-08-30 (26 weeks)

## Execution Progress Log

### 2026-03-02 01:31 CET
- Started implementation work for the pivot (Phase 0 and Phase 1 foundation).
- Added ADR workspace and accepted first four ADRs:
  - `pivot/adrs/ADR-001-domain-boundaries.md`
  - `pivot/adrs/ADR-002-event-contracts.md`
  - `pivot/adrs/ADR-003-settlement-source-policy.md`
  - `pivot/adrs/ADR-004-schema-strategy.md`
- Added first prediction schema migration wave in Phoenix backend:
  - `.../db/migration/V48_0_0__Create_prediction_market_and_execution_tables.sql`
  - `.../db/migration/V48_1_0__Create_prediction_settlement_and_bot_tables.sql`
  - `.../db/migration/V48_2_0__Create_prediction_feed_ops_and_audit_tables.sql`
- Scaffolded prediction bounded-context packages in code:
  - `services/src/main/scala/phoenix/prediction/common/PredictionModel.scala`
  - `services/src/main/scala/phoenix/prediction/markets/PredictionMarketsBoundedContext.scala`
  - `services/src/main/scala/phoenix/prediction/orders/PredictionOrdersBoundedContext.scala`
  - `services/src/main/scala/phoenix/prediction/settlement/PredictionSettlementBoundedContext.scala`
  - `services/src/main/scala/phoenix/prediction/botauth/BotAuthBoundedContext.scala`
  - `services/src/main/scala/phoenix/prediction/README.md`
- Note: no runtime wiring/routes/repositories yet; this checkpoint establishes
  architecture decisions + schema + code scaffolding.

### 2026-03-02 01:37 CET
- Added first bot key issuance HTTP surface (admin-authenticated stub):
  - `phoenix/.../prediction/botauth/infrastructure/http/PredictionBotEndpoints.scala`
  - `phoenix/.../prediction/botauth/infrastructure/http/PredictionBotRoutes.scala`
  - wired into `phoenix/http/routes/PhoenixRestRoutes.scala`
- Endpoint path now present: `POST /v1/bot/keys`
- Current behavior: returns generated key material (stub), not yet persisted to
  `bot_accounts` / `bot_api_keys` tables.
- Validation attempt:
  - `sbt "phoenix-backend/compile"` failed in this environment because network
    access is blocked and sbt launcher dependencies could not be downloaded
    (`UnknownHostException` for Maven/SBT repositories).

### 2026-03-02 01:40 CET
- Added canonical stream envelope contract scaffold:
  - `phoenix/.../prediction/common/StreamEnvelope.scala`
- Contract includes:
  - monotonic `sequenceNo`
  - deterministic `checksum` function (SHA-256 over canonical fields + payload)
- Integration of this envelope into actual websocket/stream publishers is still
  pending.

### 2026-03-02 01:43 CET
- Repository state check found many pre-existing local modifications in
  `phoenix-backend` unrelated to this pivot pass (legacy uncommitted work).
- This was not modified/reverted by pivot work; continue with caution and avoid
  touching unrelated files unless explicitly requested.

### 2026-03-02 11:31 CET
- Build blocker triage update:
  - Network download issue was resolved on local machine, but current stack then
    failed with sbt launcher `ClassCastException` while using legacy `sbt 1.5.8`.
  - Working assumption: JVM/tooling mismatch with modern JDK.
- Execution decision:
  - Do **not** run a full framework/toolchain upgrade before first green build.
  - Pin immediate build runtime to JDK 17 and keep current sbt/project versions
    for stabilization.
- Schedule modernization as a separate, controlled stream after baseline
  compile/test is stable.

### 2026-03-02 11:46 CET
- Action 6 implementation pass (BTC template + scheduler scaffold):
  - Added prediction config model:
    - `services/src/main/scala/phoenix/prediction/PredictionConfig.scala`
  - Added BTC template generation and scheduling pipeline:
    - `.../prediction/markets/templates/BtcPriceBandTemplate.scala`
    - `.../prediction/markets/application/PredictionMarketTemplatePublisher.scala`
    - `.../prediction/markets/infrastructure/GenerateBtcMarketsJob.scala`
    - `.../prediction/markets/PredictionMarketFactoryModule.scala`
  - Added runtime config:
    - `services/src/main/resources/prediction.conf`
    - included in `services/src/main/resources/application-base.conf`
  - Wired module startup in:
    - `services/src/main/scala/phoenix/main/Application.scala`
- Action 7 implementation pass (deterministic settlement scaffold):
  - Added deterministic settlement primitives:
    - `.../prediction/settlement/application/DeterministicSettlement.scala`
    - `.../prediction/settlement/application/PredictionSettlementStore.scala`
    - `.../prediction/settlement/application/DeterministicPredictionSettlementService.scala`
    - `.../prediction/settlement/infrastructure/LoggingPredictionSettlementStore.scala`
  - These align with `prediction_settlement_events` and `prediction_settlements`
    tables introduced in `V48_1_0`.
- Remaining gap:
  - No Slick-backed repository wiring yet for bot keys/templates/settlement;
    current implementations are scaffolds and logging publishers/stores.

### 2026-03-02 12:44 CET
- Compile feedback received from local run:
  - unused implicit `ExecutionContext` parameter in
    `PredictionMarketFactoryModule.init`
  - `OffsetDateTime.plus` type mismatch with `FiniteDuration` in
    `BtcPriceBandTemplate`
- Applied fixes:
  - removed unused implicit `ExecutionContext` parameter from market factory
    module init
  - converted Scala duration values to `java.time.Duration` via
    `Duration.ofNanos(...)` before calling `OffsetDateTime.plus(...)`
- Ready for rerun of:
  - `sbt -java-home "$JAVA_HOME" "phoenix-backend/compile"`

### 2026-03-02 12:48 CET
- Compile rerun status:
  - `phoenix-backend/compile` completed successfully on JDK 17.
- Action 8 implementation pass (Talon Prediction Ops placeholders):
  - Added new module:
    - `talon-backoffice/.../src/js/modules/prediction-ops/index.tsx`
  - Added route:
    - `talon-backoffice/.../src/js/routes.tsx` (`/prediction-ops`)
  - Added top-nav item:
    - `talon-backoffice/.../src/js/modules/app/Component.tsx` (`Prediction Ops`)
- Action 9 implementation pass (first replay test for one-day synthetic flow):
  - Added test:
    - `services/src/test/scala/phoenix/prediction/unit/PredictionReplayDeterminismSpec.scala`
- Test validates deterministic replay outcome for one day of synthetic trades
  (5-minute cadence, sequence ordering, checksum chain, and net-zero position
  conservation).

### 2026-03-02 13:00 CET
- Test-compile breakage triage (`phoenix-backend/test:compile`):
  - root cause identified as route-constructor compatibility drift while adding
    prediction bot endpoints.
  - symptom in specs: `Unspecified value parameter mountBackOfficeRoutes` plus
    cascading type/unused errors.
- Compatibility patch applied in:
  - `services/src/main/scala/phoenix/http/routes/PhoenixRestRoutes.scala`
- Patch details:
  - kept the existing constructor shape used by specs
  - introduced `extraEndpoints: Routes.Endpoints = List.empty` as additive
    extension point
  - moved prediction bot route wiring to `PhoenixRestRoutes.create(...)` via:
    `extraEndpoints = new PredictionBotRoutes().endpoints`
- Expected outcome:
  - existing test builders/spec constructors should compile without requiring
    broad spec rewrites.

### 2026-03-02 13:03 CET
- Validation caveat in current assistant runtime:
  - local compile verification is currently blocked by restricted DNS/network
    for external dependency resolution (`repo1.maven.org`, `oss.sonatype.org`,
    and oddin release artifact lookup).
- User-side execution guidance confirmed:
  - backend: keep JDK 17 pinned and run
    `sbt -java-home "$JAVA_HOME" "phoenix-backend/test:compile"`
  - talon frontend: run dependency install first, then start
    - `yarn install`
    - `yarn start`
  - note: command `yarn start and confirm /prediction-ops` is invalid shell
    syntax and passes extra tokens to `react-scripts`.

### 2026-03-02 13:08 CET
- Backend status from latest local user run:
  - `phoenix-backend/compile` is green on JDK 17.
  - `phoenix-backend/test:compile` no longer reports `PhoenixRestRoutes`
    constructor/mount-point regressions.
  - remaining blocker narrowed to one test file:
    `services/src/test/scala/phoenix/prediction/unit/PredictionReplayDeterminismSpec.scala`
    with `-Werror` on warnings:
    - `The outer reference in this type test cannot be checked at run time.`
- Fix applied:
  - moved `SyntheticTrade` and `ReplayState` case classes out of the spec class
    into `object PredictionReplayDeterminismSpec` and imported them in the test
    class (prevents outer-reference warning in Scala 2.13 with `-Werror`).

### 2026-03-02 13:10 CET
- Talon status from latest local user run:
  - `yarn install` succeeded.
  - `yarn start` fails under Node `v22.22.0` with
    `ERR_PACKAGE_PATH_NOT_EXPORTED` (`postcss-safe-parser`/`postcss`) because
    this CRA/react-scripts stack is Node-16-era.
- Required runtime pin for Talon:
  - repo target is `.node-version = v16.16`
  - commands:
    - `nvm install 16.16`
    - `nvm use 16.16`
    - `yarn start`

### 2026-03-02 13:12 CET
- Backend validation milestone:
  - user reran `sbt -java-home "$JAVA_HOME" "phoenix-backend/test:compile"`
  - result: `success` (all 300 test sources compiled)
  - current backend state: compile + test-compile are green on JDK 17.

### 2026-03-02 13:13 CET
- Talon runtime follow-up:
  - after switching with `nvm use 16.16`, shell reports `yarn: command not found`
  - cause: yarn binary is not installed in the active Node 16 toolchain path.
- Remediation commands:
  - `npm install -g yarn@1.22.22`
  - `yarn -v`
  - `yarn start`

### 2026-03-02 13:16 CET
- Talon runtime milestone:
  - user installed Yarn `1.22.22` under Node `16.16.0`
  - `yarn start` now launches `react-scripts start` successfully.
- Current platform status:
  - Phoenix backend: compile + test-compile green (JDK 17)
  - Talon frontend: local dev server booting under pinned Node/Yarn toolchain.

### 2026-03-02 13:20 CET
- Follow-up on `localhost refused to connect`:
  - confirmed root issue is runtime mismatch where `react-scripts` can still run
    with Node 22 despite Yarn being installed under Node 16.
  - deterministic launcher command set for Talon:
    - `export PATH="$HOME/.nvm/versions/node/v16.16.0/bin:$PATH"`
    - `HOST=127.0.0.1 PORT=3000 yarn start`
- Note:
  - Node 16 may emit a non-blocking deprecation warning from `postcss`; this is
    expected for this legacy CRA stack.

### 2026-03-02 13:24 CET
- Talon frontend runtime check:
  - frontend compiles and serves (only lint warnings reported in unrelated
    legacy modules).
  - warnings are non-blocking and do not prevent serving `Prediction Ops`.
- Remaining runtime issue:
  - repeated `[HPM] ECONNREFUSED` for `/api/*` and `/socket.io` is expected
    while API backend on `localhost:3001` is down.
  - `src/setupProxy.js` confirms all API/socket traffic proxies to
    `http://localhost:3001`.

### 2026-03-02 13:26 CET
- Talon backend dependency path identified:
  - API expected by backoffice is from
    `talon-backoffice/gstech/gstech/packages/gstech-backend`
  - default backend API port resolves to `3001` (`gstech-core/modules/ports.js`)
  - local infra bootstrap exists in monorepo root (`yarn env`) for
    postgres/redis/kafka/minio dependencies.
- Operational note:
  - Node version split is required:
    - backoffice UI: Node `16.16.0`
    - gstech backend monorepo: Node `18.20.4` (from `.node-version`)

### 2026-03-02 13:30 CET
- Live run triage from user terminals:
  - root `yarn migrate` in gstech monorepo failed with
    `ECONNREFUSED 127.0.0.1:5432` across multiple packages (postgres missing on
    5432).
  - backend startup failed with `EADDRINUSE :::4001` (metrics port collision).
  - crash stack shows Node `v22.22.0` in backend terminal (wrong runtime for
    this monorepo; should be Node 18).
  - frontend continues to show `[HPM] ECONNREFUSED` for `localhost:3001`
    because backend never binds.

### 2026-03-02 13:32 CET
- Environment facts confirmed during triage:
  - `localhost:4001` is occupied by existing `attaboy-go-wallet` container.
  - `localhost:5432` is currently free (safe to bind local gstech postgres).
  - docker has no running `gstech-*` dependency containers yet.
- Recovery plan for local Talon stack:
  - use Node 18 explicitly for `gstech/gstech` commands
  - start only required infra (`pg-idefix` on 5432)
  - avoid root-level `yarn migrate` (runs all services); run migrations only for
    `gstech-backend`
  - override `METRICS_PORT` (e.g. `4101`) to avoid collision on `4001`

### 2026-03-02 13:28 CET
- Backend runtime verification:
  - `curl -I http://127.0.0.1:3001/api/v1/status` returned `HTTP/1.1 200 OK`.
  - Talon API proxy target is confirmed healthy on local machine.
- Next validation target:
  - verify backoffice route loads with active API:
    `http://127.0.0.1:3000/prediction-ops`

### 2026-03-02 13:36 CET
- Backoffice login credential discovery:
  - local seed users are defined in backend migrations and test specs.
  - confirmed test login pair used by API tests:
    - email: `test@luckydino.com`
    - password: `foobar123`
  - admin-capable seeded users share the same password hash in migration data:
    - `janne@luckydino.com`
    - `a.krasikau@gmail.com`
    - `vladimir@luckydino.com`
    - `sean.bugeja@eeg.tech` (later migration)
- Source of truth:
  - `packages/gstech-backend/migrations/1547119284915_up_testdata.sql`
  - `packages/gstech-backend/migrations/1626950534621_up_sean-login.sql`
  - `packages/gstech-backend/server/modules/users/routes.spec.js`

### 2026-03-02 13:40 CET
- Post-login log interpretation:
  - frontend `[HPM] ECONNREFUSED localhost:3001` issue is resolved once backend
    is up (confirmed by `/api/v1/status` and successful login).
  - remaining backend `ECONNREFUSED` entries for ports `3004/3007/3009/9000`
    are dependency health checks (wallet/payment/compliance/minio) and do not
    block basic backoffice login/routing.
  - `Compiled with warnings` (unused vars) are non-blocking lint warnings in
    legacy modules unrelated to prediction-ops.
  - `[HPM] Client disconnected / Upgrading to WebSocket` messages are normal
    dev-proxy websocket lifecycle logs.
- Optional cleanup for lower log noise:
  - start minio dependency:
    `docker compose -p minio -f environment/minio.docker-compose.yml up -d`
  - or run backend with stricter log level for local UI checks:
    `LOGGER_LEVEL=error ... yarn workspace gstech-backend serve`

### 2026-03-02 13:46 CET
- Customer-facing sportsbook frontend location confirmed:
  - `/phoenix-core/attaboy-phoenix-frontend-brand-darkstormlabs/phoenix-frontend-brand-viegg`
- Runtime profile:
  - stack: Next.js 11 + React 17 monorepo (`@phoenix-ui/app-darkstormlabs`)
  - node pin: `.nvmrc = v14.17.0`
  - root dev command runs both app + brand mock server:
    - `yarn dev` (maps to `run-local:dev`)
- Environment modes discovered:
  - connected dev/stage env files point to hosted API/WS endpoints
  - offline/local mode exists in `packages/app/.env.offline.local`:
    - `API_GLOBAL_ENDPOINT=http://localhost:12552`
    - `WS_GLOBAL_ENDPOINT=ws://localhost:9552/web-socket`
- Practical execution paths:
  - customer UI against hosted dev backend:
    - `nvm use 14.17.0 && yarn bootstrap && yarn dev`
  - customer UI in offline/mock mode:
    - run mock server scope + app scope with offline env overrides.

### 2026-03-02 13:52 CET
- Customer frontend startup blocker observed in live run:
  - `nvm use 14.17.0` failed because Node 14 was not installed locally.
  - `yarn dev` then executed under Node `v22.22.0`, causing Next/Webpack crypto
    failure:
    `ERR_OSSL_EVP_UNSUPPORTED (error:0308010C:digital envelope routines::unsupported)`.
  - mock server package still came up on `localhost:3010`; app package crashed.
- Resolution path:
  - install and force Node `14.17.0` for this repo before `yarn dev`
  - optional fallback for accidental newer Node runtime:
    `NODE_OPTIONS=--openssl-legacy-provider`.

### 2026-03-02 13:56 CET
- Follow-up from user terminal:
  - `nvm install 14.17.0` failed on Apple Silicon:
    - no `darwin-arm64` binary for this exact legacy version
    - source-compile fallback failed due missing Python `distutils`
      (`ModuleNotFoundError: No module named 'distutils'`)
  - repo therefore kept running under Node `v22.22.0`, reproducing
    `ERR_OSSL_EVP_UNSUPPORTED` during Next/Webpack startup.
- Practical unblock decision:
  - run this legacy Next 11 stack using modern Node plus OpenSSL legacy
    provider flag in shell:
    `NODE_OPTIONS=--openssl-legacy-provider yarn dev`
  - prefer Node 18 shell for this command when available.

### 2026-03-02 13:59 CET
- Customer frontend i18n runtime fix:
  - error observed: `Default namespace not found ... /locales/en/common.json`
  - root cause: translation generation scripts in
    `packages/app/scripts/translations/{generate,watch}.js` only consumed
    brand-local `packages/app/translations` due a broken legacy path hack in
    this repo layout, so `common.json` from `app-core` was never generated.
- Fix applied:
  - updated both scripts to include `packages/app-core/translations` explicitly
    and keep legacy path as fallback when present.
  - regenerated locales and confirmed files exist:
    - `packages/app/public/static/locales/en/common.json`
    - `packages/app/public/static/locales/de/common.json`

## Immediate Next 10 Actions Status

1. [x] Create `pivot/` ADR folder and write ADR-001 to ADR-004.
2. [x] Add prediction migration placeholders after current Phoenix migration head.
3. [x] Scaffold new `prediction_*` modules in Phoenix services.
4. [x] Create bot auth key table and key issuance endpoint (stub response; DB wiring pending).
5. [x] Implement stream envelope contract with sequence + checksum (contract scaffold done; publisher integration pending).
6. [x] Build BTC market template and scheduler job (scaffold + scheduler wiring in app startup).
7. [x] Implement deterministic settlement with source snapshot table (deterministic service + snapshot/resolution store contracts; DB wiring pending).
8. [x] Add Talon “Prediction Ops” nav section and placeholder pages.
9. [x] Build first replay test that reprocesses one day of synthetic trades.
10. [ ] Run weekly pivot review with gate checklist, not status-only updates.

## 1) Goal of This Plan
Execute a controlled pivot from sportsbook-first to a bot-first prediction market platform, using the current codebase as a migration base, not a greenfield rewrite.

Target scope:
- Crypto price markets
- Sports event markets
- Stock price markets

Out of scope:
- Cultural/subjective markets
- Manual market operations as a primary workflow

## 2) Execution Principles
- Keep Phoenix running while carving out prediction services.
- Build one vertical fully (crypto) before expanding (sports, stocks).
- Keep human UX behind the same APIs used by bots.
- Automate market creation and settlement from day one.
- Use hard release gates with measurable criteria, not calendar-only launches.

## 3) Current Asset Reuse Map (Concrete)

### Reuse now
- `phoenix-core/attaboy-phoenix-backend/phoenix-backend/services/src/main/scala/phoenix/wallets`
- `phoenix-core/attaboy-phoenix-backend/phoenix-backend/services/src/main/scala/phoenix/auditlog`
- `phoenix-core/attaboy-phoenix-backend/phoenix-backend/services/src/main/scala/phoenix/reports`
- `phoenix-core/attaboy-phoenix-backend/phoenix-backend/services/src/main/scala/phoenix/websockets`
- `talon-backoffice/gstech-backoffice/gstech-backoffice` (ops UI shell)
- `talon-backoffice/gstech/gstech/packages/gstech-backend/migrations` (admin/risk operational patterns)
- `gmx-infrastructure/gmx-traefik/gmx-traefik` (local infra bootstrap)

### Reuse with adaptation
- `phoenix/.../phoenix/markets` and `phoenix/.../phoenix/bets` domain code:
  adapt from sportsbook entities to generic prediction contracts.
- `gmx-waysun/gmx-waysun-event-ingestor`:
  adapt as ingestion worker pattern for market context feeds.
- `gmx-infrastructure/gmx-nifi-rest/gmx-nifi-rest`:
  keep only bridging patterns; replace legacy endpoints/auth assumptions.

### Do not carry forward as core runtime
- Legacy orchestration/environment-coupled deployment repos already removed.
- `gmx-services/gmx-predictor-game/gmx-predictor-game`:
  mine schema/domain ideas only; do not run as core (old Play/Scala stack and private dependency assumptions).

## 4) Workstreams and Ownership Model

Assumed team minimum (adjust if staffing differs):
- 1 platform lead
- 2 backend engineers (trading/risk)
- 2 backend engineers (market factory/settlement/feeds)
- 1 data engineer (streaming/replay)
- 1 frontend engineer (human secondary UI + Talon ops)
- 1 DevOps/SRE
- 1 QA automation engineer

Workstreams:
- WS1 Core Trading + Risk
- WS2 Market Factory + Settlement
- WS3 Bot Gateway + SDK
- WS4 Data/Infra/SRE
- WS5 Backoffice (Talon) + Ops Tooling
- WS6 Compliance Controls + Auditability

## 5) Delivery Timeline (By Date)

### Phase 0: Baseline and Cut Plan (2026-03-02 to 2026-03-15)
Deliverables:
- Reproducible local boot using existing commands:
  - `make infra-up`
  - `make sportsbook-deps-up`
  - `make sportsbook-run`
  - `make talon-backoffice-run`
- Dependency risk list: all private registries, dead endpoints, hardcoded secrets.
- Pivot branch + ADR set:
  - product boundary
  - event model
  - migration style (strangler pattern)

Exit gate:
- Cold-start environment boots on one Mac end-to-end with documented `.env` templates.

### Phase 1: Prediction Core Skeleton (2026-03-16 to 2026-04-12)
Deliverables:
- New bounded contexts in Phoenix backend:
  - `prediction_markets`
  - `prediction_orders`
  - `prediction_settlement`
  - `bot_auth`
- Initial Postgres schema migrations added to Phoenix migration chain:
  - `prediction_instruments`
  - `prediction_market_templates`
  - `prediction_markets`
  - `prediction_outcomes`
  - `prediction_orders`
  - `prediction_trades`
  - `prediction_positions`
  - `prediction_settlements`
  - `bot_accounts`
  - `bot_api_keys`
  - `feed_jobs`
  - `feed_events`
- Internal event contracts:
  - `market.created`
  - `market.suspended`
  - `order.accepted`
  - `order.rejected`
  - `trade.executed`
  - `market.resolved`
  - `payout.booked`

Exit gate:
- Crypto test market can be created, traded in test mode, and resolved in local environment.

### Phase 2: Crypto Vertical MVP (2026-04-13 to 2026-05-10)
Deliverables:
- Feed adapter for one canonical crypto source + fallback source.
- Market factory (automated, schedule driven) for BTC/ETH contracts.
- Settlement daemon with deterministic cutoff and source snapshots.
- Risk controls v1:
  - max position per account
  - max notional per market
  - volatility halt trigger
- Bot Gateway v1:
  - API key auth
  - idempotent order endpoint
  - stream endpoint for order/trade/market updates

Exit gate:
- 7-day simulated crypto run with:
  - no unresolved markets
  - deterministic replay match > 99.9%
  - zero manual settlement overrides

### Phase 3: Bot Alpha + Talon Ops (2026-05-11 to 2026-06-07)
Deliverables:
- Sandbox environment (separate DB/topics/keys).
- SDK alpha (Python first, TypeScript second).
- Talon extensions:
  - market status board
  - settlement monitor
  - risk override log (audited)
- Runbooks:
  - feed outage
  - stale price detection
  - bad settlement source fallback

Exit gate:
- 3 pilot bots onboarded and actively trading sandbox markets.

### Phase 4: Sports + Stocks Expansion (2026-06-08 to 2026-07-05)
Deliverables:
- Sports feed adapter (official results source) and stock EOD/official close adapter.
- Template library v2:
  - moneyline/win contracts for sports
  - close-above/close-below and range for stocks
- Market lifecycle controls:
  - duplicate prevention
  - schedule collision handling
  - pre-open liquidity checks

Exit gate:
- Mixed portfolio of crypto + sports + stocks markets runs for 14 days in sandbox with automated create/resolve.

### Phase 5: Hardening + Beta (2026-07-06 to 2026-08-02)
Deliverables:
- Performance tuning for p95/p99 order path.
- Replay framework for strategy backtesting and incident reconstruction.
- Compliance controls integrated into gateways:
  - jurisdiction allow/deny policy
  - account restriction states
  - audit-export endpoints
- Human secondary UI v1 (basic discovery/trading/positions only).

Exit gate:
- Beta readiness:
  - p95 order ack under target
  - settlement SLA achieved for all closed markets
  - complete audit chain for sampled transactions

### Phase 6: Production Candidate + Cutover (2026-08-03 to 2026-08-30)
Deliverables:
- Production cutover plan:
  - sportsbook-only features isolated from prediction runtime
  - rollback procedures validated
- SLO dashboard and alerting
- Final security review + penetration test fixes
- Launch checklist sign-off (engineering + ops + legal/compliance)

Exit gate:
- Production candidate approved for controlled launch.

## 6) First 8 Weeks Detailed Sprint Backlog

### Sprint 1 (2026-03-02 to 2026-03-15)
- WS4: Lock local infra baseline and reproducible setup docs.
- WS1: Define `Order`, `Trade`, `Position` domain contracts.
- WS2: Define `MarketSpec` + `SettlementSpec` JSON schemas.
- WS6: Define compliance decision matrix per market type/jurisdiction.

Done when:
- Engineering can run local stack from clean machine in < 90 minutes.

### Sprint 2 (2026-03-16 to 2026-03-29)
- WS1: Implement order intake + validation + idempotency keys.
- WS2: Implement market create API + factory skeleton.
- WS4: Add event topics and local stream wiring.
- WS5: Talon page scaffold for prediction operations.

Done when:
- Test order lifecycle (`accepted/rejected/cancelled`) is persisted and stream-emitted.

### Sprint 3 (2026-03-30 to 2026-04-12)
- WS2: Settlement engine v1 with deterministic time cutoffs.
- WS1: Position calculator + exposure checks.
- WS3: Bot auth service with scoped API keys.
- WS4: Replay log storage and event sequence validation.

Done when:
- One synthetic market completes full create->trade->resolve->payout locally.

### Sprint 4 (2026-04-13 to 2026-04-26)
- WS2: Crypto feed adapter + market template automation.
- WS1: Risk rails (max notional/position).
- WS3: Bot WebSocket stream channel with sequence IDs.
- WS5: Talon settlement dashboard MVP.

Done when:
- Automated BTC market cycle runs daily with no manual intervention.

## 7) Data Model Transition Plan

Keep sportsbook schema intact. Add prediction schema in parallel first.

New table groups:
- Market definition: `prediction_instruments`, `prediction_market_templates`, `prediction_markets`, `prediction_outcomes`
- Execution: `prediction_orders`, `prediction_trades`, `prediction_positions`
- Settlement: `prediction_settlement_sources`, `prediction_settlement_events`, `prediction_settlements`, `prediction_payouts`
- Bot identity: `bot_accounts`, `bot_api_keys`, `bot_nonces`, `bot_rate_limit_tiers`
- Operations/audit: `ops_incidents`, `ops_overrides`, `audit_event_log`, `replay_checkpoints`

Migration sequence:
1. Add tables (no runtime usage).
2. Dual-write critical events to new audit log.
3. Enable read paths in bot gateway.
4. Switch execution to new prediction tables by market type.
5. Retire sportsbook-only dependencies for prediction routes.

## 8) API Execution Plan

### Order of delivery
1. `POST /v1/bot/keys`
2. `GET /v1/markets`
3. `POST /v1/orders`
4. `DELETE /v1/orders/{id}`
5. `GET /v1/positions`
6. `GET /v1/settlements`
7. `WS /v1/stream` (markets, orders, trades, settlements)

### Non-negotiable behavior
- Idempotency key required for order creation.
- Monotonic sequence numbers on stream.
- Deterministic error codes.
- Signed request option with nonce enforcement.

## 9) Cutover and Risk Controls

Major risks:
- Legacy private dependency breakage
- Feed integrity and settlement disputes
- Performance regression under bot traffic
- Compliance scope creep late in project

Mitigations:
- Dependency replacement tracked as blocking tasks in Phase 0/1.
- Dual-source settlement with signed source snapshots.
- Load testing every sprint from Sprint 3 onward.
- Compliance acceptance criteria added to each phase gate.

Rollback strategy:
- Feature flags by market type (`prediction_crypto`, `prediction_sports`, `prediction_stocks`).
- Blue/green runtime for gateway and settlement workers.
- Keep sportsbook routing isolated until prediction stability is proven.

## 10) KPIs and Go/No-Go Thresholds

Alpha (June 7, 2026):
- 3 active bots in sandbox
- >95% successful order flow in sandbox tests
- 100% automated settlement for crypto test markets

Beta (August 2, 2026):
- p95 order ack <= 150ms in target load profile
- 0 critical replay mismatches for 14 days
- 0 manual settlement overrides in prior 7 days

Production candidate (August 30, 2026):
- Incident response runbooks validated
- Audit export complete for sampled lifecycle events
- Compliance/legal launch checklist signed off

## 11) Immediate Next 10 Actions (Starting Now)
1. Create `pivot/` ADR folder and write ADR-001 to ADR-004 (domain boundaries, event contracts, settlement source policy, schema strategy).
2. Add prediction migration placeholders after current Phoenix migration head.
3. Scaffold new `prediction_*` modules in Phoenix services.
4. Create bot auth key table and key issuance endpoint.
5. Implement stream envelope contract with sequence + checksum.
6. Build BTC market template and scheduler job.
7. Implement deterministic settlement with source snapshot table.
8. Add Talon “Prediction Ops” nav section and placeholder pages.
9. Build first replay test that reprocesses one day of synthetic trades.
10. Run weekly pivot review with gate checklist, not status-only updates.
