# SB-304/SB-305 Promo Observability Analytics Progress

Date: 2026-03-05  
Backlog reference: immediate queue item 33 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Added first-class promo analytics summary capability in gateway bet service:
   - aggregate totals for promo usage (`totalBets`, `betsWithFreebet`, `betsWithOddsBoost`, `betsWithBoth`)
   - monetary counters (`totalStakeCents`, `totalFreebetAppliedCents`, `totalBoostedStakeCents`)
   - unique dimensions (`uniqueUsers`, `uniqueFreebets`, `uniqueOddsBoosts`)
   - ranked breakdowns (`freebets[]`, `oddsBoosts[]`) with per-id counts/stake usage.
2. Added new admin endpoint:
   - `GET /api/v1/admin/promotions/usage`
   - also available on legacy path `GET /admin/promotions/usage`.
3. Added endpoint filters and bounds:
   - `userId`
   - `freebetId`
   - `oddsBoostId`
   - `from` / `to` (RFC3339)
   - `breakdownLimit` (bounded for safety).
4. Extended admin audit log model with first-class promo dimensions:
   - `userId`
   - `freebetId`
   - `oddsBoostId`
   - `freebetAppliedCents`
5. Extended admin audit log filtering to support promo dimensions:
   - `userId`
   - `freebetId`
   - `oddsBoostId`.

## Key Files

1. Promo analytics service layer:
   - `go-platform/services/gateway/internal/bets/service.go`
   - `go-platform/services/gateway/internal/bets/service_test.go`
2. Admin endpoint and audit filtering:
   - `go-platform/services/gateway/internal/http/admin_handlers.go`
   - `go-platform/services/gateway/internal/http/handlers_test.go`

## Validation

1. `cd go-platform/services/gateway && go test ./internal/bets ./internal/http`
   - pass
2. `cd go-platform/services/gateway && go test ./...`
   - pass

## Remaining

1. Queue item 34 has now been completed in:
   - `revival/100_SB304_SB305_TALON_PROMO_ANALYTICS_SURFACE_PROGRESS.md`.
2. Continue with queue item 35:
   - expose promo dimensions as first-class filters in Talon audit-log UI (`userId`, `freebetId`, `oddsBoostId`).
