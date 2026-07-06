# JVM Resolved Classpath Residual Advisory Gate

- Generated: `2026-06-30T14:11:57.246Z`
- Result: **fail**
- Source JSON: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_141040.json`
- Reviewed residual policy: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/revival/jvm_resolved_residual_allowlist.json`
- Decision: resolved JVM OSV findings may remain only when they match the reviewed residual policy exactly.

## Observed Resolved Findings

| Package | Version | Advisory ids | Example jar |
|---|---:|---|---|
| `ch.qos.logback:logback-core` | `1.5.18` | `GHSA-25qh-j22f-pwp8`, `GHSA-qqpg-mvqg-649v` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/ch/qos/logback/logback-core/1.5.18/logback-core-1.5.18.jar` |
| `com.lightbend.akka.management:akka-management_2.13` | `1.1.3` | `GHSA-9qvj-rpj8-v5c8` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/com/lightbend/akka/management/akka-management_2.13/1.1.3/akka-management_2.13-1.1.3.jar` |
| `com.typesafe.akka:akka-http-core_2.13` | `10.2.9` | `GHSA-qppj-fm5r-hxr3` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/com/typesafe/akka/akka-http-core_2.13/10.2.9/akka-http-core_2.13-10.2.9.jar` |
| `net.i2p.crypto:eddsa` | `0.2.0` | `GHSA-p53j-g8pw-4w5f` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/net/i2p/crypto/eddsa/0.2.0/eddsa-0.2.0.jar` |
| `org.apache.kafka:kafka-clients` | `3.3.2` | `GHSA-2x2g-32r7-p4x8`, `GHSA-5qcv-4rpc-jp93`, `GHSA-vgq5-3255-v292`, `GHSA-wf66-mphr-4c4r` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/apache/kafka/kafka-clients/3.3.2/kafka-clients-3.3.2.jar` |
| `org.bouncycastle:bcpkix-jdk15on` | `1.68` | `GHSA-4cx2-fc23-5wg6`, `GHSA-wg6q-6289-32hp` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/bouncycastle/bcpkix-jdk15on/1.68/bcpkix-jdk15on-1.68.jar` |
| `org.bouncycastle:bcprov-jdk15on` | `1.70` | `GHSA-4h8f-2wvx-gg5w`, `GHSA-8xfc-gm6g-vgpv`, `GHSA-hr8g-6v94-x4m9`, `GHSA-v435-xc8x-wvr9`, `GHSA-wjxj-5m7g-mg7q` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/bouncycastle/bcprov-jdk15on/1.70/bcprov-jdk15on-1.70.jar` |
| `org.keycloak:keycloak-adapter-core` | `17.0.1` | `GHSA-7vw6-5q2f-7w5r` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/keycloak/keycloak-adapter-core/17.0.1/keycloak-adapter-core-17.0.1.jar` |
| `org.keycloak:keycloak-core` | `17.0.1` | `GHSA-5cc8-pgp5-7mpm`, `GHSA-755v-r4x4-qf7m`, `GHSA-93ww-43rr-79v3`, `GHSA-9vm7-v8wj-3fqw`, `GHSA-c7xw-p58w-h6fj`, `GHSA-g4gc-rh26-m3p5`, `GHSA-q4xq-445g-g6ch`, `GHSA-v436-q368-hvgg`, `GHSA-w97f-w3hq-36g2`, `GHSA-xmmm-jw76-q7vg` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/keycloak/keycloak-core/17.0.1/keycloak-core-17.0.1.jar` |
| `org.lz4:lz4-java` | `1.8.0` | `GHSA-cmp6-m4wj-q63q`, `GHSA-vqf4-7m7x-wgfc` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/lz4/lz4-java/1.8.0/lz4-java-1.8.0.jar` |
| `org.yaml:snakeyaml` | `1.28` | `GHSA-3mc7-4q67-w48m`, `GHSA-98wm-3w3q-mw94`, `GHSA-9w3m-gqgf-c4p9`, `GHSA-c4r9-r8fh-9vj2`, `GHSA-hhhw-99gj-p3c3`, `GHSA-mjmj-j48q-9wg2`, `GHSA-w37g-rhq8-7m4j` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/yaml/snakeyaml/1.28/snakeyaml-1.28.jar` |

## Summary

- Coordinates with resolved classpath OSV findings: `11`
- Unique OSV vulnerability ids: `36`
- Reviewed residual policy entries: `0`

## Failures

- ch.qos.logback:logback-core@1.5.18: unreviewed resolved JVM OSV finding (GHSA-25qh-j22f-pwp8, GHSA-qqpg-mvqg-649v)
- com.lightbend.akka.management:akka-management_2.13@1.1.3: unreviewed resolved JVM OSV finding (GHSA-9qvj-rpj8-v5c8)
- com.typesafe.akka:akka-http-core_2.13@10.2.9: unreviewed resolved JVM OSV finding (GHSA-qppj-fm5r-hxr3)
- net.i2p.crypto:eddsa@0.2.0: unreviewed resolved JVM OSV finding (GHSA-p53j-g8pw-4w5f)
- org.apache.kafka:kafka-clients@3.3.2: unreviewed resolved JVM OSV finding (GHSA-2x2g-32r7-p4x8, GHSA-5qcv-4rpc-jp93, GHSA-vgq5-3255-v292, GHSA-wf66-mphr-4c4r)
- org.bouncycastle:bcpkix-jdk15on@1.68: unreviewed resolved JVM OSV finding (GHSA-4cx2-fc23-5wg6, GHSA-wg6q-6289-32hp)
- org.bouncycastle:bcprov-jdk15on@1.70: unreviewed resolved JVM OSV finding (GHSA-4h8f-2wvx-gg5w, GHSA-8xfc-gm6g-vgpv, GHSA-hr8g-6v94-x4m9, GHSA-v435-xc8x-wvr9, GHSA-wjxj-5m7g-mg7q)
- org.keycloak:keycloak-adapter-core@17.0.1: unreviewed resolved JVM OSV finding (GHSA-7vw6-5q2f-7w5r)
- org.keycloak:keycloak-core@17.0.1: unreviewed resolved JVM OSV finding (GHSA-5cc8-pgp5-7mpm, GHSA-755v-r4x4-qf7m, GHSA-93ww-43rr-79v3, GHSA-9vm7-v8wj-3fqw, GHSA-c7xw-p58w-h6fj, GHSA-g4gc-rh26-m3p5, GHSA-q4xq-445g-g6ch, GHSA-v436-q368-hvgg, GHSA-w97f-w3hq-36g2, GHSA-xmmm-jw76-q7vg)
- org.lz4:lz4-java@1.8.0: unreviewed resolved JVM OSV finding (GHSA-cmp6-m4wj-q63q, GHSA-vqf4-7m7x-wgfc)
- org.yaml:snakeyaml@1.28: unreviewed resolved JVM OSV finding (GHSA-3mc7-4q67-w48m, GHSA-98wm-3w3q-mw94, GHSA-9w3m-gqgf-c4p9, GHSA-c4r9-r8fh-9vj2, GHSA-hhhw-99gj-p3c3, GHSA-mjmj-j48q-9wg2, GHSA-w37g-rhq8-7m4j)

## Notes

- This gate does not claim residual advisories are remediated.
- A missing policy means no resolved JVM OSV findings are accepted.
- Remediate findings where possible before adding residual entries.
- Any accepted residual needs compatibility/risk rationale and launch sign-off before Scenario 12 can pass.
