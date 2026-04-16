# 120 - SB-405 Audit Preset Handoff Contract

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 54 by introducing a `preset` query contract between Provider Ops deep-links and Talon audit logs (`/logs`), so recommended provider-ops filter bundles auto-apply while operators can still override filter values manually.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/audit-logs/index.tsx`
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`
- `talon-backoffice/packages/office/containers/provider-ops/contracts.ts`
- `talon-backoffice/packages/office/containers/provider-ops/__tests__/contracts.test.ts`
- `talon-backoffice/packages/office/containers/provider-ops/__tests__/provider-ops.test.tsx`

### 1) `/logs` preset query ingestion
Added preset parsing and hydration in audit logs:
1. Reads `preset` from `router.query`.
2. Resolves preset defaults (`action`/`targetId` etc.) when explicit query values are absent.
3. Preserves explicit operator overrides over preset defaults.
4. Carries active `preset` across table pagination and apply actions.

### 2) Provider Ops deep-link handoff
Extended provider-ops audit query builders to include preset keys:
1. SLA default deep-link -> `preset=provider-ack-sla-default`
2. SLA adapter deep-link -> `preset=provider-ack-sla-adapter`
3. Stream acknowledgement lifecycle deep-links map to:
   - `provider-acknowledged`
   - `provider-reassigned`
   - `provider-resolved`
   - `provider-reopened`

### 3) Contract/test updates
Added coverage for:
1. `/logs` API fetch behavior when only `preset` is provided (no explicit action/target query).
2. Preset chip router-push payload includes `preset` key.
3. Provider Ops SLA deep-link includes `preset` in query.
4. Provider Ops query-builder expectations include preset output.

## Validation
1. Focused Talon suites:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/audit-logs/__tests__/audit-logs.test.tsx components/audit-logs/utils/__tests__/resolvers.test.ts containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts --passWithNoTests`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Provider Ops can now pass structured preset context into `/logs`, which auto-hydrates recommended filters while retaining manual operator control and preserving stable query behavior across pagination/apply interactions.

## Next
Queue item 55:
- Add preset-origin UX on `/logs` (active preset banner + one-click clear) so operators can see and reset inherited context explicitly.
