# 125 - SB-405 Stale Badge + CTA Coherence Coverage

Date: 2026-03-05  
Owner: Codex

## Scope
Completed queue item 59 by adding Provider Ops UI assertions that stale-status badges (`warning`/`critical`) and stale-audit CTA render coherently for the same acknowledgement row.

## Implementation

Updated:
- `talon-backoffice/packages/office/containers/provider-ops/__tests__/provider-ops.test.tsx`

### 1) Warning/critical coexistence matrix
Added parameterized UI coverage that validates, for stale unresolved acknowledgements:
1. 20-minute age renders `ACK_STALE_WARNING` and `ACK_ACTION_STALE_AUDIT`.
2. 40-minute age renders `ACK_STALE_CRITICAL` and `ACK_ACTION_STALE_AUDIT`.

### 2) Regression safety extension
This complements prior stale CTA visibility tests by asserting stale classification and escalation action stay aligned as a single operator cue set.

## Validation
1. Focused suites:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice && yarn workspace @phoenix-ui/office test --runTestsByPath containers/provider-ops/__tests__/provider-ops.test.tsx containers/provider-ops/__tests__/contracts.test.ts containers/audit-logs/__tests__/audit-logs.test.tsx components/audit-logs/utils/__tests__/resolvers.test.ts --passWithNoTests`
- Result: PASS

2. TypeScript strict gate:
- `source ~/.nvm/nvm.sh && nvm use 20 && cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
- Result: PASS

## Outcome
Provider Ops stale-triage visuals and escalation CTA now have explicit coherence regression coverage, improving reliability of operator incident response UX.

## Next
Queue item 60:
- Add `/logs` scoped URL copy coverage for manual override scenarios (preset active + explicit action override) to ensure copied links preserve operator intent.
