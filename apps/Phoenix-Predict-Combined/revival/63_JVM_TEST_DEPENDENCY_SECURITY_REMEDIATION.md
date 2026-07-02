# JVM Test Dependency Security Remediation

- Generated: `2026-06-29T09:01:39Z`
- Scope: backend declared direct JVM test dependency
- Source file changed: `phoenix-backend/project/Dependencies.scala`
- Evidence artifact: `revival/artifacts/jvm_test_dependency_security_remediation_20260629_090139.md`

## Remediation

One inherited direct backend test dependency version was updated after OSV fixed-version review:

| Package | Previous | Current | OSV advisory removed from direct baseline | Scope |
|---|---:|---:|---|---|
| `com.github.tomakehurst:wiremock-jre8-standalone` | `2.33.2` | `2.35.1` | `GHSA-pmxq-pj47-j8j4` | `Test` |

OSV vulnerability detail showed the `com.github.tomakehurst:wiremock-jre8-standalone` affected range fixed at `2.35.1`. Maven artifact availability was checked for both the POM and JAR before the version change.

## Verification

`make security-jvm-osv-direct` passed after the version change and regenerated `revival/61_JVM_OSV_DIRECT_DEPENDENCY_BASELINE.md` plus artifacts:

- `revival/artifacts/jvm_osv_direct_dependency_baseline_20260629_090129.md`
- `revival/artifacts/jvm_osv_direct_dependency_baseline_20260629_090129.json`

The refreshed direct baseline parsed 113 package/version coordinates, found 6 coordinates with OSV findings, and reported 15 unique OSV ids. The previous direct baseline had 7 coordinates with OSV findings and 16 unique OSV ids. `wiremock-jre8-standalone@2.35.1` remains present in the parsed coordinate table but no longer appears in the findings table.

Remaining direct OSV findings are:

- `com.lightbend.akka.management:akka-management_2.13@1.1.3`
- `com.rabbitmq:amqp-client@5.8.0`
- `com.typesafe.akka:akka-stream-kafka_2.13@3.0.0`
- `org.keycloak:keycloak-adapter-core@17.0.1`
- `org.keycloak:keycloak-core@17.0.1`
- `org.webjars:swagger-ui@4.1.2`

## Limitations

This remediation does not prove backend tests compile or pass. Java and `sbt` are still unavailable in this workspace, so full backend compile, test execution, eviction review, and transitive JVM SCA remain incomplete. Scenario 12 stays Partial pending resolver-backed JVM SCA and final RC audit.
