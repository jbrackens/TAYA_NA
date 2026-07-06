# SB-304/SB-305 Precheck + Audit Promo Parity Progress

Date: 2026-03-04  
Backlog reference: immediate queue item 32 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Extended sportsbook bet precheck contract to accept promo context:
   - `freebetId`
   - `oddsBoostId`.
2. Added promo-aware backend precheck validation:
   - rejects unaccepted/invalid odds-boost usage with stable reason taxonomy
   - rejects ineligible freebet usage (state/expiry/min-odds/ownership) with stable reason taxonomy.
3. Added audit visibility improvements for promo placement context:
   - bet placement audit details now include `freebetId`, `freebetAppliedCents`, and `oddsBoostId`.
4. Added deterministic test coverage for the new parity path:
   - service-level precheck promotion eligibility tests
   - HTTP-level precheck reason-code tests
   - HTTP-level admin audit verification for promo context on `bet.placed`.

## Key Files

1. Bet precheck/backend validation:
   - `go-platform/services/gateway/internal/bets/service.go`
   - `go-platform/services/gateway/internal/bets/service_test.go`
2. HTTP precheck contract wiring:
   - `go-platform/services/gateway/internal/http/bet_handlers.go`
   - `go-platform/services/gateway/internal/http/handlers_test.go`

## Validation

1. `cd go-platform/services/gateway && go test ./internal/bets ./internal/http ./internal/freebets ./internal/oddsboosts`
   - pass
2. `cd go-platform/services/gateway && go test ./...`
   - pass

## Remaining

1. Promo observability analytics extension has now been delivered in queue item 33.
2. Follow-up progress is tracked in:
   - `revival/99_SB304_SB305_PROMO_OBSERVABILITY_ANALYTICS_PROGRESS.md`.
3. Queue item 34 is completed and documented in:
   - `revival/100_SB304_SB305_TALON_PROMO_ANALYTICS_SURFACE_PROGRESS.md`.
4. Continue with queue item 35:
   - extend Talon audit-log UI with promo filter inputs for direct operator drill-down.
