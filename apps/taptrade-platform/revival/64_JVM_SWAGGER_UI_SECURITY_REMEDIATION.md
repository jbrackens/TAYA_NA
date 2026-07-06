# JVM Swagger UI Security Remediation

- Generated: `2026-06-29T09:08:16Z`
- Scope: backend declared direct Swagger UI webjar dependency
- Source file changed: `phoenix-backend/project/Dependencies.scala`
- Evidence artifact: `revival/artifacts/jvm_swagger_ui_security_remediation_20260629_090816.md`

## Remediation

One inherited direct backend documentation-surface dependency version was updated after OSV fixed-version review:

| Package | Previous | Current | OSV advisory removed from direct baseline |
|---|---:|---:|---|
| `org.webjars:swagger-ui` | `4.1.2` | `4.1.3` | `GHSA-cr3q-pqgq-m8c2` |

OSV vulnerability detail showed the `org.webjars:swagger-ui` affected range fixed at `4.1.3`. Maven artifact availability was checked for both the POM and JAR before the version change.

## Preservation Review

The inherited dependency comment warned that higher Swagger UI versions displayed the sample Petstore docs instead of the provided docs. Before applying the bump, the webjar `index.html` files for 4.1.2 and 4.1.3 were compared and showed no diff. The route still redirects `/docs` to `/docs/index.html?url=/docs/docs.yaml&defaultModelRendering=model&displayRequestDuration=true&validatorUrl=none`, and the webjar resource path is still discovered from `META-INF/maven/org.webjars/swagger-ui/pom.properties`.

This is a documentation-surface dependency change only. It does not alter point sources, point uses, ledger behavior, settlement, social features, rewards, API-client contracts, or launch money-path constraints.

## Verification

`make security-jvm-osv-direct` passed after the version change and regenerated `revival/61_JVM_OSV_DIRECT_DEPENDENCY_BASELINE.md` plus artifacts:

- `revival/artifacts/jvm_osv_direct_dependency_baseline_20260629_090808.md`
- `revival/artifacts/jvm_osv_direct_dependency_baseline_20260629_090808.json`

The refreshed direct baseline parsed 113 package/version coordinates, found 5 coordinates with OSV findings, and reported 14 unique OSV ids. The previous direct baseline had 6 coordinates with OSV findings and 15 unique OSV ids. `swagger-ui@4.1.3` remains present in the parsed coordinate table but no longer appears in the findings table.

Remaining direct OSV findings are:

- `com.lightbend.akka.management:akka-management_2.13@1.1.3`
- `com.rabbitmq:amqp-client@5.8.0`
- `com.typesafe.akka:akka-stream-kafka_2.13@3.0.0`
- `org.keycloak:keycloak-adapter-core@17.0.1`
- `org.keycloak:keycloak-core@17.0.1`

## Limitations

This remediation does not prove backend compile, runtime docs rendering, eviction behavior, or transitive JVM SCA. Java and `sbt` are still unavailable in this workspace. Scenario 12 stays Partial pending resolver-backed JVM SCA, runtime/compile evidence, and final RC audit.
