# Shared API Client Order-Book Hint Point Contract Artifact

- Generated: 2026-06-29T18:41:20+0200
- Report: `revival/90_SHARED_API_CLIENT_ORDERBOOK_HINT_POINT_CONTRACT.md`

## Changed Files

- `talon-backoffice/packages/api-client/src/prediction-types.ts`
- `talon-backoffice/packages/api-client/src/index.ts`
- `talon-backoffice/packages/api-client/src/prediction-client.ts`
- `talon-backoffice/packages/app/app/__tests__/wallet-paths.test.ts`

## Contract Result

`OrderBookHint` now exposes only point-native best-quote fields:

- `bestYesBidPointsCents`
- `bestYesAskPointsCents`
- `bestNoBidPointsCents`
- `bestNoAskPointsCents`
- `unit?: "PTS" | string`

The retired aliases `bestYesBidCents`, `bestYesAskCents`,
`bestNoBidCents`, and `bestNoAskCents` are no longer exported from
`prediction-types.ts`. Private legacy compatibility reads in
`prediction-client.ts` remain available for older market payloads.

## Verification Evidence

- `npx tsx --test app/__tests__/wallet-paths.test.ts`
  - Result: pass, 21 tests.
- `npm run build`
  - Workdir: `talon-backoffice/packages/api-client`
  - Result: pass.
- `go test ./services/gateway/internal/http -run TestLaunchDocsStayPointsOnly -count=1`
  - Workdir: `go-platform`
  - Result: pass.
- Focused scan:
  - Command searched edited exported files for retired best-quote aliases and
    sportsbook wording.
  - Result: no matches.
- `git diff --check`
  - Result: pass.
- `make qa-preservation-modifications`
  - Result: pass.
  - Artifact: `revival/artifacts/preservation_modification_map_20260629_164036.md`.
- `make qa-rc-completion-audit`
  - Result: expected fail.
  - Partial scenarios: 4, 6, 7, 9, 10, 11, 12.
  - Artifact: `revival/artifacts/rc_completion_audit_gate_20260629_164053.md`.
