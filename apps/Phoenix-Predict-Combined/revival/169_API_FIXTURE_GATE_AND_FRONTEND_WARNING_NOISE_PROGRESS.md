# 169 - API Fixture Gate + Frontend Warning-Noise Reduction

Date: 2026-03-05  
Owner: Codex

## Scope
Implemented Section 13 coverage for API fixture regression gating and incremental frontend warning-noise reduction.

## Implementation

Added:
- `scripts/frontend/verify-api-contract-fixtures.sh`

Updated:
- `Makefile` (new target: `verify-api-contract-fixtures`)
- `scripts/frontend/verify-sportsbook.sh`
- `scripts/frontend/verify-talon.sh`

### Changes
1. New local/CI gate:
- `make verify-api-contract-fixtures`
- Runs sportsbook response-shape fixture suite:
  - `services/api/__tests__/response-shapes.test.ts`

2. Reduced noisy legacy Browserslist warnings during verify builds by setting:
- `BROWSERSLIST_IGNORE_OLD_DATA=1`
- applied in sportsbook and talon Next build execution path.

## Validation
1. `make verify-api-contract-fixtures` (pass)
2. `make verify-talon` (pass)
3. `make verify-sportsbook` (pass)

## Outcome
Section 13 item (3) is operationalized via dedicated gate, and item (5) gets an incremental modernization/noise-reduction step while preserving green verify gates.
