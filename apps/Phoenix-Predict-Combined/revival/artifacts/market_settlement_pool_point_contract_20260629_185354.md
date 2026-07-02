# Market Settlement Pool Point Contract Artifact

- Generated: 2026-06-29T18:53:54+0200
- Report: `revival/92_MARKET_SETTLEMENT_POOL_POINT_CONTRACT.md`

## Changed Files

- `go-platform/services/gateway/internal/prediction/types.go`
- `go-platform/services/gateway/internal/prediction/json_defaults_test.go`
- `go-platform/services/gateway/internal/http/launch_docs_test.go`
- `go-platform/services/gateway/api/openapi.yaml`
- `talon-backoffice/packages/api-client/src/prediction-types.ts`
- `talon-backoffice/packages/api-client/src/prediction-client.ts`
- `talon-backoffice/packages/app/app/__tests__/qa-regressions-2026-04-18.test.ts`

## Contract Result

Public market payloads now expose `settlementPoolPointsCents` for the
point-native settlement pool. The retired public name
`settledPayoutPoolPointsCents` is absent from launch OpenAPI and exported
shared API-client market types. Private legacy reads still accept inherited
payout-pool fields.

## Verification Evidence

- `go test ./services/gateway/internal/prediction -run TestMarketJSONExposesPointAliases -count=1`
  - Result: pass.
- `go test ./services/gateway/internal/http -run TestLaunchDocsStayPointsOnly -count=1`
  - Result: pass.
- `npx tsx --test app/__tests__/qa-regressions-2026-04-18.test.ts`
  - Result: pass, 99 tests.
- `npx tsx --test app/__tests__/wallet-paths.test.ts`
  - Result: pass, 21 tests.
- `npm run build`
  - Workdir: `talon-backoffice/packages/api-client`
  - Result: pass.
- `yarn typecheck`
  - Workdir: `talon-backoffice/packages/app`
  - Result: pass, 0 scoped type errors.
- Focused public-contract scan:
  - Result: only `settlementPoolPointsCents` appears in launch OpenAPI and
    exported prediction market type.
- `git diff --check`
  - Result: pass.
- `make qa-preservation-modifications`
  - Result: pass.
  - Artifact: `revival/artifacts/preservation_modification_map_20260629_165327.md`.
- `make qa-rc-completion-audit`
  - Result: expected fail.
  - Partial scenarios: 4, 6, 7, 9, 10, 11, 12.
  - Artifact: `revival/artifacts/rc_completion_audit_gate_20260629_165344.md`.
