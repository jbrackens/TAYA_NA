# Gateway Makefile Launch Seed Target Cleanup

## Summary

Loop 398 moves the active gateway `make seed` target onto the launch-safe Go
seed command. The Makefile no longer tries to load the removed historical
`migrations/seed.sql` file and now uses `go run ./cmd/seed -mode base`, which
discovers `seed-data/seed_prediction.sql`.

## Preservation Decision

- Preserved migrations, schema, gateway handlers, API routes, and runtime
  contracts.
- Preserved the `cmd/seed` mode names and demo/wipe behavior.
- Changed active developer tooling so `make seed` and `dev-setup` use the same
  launch seed command family as `make demo-data`.
- Added a focused launch-doc regression for the Makefile seed command.

## Verification

- `make -C go-platform/services/gateway help` renders
  `make seed              Load Tiangge launch base seed data`.
- `go test ./internal/http -run 'TestLaunchDocsStayPointsOnly|TestGatewayMakefileUsesLaunchSeedCommand'`
  passed.
- `go test ./cmd/seed -run Test` passed.
- `git diff --check` passed.
- Focused scan found the retired direct `psql $(GATEWAY_DB_DSN) -f
  migrations/seed.sql` command absent from the active Makefile.
- `make qa-preservation-modifications` passed with 407 modified artifacts,
  90 high-risk contract files, 36 large-change files, tracked line churn
  `+31799 / -6566`, and zero unclassified modified artifacts.
- `make qa-rc-completion-audit` failed as expected because scenarios 4, 6, 7,
  9, 10, 11, and 12 remain Partial.

## Remaining Gap

Scenarios 10, 11, and 12 remain Partial. This closes one active seed-tooling
hazard, not the broader backend/API terminology cleanup or final RC completion
evidence.
