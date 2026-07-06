# Loop 399 - Gateway Demo Backoffice Audit Seed Cleanup

## Summary

The active gateway demo seed no longer inserts launch-visible backoffice audit
rows with inherited crypto market examples or payout/price-cent JSON detail
keys.

This is a seed/admin-safety cleanup only. It preserves the inherited demo seed
phase structure, settlement service calls, wallet behavior, prediction order
logic, audit-log table contract, and loyalty-account demo rows.

## Changes

- Replaced phase 6 audit-log halt/resume examples from the removed
  `BTC-100K-YES` market to the launch-seeded `MLBB-FINAL-G1` market.
- Replaced audit-log detail reasons from oracle-feed wording to official-source
  review/confirmation wording.
- Replaced phase 6 `payout_pool_cents` detail keys with
  `settlementPointsCents`.
- Replaced phase 6 `yes_price_cents` detail keys with
  `yesPricePointsCents`.
- Removed executable phase 4/5 demo prefixes for removed ETH/BTC market
  examples and replaced them with launch-seeded market prefixes.
- Added a seed-package regression that scans launch-visible demo phase files
  for the retired markers and requires point-native phase 6 audit markers.

## Verification

- `go test ./cmd/seed -run Test` passed.
- `go test ./internal/http -run 'TestLaunchDocsStayPointsOnly|TestGatewayMakefileUsesLaunchSeedCommand'` passed.
- `git diff --check` passed.
- Focused scan found no `BTC`, `ETH`, `payout_pool_cents`,
  `yes_price_cents`, or `oracle_feed` in the touched demo seed phase files.
- `make qa-preservation-modifications` passed with 409 classified modified
  artifacts and zero unclassified modified artifacts. Artifact:
  `revival/artifacts/preservation_modification_map_20260629_160132.md`.
- `make qa-rc-completion-audit` failed as intended with scenarios 4, 6, 7, 9,
  10, 11, and 12 still Partial. Artifact:
  `revival/artifacts/rc_completion_audit_gate_20260629_160132.md`.

## Scenario Status

Scenarios 10, 11, and 12 remain Partial. This closes one active gateway demo
admin-audit seed boundary, but broader backend/API terminology cleanup and
final RC evidence remain incomplete.
