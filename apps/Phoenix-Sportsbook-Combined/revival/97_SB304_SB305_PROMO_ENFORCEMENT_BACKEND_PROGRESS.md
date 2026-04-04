# SB-304/SB-305 Promo Enforcement Backend Progress

Date: 2026-03-04  
Backlog reference: immediate queue item 31 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Added backend sportsbook placement promo fields to gateway placement contract:
   - `freebetId`
   - `oddsBoostId`.
2. Implemented freebet backend enforcement lifecycle for placement:
   - deterministic `ApplyToBet` flow with idempotency keying
   - status/expiry/min-odds/ownership enforcement
   - amount application against `remainingAmountCents`
   - rollback hook for failed placement flow.
3. Implemented odds-boost backend enforcement validation for placement:
   - requires accepted state
   - validates ownership, expiry, market/selection alignment
   - enforces stake limits and boosted-odds match.
4. Wired promotion services into gateway bet placement service and request path:
   - placement now validates accepted odds-boost server-side before commit
   - placement now applies freebet server-side and credits applied amount into wallet ledger
   - placement persists and returns promotion context on the bet entity.
5. Extended bet persistence schema + DB read/write path with promo fields:
   - `freebet_id`
   - `freebet_applied_cents`
   - `odds_boost_id`.
6. Added deterministic unit and HTTP tests for promo enforcement path:
   - freebet lifecycle/idempotency/rollback coverage
   - odds-boost validate-for-placement coverage
   - bet placement success/failure promo scenarios with reason-code assertions.

## Key Files

1. Promo domain services:
   - `go-platform/services/gateway/internal/freebets/service.go`
   - `go-platform/services/gateway/internal/freebets/service_test.go`
   - `go-platform/services/gateway/internal/oddsboosts/service.go`
   - `go-platform/services/gateway/internal/oddsboosts/service_test.go`
2. Bet placement enforcement + persistence:
   - `go-platform/services/gateway/internal/bets/service.go`
   - `go-platform/services/gateway/internal/bets/service_test.go`
3. HTTP wiring and error mapping:
   - `go-platform/services/gateway/internal/http/handlers.go`
   - `go-platform/services/gateway/internal/http/bet_handlers.go`
   - `go-platform/services/gateway/internal/http/handlers_test.go`

## Validation

1. `cd go-platform/services/gateway && go test ./internal/freebets ./internal/oddsboosts ./internal/bets ./internal/http`
   - pass
2. `cd go-platform/services/gateway && go test ./...`
   - pass

## Remaining

1. Promo parity extension for precheck + admin observability has now been delivered in queue item 32.
2. Follow-up progress is tracked in:
   - `revival/98_SB304_SB305_PRECHECK_AUDIT_PROMO_PARITY_PROGRESS.md`.
3. Continue with queue item 33:
   - promote promo observability into filterable analytics dimensions and counters.
