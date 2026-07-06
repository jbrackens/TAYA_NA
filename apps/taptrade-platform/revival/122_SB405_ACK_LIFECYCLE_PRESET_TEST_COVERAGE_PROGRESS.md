# 122 - SB-405 Acknowledgement Lifecycle Preset Test Coverage

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 56 by adding Provider Ops UI-level regression coverage for acknowledgement lifecycle audit deep-links across all preset variants (`acknowledged/reassigned/resolved/reopened`).

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/provider-ops/__tests__/provider-ops.test.tsx`

### 1) Lifecycle deep-link UI coverage
Added parameterized UI test cases that validate stale acknowledgement audit deep-link routing for each lifecycle variant:
1. `acknowledged` -> `action=provider.stream.acknowledged`, `preset=provider-acknowledged`
2. `reassigned` -> `action=provider.stream.reassigned`, `preset=provider-reassigned`
3. `resolved` -> `action=provider.stream.resolved`, `preset=provider-resolved`
4. `reopened` -> `action=provider.stream.reopened`, `preset=provider-reopened`

Each case asserts `/logs` router payload includes:
- `preset`
- `action`
- `targetId`
- `p` and `limit`

### 2) Stability guardrail
The new table-driven test ensures future edits to acknowledgement action mapping or preset naming cannot silently break deep-link query contracts.

## Validation
1. Focused Talon suites:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts containers/audit-logs/__tests__/audit-logs.test.tsx components/audit-logs/utils/__tests__/resolvers.test.ts --passWithNoTests`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Provider Ops preset deep-link behavior now has explicit UI coverage for all acknowledgement lifecycle states, reducing regression risk for operator triage flows.

## Next
Queue item 57:
- Add `/logs` preset-aware URL copy action (copy sharable scoped URL) for operator handoff during incident escalation.
