# SB-204 Fixed Exotics Admin Controls Progress

Date: 2026-03-04  
Backlog reference: immediate queue item 14 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Added fixed-exotics admin observability APIs:
   - list quotes with filters (`userId`, `status`, `limit`)
   - fetch quote by ID
2. Added fixed-exotics manual intervention API:
   - admin lifecycle action to expire open quotes
3. Added fixed-exotics service-side admin operations:
   - quote list filtering/sorting/limit handling
   - admin expire transition with actor/reason attribution
4. Added conflict safety:
   - accepted quotes cannot be force-expired
   - already-expired quotes remain idempotent
5. Added test coverage for:
   - service list + admin expire behavior
   - HTTP admin list/get/expire route behavior and conflict responses.

## Admin Endpoints

1. `GET /api/v1/admin/exotics/fixed/quotes?userId=&status=&limit=`
2. `GET /api/v1/admin/exotics/fixed/quotes/{quoteId}`
3. `POST /api/v1/admin/exotics/fixed/quotes/{quoteId}/lifecycle/expire`
   - payload: `{ "reason": "..." }`
   - requires `X-Admin-Role: admin`

## Key Files

1. Service logic:
   - `go-platform/services/gateway/internal/bets/fixed_exotics.go`
   - `go-platform/services/gateway/internal/bets/fixed_exotics_test.go`
2. HTTP admin routes:
   - `go-platform/services/gateway/internal/http/bet_handlers.go`
   - `go-platform/services/gateway/internal/http/bet_handlers_test.go`

## Validation

1. `cd go-platform/services/gateway && go test ./internal/bets/... ./internal/http/...`
   - pass

## Remaining

1. Talon backoffice UI still needs explicit operator screens/forms for:
   - viewing filtered fixed-exotics quote state
   - expiring open quotes with confirmation prompts and actor/reason capture.
