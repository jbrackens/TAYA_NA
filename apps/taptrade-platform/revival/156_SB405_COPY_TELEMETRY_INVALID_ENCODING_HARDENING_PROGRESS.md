# 156 - SB-405 Scoped Copy Telemetry Invalid-Encoding Decode Hardening

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 90 by hardening scoped-copy telemetry signature decoding against invalid percent-encoding inputs and adding regression tests.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/audit-logs/utils/scoped-copy-telemetry.ts`
- `talon-backoffice/packages/office/containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts`

### 1) Decode safety hardening
Updated query-key signature resolver to use safe decode behavior:
- wrap `decodeURIComponent` in `try/catch`
- fallback to raw key string when decoding fails

This prevents malformed query keys from throwing and breaking telemetry flows.

### 2) Invalid-encoding regression coverage
Added explicit tests for malformed inputs:
- `bad%ZZ`
- incomplete multibyte sequence `bad%E0%A4%A`

Assertions now verify:
- no throw
- stable signature output with fallback raw key normalization

## Validation
1. Expanded focused SB-405 suite:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx jest --config ./jest.config.js containers/audit-logs/__tests__/audit-logs.test.tsx containers/audit-logs/utils/__tests__/scoped-copy-telemetry.test.ts containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts lib/telemetry/__tests__/scoped-copy-events.test.ts --runInBand --coverage=false`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Scoped-copy telemetry is now resilient to malformed query key encoding, reducing runtime risk from malformed/mutated URL handoff inputs.

## Next
Queue item 91:
- Add scoped-copy telemetry utility edge-case tests for `+`-encoded key names and normalize signature handling for plus literals/spaces.
