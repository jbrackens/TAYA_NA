# SB-204 Fixed Exotics Contract Scaffold Progress

Date: 2026-03-04  
Backlog reference: immediate queue item 11 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Introduced fixed-exotics quote domain contract in gateway (`exacta`, `trifecta`) with explicit request/response models.
2. Implemented initial fixed-exotics quote service method:
   - validates exotic type and leg shape
   - enforces distinct markets per leg
   - enforces single-fixture combinability
   - validates market/selection/odds constraints against canonical read model
   - computes combined odds, implied probability, potential payout, and encoded ticket.
3. Added stable fixed-exotics reason-code taxonomy:
   - `invalid_fixed_exotic_request`
   - `fixed_exotic_type_unsupported`
   - `fixed_exotic_fixture_mismatch`
   - `fixed_exotic_duplicate_market`
4. Added canonical HTTP endpoint scaffold:
   - `POST /api/v1/bets/exotics/fixed/quote`
5. Added frontend API contract scaffolding and runtime response-shape guard for fixed-exotics quote payloads.
6. Added localization strings for new fixed-exotics reason codes.

## Key Files

1. Gateway domain + route:
   - `go-platform/services/gateway/internal/bets/fixed_exotics.go`
   - `go-platform/services/gateway/internal/bets/service.go`
   - `go-platform/services/gateway/internal/http/bet_handlers.go`
2. Gateway tests:
   - `go-platform/services/gateway/internal/bets/fixed_exotics_test.go`
   - `go-platform/services/gateway/internal/http/bet_handlers_test.go`
3. Frontend contracts:
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/contracts.ts`
   - `phoenix-frontend-brand-viegg/packages/app-core/services/api/__tests__/response-shapes.test.ts`
   - `phoenix-frontend-brand-viegg/packages/app/public/static/locales/en/api-errors.json`

## Validation

1. `cd go-platform/services/gateway && go test ./internal/bets/...`
   - pass
2. `cd go-platform/services/gateway && go test ./internal/http/...`
   - pass
3. `cd phoenix-frontend-brand-viegg && yarn workspace @phoenix-ui/app test --runTestsByPath services/api/__tests__/response-shapes.test.ts services/api/__tests__/bet-builder-service.test.ts components/layout/betslip/__tests__/same-game-combo.test.ts --passWithNoTests`
   - pass

## Remaining

1. Add fixed-exotics quote persistence/TTL and accept/place lifecycle (`quote -> accept -> bet`).
2. Add settlement normalization path for exotics outcomes and reconciliation assertions.
3. Add sportsbook UI entry path for exotics authoring and placement feedback.
