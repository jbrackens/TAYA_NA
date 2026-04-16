# 112 - SB-405 Talon Provider Ops Acknowledgement Workflow

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 46 by introducing a stream triage acknowledgement workflow in Provider Ops, with operator note/timestamp ownership tracking surfaced in the cockpit.

## Implementation

### 1) Contracts and stream-key utility
Updated:
- `talon-backoffice/packages/office/containers/provider-ops/contracts.ts`
- `talon-backoffice/packages/office/containers/provider-ops/__tests__/contracts.test.ts`

Added:
1. `StreamAcknowledgement` type.
2. `buildStreamKey({adapter, stream})` helper for stable per-stream acknowledgement keys.
3. Contract test for key normalization.

### 2) Cockpit acknowledgement UI and state
Updated:
- `talon-backoffice/packages/office/containers/provider-ops/index.tsx`

Added:
1. Local acknowledgement state map (`acknowledgements`) keyed by stream.
2. Acknowledgement form card:
   - stream selector
   - operator input
   - acknowledgement note input
   - submit/reset actions
3. Acknowledgement rendering in stream table:
   - pending vs acknowledged status
   - operator
   - timestamp
   - note
4. Triage summary counter for acknowledged streams.

### 3) Translation coverage
Updated:
- `talon-backoffice/packages/office/translations/en/page-provider-ops.js`
- `talon-backoffice/packages/office/public/static/locales/en/page-provider-ops.json`

Added keys:
- `HEADER_ACKNOWLEDGED`
- `TRIAGE_ACKNOWLEDGED`
- `ACK_FORM_TITLE`
- `ACK_FIELD_STREAM`
- `ACK_FIELD_OPERATOR`
- `ACK_FIELD_NOTE`
- `ACK_ACTION_SUBMIT`
- `ACK_ACTION_RESET`
- `ACK_STATUS_PENDING`
- `ACK_STATUS_ACKNOWLEDGED`

### 4) Test updates
Updated:
- `talon-backoffice/packages/office/containers/provider-ops/__tests__/provider-ops.test.tsx`

Coverage extended for:
1. acknowledgement form surface presence.
2. coexistence with stream quick-action prefill/deep-link paths.

## Validation
Executed with Node 20 active (`nvm use 20`):

1. Provider Ops tests:
- `cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts --passWithNoTests`
- Result: PASS

2. Locale generation:
- `cd talon-backoffice && yarn bootstrap:locales`
- Result: PASS

3. TypeScript check:
- `cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Provider Ops now records explicit triage ownership context at stream level (operator note + timestamp), making incident handling visible in-cockpit.

## Next
Backlog item 47:
- Persist acknowledgement state via backend/admin API integration so ownership survives reload and is shared across operators.
