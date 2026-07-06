# Go Bet Settlement Lifecycle Progress (B018)

Date: 2026-03-03

## Delivered (Complete for Relaunch Scope)

Settlement lifecycle transitions are implemented in the Go gateway, wired to wallet behavior, persisted as lifecycle events, and surfaced in admin audit logs.

### Admin Lifecycle Endpoints

1. `POST /admin/bets/{betId}/lifecycle/settle`
2. `POST /admin/bets/{betId}/lifecycle/cancel`
3. `POST /admin/bets/{betId}/lifecycle/refund`
4. `POST /api/v1/admin/bets/{betId}/lifecycle/settle`
5. `POST /api/v1/admin/bets/{betId}/lifecycle/cancel`
6. `POST /api/v1/admin/bets/{betId}/lifecycle/refund`

### Lifecycle Behavior

1. Settle winning bet:
   - status `settled_won`
   - wallet credit `potentialPayoutCents`
2. Settle losing bet:
   - status `settled_lost`
   - no payout credit
3. Cancel placed bet:
   - status `cancelled`
   - stake refund
4. Refund transition:
   - allowed from `placed` and `settled_lost`
   - status `refunded`
   - stake credit
5. Transition conflicts return `409 conflict`.
6. Admin guard enforced via `X-Admin-Role: admin` (with local bypass env support).

### Lifecycle Reason/Actor Metadata

1. `actorId` captured from `X-Admin-Actor` (fallback `admin`).
2. Normalized reason codes:
   - settle: `result_confirmed`
   - cancel: `cancelled_by_admin`
   - refund: `refunded_by_admin`
3. Optional settle metadata:
   - `winningSelectionName`
   - `resultSource`

### Event/Audit Persistence

1. Lifecycle events persist in file and db store modes.
2. Event model includes action, actor, reason, status, details, timestamp.
3. Admin audit endpoint includes dynamic bet lifecycle events:
   - `bet.placed`
   - `bet.settled`
   - `bet.cancelled`
   - `bet.refunded`

## No-Legacy-Migration Decision

Production historical dataset onboarding is **de-scoped** for relaunch. B018 completion is now based on live-system lifecycle correctness and test coverage, not migrated legacy bet replay.

## Files

1. `go-platform/services/gateway/internal/bets/service.go`
2. `go-platform/services/gateway/internal/bets/service_test.go`
3. `go-platform/services/gateway/internal/http/bet_handlers.go`
4. `go-platform/services/gateway/internal/http/bet_handlers_test.go`
5. `go-platform/services/gateway/internal/http/admin_handlers.go`
6. `go-platform/services/gateway/internal/http/handlers.go`
7. `go-platform/services/gateway/internal/http/handlers_test.go`

## Validation

```bash
cd /Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined
make go-test
```

Pass evidence:

1. `/Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined/revival/artifacts/verify_go_20260303_190842.log`
