# Shared API Client Audit Log Point Contract

- Date: 2026-06-29
- Scope: shared TypeScript API client audit-log exports
- Scenarios: 10, 11, and 12 remain Partial

## Summary

The shared `@phoenix-ui/api-client` audit-log contract no longer exports
retired promo fields:

- `freebetId`
- `oddsBoostId`
- `freebetAppliedCents`

`AuditLogEntry` now exposes point-native review fields:

- `pointGrantId`
- `pointRuleId`
- `pointGrantAppliedPointsCents`

The client keeps the old promo field names only inside a private legacy audit
payload normalizer so older rows can still be read and mapped to the
point-native exported shape.

## Files

- `talon-backoffice/packages/api-client/src/types.ts`
- `talon-backoffice/packages/api-client/src/client.ts`
- `talon-backoffice/packages/app/app/__tests__/wallet-paths.test.ts`

## Verification

- `npx tsx --test app/__tests__/wallet-paths.test.ts` passed with 20 tests.
- `npm run build` passed in `talon-backoffice/packages/api-client`.
- `go test ./services/gateway/internal/http -run TestLaunchDocsStayPointsOnly -count=1`
  passed.
- `rg -n "freebetId|oddsBoostId|freebetAppliedCents|balanceCents|amountCents|Phoenix Sportsbook" talon-backoffice/packages/api-client/src/types.ts`
  returned no matches.
- `make qa-preservation-modifications` passed with 412 classified modified
  artifacts, 92 high-risk contract files, 36 large-change files, tracked line
  churn `+32176 / -6641`, and zero unclassified modified paths. Artifact:
  `revival/artifacts/preservation_modification_map_20260629_163333.md`.
- `git diff --check` passed.
- `make qa-rc-completion-audit` failed as intended with scenarios 4, 6, 7, 9,
  10, 11, and 12 still Partial. Artifact:
  `revival/artifacts/rc_completion_audit_gate_20260629_163352.md`.

## Remaining Risk

This closes one shared audit-log API-client alias leak. It does not replace the
full admin/audit lifecycle proof, all backend API terminology cleanup, or the
authenticated canonical journey required for RC.
