# Shared API Client Order-Book Hint Point Contract

- Date: 2026-06-29
- Scope: shared API-client exported prediction contract
- Scenarios: 11 and 12 remain Partial

## Summary

The shared `@phoenix-ui/api-client` order-book hint export is now point-native.
`OrderBookHint` no longer exposes retired best-quote aliases such as
`bestYesBidCents`, `bestYesAskCents`, `bestNoBidCents`, or
`bestNoAskCents`. It exposes the point-native best-quote fields plus `PTS`
unit metadata.

This loop also cleaned launch-facing package comments in the shared API-client
entrypoint and prediction client header so they describe shared infrastructure
and prediction methods without advertising sportsbook-era contracts.

## Preservation Boundary

This is not a rewrite of exchange logic or WebSocket behavior. Existing private
legacy reads in `prediction-client.ts` remain available where they normalize
older market payloads. The launch-facing exported `OrderBookHint` contract now
matches the already point-native backend order-book hint frame.

## Verification

- `npx tsx --test app/__tests__/wallet-paths.test.ts` passed with 21 tests.
- `npm run build` passed in `talon-backoffice/packages/api-client`.
- `go test ./services/gateway/internal/http -run TestLaunchDocsStayPointsOnly -count=1`
  passed.
- Focused scan found no `bestYesBidCents`, `bestYesAskCents`,
  `bestNoBidCents`, `bestNoAskCents`, or `sportsbook` in
  `talon-backoffice/packages/api-client/src/index.ts` and
  `talon-backoffice/packages/api-client/src/prediction-types.ts`.
- `git diff --check` passed.
- `make qa-preservation-modifications` passed with 412 classified modified
  artifacts, 92 high-risk contract files, 36 large-change files, tracked line
  churn `+32230 / -6651`, and zero unclassified modified artifacts. Artifact:
  `revival/artifacts/preservation_modification_map_20260629_164036.md`.
- `make qa-rc-completion-audit` failed as intended with scenarios 4, 6, 7, 9,
  10, 11, and 12 still Partial. Artifact:
  `revival/artifacts/rc_completion_audit_gate_20260629_164053.md`.

## Remaining Risk

The shared API-client still contains private legacy compatibility normalizers
and other exported/admin contracts need continued review. This closes one
order-book hint export leak; it does not prove the full API/data surface or the
authenticated canonical journey is complete.
