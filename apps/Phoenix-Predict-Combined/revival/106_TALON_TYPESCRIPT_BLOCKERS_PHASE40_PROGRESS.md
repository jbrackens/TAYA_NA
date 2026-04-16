# Talon Phase 40 TypeScript Blockers Progress

Date: 2026-03-05  
Backlog reference: item 40 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Fixed `Protected` JSX return typing to satisfy strict TS JSX contract.
   - Wrapped children in a fragment and returned `null` for denied access.
2. Fixed `session-guard` test `useApi` mock tuple shape to match the current 5-element `UseApi` contract.
3. Fixed nullable element usage in settle lifecycle tests by guarding the reason input before firing change events.
4. Restored clean office typecheck baseline.

## Key Files

1. `talon-backoffice/packages/office/components/auth/protected/index.tsx`
2. `talon-backoffice/packages/office/components/auth/session-guard/__tests__/session-guard.test.tsx`
3. `talon-backoffice/packages/office/components/markets/lifecycle/settle/__tests__/lifecycle-settle.test.tsx`

## Validation

1. `cd talon-backoffice/packages/office && npx tsc --noEmit --pretty false`
   - pass

## Follow-up

1. Move to SB-404/SB-405 Talon provider-ops cockpit surface (backlog item 41).
