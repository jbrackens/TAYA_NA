# 119 - SB-405 Audit Preset Chips for Provider Ops Workflows

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 53 by adding provider-ops-focused preset chips to Talon audit logs for common acknowledgement/SLA workflows, while improving provider stream acknowledgement action labeling and hardening shared audit table column insertion behavior.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/audit-logs/index.tsx`
- `talon-backoffice/packages/office/containers/audit-logs/__tests__/audit-logs.test.tsx`
- `talon-backoffice/packages/office/components/audit-logs/index.tsx`
- `talon-backoffice/packages/office/components/audit-logs/utils/resolvers.ts`
- `talon-backoffice/packages/office/components/audit-logs/utils/__tests__/resolvers.test.ts`
- `talon-backoffice/packages/office/translations/en/page-audit-logs.js`
- `talon-backoffice/packages/office/public/static/locales/en/page-audit-logs.json`

### 1) Provider Ops preset chips on `/logs`
Added preset chip controls to apply common provider-ops audit filters directly:
1. SLA default updates (`provider.stream.sla.default.updated` + target scope)
2. SLA adapter updates (`provider.stream.sla.adapter.updated`)
3. Acknowledged (`provider.stream.acknowledged`)
4. Reassigned (`provider.stream.reassigned`)
5. Resolved (`provider.stream.resolved`)
6. Reopened (`provider.stream.reopened`)

Each preset sets the filter model, pushes shallow router query, and triggers API fetch via existing query pipeline.

### 2) Audit action label coverage for acknowledgement lifecycle
Extended resolver action map and translation dictionary for:
- `provider.stream.acknowledged`
- `provider.stream.reassigned`
- `provider.stream.resolved`
- `provider.stream.reopened`

This removes fallback `unknown` labels for common acknowledgement lifecycle events.

### 3) Shared audit additional-column insertion hardening
Replaced the prior insertion reducer with deterministic sorted `splice` insertion to avoid duplicate headers when multiple additional columns are provided (promo + target/provider extensions).

### 4) Test coverage additions
Added/extended tests to validate:
1. Preset chip click pushes expected action/target query.
2. Audit resolver maps new acknowledgement actions to explicit labels.
3. Audit target/user headers are not duplicated in rendered table.

## Validation
1. Locale generation:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice && yarn bootstrap:locales`
- Result: PASS

2. Focused Talon suites:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/audit-logs/__tests__/audit-logs.test.tsx components/audit-logs/utils/__tests__/resolvers.test.ts containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts --passWithNoTests`
- Result: PASS

3. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Talon operators can now jump into high-frequency provider-ops audit trails with one click, lifecycle events render with clear labels, and audit table column injection remains stable as additional fields are introduced.

## Next
Queue item 54:
- Add provider-ops deep-link preset handoff (`preset` query contract) so `/logs` can auto-highlight and lock-on recommended filters from source workflows while preserving manual override.
