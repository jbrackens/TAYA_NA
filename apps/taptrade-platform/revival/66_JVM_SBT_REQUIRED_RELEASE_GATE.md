# JVM/SBT Required Release Gate

- Generated: `2026-06-29T09:20:42Z`
- Scope: backend JVM dependency graph, eviction, compile, and resolver-backed SCA readiness
- Evidence artifact: `revival/artifacts/jvm_sbt_required_release_gate_20260629_092042.md`

## Change

The JVM dependency baseline now has an explicit strict mode:

- `make security-jvm` continues to write `revival/12_JVM_DEPENDENCY_BASELINE.md` and the SBT preflight log without failing the broader evidence-collection workflow.
- `make security-jvm-required` runs the same baseline with `JVM_DEPENDENCY_BASELINE_STRICT=1` and fails when Java/SBT evidence cannot be produced.
- `scripts/release/launch-readiness-gate.sh` now includes `make security-jvm-required` before the direct OSV baseline and residual gate.

## Verification

`make security-jvm` passed as a report-generation target and refreshed:

- `revival/12_JVM_DEPENDENCY_BASELINE.md`
- `revival/artifacts/backend_sbt_update_2026-06-29.log`

The refreshed report states:

- Status: `failed`
- Summary: `SBT binary not found in PATH.`
- Blocker: `sbt_not_found`
- Exit code: `127`

`make security-jvm-required` was then run and failed as intended. The shell wrapper captured `strict_exit_code=2` because GNU Make reports a failing recipe as exit code 2 after the underlying script exits 127.

## Release Decision

This is an intentional launch-readiness blocker. Direct OSV evidence and residual governance are useful bounded evidence, but they do not replace the required backend JVM dependency graph, eviction review, compile proof, runtime validation, or transitive SCA.

Scenario 12 remains Partial until Java/SBT or equivalent resolver-backed tooling is available and the strict target passes in the same launch-readiness run.
