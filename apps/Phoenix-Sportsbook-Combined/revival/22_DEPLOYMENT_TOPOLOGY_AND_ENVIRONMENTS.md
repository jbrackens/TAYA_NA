# Deployment Topology and Environments

## Objective

Define a concrete target topology for the Phoenix Sportsbook relaunch, aligned with the Go migration and dual-frontend launch scope.

## Runtime Targets

- Frontends/tooling: **Node 20.x**
- Transitional JVM services: **Java 21 target** (Java 17 fallback currently allowed locally)
- Go services: Go workspace in `go-platform/`

## Service Topology (Target)

### Edge and Frontends

- `sportsbook-web` (Next.js app)
  - source: `phoenix-frontend-brand-viegg/packages/app`
  - external route: `/` (customer-facing sportsbook)
- `talon-office-web` (Next.js app)
  - source: `talon-backoffice/packages/office`
  - external route: `/office` (or dedicated admin host)

### API Layer

- `gateway-api` (Go)
  - source: `go-platform/services/gateway`
  - responsibilities:
    - markets/fixtures read
    - wallet mutations + reconciliation
    - bet placement/settlement lifecycle
    - admin read/mutation endpoints
- `auth-api` (Go)
  - source: `go-platform/services/auth`
  - responsibilities:
    - login/session/refresh
    - auth metrics and audit events

### Data and Supporting Components

- `postgres-primary`
  - legacy + transitional schema owner for sportsbook data
- `migration-runner` (Flyway)
  - migration source: `phoenix-backend/services/src/main/resources/db/migration`
- `event-stream` (Kafka family, for async market/settlement workflows in later phases)

## Environment Matrix

| Environment | Purpose | API URLs | Frontend URLs | Data Strategy |
|---|---|---|---|---|
| Local | Developer iteration | `http://127.0.0.1:18080` (gateway), `http://127.0.0.1:18081` (auth) | Talon: `:3000`, Sportsbook: `:3002` | local state files + optional local Postgres |
| Integration | Cross-service contract checks | cluster internal LB | internal ingress hostnames | isolated integration DB + seeded fixtures |
| Staging | Dress rehearsal and cutover drills | staging gateway/auth hosts | staging sportsbook/talon hosts | production-like schema + anonymized seed |
| Production | Live relaunch | production gateway/auth hosts | production sportsbook/talon hosts | controlled migration with rollback plan |

## Deployment Units

- Each service deploys as an independent unit with:
  - image tag pinned by git SHA
  - immutable config map / env set
  - health endpoints (`/healthz`, `/readyz`)
  - metrics endpoint (`/metrics`) for Go services

## Rollout Strategy (Phase 6-8)

1. Deploy Go `auth-api` + `gateway-api` in shadow mode against staged data.
2. Run parity and reconciliation checks against historical exports.
3. Shift Talon read paths to Go endpoints.
4. Shift sportsbook read paths, then write paths.
5. Execute rollback drill before production cutover.

## Notes

- This topology is the baseline contract for B025 and downstream release rehearsal tasks.
- Environment-specific credentials and vendor integrations remain externalized and are not embedded in this document.
