# SB-501 / SB-502 / SB-503 Gate Suites Progress

Date: 2026-03-05  
Backlog references: `SB-501`, `SB-502`, `SB-503` in `revival/41_ODDS88_BETBY_COMBINED_BACKLOG.md`

## Delivered

1. Added provider conformance suite framework (`SB-501`):
   - conformance profile validates adapter stream contract and command semantics for `odds88-demo` and `betby-demo`.
   - conformance harness + persistent report artifacts added.
2. Added canonical regression pack (`SB-502`):
   - deterministic regression suites for replay, bet lifecycle, wallet ledger, and HTTP lifecycle/admin parity transitions.
   - mandatory report artifact generated each execution.
3. Added provider chaos suite (`SB-503`):
   - reconnect replay dedupe scenario.
   - reorder + duplicate telemetry scenario.
   - dropped revision gap telemetry scenario.
   - stream error telemetry scenario.
   - threshold policy (`CHAOS_MIN_CASES`, `CHAOS_MAX_FAILED_CASES`) enforced.
4. Wired all three suites into mandatory Go gate:
   - `make verify-go` now runs:
     - `make qa-provider-conformance`
     - `make qa-regression-pack`
     - `make qa-provider-chaos`
     - strict reconciliation parity report.
5. Wired CI artifact collection for suite outputs:
   - `verify-go` workflow now uploads suite reports/logs/json artifacts.

## Key Files

1. Conformance + chaos tests:
   - `go-platform/services/gateway/internal/provider/conformance_test.go`
   - `go-platform/services/gateway/internal/provider/runtime_chaos_test.go`
2. QA harness scripts:
   - `scripts/qa/go-provider-conformance.sh`
   - `scripts/qa/go-regression-pack.sh`
   - `scripts/qa/go-provider-chaos-suite.sh`
3. Build/CI wiring:
   - `Makefile`
   - `.github/workflows/verify-go.yml`
4. Generated suite reports:
   - `revival/178_SB501_PROVIDER_CONFORMANCE_REPORT.md`
   - `revival/179_SB502_CANONICAL_REGRESSION_PACK_REPORT.md`
   - `revival/180_SB503_PROVIDER_CHAOS_SUITE_REPORT.md`

## Validation

1. `make qa-provider-conformance`
   - pass
2. `make qa-regression-pack`
   - pass
3. `make qa-provider-chaos`
   - pass
4. `make verify-go`
   - pass

## Remaining

1. None for `SB-501`/`SB-502`/`SB-503` closure scope in this execution slice.
