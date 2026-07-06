# JVM/SBT Required Release Gate Artifact

- Generated: `2026-06-29T09:20:42Z`
- Scope: backend JVM dependency graph, eviction, compile, and resolver-backed SCA readiness

## Commands

```sh
make security-jvm
make security-jvm-required
```

## Observed Results

`make security-jvm` wrote:

- `revival/12_JVM_DEPENDENCY_BASELINE.md`
- `revival/artifacts/backend_sbt_update_2026-06-29.log`

The baseline report and log show:

- Java binary path: `/usr/bin/java`
- Java runtime result: `Unable to locate a Java Runtime`
- `JAVA_HOME` candidate: `<empty>`
- SBT: `not_found`
- Baseline status: `failed`
- Blocker: `sbt_not_found`
- Baseline exit code: `127`

`make security-jvm-required` failed intentionally:

- Underlying script mode: `JVM_DEPENDENCY_BASELINE_STRICT=1`
- Underlying blocker: `sbt_not_found`
- Underlying exit code: `127`
- Make wrapper exit observed by shell: `strict_exit_code=2`

## Release Gate Impact

`scripts/release/launch-readiness-gate.sh` now runs `make security-jvm-required` before direct JVM OSV and residual governance checks. Launch readiness is therefore NO-GO until the backend JVM toolchain can produce dependency graph and eviction evidence.
