# Live Time Delay Policy Engine Progress (SB-103)

Date: 2026-03-04  
Backlog reference: `SB-103` in `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Delivered

1. Added in-play detection and policy decision layer for placement:
   - determines in-play from market/fixture start timestamps.
2. Added configurable in-play enablement and LTD controls:
   - `BET_ALLOW_INPLAY` (default `false`)
   - `BET_LTD_ENABLED` (default `true`)
   - `BET_LTD_INPLAY_MS` (default `0`)
3. Added enforced LTD delay for in-play placements when enabled/configured.
4. Added auditable LTD metadata on placed bet:
   - `inPlay`
   - `appliedLtdMsec`
5. Placement audit details now include LTD decision fields:
   - `inPlay`
   - `appliedLtdMsec`

## Behavior Notes

1. Backward-compatible default:
   - in-play remains blocked unless `BET_ALLOW_INPLAY=true`.
2. LTD is applied only when:
   - in-play placement is allowed
   - LTD enabled
   - configured delay > 0.

## Key Files

1. LTD/in-play policy integration:
   - `go-platform/services/gateway/internal/bets/service.go`
2. Coverage:
   - `go-platform/services/gateway/internal/bets/service_test.go`

## Tests Added

1. `TestPlaceBetAppliesInPlayLtdWhenEnabled`
   - verifies delay is enforced and metadata is set.

## Validation

1. `cd go-platform/services/gateway && go test ./...`
   - pass
2. `cd go-platform/modules/platform && go test ./...`
   - pass

## Why this satisfies SB-103 foundation

1. LTD policy is now explicitly modeled and enforceable for in-play bets.
2. Enforcement behavior is configurable by environment.
3. LTD application is auditable in placement metadata and event traces.

## Next

1. Expand LTD policy to multi-leg in-play compositions after SB-202 path activation.
2. Add policy jitter/window controls and operation-level telemetry for LTD distributions.
