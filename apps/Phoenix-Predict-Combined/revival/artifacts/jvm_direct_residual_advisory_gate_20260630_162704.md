# JVM Direct Residual Advisory Gate

- Generated: `2026-06-30T16:27:04.796Z`
- Result: **pass**
- Source JSON: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_162631.json`
- Decision: direct JVM OSV findings may remain only when they match the reviewed runtime residual set exactly.

## Allowed Residual Direct Findings

| Package | Version | Advisory ids | Rationale |
|---|---:|---|---|
| `com.lightbend.akka.management:akka-management_2.13` | `1.1.3` | `GHSA-9qvj-rpj8-v5c8` | Runtime Akka Management line; OSV fixed version is 1.6.1, which requires Java/SBT compile and runtime validation before accepting. |
| `com.rabbitmq:amqp-client` | `5.8.0` | `GHSA-mm8h-8587-p46h` | Runtime RabbitMQ client pulled through inherited odds-feed support; fixed version 5.18.0 needs Java/SBT compile and integration validation. |
| `com.typesafe.akka:akka-stream-kafka_2.13` | `3.0.0` | `GHSA-55vq-xpjf-r2xc` | Runtime Akka Stream Kafka line; OSV fixed version is 4.0.2 and should not be bumped without resolver-backed compatibility evidence. |
| `org.keycloak:keycloak-adapter-core` | `17.0.1` | `GHSA-7vw6-5q2f-7w5r` | Runtime Keycloak adapter; advisory has no fixed event in OSV and broad Keycloak upgrades require auth compatibility validation. |
| `org.keycloak:keycloak-core` | `17.0.1` | `GHSA-5cc8-pgp5-7mpm`, `GHSA-755v-r4x4-qf7m`, `GHSA-93ww-43rr-79v3`, `GHSA-9vm7-v8wj-3fqw`, `GHSA-c7xw-p58w-h6fj`, `GHSA-g4gc-rh26-m3p5`, `GHSA-q4xq-445g-g6ch`, `GHSA-v436-q368-hvgg`, `GHSA-w97f-w3hq-36g2`, `GHSA-xmmm-jw76-q7vg` | Runtime Keycloak core; multiple advisories remain and any major Keycloak movement requires auth/session compatibility validation. |

## Observed Direct Findings

| Package | Version | Advisory ids | First source |
|---|---:|---|---|
| `com.lightbend.akka.management:akka-management_2.13` | `1.1.3` | `GHSA-9qvj-rpj8-v5c8` | `project/Dependencies.scala:116` |
| `org.keycloak:keycloak-adapter-core` | `17.0.1` | `GHSA-7vw6-5q2f-7w5r` | `project/Dependencies.scala:254` |
| `org.keycloak:keycloak-core` | `17.0.1` | `GHSA-5cc8-pgp5-7mpm`, `GHSA-755v-r4x4-qf7m`, `GHSA-93ww-43rr-79v3`, `GHSA-9vm7-v8wj-3fqw`, `GHSA-c7xw-p58w-h6fj`, `GHSA-g4gc-rh26-m3p5`, `GHSA-q4xq-445g-g6ch`, `GHSA-v436-q368-hvgg`, `GHSA-w97f-w3hq-36g2`, `GHSA-xmmm-jw76-q7vg` | `project/Dependencies.scala:255` |

## Summary

- Coordinates with direct OSV findings: `3`
- Unique OSV vulnerability ids: `12`

## Verification

- Every direct JVM OSV finding matched the reviewed residual package, version, and advisory id set.
- No new direct JVM OSV finding was observed.
- Lower residual counts pass only when the remaining rows still match the reviewed residual set.

## Notes

- This gate does not claim the residual advisories are remediated.
- Full resolver-backed JVM SCA, eviction review, compile proof, and runtime validation remain required before Scenario 12 can pass.
- Any new package, changed version, changed advisory id set, malformed artifact, or missing artifact fails this gate.
