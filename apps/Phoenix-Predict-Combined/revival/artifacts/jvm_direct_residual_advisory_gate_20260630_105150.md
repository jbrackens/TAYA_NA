# JVM Direct Residual Advisory Gate

- Generated: `2026-06-30T10:51:50.737Z`
- Result: **fail**
- Source JSON: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_direct_dependency_baseline_20260630_105139.json`
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
| `com.lightbend.akka.management:akka-management_2.13` | `1.1.3` | `GHSA-9qvj-rpj8-v5c8` | `project/Dependencies.scala:111` |
| `org.bouncycastle:bcpkix-jdk15on` | `1.70` | `GHSA-4cx2-fc23-5wg6`, `GHSA-wg6q-6289-32hp` | `project/Dependencies.scala:430` |
| `org.bouncycastle:bcprov-jdk15on` | `1.70` | `GHSA-4h8f-2wvx-gg5w`, `GHSA-8xfc-gm6g-vgpv`, `GHSA-hr8g-6v94-x4m9`, `GHSA-v435-xc8x-wvr9`, `GHSA-wjxj-5m7g-mg7q` | `project/Dependencies.scala:431` |
| `org.keycloak:keycloak-adapter-core` | `17.0.1` | `GHSA-7vw6-5q2f-7w5r` | `project/Dependencies.scala:249` |
| `org.keycloak:keycloak-core` | `17.0.1` | `GHSA-5cc8-pgp5-7mpm`, `GHSA-755v-r4x4-qf7m`, `GHSA-93ww-43rr-79v3`, `GHSA-9vm7-v8wj-3fqw`, `GHSA-c7xw-p58w-h6fj`, `GHSA-g4gc-rh26-m3p5`, `GHSA-q4xq-445g-g6ch`, `GHSA-v436-q368-hvgg`, `GHSA-w97f-w3hq-36g2`, `GHSA-xmmm-jw76-q7vg` | `project/Dependencies.scala:250` |

## Summary

- Coordinates with direct OSV findings: `5`
- Unique OSV vulnerability ids: `19`

## Failures

- org.bouncycastle:bcpkix-jdk15on: unreviewed direct JVM OSV finding (GHSA-4cx2-fc23-5wg6, GHSA-wg6q-6289-32hp)
- org.bouncycastle:bcprov-jdk15on: unreviewed direct JVM OSV finding (GHSA-4h8f-2wvx-gg5w, GHSA-8xfc-gm6g-vgpv, GHSA-hr8g-6v94-x4m9, GHSA-v435-xc8x-wvr9, GHSA-wjxj-5m7g-mg7q)

## Notes

- This gate does not claim the residual advisories are remediated.
- Full resolver-backed JVM SCA, eviction review, compile proof, and runtime validation remain required before Scenario 12 can pass.
- Any new package, changed version, changed advisory id set, malformed artifact, or missing artifact fails this gate.
