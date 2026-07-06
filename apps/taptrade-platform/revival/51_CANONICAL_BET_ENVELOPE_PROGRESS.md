# Canonical Bet Placement Envelope Progress (SB-101)

Date: 2026-03-04  
Backlog reference: `SB-101` in `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Delivered

1. Extended bet placement request model with canonical envelope fields:
   - `requestId`
   - `deviceId`
   - `segmentId`
   - `ipAddress`
   - `oddsPrecision`
   - `items[]` (line payload)
2. Added envelope normalization for backward compatibility:
   - supports legacy single-line payloads.
   - supports canonical `items[]` payloads.
   - enforces single-line shape for current core placement path.
3. Added stronger envelope validation:
   - required identity/request fields (`userId`, `requestId`, `idempotencyKey`).
   - `ipAddress` format validation.
   - precision bounds and decimal precision consistency checks.
   - item/top-level consistency checks (market/selection/stake/odds).
4. Enhanced placement audit details with envelope metadata:
   - request id, segment, device, ip, precision, item count.

## API Surface

Updated endpoint:

- `POST /api/v1/bets/place`

New accepted payload fields (in addition to legacy fields):

1. `requestId`
2. `deviceId`
3. `segmentId`
4. `ipAddress`
5. `oddsPrecision`
6. `items[]` with:
   - `marketId`
   - `selectionId`
   - `stakeCents`
   - `odds`
   - `requestLineId` (optional)

## Key Files

1. Core bet service:
   - `go-platform/services/gateway/internal/bets/service.go`
2. HTTP mapping layer:
   - `go-platform/services/gateway/internal/http/bet_handlers.go`
3. API tests:
   - `go-platform/services/gateway/internal/http/bet_handlers_test.go`

## Tests Added/Updated

1. Added canonical envelope success test:
   - `TestPlaceBetSupportsCanonicalEnvelopeItems`
2. Added invalid envelope rejection tests:
   - multi-item payload rejected for current single-line core.
   - invalid `ipAddress` rejected.
3. Existing bet service and route tests remain green.

## Validation

1. `cd go-platform/services/gateway && go test ./...`
   - pass
2. `cd go-platform/modules/platform && go test ./...`
   - pass

## Notes

1. This iteration establishes canonical envelope and validation boundaries while preserving compatibility with legacy single-line requests.
2. Multi-line bet composition is intentionally deferred to `SB-202` (Bet Builder/combinability path).

## Next

1. Start `SB-102` odds-change policy + stable reject-reason taxonomy.
2. Start `SB-103` LTD policy enforcement path.
