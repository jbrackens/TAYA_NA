# Architecture Baseline and Target (Sprint 0)

Program root: `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined`

## 1) Baseline (As-Is) Architecture

### Core Repositories in Scope
1. Backend (Scala/Akka monolith):
   - `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-backend`
2. Talon Backoffice frontend (Next.js):
   - `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/talon-backoffice`
   - package: `packages/office`
3. Sportsbook frontend (brand app, Next.js):
   - `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/phoenix-frontend-brand-viegg`
   - package: `packages/app`

### Runtime Shape (Legacy Backend)
The legacy backend starts multiple servers per node role (from `phoenix.main.Application` + `LocalApplication`):
1. REST API server (`forRestServer`) -> local cluster first node: `13551`
2. Dev routes server (`forDevServer`) -> local cluster first node: `12551`
3. WebSocket server (`forWebSockets`) -> local cluster first node: `9551`
4. PXP callback server (`forPxpServer`) -> local cluster first node: `6551` (based on `+4000` from `2551`)
5. Betgenius server (`forBetgeniusServer`) -> local cluster first node: `7551` (based on `+5000`)

### Key Backend Domain Components (Bounded Contexts)
1. Punters
2. Wallets
3. Bets
4. Markets
5. Backoffice
6. Payments
7. GeoComply
8. Notes
9. Audit Log
10. Prediction (bot auth, markets/orders/settlement)
11. WebSockets
12. Supplier ingestion modules (Oddin, Betgenius, mock data)

### API Surface Characteristics
1. REST endpoints are primarily Tapir-based and mounted through `PhoenixRestRoutes`.
2. Backoffice routes are mounted under `/admin` (see `BackofficeRoutes.adminMountPoint`).
3. Trading backoffice subset is mounted under `/admin/trading`.
4. WebSocket route root is `/web-socket`.
5. Dev routes include `/docs` and dev helper endpoints (e.g., test account sign-up).

### Frontend Baseline
1. Talon backoffice and sportsbook are separate Next.js apps and route trees.
2. Both rely on legacy API semantics and JWT/auth flows.
3. Existing frontend runtime assumptions are pre-Node-20 era and require modernization.

---

## 2) Target (To-Be) Architecture

### Strategic Direction
1. Replace Scala/Akka backend with Go services.
2. Keep frontends (Talon + sportsbook) and migrate them to modern Node 20+ tooling.
3. Run legacy and Go stacks in parallel until behavior parity is proven.

### Target Logical Services (Go)
1. `identity-service`:
   - login/session/token refresh/account verification endpoints
2. `punter-service`:
   - profile, limits, cool-off/self-exclusion, preferences
3. `market-service`:
   - sports/fixtures/markets read APIs and lifecycle controls
4. `bet-service`:
   - bet placement, status, history, lifecycle actions
5. `wallet-service`:
   - balances, transactions, responsibility checks, credit/debit operations
6. `payments-service`:
   - deposit/withdrawal flows and provider callbacks
7. `backoffice-service`:
   - `/admin` APIs for punters, markets, fixtures, tournaments, audits, reports
8. `realtime-gateway`:
   - websocket sessions, subscriptions, event fan-out
9. `ops-service` (or shared platform module):
   - health, metrics, readiness, admin diagnostics

### Data and Messaging
1. PostgreSQL remains system of record (schema evolved via managed migrations).
2. Event pipeline retained for market/settlement/realtime propagation.
3. Reconciliation jobs mandatory for wallet + bet lifecycle correctness.

### Platform and Delivery
1. Containerized service deployment.
2. CI/CD with build/test/security gates.
3. Observability baseline (structured logs, traces, metrics, alerting).
4. Rollback and cutover rehearsals as release prerequisites.

---

## 3) Migration Architecture (Strangler Pattern)

### Stages
1. Freeze and capture legacy API contracts.
2. Route selected read endpoints to Go while writes remain legacy.
3. Move write paths (wallet/bets) with dual-write or shadow-compare strategy.
4. Move settlement/realtime paths after ledger parity checks pass.
5. Decommission legacy Akka paths service-by-service.

### Safety Controls
1. Endpoint-level parity tests against legacy and Go.
2. Ledger reconciliation checks after every write-path migration.
3. Feature flags for endpoint cutover.
4. Fast rollback to legacy route map.

---

## 4) Architecture Decisions Locked by Product Owner
1. Backend migration target: Go (not Akka, Rust deferred).
2. Target runtimes: Node 20+ and Java 21 transitional support.
3. First launch scope: Sportsbook + Talon backoffice together.

---

## 5) Sprint 0 Deliverable Mapping
1. B001 (architecture diagrams and map): this document + inventories.
2. B002 (endpoint inventory):
   - `02_backend_route_patterns.csv`
   - `02_frontend_route_inventory.csv`
3. B003 (bounded contexts and ownership):
   - `03_DOMAIN_CONTEXT_OWNERSHIP.csv`

