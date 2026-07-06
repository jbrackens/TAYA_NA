# SB-304/SB-305 Talon Audit DTO Alignment Progress

Date: 2026-03-05  
Backlog reference: item 37 in `revival/42_BACKLOG_EXECUTION_PHASES.md`

## Delivered

1. Replaced legacy/incomplete Talon audit-log declarations with gateway-aligned DTO shape:
   - `id`
   - `action`
   - `actorId`
   - `userId`
   - `freebetId`
   - `oddsBoostId`
   - `occurredAt`
   - `details`
   - plus compatibility fields (`createdAt`, legacy category/type, optional diff payloads).
2. Updated audit-log component typing to consume the new `TalonAuditLog` model directly:
   - removed `any`-first handling
   - updated date/details/row-key render signatures to typed audit entries.
3. Preserved backward compatibility for older payload shapes while centering the modern gateway contract.

## Key Files

1. Types:
   - `talon-backoffice/packages/office/types/logs.d.ts`
2. Audit component typing updates:
   - `talon-backoffice/packages/office/components/audit-logs/index.tsx`

## Validation

1. `cd talon-backoffice/packages/office && yarn test audit-logs`
   - pass
2. `cd talon-backoffice/packages/office && yarn test risk-management-summary`
   - pass
3. `cd talon-backoffice/packages/office && npx tsc --noEmit`
   - fails only on pre-existing unrelated test typing issues in:
     - `components/auth/protected/__tests__/protected.test.tsx`
     - `components/auth/session-guard/__tests__/session-guard.test.tsx`
     - `components/markets/lifecycle/settle/__tests__/lifecycle-settle.test.tsx`

## Remaining

1. Backlog item 38 is now completed in:
   - `revival/104_SB304_SB305_TALON_AUDIT_REDUCER_NORMALIZATION_PROGRESS.md`.
2. Continue with backlog item 39:
   - add an integration-level drill-down contract test from promo summary filters into audit-log filters.
