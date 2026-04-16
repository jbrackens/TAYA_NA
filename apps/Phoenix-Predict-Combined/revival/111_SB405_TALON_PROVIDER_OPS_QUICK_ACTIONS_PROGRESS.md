# 111 - SB-405 Talon Provider Ops Quick Actions (Prefill + Deep-link)

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 45 by adding row-level quick-action shortcuts in Provider Ops so operators can move directly from high-risk stream triage to intervention workflows.

## Implementation

### 1) Stream context and audit query contracts
Updated:
- `talon-backoffice/packages/office/containers/provider-ops/contracts.ts`
- `talon-backoffice/packages/office/containers/provider-ops/__tests__/contracts.test.ts`

Changes:
1. Extended stream model with optional triage context fields:
   - `lastBetId`
   - `lastPlayerId`
   - `lastRequestId`
2. Added `buildProviderStreamAuditLogQuery(stream)`:
   - maps stream health (`state`/`lastError`) to action filter (`provider.cancel.failed` vs `provider.cancel.succeeded`),
   - carries `actorId` when adapter is available.
3. Added contract tests for stream-scoped audit query mapping.

### 2) Provider Ops row-level quick actions
Updated:
- `talon-backoffice/packages/office/containers/provider-ops/index.tsx`

Added stream table `Actions` column with:
1. `Prefill cancel`
   - prepopulates manual-cancel form with adapter/player/bet/request ids when present.
2. `Prefill intervention`
   - prepopulates intervention form with bet id and triage reason context.
3. `Open stream audit`
   - deep-links into audit logs with stream-scoped query contract.

### 3) Translation coverage
Updated:
- `talon-backoffice/packages/office/translations/en/page-provider-ops.js`
- `talon-backoffice/packages/office/public/static/locales/en/page-provider-ops.json`

Added keys:
- `HEADER_ACTIONS`
- `ACTION_PREFILL_CANCEL`
- `ACTION_PREFILL_INTERVENTION`
- `ACTION_STREAM_AUDIT`

### 4) Container test coverage
Updated:
- `talon-backoffice/packages/office/containers/provider-ops/__tests__/provider-ops.test.tsx`

Added behavior test for:
1. stream-row prefill actions updating cancel/intervention forms.
2. stream-row audit shortcut pushing expected route/query payload.

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
High-risk stream triage now has direct workflow shortcuts to reduce manual form-entry time and improve incident response continuity from the Provider Ops cockpit.

## Next
Backlog item 46:
- Add stream triage acknowledgment tracking (operator note + timestamp) for incident ownership inside Provider Ops.
