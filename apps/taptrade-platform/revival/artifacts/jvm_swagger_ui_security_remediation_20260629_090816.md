# JVM Swagger UI Security Remediation Artifact

- Generated: `2026-06-29T09:08:16Z`
- Scope: backend declared direct Swagger UI webjar dependency
- Changed file: `phoenix-backend/project/Dependencies.scala`

## Source Change

```diff
-    // Let's stick to 4.1.2 since higher versions always display the sample Petstore docs instead of the provided docs for some reason
-    val swaggerUi               = "4.1.2"
+    // 4.1.3 keeps the same index.html behavior as 4.1.2 while fixing GHSA-cr3q-pqgq-m8c2.
+    val swaggerUi               = "4.1.3"
```

## Fixed-Version Evidence

| Package | Advisory | Fixed version used |
|---|---|---:|
| `org.webjars:swagger-ui` | `GHSA-cr3q-pqgq-m8c2` | `4.1.3` |

Maven artifact availability was checked before accepting the bump:

- `swagger-ui-4.1.3.pom`: HTTP `200`
- `swagger-ui-4.1.3.jar`: HTTP `200`

The `index.html` files embedded in `swagger-ui-4.1.2.jar` and `swagger-ui-4.1.3.jar` were compared with `diff -u`; no diff was reported. This preserves the inherited static UI behavior while removing the direct OSV finding.

## Scanner Evidence

Command:

```sh
make security-jvm-osv-direct
```

Refreshed report:

- `revival/61_JVM_OSV_DIRECT_DEPENDENCY_BASELINE.md`
- `revival/artifacts/jvm_osv_direct_dependency_baseline_20260629_090808.md`
- `revival/artifacts/jvm_osv_direct_dependency_baseline_20260629_090808.json`

Outcome:

- Parsed package/version coordinates: `113`
- Coordinates with OSV findings: `5`
- Unique OSV vulnerability ids: `14`
- Removed from findings: `org.webjars:swagger-ui@4.1.2`
- Present without findings after bump: `org.webjars:swagger-ui@4.1.3`

## Remaining Required Work

This artifact is not a compile proof, runtime docs-rendering proof, resolved dependency graph, eviction report, or transitive SCA result. Java and `sbt` remain required, or an equivalent resolver-backed JVM SCA tool must be introduced before Scenario 12 can pass.
