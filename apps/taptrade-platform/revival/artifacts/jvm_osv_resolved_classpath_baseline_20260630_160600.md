# JVM OSV Resolved Classpath Baseline

- Generated: `2026-06-30T16:08:20.046Z`
- Backend: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/phoenix-backend`
- Resolved classpath log: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/revival/artifacts/jvm_resolved_classpath_20260630_160600.log`
- Data source: OSV API `https://api.osv.dev/v1/querybatch`
- Ecosystem: Maven
- Scope: SBT-resolved `phoenix-backend / Compile / externalDependencyClasspath` jar coordinates.
- Limitation: compile classpath evidence does not replace runtime smoke/compatibility validation or human residual-risk acceptance.

## Summary

- Resolved package/version coordinates: **261**
- Coordinates with OSV findings: **11**
- Unique OSV vulnerability ids: **27**
- Unique CVE aliases: **0**

## Findings

| Package | Version | Findings | Example jar |
|---|---:|---|---|
| `com.lightbend.akka.management:akka-management_2.13` | `1.1.3` | GHSA-9qvj-rpj8-v5c8 | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/com/lightbend/akka/management/akka-management_2.13/1.1.3/akka-management_2.13-1.1.3.jar` |
| `com.typesafe.akka:akka-http-core_2.13` | `10.2.9` | GHSA-qppj-fm5r-hxr3 | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/com/typesafe/akka/akka-http-core_2.13/10.2.9/akka-http-core_2.13-10.2.9.jar` |
| `net.i2p.crypto:eddsa` | `0.2.0` | GHSA-p53j-g8pw-4w5f | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/net/i2p/crypto/eddsa/0.2.0/eddsa-0.2.0.jar` |
| `org.bouncycastle:bcpkix-jdk15on` | `1.60` | GHSA-4cx2-fc23-5wg6<br>GHSA-wg6q-6289-32hp | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/bouncycastle/bcpkix-jdk15on/1.60/bcpkix-jdk15on-1.60.jar` |
| `org.bouncycastle:bcpkix-jdk18on` | `1.74` | GHSA-4cx2-fc23-5wg6<br>GHSA-wg6q-6289-32hp | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/bouncycastle/bcpkix-jdk18on/1.74/bcpkix-jdk18on-1.74.jar` |
| `org.bouncycastle:bcprov-jdk15on` | `1.70` | GHSA-4h8f-2wvx-gg5w<br>GHSA-8xfc-gm6g-vgpv<br>GHSA-hr8g-6v94-x4m9<br>GHSA-v435-xc8x-wvr9<br>GHSA-wjxj-5m7g-mg7q | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/bouncycastle/bcprov-jdk15on/1.70/bcprov-jdk15on-1.70.jar` |
| `org.bouncycastle:bcprov-jdk18on` | `1.74` | GHSA-4h8f-2wvx-gg5w<br>GHSA-67mf-3cr5-8w23<br>GHSA-8xfc-gm6g-vgpv<br>GHSA-c3fc-8qff-9hwx<br>GHSA-m44j-cfrm-g8qc<br>GHSA-v435-xc8x-wvr9 | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/bouncycastle/bcprov-jdk18on/1.74/bcprov-jdk18on-1.74.jar` |
| `org.keycloak:keycloak-adapter-core` | `25.0.3` | GHSA-7vw6-5q2f-7w5r | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/keycloak/keycloak-adapter-core/25.0.3/keycloak-adapter-core-25.0.3.jar` |
| `org.keycloak:keycloak-core` | `25.0.3` | GHSA-93ww-43rr-79v3<br>GHSA-q4xq-445g-g6ch<br>GHSA-xmmm-jw76-q7vg | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/keycloak/keycloak-core/25.0.3/keycloak-core-25.0.3.jar` |
| `org.keycloak:keycloak-server-spi-private` | `25.0.3` | GHSA-q35r-vvhv-vx5h<br>GHSA-v4jw-m6rm-399h<br>GHSA-x4p7-7chp-64hq | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/keycloak/keycloak-server-spi-private/25.0.3/keycloak-server-spi-private-25.0.3.jar` |
| `org.yaml:snakeyaml` | `1.28` | GHSA-3mc7-4q67-w48m<br>GHSA-98wm-3w3q-mw94<br>GHSA-9w3m-gqgf-c4p9<br>GHSA-c4r9-r8fh-9vj2<br>GHSA-hhhw-99gj-p3c3<br>GHSA-mjmj-j48q-9wg2<br>GHSA-w37g-rhq8-7m4j | `/Users/john/Library/Caches/Coursier/v1/https/repo1.maven.org/maven2/org/yaml/snakeyaml/1.28/snakeyaml-1.28.jar` |

## Resolved Coordinates

| Package | Version | Jar count |
|---|---:|---:|
| `aopalliance:aopalliance` | `1.0` | 1 |
| `at.yawk.lz4:lz4-java` | `1.10.2` | 1 |
| `ch.megard:akka-http-cors_2.13` | `1.1.3` | 1 |
| `ch.qos.logback:logback-classic` | `1.5.37` | 1 |
| `ch.qos.logback:logback-core` | `1.5.37` | 1 |
| `com.beachape:enumeratum_2.13` | `1.7.0` | 1 |
| `com.beachape:enumeratum-circe_2.13` | `1.7.0` | 1 |
| `com.beachape:enumeratum-macros_2.13` | `1.6.1` | 1 |
| `com.beachape:enumeratum-slick_2.13` | `1.7.0` | 1 |
| `com.chuusai:shapeless_2.13` | `2.3.7` | 1 |
| `com.fasterxml:aalto-xml` | `1.2.2` | 1 |
| `com.fasterxml.jackson.core:jackson-annotations` | `2.22` | 1 |
| `com.fasterxml.jackson.core:jackson-core` | `2.22.0` | 1 |
| `com.fasterxml.jackson.core:jackson-databind` | `2.22.0` | 1 |
| `com.fasterxml.jackson.jakarta.rs:jackson-jakarta-rs-base` | `2.14.3` | 1 |
| `com.fasterxml.jackson.jakarta.rs:jackson-jakarta-rs-json-provider` | `2.14.3` | 1 |
| `com.fasterxml.jackson.module:jackson-module-jakarta-xmlbind-annotations` | `2.14.3` | 1 |
| `com.github.ben-manes.caffeine:caffeine` | `2.9.3` | 1 |
| `com.github.java-json-tools:btf` | `1.3` | 1 |
| `com.github.java-json-tools:jackson-coreutils` | `2.0` | 1 |
| `com.github.java-json-tools:json-patch` | `1.13` | 1 |
| `com.github.java-json-tools:msg-simple` | `1.2` | 1 |
| `com.github.jnr:jffi` | `1.2.18` | 2 |
| `com.github.jnr:jnr-a64asm` | `1.0.0` | 1 |
| `com.github.jnr:jnr-constants` | `0.9.12` | 1 |
| `com.github.jnr:jnr-ffi` | `2.1.9` | 1 |
| `com.github.jnr:jnr-x86asm` | `1.0.2` | 1 |
| `com.github.kittinunf.fuel:fuel-coroutines` | `2.3.1` | 1 |
| `com.github.kittinunf.fuel:fuel` | `2.3.1` | 1 |
| `com.github.kittinunf.result:result` | `3.1.0` | 1 |
| `com.github.luben:zstd-jni` | `1.5.6-10` | 1 |
| `com.github.oshi:oshi-core` | `5.7.5` | 1 |
| `com.github.pureconfig:pureconfig_2.13` | `0.17.1` | 1 |
| `com.github.pureconfig:pureconfig-core_2.13` | `0.17.1` | 1 |
| `com.github.pureconfig:pureconfig-generic_2.13` | `0.17.1` | 1 |
| `com.github.pureconfig:pureconfig-generic-base_2.13` | `0.17.1` | 1 |
| `com.github.stephenc.jcip:jcip-annotations` | `1.0-1` | 1 |
| `com.github.tminglei:slick-pg_2.13` | `0.20.3` | 1 |
| `com.github.tminglei:slick-pg_circe-json_2.13` | `0.20.3` | 1 |
| `com.github.tminglei:slick-pg_core_2.13` | `0.20.3` | 1 |
| `com.github.virtuald:curvesapi` | `1.08` | 1 |
| `com.google.errorprone:error_prone_annotations` | `2.47.0` | 1 |
| `com.google.guava:failureaccess` | `1.0.3` | 1 |
| `com.google.guava:guava` | `33.6.0-jre` | 1 |
| `com.google.guava:listenablefuture` | `9999.0-empty-to-avoid-conflict-with-guava` | 1 |
| `com.google.inject:guice` | `5.0.1` | 1 |
| `com.google.j2objc:j2objc-annotations` | `3.1` | 1 |
| `com.hierynomus:asn-one` | `0.5.0` | 1 |
| `com.hierynomus:sshj` | `0.27.0` | 1 |
| `com.ibm.async:asyncutil` | `0.1.0` | 1 |
| `com.iheart:ficus_2.13` | `1.4.7` | 1 |
| `com.jcraft:jzlib` | `1.1.3` | 1 |
| `com.lightbend.akka:akka-persistence-jdbc_2.13` | `5.0.4` | 1 |
| `com.lightbend.akka:akka-projection-core_2.13` | `1.2.4` | 1 |
| `com.lightbend.akka:akka-projection-eventsourced_2.13` | `1.2.4` | 1 |
| `com.lightbend.akka:akka-projection-jdbc_2.13` | `1.2.4` | 1 |
| `com.lightbend.akka:akka-stream-alpakka-csv_2.13` | `3.0.4` | 1 |
| `com.lightbend.akka:akka-stream-alpakka-ftp_2.13` | `2.0.2` | 1 |
| `com.lightbend.akka:akka-stream-alpakka-xml_2.13` | `3.0.4` | 1 |
| `com.lightbend.akka.discovery:akka-discovery-kubernetes-api_2.13` | `1.1.3` | 1 |
| `com.lightbend.akka.management:akka-management_2.13` | `1.1.3` | 1 |
| `com.lightbend.akka.management:akka-management-cluster-bootstrap_2.13` | `1.1.3` | 1 |
| `com.lightbend.akka.management:akka-management-cluster-http_2.13` | `1.1.3` | 1 |
| `com.lightbend.akka.management:akka-management-pki_2.13` | `1.1.3` | 1 |
| `com.lightbend.cloudflow:cloudflow-avro_2.13` | `2.3.1` | 1 |
| `com.lightbend.cloudflow:cloudflow-streamlets_2.13` | `2.3.1` | 1 |
| `com.norbitltd:spoiwo_2.13` | `1.8.0` | 1 |
| `com.rabbitmq:amqp-client` | `5.26.0` | 1 |
| `com.sendgrid:java-http-client` | `4.5.0` | 1 |
| `com.sendgrid:sendgrid-java` | `4.9.2` | 1 |
| `com.softwaremill.magnolia1_2:magnolia_2.13` | `1.1.1` | 1 |
| `com.softwaremill.sttp.model:core_2.13` | `1.4.23` | 1 |
| `com.softwaremill.sttp.shared:akka_2.13` | `1.3.2` | 1 |
| `com.softwaremill.sttp.shared:core_2.13` | `1.3.2` | 1 |
| `com.softwaremill.sttp.shared:ws_2.13` | `1.3.2` | 1 |
| `com.softwaremill.sttp.tapir:tapir-akka-http-server_2.13` | `0.20.2` | 1 |
| `com.softwaremill.sttp.tapir:tapir-apispec-docs_2.13` | `0.20.2` | 1 |
| `com.softwaremill.sttp.tapir:tapir-apispec-model_2.13` | `0.20.2` | 1 |
| `com.softwaremill.sttp.tapir:tapir-core_2.13` | `0.20.2` | 1 |
| `com.softwaremill.sttp.tapir:tapir-enumeratum_2.13` | `0.20.2` | 1 |
| `com.softwaremill.sttp.tapir:tapir-json-circe_2.13` | `0.20.2` | 1 |
| `com.softwaremill.sttp.tapir:tapir-openapi-circe_2.13` | `0.20.2` | 1 |
| `com.softwaremill.sttp.tapir:tapir-openapi-circe-yaml_2.13` | `0.20.2` | 1 |
| `com.softwaremill.sttp.tapir:tapir-openapi-docs_2.13` | `0.20.2` | 1 |
| `com.softwaremill.sttp.tapir:tapir-openapi-model_2.13` | `0.20.2` | 1 |
| `com.squareup.okhttp3:okhttp` | `4.12.0` | 1 |
| `com.squareup.okio:okio-jvm` | `3.9.0` | 1 |
| `com.squareup.okio:okio` | `3.9.0` | 1 |
| `com.sun.activation:jakarta.activation` | `2.0.1` | 1 |
| `com.sun.istack:istack-commons-runtime` | `4.1.2` | 1 |
| `com.sun.istack:istack-commons-tools` | `4.1.2` | 1 |
| `com.sun.mail:jakarta.mail` | `2.0.2` | 1 |
| `com.sun.xml.bind.external:relaxng-datatype` | `4.0.2` | 1 |
| `com.sun.xml.bind.external:rngom` | `4.0.2` | 1 |
| `com.twitter:bijection-avro_2.13` | `0.9.7` | 1 |
| `com.twitter:bijection-core_2.13` | `0.9.7` | 1 |
| `com.typesafe:config` | `1.4.2` | 1 |
| `com.typesafe:ssl-config-core_2.13` | `0.4.3` | 1 |
| `com.typesafe.akka:akka-actor_2.13` | `2.7.0` | 1 |
| `com.typesafe.akka:akka-actor-typed_2.13` | `2.6.19` | 1 |
| `com.typesafe.akka:akka-cluster_2.13` | `2.6.19` | 1 |
| `com.typesafe.akka:akka-cluster-sharding_2.13` | `2.6.19` | 1 |
| `com.typesafe.akka:akka-cluster-sharding-typed_2.13` | `2.6.19` | 1 |
| `com.typesafe.akka:akka-cluster-tools_2.13` | `2.6.19` | 1 |
| `com.typesafe.akka:akka-cluster-typed_2.13` | `2.6.19` | 1 |
| `com.typesafe.akka:akka-coordination_2.13` | `2.6.19` | 1 |
| `com.typesafe.akka:akka-discovery_2.13` | `2.6.19` | 1 |
| `com.typesafe.akka:akka-distributed-data_2.13` | `2.6.19` | 1 |
| `com.typesafe.akka:akka-http_2.13` | `10.2.9` | 1 |
| `com.typesafe.akka:akka-http-caching_2.13` | `10.2.9` | 1 |
| `com.typesafe.akka:akka-http-core_2.13` | `10.2.9` | 1 |
| `com.typesafe.akka:akka-http-spray-json_2.13` | `10.2.9` | 1 |
| `com.typesafe.akka:akka-http-xml_2.13` | `10.2.9` | 1 |
| `com.typesafe.akka:akka-parsing_2.13` | `10.2.9` | 1 |
| `com.typesafe.akka:akka-persistence_2.13` | `2.6.19` | 1 |
| `com.typesafe.akka:akka-persistence-query_2.13` | `2.6.19` | 1 |
| `com.typesafe.akka:akka-persistence-typed_2.13` | `2.6.19` | 1 |
| `com.typesafe.akka:akka-pki_2.13` | `2.6.19` | 1 |
| `com.typesafe.akka:akka-protobuf-v3_2.13` | `2.7.0` | 1 |
| `com.typesafe.akka:akka-remote_2.13` | `2.6.19` | 1 |
| `com.typesafe.akka:akka-slf4j_2.13` | `2.6.19` | 1 |
| `com.typesafe.akka:akka-stream_2.13` | `2.7.0` | 1 |
| `com.typesafe.akka:akka-stream-kafka_2.13` | `4.0.2` | 1 |
| `com.typesafe.akka:akka-stream-typed_2.13` | `2.6.19` | 1 |
| `com.typesafe.slick:slick_2.13` | `3.3.3` | 1 |
| `com.typesafe.slick:slick-hikaricp_2.13` | `3.3.3` | 1 |
| `com.zaxxer:HikariCP` | `3.2.0` | 1 |
| `com.zaxxer:SparseBitSet` | `1.3` | 1 |
| `commons-beanutils:commons-beanutils` | `1.11.0` | 1 |
| `commons-codec:commons-codec` | `1.19.0` | 1 |
| `commons-collections:commons-collections` | `3.2.2` | 1 |
| `commons-digester:commons-digester` | `2.1` | 1 |
| `commons-io:commons-io` | `2.22.0` | 1 |
| `commons-net:commons-net` | `3.13.0` | 1 |
| `commons-validator:commons-validator` | `1.7` | 1 |
| `io.circe:circe-core_2.13` | `0.14.1` | 1 |
| `io.circe:circe-extras_2.13` | `0.14.1` | 1 |
| `io.circe:circe-generic_2.13` | `0.14.1` | 1 |
| `io.circe:circe-generic-extras_2.13` | `0.14.1` | 1 |
| `io.circe:circe-jawn_2.13` | `0.14.1` | 1 |
| `io.circe:circe-numbers_2.13` | `0.14.1` | 1 |
| `io.circe:circe-parser_2.13` | `0.14.1` | 1 |
| `io.circe:circe-yaml_2.13` | `0.14.1` | 1 |
| `io.github.java-diff-utils:java-diff-utils` | `4.15` | 1 |
| `io.github.microutils:kotlin-logging-jvm` | `2.1.16` | 1 |
| `io.github.microutils:kotlin-logging` | `2.1.16` | 1 |
| `io.github.nafg.slick-migration-api:slick-migration-api_2.13` | `0.8.2` | 1 |
| `io.github.nafg.slick-migration-api:slick-migration-api-flyway_2.13` | `0.8.1` | 1 |
| `io.kamon:kamon-bundle_2.13` | `2.5.4` | 1 |
| `io.kamon:kamon-core_2.13` | `2.5.4` | 1 |
| `io.kamon:kamon-prometheus_2.13` | `2.5.4` | 1 |
| `io.reactivex.rxjava2:rxjava` | `2.2.10` | 1 |
| `io.reactivex.rxjava2:rxkotlin` | `2.4.0` | 1 |
| `io.scalaland:chimney_2.13` | `0.6.1` | 1 |
| `io.spray:spray-json_2.13` | `1.3.6` | 1 |
| `jakarta.activation:jakarta.activation-api` | `2.1.2` | 1 |
| `jakarta.annotation:jakarta.annotation-api` | `2.1.1` | 1 |
| `jakarta.validation:jakarta.validation-api` | `3.0.2` | 1 |
| `jakarta.ws.rs:jakarta.ws.rs-api` | `3.1.0` | 1 |
| `jakarta.xml.bind:jakarta.xml.bind-api` | `4.0.0` | 1 |
| `javax.inject:javax.inject` | `1` | 1 |
| `net.i2p.crypto:eddsa` | `0.2.0` | 1 |
| `net.java.dev.jna:jna-platform` | `5.8.0` | 1 |
| `net.java.dev.jna:jna` | `5.8.0` | 1 |
| `net.logstash.logback:logstash-logback-encoder` | `8.1` | 1 |
| `net.oneandone.reflections8:reflections8` | `0.11.7` | 1 |
| `org.agrona:agrona` | `1.14.0` | 1 |
| `org.apache.avro:avro` | `1.12.1` | 1 |
| `org.apache.commons:commons-collections4` | `4.4` | 1 |
| `org.apache.commons:commons-compress` | `1.28.0` | 1 |
| `org.apache.commons:commons-lang3` | `3.20.0` | 1 |
| `org.apache.commons:commons-math3` | `3.6.1` | 1 |
| `org.apache.commons:commons-text` | `1.10.0` | 1 |
| `org.apache.httpcomponents:httpclient` | `4.5.14` | 1 |
| `org.apache.httpcomponents:httpcore` | `4.4.16` | 1 |
| `org.apache.james:apache-mime4j-core` | `0.8.10` | 1 |
| `org.apache.james:apache-mime4j-dom` | `0.8.9` | 1 |
| `org.apache.james:apache-mime4j-storage` | `0.8.9` | 1 |
| `org.apache.kafka:kafka-clients` | `4.3.1` | 1 |
| `org.apache.logging.log4j:log4j-api` | `2.24.3` | 1 |
| `org.apache.poi:poi-ooxml-lite` | `5.4.1` | 1 |
| `org.apache.poi:poi-ooxml` | `5.4.1` | 1 |
| `org.apache.poi:poi` | `5.4.1` | 1 |
| `org.apache.xmlbeans:xmlbeans` | `5.3.0` | 1 |
| `org.bouncycastle:bcpkix-jdk15on` | `1.60` | 1 |
| `org.bouncycastle:bcpkix-jdk18on` | `1.74` | 1 |
| `org.bouncycastle:bcprov-jdk15on` | `1.70` | 1 |
| `org.bouncycastle:bcprov-jdk18on` | `1.74` | 1 |
| `org.bouncycastle:bcutil-jdk18on` | `1.74` | 1 |
| `org.checkerframework:checker-qual` | `3.19.0` | 1 |
| `org.codehaus.janino:commons-compiler` | `3.1.7` | 1 |
| `org.codehaus.janino:janino` | `3.1.7` | 1 |
| `org.codehaus.woodstox:stax2-api` | `4.2` | 1 |
| `org.eclipse.angus:angus-activation` | `2.0.0` | 1 |
| `org.eclipse.microprofile.openapi:microprofile-openapi-api` | `3.1.1` | 1 |
| `org.flywaydb:flyway-core` | `8.5.13` | 1 |
| `org.glassfish.jaxb:codemodel` | `4.0.2` | 1 |
| `org.glassfish.jaxb:jaxb-core` | `4.0.2` | 1 |
| `org.glassfish.jaxb:jaxb-jxc` | `4.0.2` | 1 |
| `org.glassfish.jaxb:jaxb-runtime` | `4.0.2` | 1 |
| `org.glassfish.jaxb:jaxb-xjc` | `4.0.2` | 1 |
| `org.glassfish.jaxb:txw2` | `4.0.2` | 1 |
| `org.glassfish.jaxb:xsom` | `4.0.2` | 1 |
| `org.javassist:javassist` | `3.22.0-GA` | 1 |
| `org.jboss:jandex` | `2.4.3.Final` | 1 |
| `org.jboss.logging:jboss-logging` | `3.5.1.Final` | 1 |
| `org.jboss.resteasy:resteasy-client-api` | `6.2.4.Final` | 1 |
| `org.jboss.resteasy:resteasy-client` | `6.2.4.Final` | 1 |
| `org.jboss.resteasy:resteasy-core-spi` | `6.2.4.Final` | 1 |
| `org.jboss.resteasy:resteasy-core` | `6.2.4.Final` | 1 |
| `org.jboss.resteasy:resteasy-jackson2-provider` | `6.2.4.Final` | 1 |
| `org.jboss.resteasy:resteasy-jaxb-provider` | `6.2.4.Final` | 1 |
| `org.jboss.resteasy:resteasy-jaxrs` | `3.15.6.Final` | 1 |
| `org.jboss.resteasy:resteasy-multipart-provider` | `3.15.6.Final` | 1 |
| `org.jboss.spec.javax.annotation:jboss-annotations-api_1.3_spec` | `2.0.1.Final` | 1 |
| `org.jboss.spec.javax.ws.rs:jboss-jaxrs-api_2.1_spec` | `2.0.1.Final` | 1 |
| `org.jboss.spec.javax.xml.bind:jboss-jaxb-api_2.3_spec` | `2.0.1.Final` | 1 |
| `org.jetbrains:annotations` | `13.0` | 1 |
| `org.jetbrains.kotlin:kotlin-stdlib-common` | `1.6.0` | 1 |
| `org.jetbrains.kotlin:kotlin-stdlib-jdk7` | `1.8.21` | 1 |
| `org.jetbrains.kotlin:kotlin-stdlib-jdk8` | `1.8.21` | 1 |
| `org.jetbrains.kotlin:kotlin-stdlib` | `1.9.21` | 1 |
| `org.jetbrains.kotlinx:kotlinx-coroutines-core` | `1.3.9` | 1 |
| `org.jline:jline` | `3.27.1` | 1 |
| `org.jspecify:jspecify` | `1.0.0` | 1 |
| `org.keycloak:keycloak-adapter-core` | `25.0.3` | 1 |
| `org.keycloak:keycloak-admin-client` | `25.0.3` | 1 |
| `org.keycloak:keycloak-authz-client` | `25.0.3` | 1 |
| `org.keycloak:keycloak-common` | `25.0.3` | 1 |
| `org.keycloak:keycloak-core` | `25.0.3` | 1 |
| `org.keycloak:keycloak-crypto-default` | `25.0.3` | 1 |
| `org.keycloak:keycloak-server-spi-private` | `25.0.3` | 1 |
| `org.keycloak:keycloak-server-spi` | `25.0.3` | 1 |
| `org.lmdbjava:lmdbjava` | `0.7.0` | 1 |
| `org.ow2.asm:asm-analysis` | `5.0.3` | 1 |
| `org.ow2.asm:asm-commons` | `5.0.3` | 1 |
| `org.ow2.asm:asm-tree` | `5.0.3` | 1 |
| `org.ow2.asm:asm-util` | `5.0.3` | 1 |
| `org.ow2.asm:asm` | `5.0.3` | 1 |
| `org.passay:passay` | `1.6.1` | 1 |
| `org.postgresql:postgresql` | `42.7.12` | 1 |
| `org.reactivestreams:reactive-streams` | `1.0.4` | 1 |
| `org.scala-lang:scala-compiler` | `2.13.16` | 1 |
| `org.scala-lang:scala-library` | `2.13.16` | 1 |
| `org.scala-lang:scala-reflect` | `2.13.16` | 1 |
| `org.scala-lang.modules:scala-collection-compat_2.13` | `2.6.0` | 1 |
| `org.scala-lang.modules:scala-java8-compat_2.13` | `1.0.0` | 1 |
| `org.scala-lang.modules:scala-parser-combinators_2.13` | `1.1.2` | 1 |
| `org.scala-lang.modules:scala-xml_2.13` | `1.3.0` | 1 |
| `org.scalatra.scalate:scalate-core_2.13` | `1.9.6` | 1 |
| `org.scalatra.scalate:scalate-util_2.13` | `1.9.6` | 1 |
| `org.slf4j:jcl-over-slf4j` | `2.0.17` | 1 |
| `org.slf4j:slf4j-api` | `2.0.17` | 1 |
| `org.typelevel:cats-core_2.13` | `2.8.0` | 1 |
| `org.typelevel:cats-kernel_2.13` | `2.8.0` | 1 |
| `org.typelevel:jawn-parser_2.13` | `1.3.2` | 1 |
| `org.virtuslab.ash:annotation_2.13` | `0.6.0` | 1 |
| `org.virtuslab.ash:circe-akka-serializer_2.13` | `0.6.0` | 1 |
| `org.webjars:swagger-ui` | `4.1.3` | 1 |
| `org.xerial.snappy:snappy-java` | `1.1.10.8` | 1 |
| `org.yaml:snakeyaml` | `1.28` | 1 |

## Required Follow-Up

- Review every resolved classpath OSV finding against launch runtime reachability and inherited compatibility constraints.
- Remediate or explicitly accept residual JVM findings before Scenario 12 can pass.
- Keep `security-jvm-required`, direct JVM OSV, and this resolved-classpath OSV baseline in launch readiness.
