# Market Settlement Pool Point Contract

- Date: 2026-06-29
- Scope: public market JSON, launch OpenAPI, shared API-client market contract
- Scenarios: 11 and 12 remain Partial

## Summary

The launch-facing market payload no longer publishes the payout-named
`settledPayoutPoolPointsCents` field. The public JSON/OpenAPI/client contract
now uses `settlementPoolPointsCents`, while the underlying database field and
private compatibility readers still tolerate the inherited payout-pool names.

## Preservation Boundary

This change does not rewrite settlement accounting, exchange state, or the
database column `settled_payout_pool_cents`. The Go market model still stores
the inherited field internally, and the shared prediction client can still read
older `settledPayoutPoolPointsCents` / `settledPayoutPoolCents` payloads in its
legacy normalizer. The public launch boundary now uses settlement-pool wording.

## Verification

- `go test ./services/gateway/internal/prediction -run TestMarketJSONExposesPointAliases -count=1`
  passed.
- `go test ./services/gateway/internal/http -run TestLaunchDocsStayPointsOnly -count=1`
  passed.
- `npx tsx --test app/__tests__/qa-regressions-2026-04-18.test.ts` passed with
  99 tests.
- `npx tsx --test app/__tests__/wallet-paths.test.ts` passed with 21 tests.
- `npm run build` passed in `talon-backoffice/packages/api-client`.
- `yarn typecheck` passed in `talon-backoffice/packages/app`.
- Focused public-contract scan found only `settlementPoolPointsCents` in
  `go-platform/services/gateway/api/openapi.yaml` and
  `talon-backoffice/packages/api-client/src/prediction-types.ts`.
- `git diff --check` passed.
- `make qa-preservation-modifications` passed with 412 classified modified
  artifacts, 92 high-risk contract files, 36 large-change files, tracked line
  churn `+32253 / -6658`, and zero unclassified modified artifacts. Artifact:
  `revival/artifacts/preservation_modification_map_20260629_165327.md`.
- `make qa-rc-completion-audit` failed as intended with scenarios 4, 6, 7, 9,
  10, 11, and 12 still Partial. Artifact:
  `revival/artifacts/rc_completion_audit_gate_20260629_165344.md`.

## Remaining Risk

This closes one public market payload naming leak. It does not prove the full
API/data surface, broader backend terminology cleanup, or the authenticated
canonical journey.
