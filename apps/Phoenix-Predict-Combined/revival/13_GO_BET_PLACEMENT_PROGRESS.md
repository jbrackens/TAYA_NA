# Go Bet Placement & Validation Progress (B017)

Date: 2026-03-02

Update: 2026-03-04

## Delivered

Implemented bet placement flow in Go gateway with richer domain validation, persistence modes, and lifecycle hooks.

### Bet Endpoints
- `POST /api/v1/bets/place`
- `GET /api/v1/bets/{betId}`

### Behavior
- Validates required bet fields (`userId`, `marketId`, `selectionId`, `stakeCents`, `odds`, `idempotencyKey`).
- Enforces market state and timing checks (`open` and pre-start only).
- Enforces selection integrity against market selections.
- Enforces stake/odds constraints (min/max stake, odds range, odds precision).
- Debits wallet on successful placement via wallet mutation API integration.
- Supports idempotent replay for repeated placement request with same payload.
- Returns `409 conflict` on idempotency key reuse with mismatched payload.
- Exposes placed bet lookup by `betId`.
- Supports persisted bet state via:
  - `BET_STORE_FILE=/abs/path/bets-state.json`
  - `BET_STORE_MODE=db`
  - `BET_DB_DRIVER=postgres` (or another registered `database/sql` driver)
  - `BET_DB_DSN=<dsn>`
- Adds lifecycle transition hooks:
  - settle, cancel, refund methods in bet service
  - admin HTTP lifecycle endpoints wired for B018 start

### Additional Hardening (2026-03-04)
- Canonical placement envelope support:
  - request metadata (`requestId`, `deviceId`, `segmentId`, `ipAddress`, `oddsPrecision`)
  - item payload support (`items[]`) with backward-compatible normalization
- Odds-change policy engine (`SB-102`) with env-configurable behavior and stable reject taxonomy.
- Live-time-delay policy foundation (`SB-103`) with configurable in-play enablement and delay controls.

## Files
- `go-platform/services/gateway/internal/bets/service.go`
- `go-platform/services/gateway/internal/bets/service_test.go`
- `go-platform/services/gateway/internal/http/bet_handlers.go`
- `go-platform/services/gateway/internal/http/bet_handlers_test.go`
- `go-platform/services/gateway/internal/http/handlers.go`

## Remaining to Complete B017
- None. B017 is complete.
- Follow-up moved to B018/B021: lifecycle expansion, ledger parity checks, admin bet search/read screens.

## Validation
```bash
cd /Users/johnb/Desktop/PhoenixBotRevival/Phoenix-Sportsbook-Combined
make go-test
```
