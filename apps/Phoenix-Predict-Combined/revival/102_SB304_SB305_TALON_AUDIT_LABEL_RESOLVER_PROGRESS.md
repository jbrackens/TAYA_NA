# SB-304/SB-305 Talon Audit Label Resolver Progress

Date: 2026-03-05  
Backlog reference: item 36 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Extended audit-log category resolver to support modern action-first gateway events:
   - trading (`bet.*`, `fixed_exotic.*`)
   - provider (`provider.*`)
   - account (`punter.*`)
   - operations (`market.*`, `fixture.*`)
   - configuration (`config.*`).
2. Extended audit-log action resolver mapping for newer admin events:
   - `bet.placed`
   - `bet.precheck.failed`
   - `fixed_exotic.quote.created/accepted/expired`
   - `market.updated`
   - `fixture.updated`
   - `config.updated`
   - `punter.suspended`
   - `provider.cancel.failed/succeeded`.
3. Updated audit-log table rendering to better fit gateway payloads:
   - date column now prefers `occurredAt` and falls back to `createdAt`
   - row key now supports `id`, `occurredAt`, or `createdAt`
   - details renderer now shows raw `details` text for non-diff events instead of blank output.
4. Added resolver-focused unit tests to lock action/category behavior and prevent regressions.
5. Updated locale keys with the new category/action labels.

## Key Files

1. Resolver and UI behavior:
   - `talon-backoffice/packages/office/components/audit-logs/utils/resolvers.ts`
   - `talon-backoffice/packages/office/components/audit-logs/index.tsx`
2. Tests:
   - `talon-backoffice/packages/office/components/audit-logs/utils/__tests__/resolvers.test.ts`
3. Translations:
   - `talon-backoffice/packages/office/translations/en/page-audit-logs.js`
   - `talon-backoffice/packages/office/public/static/locales/en/page-audit-logs.json`

## Validation

1. `cd talon-backoffice/packages/office && yarn bootstrap:locales`
   - pass
2. `cd talon-backoffice/packages/office && yarn test audit-logs`
   - pass
3. Regression check:
   - `cd talon-backoffice/packages/office && yarn test risk-management-summary`
   - pass
4. `cd talon-backoffice/packages/office && npx tsc --noEmit`
   - fails only on pre-existing unrelated test typing issues in:
     - `components/auth/protected/__tests__/protected.test.tsx`
     - `components/auth/session-guard/__tests__/session-guard.test.tsx`
     - `components/markets/lifecycle/settle/__tests__/lifecycle-settle.test.tsx`

## Remaining

1. Backlog item 37 is now completed in:
   - `revival/103_SB304_SB305_TALON_AUDIT_DTO_ALIGNMENT_PROGRESS.md`.
2. Continue with backlog item 38:
   - normalize audit reducers for dual payload contracts (`data` and `items/pagination`).
