# 124 - SB-405 Stale Acknowledgement CTA UI Coverage

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 58 by adding explicit Provider Ops UI coverage for stale acknowledgement audit CTA behavior on stream rows.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/provider-ops/__tests__/provider-ops.test.tsx`

### 1) Fresh acknowledgement guardrail
Added coverage proving `ACK_ACTION_STALE_AUDIT` is not rendered for fresh unresolved acknowledgements.

### 2) Stale lifecycle coverage matrix
Combined with existing table-driven deep-link checks, UI coverage now validates stale CTA click behavior and deep-link query payload (`preset/action/targetId/pagination`) across acknowledgement lifecycle variants.

## Validation
1. Focused suites:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts containers/audit-logs/__tests__/audit-logs.test.tsx components/audit-logs/utils/__tests__/resolvers.test.ts --passWithNoTests`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Stale-incident CTA behavior is now guarded at the UI level, reducing regression risk in operator escalation pathways for Provider Ops acknowledgement triage.

## Next
Queue item 59:
- Add provider-ops stale acknowledgement CTA visual state assertions (warning vs critical badge + CTA coexistence) for richer regression safety.
