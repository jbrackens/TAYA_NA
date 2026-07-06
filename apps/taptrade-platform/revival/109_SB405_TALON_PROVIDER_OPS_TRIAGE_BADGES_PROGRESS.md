# 109 - SB-405 Talon Provider Ops Triage UX (Unhealthy Toggle + Breach Badges)

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 43 by extending Talon Provider Ops triage UX with:
1. Explicit unhealthy-only stream toggle.
2. Threshold-breach badges per stream row (lag, gap, duplicate, error).
3. Stream filtering behavior that combines adapter filter + unhealthy toggle.

## Implementation

### 1) Provider Ops stream triage controls
Updated:
- `talon-backoffice/packages/office/containers/provider-ops/index.tsx`

Changes:
1. Added `showUnhealthyOnly` state and a `Switch` control in the filter toolbar.
2. Extended stream filtering logic to apply:
   - adapter match (when selected), and
   - unhealthy-only predicate using `isStreamUnhealthy(stream, thresholds)`.
3. Added a breach rendering column (`HEADER_BREACHES`) to the stream table.
4. Added per-row breach tags based on `computeStreamBreaches`:
   - `BREACH_LAG`
   - `BREACH_GAP`
   - `BREACH_DUPLICATE`
   - `BREACH_ERROR`
   - fallback `BREACH_NONE` when no breach is present.

### 2) Translation coverage
Updated:
- `talon-backoffice/packages/office/translations/en/page-provider-ops.js`
- `talon-backoffice/packages/office/public/static/locales/en/page-provider-ops.json`

Added keys:
- `FILTER_UNHEALTHY_ONLY`
- `HEADER_BREACHES`
- `BREACH_LAG`
- `BREACH_GAP`
- `BREACH_DUPLICATE`
- `BREACH_ERROR`
- `BREACH_NONE`

### 3) Contract and container tests
Updated:
- `talon-backoffice/packages/office/containers/provider-ops/__tests__/contracts.test.ts`
- `talon-backoffice/packages/office/containers/provider-ops/__tests__/provider-ops.test.tsx`

Coverage added:
1. Breach computation contract assertions (lag/gap/duplicate/error + unhealthy predicate).
2. Container behavior for:
   - breach tags in rendered stream rows,
   - unhealthy-only toggle filtering out healthy rows while retaining unhealthy rows.

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
SB-405 item 43 is complete. Provider Ops now gives operators an explicit triage path for unstable streams via unhealthy-only filtering and visible breach classifications.

## Next
Backlog item 44:
- Add provider-ops triage ordering and stream-risk summary counters so highest-impact feed issues surface first.
