# Shared API Client Settled Position Result Contract

- Date: 2026-06-29
- Scope: shared API-client exported portfolio-history contract
- Scenarios: 6, 11, and 12 remain Partial

## Summary

The shared `@phoenix-ui/api-client` portfolio-history export no longer uses the
launch-facing type name `SettledPayout`. The exported settlement-history row is
now `SettledPositionResult`, with the existing point-native fields:

- `entryPricePointsCents`
- `exitPricePointsCents`
- `realizedPointsCents`
- `settlementPointsCents`
- `unit?: "PTS" | string`

The player portfolio page now stores history rows as `SettledPositionResult[]`.

## Preservation Boundary

This is a public TypeScript contract rename, not a rewrite of portfolio
history behavior, settlement behavior, or gateway persistence. Private legacy
compatibility reads for older `pnlCents` and `payoutCents` payloads remain in
the shared prediction client normalizer so older rows can still be consumed
without re-exporting a payout-named launch contract.

## Verification

- `npx tsx --test app/__tests__/qa-regressions-2026-04-18.test.ts` passed with
  99 tests.
- `npx tsx --test app/__tests__/wallet-paths.test.ts` passed with 21 tests.
- `npm run build` passed in `talon-backoffice/packages/api-client`.
- `yarn typecheck` passed in `talon-backoffice/packages/app`.
- `go test ./services/gateway/internal/http -run TestLaunchDocsStayPointsOnly -count=1`
  passed.
- Focused scan found no `export interface SettledPayout`, `SettledPayout`, or
  `normalizeSettledPayout` in the edited shared API-client files or portfolio
  page.
- `git diff --check` passed.
- `make qa-preservation-modifications` passed with 412 classified modified
  artifacts, 92 high-risk contract files, 36 large-change files, tracked line
  churn `+32250 / -6658`, and zero unclassified modified artifacts. Artifact:
  `revival/artifacts/preservation_modification_map_20260629_164651.md`.
- `make qa-rc-completion-audit` failed as intended with scenarios 4, 6, 7, 9,
  10, 11, and 12 still Partial. Artifact:
  `revival/artifacts/rc_completion_audit_gate_20260629_164709.md`.

## Remaining Risk

This closes one exported portfolio-history contract-name leak. It does not
prove broader portfolio-history coverage, settlement lifecycle completeness,
the full API/data surface, or the authenticated canonical journey.
