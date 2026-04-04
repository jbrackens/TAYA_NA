# Max-Bet Eligibility Precheck Progress (SB-105)

Date: 2026-03-04  
Backlog reference: `SB-105` in `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Delivered

1. Completed precheck endpoint contract at `POST /api/v1/bets/precheck`.
2. Added precheck envelope parity with placement envelope:
   - `requestId`, `deviceId`, `segmentId`, `ipAddress`, `oddsPrecision`, `acceptAnyOdds`, `items`.
3. Added structured precheck response signals for betslip UX:
   - `allowed`
   - `reasonCode`
   - `minStakeCents`
   - `maxStakeCents`
   - `requiredStakeCents`
   - `availableBalanceCents`
   - odds/LTD policy outputs (`requestedOdds`, `currentOdds`, `acceptedOdds`, `oddsChanged`, `oddsPolicy`, `inPlay`, `appliedLtdMsec`).
4. Added insufficient-funds eligibility in precheck using wallet balance, with stable reason taxonomy (`insufficient_funds`).

## Behavior Notes

1. Precheck uses the same normalization/validation/policy path as placement to prevent drift.
2. Rejections are returned as successful precheck responses with `allowed=false` and stable `reasonCode`, not transport-level errors.
3. Stake range and wallet eligibility are both returned before placement attempts.

## Key Files

1. Service precheck logic and response fields:
   - `go-platform/services/gateway/internal/bets/service.go`
2. Public precheck route:
   - `go-platform/services/gateway/internal/http/bet_handlers.go`
3. Coverage:
   - `go-platform/services/gateway/internal/bets/service_test.go`
   - `go-platform/services/gateway/internal/http/bet_handlers_test.go`

## Tests Added

1. `TestPrecheckReturnsAllowAndReasonCodes`
   - verifies allow path and stable odds-change rejection taxonomy.
2. `TestPrecheckReturnsEligibilityAndReasonCodes`
   - verifies endpoint response fields and insufficient-funds behavior.

## Validation

1. `cd go-platform/services/gateway && go test ./...`
   - pass
2. `cd go-platform/modules/platform && go test ./...`
   - pass

## Why this satisfies SB-105 foundation

1. The canonical precheck endpoint now returns eligibility and stake-limit outcomes before placement.
2. Response fields are stable and UX-ready for betslip pre-flight checks.
3. Policy outcomes align with placement behavior, reducing mismatch risk between precheck and place paths.

## Next

1. Wire sportsbook betslip client calls to `/api/v1/bets/precheck`.
2. Expand precheck for multi-leg composition after SB-202 rollout.
3. Integrate provider-side max-stake feeds once adapter command path is activated.
