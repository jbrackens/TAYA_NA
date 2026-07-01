# Gateway Makefile Point-Native Setup Cleanup

## Summary

Loop 397 removes active `sportsbook` setup wording from the Go gateway
Makefile. The developer help now presents the service as the Tiangge Prediction
Gateway and uses a `tiangge_predict` development database name in setup
examples and the `createdb` target.

## Preservation Decision

- Preserved migration files, schema names, gateway handlers, API routes, and
  runtime contracts.
- Changed active developer-facing setup/help text only.
- Added the gateway Makefile to the existing launch-doc safety test.
- Classified the Makefile in the preservation modification gate as Go platform
  documentation/dependency metadata.

## Verification

- `make -C go-platform/services/gateway help` renders
  `Tiangge Prediction Gateway - Make Commands` and
  `postgres://user:pass@localhost:5432/tiangge_predict`.
- `go test ./internal/http -run TestLaunchDocsStayPointsOnly` passed.
- `git diff --check` passed.
- Focused scan found no `sportsbook` or old sportsbook DSN examples in
  `go-platform/services/gateway/Makefile`.
- `make qa-preservation-modifications` passed with 407 modified artifacts,
  90 high-risk contract files, 36 large-change files, tracked line churn
  `+31792 / -6559`, and zero unclassified modified artifacts.
- `make qa-rc-completion-audit` failed as expected because scenarios 4, 6, 7,
  9, 10, 11, and 12 remain Partial.

## Remaining Gap

Scenarios 10, 11, and 12 remain Partial. This closes one active gateway
developer-tooling documentation leak, not the broader backend/API terminology
cleanup or final RC completion evidence.
