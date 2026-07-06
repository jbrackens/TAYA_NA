# JVM Resolved Classpath Residual Advisory Gate

- Generated: `2026-06-30T10:41:08.454Z`
- Result: **fail**
- Source JSON: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/revival/artifacts/jvm_osv_resolved_classpath_baseline_20260630_103139.json`
- Reviewed residual policy: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/revival/jvm_resolved_residual_allowlist.json`
- Decision: resolved JVM OSV findings may remain only when they match the reviewed residual policy exactly.

## Observed Resolved Findings

| Package | Version | Advisory ids | Example jar |
|---|---:|---|---|
| `ch.qos.logback:logback-core` | `1.2.13` | `GHSA-25qh-j22f-pwp8`, `GHSA-6v67-2wr5-gvf4`, `GHSA-pr98-23f8-jwxv`, `GHSA-qqpg-mvqg-649v` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/ch/qos/logback/logback-core/1.2.13/logback-core-1.2.13.jar` |
| `com.fasterxml.jackson.core:jackson-core` | `2.13.3` | `GHSA-72hv-8253-57qq`, `GHSA-h46c-h94j-95f3` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/com/fasterxml/jackson/core/jackson-core/2.13.3/jackson-core-2.13.3.jar` |
| `com.fasterxml.jackson.core:jackson-databind` | `2.13.3` | `GHSA-3wrr-7qpf-2prh`, `GHSA-5jmj-h7xm-6q6v`, `GHSA-hgj6-7826-r7m5`, `GHSA-j3rv-43j4-c7qm`, `GHSA-jjjh-jjxp-wpff`, `GHSA-rgv9-q543-rqg4`, `GHSA-rmj7-2vxq-3g9f` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/com/fasterxml/jackson/core/jackson-databind/2.13.3/jackson-databind-2.13.3.jar` |
| `com.google.guava:guava` | `30.1-jre` | `GHSA-5mg8-w23w-74h3`, `GHSA-7g45-4rm6-3mm3` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/com/google/guava/guava/30.1-jre/guava-30.1-jre.jar` |
| `com.lightbend.akka.management:akka-management_2.13` | `1.1.3` | `GHSA-9qvj-rpj8-v5c8` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/com/lightbend/akka/management/akka-management_2.13/1.1.3/akka-management_2.13-1.1.3.jar` |
| `com.rabbitmq:amqp-client` | `5.8.0` | `GHSA-mm8h-8587-p46h` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/com/rabbitmq/amqp-client/5.8.0/amqp-client-5.8.0.jar` |
| `com.squareup.okhttp3:okhttp` | `3.14.7` | `GHSA-3cqm-mf7h-prrj` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/com/squareup/okhttp3/okhttp/3.14.7/okhttp-3.14.7.jar` |
| `com.squareup.okio:okio` | `1.17.2` | `GHSA-w33c-445m-f8w7` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/com/squareup/okio/okio/1.17.2/okio-1.17.2.jar` |
| `com.sun.mail:jakarta.mail` | `1.6.5` | `GHSA-9342-92gg-6v29` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/com/sun/mail/jakarta.mail/1.6.5/jakarta.mail-1.6.5.jar` |
| `com.typesafe.akka:akka-http-core_2.13` | `10.2.9` | `GHSA-qppj-fm5r-hxr3` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/com/typesafe/akka/akka-http-core_2.13/10.2.9/akka-http-core_2.13-10.2.9.jar` |
| `com.typesafe.akka:akka-stream-kafka_2.13` | `3.0.0` | `GHSA-55vq-xpjf-r2xc` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/com/typesafe/akka/akka-stream-kafka_2.13/3.0.0/akka-stream-kafka_2.13-3.0.0.jar` |
| `commons-beanutils:commons-beanutils` | `1.9.4` | `GHSA-wxr5-93ph-8wr9` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/commons-beanutils/commons-beanutils/1.9.4/commons-beanutils-1.9.4.jar` |
| `commons-io:commons-io` | `2.5` | `GHSA-78wr-2p64-hpwj`, `GHSA-gwrp-pvrq-jmwv` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/commons-io/commons-io/2.5/commons-io-2.5.jar` |
| `commons-net:commons-net` | `3.6` | `GHSA-cgp8-4m63-fhh5` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/commons-net/commons-net/3.6/commons-net-3.6.jar` |
| `net.i2p.crypto:eddsa` | `0.2.0` | `GHSA-p53j-g8pw-4w5f` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/net/i2p/crypto/eddsa/0.2.0/eddsa-0.2.0.jar` |
| `org.apache.avro:avro` | `1.11.0` | `GHSA-r7pg-v2c8-mfg3`, `GHSA-rhrv-645h-fjfh` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/apache/avro/avro/1.11.0/avro-1.11.0.jar` |
| `org.apache.commons:commons-compress` | `1.21` | `GHSA-4265-ccf5-phj5`, `GHSA-4g9r-vxhx-9pgx` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/apache/commons/commons-compress/1.21/commons-compress-1.21.jar` |
| `org.apache.commons:commons-lang3` | `3.12.0` | `GHSA-j288-q9x7-2f5v` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/apache/commons/commons-lang3/3.12.0/commons-lang3-3.12.0.jar` |
| `org.apache.kafka:kafka-clients` | `3.0.0` | `GHSA-2x2g-32r7-p4x8`, `GHSA-5qcv-4rpc-jp93`, `GHSA-wf66-mphr-4c4r` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/apache/kafka/kafka-clients/3.0.0/kafka-clients-3.0.0.jar` |
| `org.apache.poi:poi-ooxml` | `4.1.2` | `GHSA-gmg8-593g-7mv3` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/apache/poi/poi-ooxml/4.1.2/poi-ooxml-4.1.2.jar` |
| `org.bouncycastle:bcpkix-jdk15on` | `1.68` | `GHSA-4cx2-fc23-5wg6`, `GHSA-wg6q-6289-32hp` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/bouncycastle/bcpkix-jdk15on/1.68/bcpkix-jdk15on-1.68.jar` |
| `org.bouncycastle:bcprov-jdk15on` | `1.70` | `GHSA-4h8f-2wvx-gg5w`, `GHSA-8xfc-gm6g-vgpv`, `GHSA-hr8g-6v94-x4m9`, `GHSA-v435-xc8x-wvr9`, `GHSA-wjxj-5m7g-mg7q` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/bouncycastle/bcprov-jdk15on/1.70/bcprov-jdk15on-1.70.jar` |
| `org.jboss.resteasy:resteasy-multipart-provider` | `3.15.1.Final` | `GHSA-2c6g-pfx3-w7h8` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/jboss/resteasy/resteasy-multipart-provider/3.15.1.Final/resteasy-multipart-provider-3.15.1.Final.jar` |
| `org.keycloak:keycloak-adapter-core` | `17.0.1` | `GHSA-7vw6-5q2f-7w5r` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/keycloak/keycloak-adapter-core/17.0.1/keycloak-adapter-core-17.0.1.jar` |
| `org.keycloak:keycloak-core` | `17.0.1` | `GHSA-5cc8-pgp5-7mpm`, `GHSA-755v-r4x4-qf7m`, `GHSA-93ww-43rr-79v3`, `GHSA-9vm7-v8wj-3fqw`, `GHSA-c7xw-p58w-h6fj`, `GHSA-g4gc-rh26-m3p5`, `GHSA-q4xq-445g-g6ch`, `GHSA-v436-q368-hvgg`, `GHSA-w97f-w3hq-36g2`, `GHSA-xmmm-jw76-q7vg` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/keycloak/keycloak-core/17.0.1/keycloak-core-17.0.1.jar` |
| `org.lz4:lz4-java` | `1.7.1` | `GHSA-cmp6-m4wj-q63q`, `GHSA-vqf4-7m7x-wgfc` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/lz4/lz4-java/1.7.1/lz4-java-1.7.1.jar` |
| `org.postgresql:postgresql` | `42.2.19` | `GHSA-24rp-q3w6-vc56`, `GHSA-562r-vg33-8x8h`, `GHSA-673j-qm5f-xpv8`, `GHSA-727h-hrw8-jg8q`, `GHSA-98qh-xjc8-98pq`, `GHSA-r38f-c4h4-hqq2`, `GHSA-v7wg-cpwc-24m4` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/postgresql/postgresql/42.2.19/postgresql-42.2.19.jar` |
| `org.scala-lang:scala-library` | `2.13.8` | `GHSA-8qv5-68g4-248j` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/scala-lang/scala-library/2.13.8/scala-library-2.13.8.jar` |
| `org.typelevel:jawn-parser_2.13` | `1.1.2` | `GHSA-vc89-hccf-rq55` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/typelevel/jawn-parser_2.13/1.1.2/jawn-parser_2.13-1.1.2.jar` |
| `org.xerial.snappy:snappy-java` | `1.1.8.1` | `GHSA-55g7-9cwv-5qfv`, `GHSA-fjpj-2g6w-x25r`, `GHSA-pqr6-cmr2-h8hf`, `GHSA-qcwq-55hx-v3vh` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/xerial/snappy/snappy-java/1.1.8.1/snappy-java-1.1.8.1.jar` |
| `org.yaml:snakeyaml` | `1.28` | `GHSA-3mc7-4q67-w48m`, `GHSA-98wm-3w3q-mw94`, `GHSA-9w3m-gqgf-c4p9`, `GHSA-c4r9-r8fh-9vj2`, `GHSA-hhhw-99gj-p3c3`, `GHSA-mjmj-j48q-9wg2`, `GHSA-w37g-rhq8-7m4j` | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/yaml/snakeyaml/1.28/snakeyaml-1.28.jar` |

## Summary

- Coordinates with resolved classpath OSV findings: `31`
- Unique OSV vulnerability ids: `77`
- Reviewed residual policy entries: `0`

## Failures

- ch.qos.logback:logback-core@1.2.13: unreviewed resolved JVM OSV finding (GHSA-25qh-j22f-pwp8, GHSA-6v67-2wr5-gvf4, GHSA-pr98-23f8-jwxv, GHSA-qqpg-mvqg-649v)
- com.fasterxml.jackson.core:jackson-core@2.13.3: unreviewed resolved JVM OSV finding (GHSA-72hv-8253-57qq, GHSA-h46c-h94j-95f3)
- com.fasterxml.jackson.core:jackson-databind@2.13.3: unreviewed resolved JVM OSV finding (GHSA-3wrr-7qpf-2prh, GHSA-5jmj-h7xm-6q6v, GHSA-hgj6-7826-r7m5, GHSA-j3rv-43j4-c7qm, GHSA-jjjh-jjxp-wpff, GHSA-rgv9-q543-rqg4, GHSA-rmj7-2vxq-3g9f)
- com.google.guava:guava@30.1-jre: unreviewed resolved JVM OSV finding (GHSA-5mg8-w23w-74h3, GHSA-7g45-4rm6-3mm3)
- com.lightbend.akka.management:akka-management_2.13@1.1.3: unreviewed resolved JVM OSV finding (GHSA-9qvj-rpj8-v5c8)
- com.rabbitmq:amqp-client@5.8.0: unreviewed resolved JVM OSV finding (GHSA-mm8h-8587-p46h)
- com.squareup.okhttp3:okhttp@3.14.7: unreviewed resolved JVM OSV finding (GHSA-3cqm-mf7h-prrj)
- com.squareup.okio:okio@1.17.2: unreviewed resolved JVM OSV finding (GHSA-w33c-445m-f8w7)
- com.sun.mail:jakarta.mail@1.6.5: unreviewed resolved JVM OSV finding (GHSA-9342-92gg-6v29)
- com.typesafe.akka:akka-http-core_2.13@10.2.9: unreviewed resolved JVM OSV finding (GHSA-qppj-fm5r-hxr3)
- com.typesafe.akka:akka-stream-kafka_2.13@3.0.0: unreviewed resolved JVM OSV finding (GHSA-55vq-xpjf-r2xc)
- commons-beanutils:commons-beanutils@1.9.4: unreviewed resolved JVM OSV finding (GHSA-wxr5-93ph-8wr9)
- commons-io:commons-io@2.5: unreviewed resolved JVM OSV finding (GHSA-78wr-2p64-hpwj, GHSA-gwrp-pvrq-jmwv)
- commons-net:commons-net@3.6: unreviewed resolved JVM OSV finding (GHSA-cgp8-4m63-fhh5)
- net.i2p.crypto:eddsa@0.2.0: unreviewed resolved JVM OSV finding (GHSA-p53j-g8pw-4w5f)
- org.apache.avro:avro@1.11.0: unreviewed resolved JVM OSV finding (GHSA-r7pg-v2c8-mfg3, GHSA-rhrv-645h-fjfh)
- org.apache.commons:commons-compress@1.21: unreviewed resolved JVM OSV finding (GHSA-4265-ccf5-phj5, GHSA-4g9r-vxhx-9pgx)
- org.apache.commons:commons-lang3@3.12.0: unreviewed resolved JVM OSV finding (GHSA-j288-q9x7-2f5v)
- org.apache.kafka:kafka-clients@3.0.0: unreviewed resolved JVM OSV finding (GHSA-2x2g-32r7-p4x8, GHSA-5qcv-4rpc-jp93, GHSA-wf66-mphr-4c4r)
- org.apache.poi:poi-ooxml@4.1.2: unreviewed resolved JVM OSV finding (GHSA-gmg8-593g-7mv3)
- org.bouncycastle:bcpkix-jdk15on@1.68: unreviewed resolved JVM OSV finding (GHSA-4cx2-fc23-5wg6, GHSA-wg6q-6289-32hp)
- org.bouncycastle:bcprov-jdk15on@1.70: unreviewed resolved JVM OSV finding (GHSA-4h8f-2wvx-gg5w, GHSA-8xfc-gm6g-vgpv, GHSA-hr8g-6v94-x4m9, GHSA-v435-xc8x-wvr9, GHSA-wjxj-5m7g-mg7q)
- org.jboss.resteasy:resteasy-multipart-provider@3.15.1.Final: unreviewed resolved JVM OSV finding (GHSA-2c6g-pfx3-w7h8)
- org.keycloak:keycloak-adapter-core@17.0.1: unreviewed resolved JVM OSV finding (GHSA-7vw6-5q2f-7w5r)
- org.keycloak:keycloak-core@17.0.1: unreviewed resolved JVM OSV finding (GHSA-5cc8-pgp5-7mpm, GHSA-755v-r4x4-qf7m, GHSA-93ww-43rr-79v3, GHSA-9vm7-v8wj-3fqw, GHSA-c7xw-p58w-h6fj, GHSA-g4gc-rh26-m3p5, GHSA-q4xq-445g-g6ch, GHSA-v436-q368-hvgg, GHSA-w97f-w3hq-36g2, GHSA-xmmm-jw76-q7vg)
- org.lz4:lz4-java@1.7.1: unreviewed resolved JVM OSV finding (GHSA-cmp6-m4wj-q63q, GHSA-vqf4-7m7x-wgfc)
- org.postgresql:postgresql@42.2.19: unreviewed resolved JVM OSV finding (GHSA-24rp-q3w6-vc56, GHSA-562r-vg33-8x8h, GHSA-673j-qm5f-xpv8, GHSA-727h-hrw8-jg8q, GHSA-98qh-xjc8-98pq, GHSA-r38f-c4h4-hqq2, GHSA-v7wg-cpwc-24m4)
- org.scala-lang:scala-library@2.13.8: unreviewed resolved JVM OSV finding (GHSA-8qv5-68g4-248j)
- org.typelevel:jawn-parser_2.13@1.1.2: unreviewed resolved JVM OSV finding (GHSA-vc89-hccf-rq55)
- org.xerial.snappy:snappy-java@1.1.8.1: unreviewed resolved JVM OSV finding (GHSA-55g7-9cwv-5qfv, GHSA-fjpj-2g6w-x25r, GHSA-pqr6-cmr2-h8hf, GHSA-qcwq-55hx-v3vh)
- org.yaml:snakeyaml@1.28: unreviewed resolved JVM OSV finding (GHSA-3mc7-4q67-w48m, GHSA-98wm-3w3q-mw94, GHSA-9w3m-gqgf-c4p9, GHSA-c4r9-r8fh-9vj2, GHSA-hhhw-99gj-p3c3, GHSA-mjmj-j48q-9wg2, GHSA-w37g-rhq8-7m4j)

## Notes

- This gate does not claim residual advisories are remediated.
- A missing policy means no resolved JVM OSV findings are accepted.
- Remediate findings where possible before adding residual entries.
- Any accepted residual needs compatibility/risk rationale and launch sign-off before Scenario 12 can pass.
