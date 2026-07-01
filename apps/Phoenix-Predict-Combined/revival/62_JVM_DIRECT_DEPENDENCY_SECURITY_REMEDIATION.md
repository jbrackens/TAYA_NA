# JVM Direct Dependency Security Remediation

- Generated: `2026-06-29T08:52:57Z`
- Scope: backend declared direct JVM dependencies only
- Source file changed: `phoenix-backend/project/Dependencies.scala`
- Evidence artifact: `revival/artifacts/jvm_direct_dependency_security_remediation_20260629_085257.md`

## Remediation

Two inherited direct backend dependency versions were updated after OSV fixed-version review:

| Package | Previous | Current | OSV advisory removed from direct baseline |
|---|---:|---:|---|
| `org.apache.commons:commons-text` | `1.9` | `1.10.0` | `GHSA-599f-7c49-w659` |
| `ch.qos.logback:logback-classic` | `1.2.11` | `1.2.13` | `GHSA-vmq6-5m68-f53m` |

OSV vulnerability detail showed `commons-text` fixed at `1.10.0` for the affected range and Logback 1.2.x fixed at `1.2.13`. Maven artifact availability was checked before the version change.

## Verification

`make security-jvm-osv-direct` passed after the version change and regenerated `revival/61_JVM_OSV_DIRECT_DEPENDENCY_BASELINE.md` plus artifacts:

- `revival/artifacts/jvm_osv_direct_dependency_baseline_20260629_084940.md`
- `revival/artifacts/jvm_osv_direct_dependency_baseline_20260629_084940.json`

The refreshed direct baseline parsed 113 package/version coordinates, found 7 coordinates with OSV findings, and reported 16 unique OSV ids. The previous direct baseline had 9 coordinates with OSV findings and 18 unique OSV ids. `logback-classic@1.2.13` and `commons-text@1.10.0` remain present in the parsed coordinate table but no longer appear in the findings table.

`make qa-preservation-modifications` also passed after the dependency and evidence changes. The canonical preservation report is `revival/36_PRESERVATION_MODIFICATION_MAP.md`, with the timestamped artifact written under `revival/artifacts/`.

Remaining direct OSV findings are:

- `com.github.tomakehurst:wiremock-jre8-standalone@2.33.2`
- `com.lightbend.akka.management:akka-management_2.13@1.1.3`
- `com.rabbitmq:amqp-client@5.8.0`
- `com.typesafe.akka:akka-stream-kafka_2.13@3.0.0`
- `org.keycloak:keycloak-adapter-core@17.0.1`
- `org.keycloak:keycloak-core@17.0.1`
- `org.webjars:swagger-ui@4.1.2`

## Limitations

This remediation does not prove the resolved JVM classpath is clean. Java and `sbt` are still unavailable in this workspace, so full backend compile, eviction review, and transitive JVM SCA remain incomplete. Scenario 12 stays Partial pending resolver-backed JVM SCA and final RC audit.
