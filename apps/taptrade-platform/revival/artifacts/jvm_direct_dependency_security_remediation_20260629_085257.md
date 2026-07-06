# JVM Direct Dependency Security Remediation Artifact

- Generated: `2026-06-29T08:52:57Z`
- Scope: backend declared direct JVM dependencies only
- Changed file: `phoenix-backend/project/Dependencies.scala`

## Source Changes

```diff
-    val apacheCommonsText       = "1.9"
+    val apacheCommonsText       = "1.10.0"
-    val logback                 = "1.2.11"
+    val logback                 = "1.2.13"
```

## Fixed-Version Evidence

| Package | Advisory | Fixed version used |
|---|---|---:|
| `org.apache.commons:commons-text` | `GHSA-599f-7c49-w659` | `1.10.0` |
| `ch.qos.logback:logback-classic` | `GHSA-vmq6-5m68-f53m` | `1.2.13` |

Maven artifact availability was checked for both selected fixed versions before accepting the bump.

## Scanner Evidence

Command:

```sh
make security-jvm-osv-direct
```

Refreshed report:

- `revival/61_JVM_OSV_DIRECT_DEPENDENCY_BASELINE.md`
- `revival/artifacts/jvm_osv_direct_dependency_baseline_20260629_084940.md`
- `revival/artifacts/jvm_osv_direct_dependency_baseline_20260629_084940.json`

Outcome:

- Parsed package/version coordinates: `113`
- Coordinates with OSV findings: `7`
- Unique OSV vulnerability ids: `16`
- Removed from findings: `org.apache.commons:commons-text@1.9`, `ch.qos.logback:logback-classic@1.2.11`
- Present without findings after bump: `org.apache.commons:commons-text@1.10.0`, `ch.qos.logback:logback-classic@1.2.13`

Preservation gate:

- Command: `make qa-preservation-modifications`
- Result: passed
- Unclassified modified artifacts: `0`
- Canonical report: `revival/36_PRESERVATION_MODIFICATION_MAP.md`
- Timestamped artifacts: `revival/artifacts/preservation_modification_map_*.md`

## Remaining Required Work

This artifact is not a resolved dependency graph, compile proof, eviction report, or transitive SCA result. Java and `sbt` remain required, or an equivalent resolver-backed JVM SCA tool must be introduced before Scenario 12 can pass.
