# SB-204 Fixed Exotics Lifecycle Progress

Date: 2026-03-04  
Backlog reference: immediate queue item 12 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Extended fixed-exotics from quote-only scaffold into full quote lifecycle:
   - quote creation with persistence/idempotency
   - quote retrieval by ID
   - quote expiry transition
   - quote accept transition
2. Implemented fixed-exotics placement path:
   - wallet-safe stake debit on accept
   - idempotent accept replay behavior
   - native multi-leg bet persistence with fixed-exotic metadata (`marketId`, encoded ticket, positioned legs)
3. Added fixed-exotics lifecycle HTTP endpoints:
   - `POST /api/v1/bets/exotics/fixed/quote`
   - `GET /api/v1/bets/exotics/fixed/quotes/{quoteId}`
   - `POST /api/v1/bets/exotics/fixed/accept`
4. Added fixed-exotics lifecycle reason taxonomy:
   - `fixed_exotic_quote_not_found`
   - `fixed_exotic_quote_expired`
   - `fixed_exotic_quote_conflict`
5. Added settlement normalization coverage for fixed-exotic multi-leg bets:
   - winning settle with multi-selection payload (`home,over`) succeeds and normalizes reference
   - single-selection settle payload rejected for multi-leg fixed-exotic bet.
6. Extended frontend API contracts + response-shape guards for fixed-exotics accept responses and new quote lifecycle fields.
7. Added localized API error strings for fixed-exotics lifecycle errors.

## Key Files

1. Fixed-exotics lifecycle core:
   - `go-platform/services/gateway/internal/bets/fixed_exotics.go`
   - `go-platform/services/gateway/internal/bets/service.go`
2. Fixed-exotics service tests:
   - `go-platform/services/gateway/internal/bets/fixed_exotics_test.go`
3. HTTP route + mapping:
   - `go-platform/services/gateway/internal/http/bet_handlers.go`
   - `go-platform/services/gateway/internal/http/bet_handlers_test.go`
4. Frontend contract updates:
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

1. Add sportsbook fixed-exotics UI and hook integration (quote/accept path).
2. Add backoffice/admin controls for fixed-exotics lifecycle observability and manual intervention.
