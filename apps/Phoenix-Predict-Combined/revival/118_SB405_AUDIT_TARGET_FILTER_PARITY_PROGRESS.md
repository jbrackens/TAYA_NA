# 118 - SB-405 Audit Target Filter Parity

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 52 by wiring Talon audit-log `targetId` filtering end-to-end so provider-ops deep-links (including SLA settings links) resolve into properly scoped audit results.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/audit-logs/index.tsx`
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`
- `talon-backoffice/packages/office/components/audit-logs/index.tsx`
- `talon-backoffice/packages/office/translations/en/page-audit-logs.js`
- `talon-backoffice/packages/office/public/static/locales/en/page-audit-logs.json`

### 1) Filter contract parity
Added `targetId` to Talon audit-log filter model and query builders:
1. Parse `targetId` from `router.query`.
2. Include `targetId` in `buildFilterQuery(...)` (router and API paths).
3. Preserve `targetId` in apply/reset/table navigation behavior.

### 2) UI visibility and operator ergonomics
Added:
1. `Target ID` filter input in the audit filter card.
2. `Target` column (`targetId`) in audit logs table additional columns.
3. Translation keys:
   - `FILTER_TARGET_PLACEHOLDER`
   - `HEADER_TARGET`

### 3) Test hardening
Extended audit container tests to assert:
1. API query includes `targetId` from route query.
2. Apply action includes `targetId` in router push query.
3. Additional audit columns render once (no duplicate header injection).

Also fixed event-value handling for the new field by capturing input value before state update callback, avoiding pooled-event edge behavior during tests.

### 4) Shared audit table column merge fix
Updated the additional-column insertion logic in `components/audit-logs/index.tsx` to perform deterministic index-based insertion without duplicating existing columns. This prevents repeated headers when multiple additional columns (promo + target) are supplied.

## Validation
1. Locales regeneration:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice && yarn bootstrap:locales`
- Result: PASS

2. Talon focused test suite:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/audit-logs/__tests__/audit-logs.test.tsx containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts components/audit-logs/utils/__tests__/resolvers.test.ts --passWithNoTests`
- Result: PASS

3. Talon TypeScript gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Provider Ops SLA/acknowledgement audit deep-links now resolve with full scope fidelity, and Talon operators can directly inspect and refine `targetId` audit views from the logs interface.

## Next
Queue item 53:
- Add audit-log preset chips for provider-ops workflows (SLA defaults/adapters + acknowledgement lifecycle actions) to speed common triage filtering.
