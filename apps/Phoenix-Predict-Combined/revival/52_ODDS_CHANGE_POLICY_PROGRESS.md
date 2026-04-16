# Odds-Change Policy and Reject Taxonomy Progress (SB-102)

Date: 2026-03-04  
Backlog reference: `SB-102` in `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Delivered

1. Added configurable odds-change policy engine in bet placement:
   - `accept_requested` (default, backward-compatible)
   - `accept_latest`
   - `reject_on_change`
   - `only_better`
2. Added request-level override support:
   - `acceptAnyOdds` in bet placement payload can bypass strict reject behavior.
3. Captured odds decision metadata in placed bet model:
   - `requestedOdds`
   - `currentOdds`
   - `oddsChangePolicy`
   - `oddsChanged`
4. Added stable reject taxonomy exposure in API error details:
   - `reasonCode` in bad-request/conflict payloads.
   - includes `odds_changed`, `invalid_request`, `selection_not_found`, `stake_out_of_range`, `odds_out_of_range`, `idempotency_conflict`, etc.
5. Placement audit details now include policy/odds decision trace for backoffice/audit log visibility.

## Configuration

1. `BET_ODDS_CHANGE_POLICY`
   - one of: `accept_requested`, `accept_latest`, `reject_on_change`, `only_better`
2. `acceptAnyOdds` request flag
   - request-scoped override for strict rejection flows.

## API Surface

Updated endpoint:

- `POST /api/v1/bets/place`

New optional input:

1. `acceptAnyOdds`

## Key Files

1. Policy engine + placement decision model:
   - `go-platform/services/gateway/internal/bets/service.go`
2. HTTP payload mapping and error taxonomy surfacing:
   - `go-platform/services/gateway/internal/http/bet_handlers.go`
3. Coverage:
   - `go-platform/services/gateway/internal/bets/service_test.go`
   - `go-platform/services/gateway/internal/http/bet_handlers_test.go`

## Validation

1. `cd go-platform/services/gateway && go test ./...`
   - pass
2. `cd go-platform/modules/platform && go test ./...`
   - pass

## Why this satisfies SB-102 foundation

1. Accept/reject odds-change behavior is now policy-driven and environment-configurable.
2. Rejections are emitted with stable, machine-readable reason codes for UI/backoffice handling.
3. Placement decisions are auditable through event details and response metadata.

## Next

1. Extend policy matrix to multi-leg combinations once SB-202 multi-line placement path is enabled.
2. [done] Added conformance/regression gate coverage for odds policy behavior (`SB-501`/`SB-502`):
   - `TestPlaceBetRejectsOddsChangeWhenPolicyRejectOnChange`
   - `TestPlaceBetAcceptLatestOddsWhenConfigured`
   - executed via `make qa-regression-pack`.
