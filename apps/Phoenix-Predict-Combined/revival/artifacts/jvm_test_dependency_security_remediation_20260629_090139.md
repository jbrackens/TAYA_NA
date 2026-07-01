# JVM Test Dependency Security Remediation Artifact

- Generated: `2026-06-29T09:01:39Z`
- Scope: backend declared direct JVM test dependency
- Changed file: `phoenix-backend/project/Dependencies.scala`

## Source Change

```diff
-    val wiremock                = "2.33.2"
+    val wiremock                = "2.35.1"
```

The dependency declaration for `wiremock-jre8-standalone` is in `testingDeps`, which is mapped to the SBT `Test` configuration.

## Fixed-Version Evidence

| Package | Advisory | Fixed version used |
|---|---|---:|
| `com.github.tomakehurst:wiremock-jre8-standalone` | `GHSA-pmxq-pj47-j8j4` | `2.35.1` |

Maven artifact availability was checked before accepting the bump:

- `wiremock-jre8-standalone-2.35.1.pom`: HTTP `200`
- `wiremock-jre8-standalone-2.35.1.jar`: HTTP `200`

## Scanner Evidence

Command:

```sh
make security-jvm-osv-direct
```

Refreshed report:

- `revival/61_JVM_OSV_DIRECT_DEPENDENCY_BASELINE.md`
- `revival/artifacts/jvm_osv_direct_dependency_baseline_20260629_090129.md`
- `revival/artifacts/jvm_osv_direct_dependency_baseline_20260629_090129.json`

Outcome:

- Parsed package/version coordinates: `113`
- Coordinates with OSV findings: `6`
- Unique OSV vulnerability ids: `15`
- Removed from findings: `com.github.tomakehurst:wiremock-jre8-standalone@2.33.2`
- Present without findings after bump: `com.github.tomakehurst:wiremock-jre8-standalone@2.35.1`

## Remaining Required Work

This artifact is not a compile proof, test pass, resolved dependency graph, eviction report, or transitive SCA result. Java and `sbt` remain required, or an equivalent resolver-backed JVM SCA tool must be introduced before Scenario 12 can pass.
