# JVM OSV Direct Dependency Baseline

- Generated: `2026-06-30T10:51:39.538Z`
- Backend: `/Users/john/Sandbox/Taya_NA_Predict/Taya_Na_Predict/apps/Phoenix-Predict-Combined/phoenix-backend`
- Data source: OSV API `https://api.osv.dev/v1/querybatch`
- Ecosystem: Maven
- Scope: declared direct dependencies and SBT plugin declarations parsed from backend SBT source files.
- Limitation: this is not a full resolved dependency graph; Java/SBT are still required for transitive SCA and eviction evidence.

## Summary

- Parsed package/version coordinates: **130**
- Coordinates with OSV findings: **5**
- Unique OSV vulnerability ids: **19**
- Unique CVE aliases: **0**

## Findings

| Package | Version | Findings | First source |
|---|---:|---|---|
| `com.lightbend.akka.management:akka-management_2.13` | `1.1.3` | GHSA-9qvj-rpj8-v5c8 | `project/Dependencies.scala:111` |
| `org.bouncycastle:bcpkix-jdk15on` | `1.70` | GHSA-4cx2-fc23-5wg6<br>GHSA-wg6q-6289-32hp | `project/Dependencies.scala:430` |
| `org.bouncycastle:bcprov-jdk15on` | `1.70` | GHSA-4h8f-2wvx-gg5w<br>GHSA-8xfc-gm6g-vgpv<br>GHSA-hr8g-6v94-x4m9<br>GHSA-v435-xc8x-wvr9<br>GHSA-wjxj-5m7g-mg7q | `project/Dependencies.scala:431` |
| `org.keycloak:keycloak-adapter-core` | `17.0.1` | GHSA-7vw6-5q2f-7w5r | `project/Dependencies.scala:249` |
| `org.keycloak:keycloak-core` | `17.0.1` | GHSA-5cc8-pgp5-7mpm<br>GHSA-755v-r4x4-qf7m<br>GHSA-93ww-43rr-79v3<br>GHSA-9vm7-v8wj-3fqw<br>GHSA-c7xw-p58w-h6fj<br>GHSA-g4gc-rh26-m3p5<br>GHSA-q4xq-445g-g6ch<br>GHSA-v436-q368-hvgg<br>GHSA-w97f-w3hq-36g2<br>GHSA-xmmm-jw76-q7vg | `project/Dependencies.scala:250` |

## Parsed Coordinates

| Package | Version | Occurrences |
|---|---:|---|
| `au.com.onegeek:sbt-dotenv_2.13` | `2.1.233` | `project/plugins.sbt:26`, `project/plugins.sbt:26` |
| `ch.epfl.scala:sbt-scalafix` | `0.9.34` | `project/plugins.sbt:11`, `project/plugins.sbt:11` |
| `ch.megard:akka-http-cors_2.13` | `1.1.3` | `project/Dependencies.scala:136` |
| `ch.qos.logback:logback-classic` | `1.2.13` | `project/Dependencies.scala:150` |
| `com.beachape:enumeratum_2.13` | `1.7.0` | `project/Dependencies.scala:277`, `project/Dependencies.scala:454`, `build.sbt:214` |
| `com.beachape:enumeratum-circe_2.13` | `1.7.0` | `project/Dependencies.scala:279` |
| `com.beachape:enumeratum-slick_2.13` | `1.7.0` | `project/Dependencies.scala:278` |
| `com.dwijnand:sbt-dynver` | `4.1.1` | `project/plugins.sbt:5`, `project/plugins.sbt:5` |
| `com.fasterxml.jackson.core:jackson-core` | `2.22.0` | `project/Dependencies.scala:421` |
| `com.fasterxml.jackson.core:jackson-databind` | `2.22.0` | `project/Dependencies.scala:422` |
| `com.github.alexarchambault:scalacheck-shapeless_1.15_2.13` | `1.3.0` | `project/Dependencies.scala:216` |
| `com.github.andyglow:scala-xml-diff_2.13` | `3.0.1` | `project/Dependencies.scala:295` |
| `com.github.dasniko:testcontainers-keycloak` | `1.10.0` | `project/Dependencies.scala:220` |
| `com.github.geirolz:advxml-core_2.13` | `2.4.2` | `project/Dependencies.scala:214` |
| `com.github.javafaker:javafaker` | `1.0.2` | `project/Dependencies.scala:210` |
| `com.github.kittinunf.fuel:fuel-coroutines` | `2.3.1` | `project/Dependencies.scala:176` |
| `com.github.kittinunf.fuel:fuel` | `2.3.1` | `project/Dependencies.scala:175` |
| `com.github.liancheng:organize-imports_2.13` | `0.6.0` | `project/Dependencies.scala:462` |
| `com.github.pureconfig:pureconfig_2.13` | `0.17.1` | `project/Dependencies.scala:196`, `project/Dependencies.scala:308` |
| `com.github.tminglei:slick-pg_2.13` | `0.20.3` | `project/Dependencies.scala:230` |
| `com.github.tminglei:slick-pg_circe-json_2.13` | `0.20.3` | `project/Dependencies.scala:231` |
| `com.github.tomakehurst:wiremock-jre8-standalone` | `2.35.1` | `project/Dependencies.scala:212` |
| `com.google.guava:guava` | `33.6.0-jre` | `project/Dependencies.scala:423` |
| `com.google.inject:guice` | `5.0.1` | `project/Dependencies.scala:172` |
| `com.julianpeeters:sbt-avrohugger` | `2.0.0` | `project/plugins.sbt:35`, `project/plugins.sbt:35` |
| `com.lightbend.akka:akka-persistence-jdbc_2.13` | `5.0.4` | `project/Dependencies.scala:180` |
| `com.lightbend.akka:akka-projection-core_2.13` | `1.2.4` | `project/Dependencies.scala:140` |
| `com.lightbend.akka:akka-projection-eventsourced_2.13` | `1.2.4` | `project/Dependencies.scala:141` |
| `com.lightbend.akka:akka-projection-jdbc_2.13` | `1.2.4` | `project/Dependencies.scala:142` |
| `com.lightbend.akka:akka-projection-testkit_2.13` | `1.2.4` | `project/Dependencies.scala:204` |
| `com.lightbend.akka:akka-stream-alpakka-csv_2.13` | `3.0.4` | `project/Dependencies.scala:121` |
| `com.lightbend.akka:akka-stream-alpakka-ftp_2.13` | `2.0.2` | `project/Dependencies.scala:125` |
| `com.lightbend.akka:akka-stream-alpakka-xml_2.13` | `3.0.4` | `project/Dependencies.scala:129` |
| `com.lightbend.akka.discovery:akka-discovery-kubernetes-api_2.13` | `1.1.3` | `project/Dependencies.scala:107` |
| `com.lightbend.akka.management:akka-management_2.13` | `1.1.3` | `project/Dependencies.scala:111` |
| `com.lightbend.akka.management:akka-management-cluster-bootstrap_2.13` | `1.1.3` | `project/Dependencies.scala:112` |
| `com.lightbend.akka.management:akka-management-cluster-http_2.13` | `1.1.3` | `project/Dependencies.scala:113` |
| `com.lightbend.cloudflow:sbt-cloudflow` | `2.3.1` | `project/plugins.sbt:23`, `project/plugins.sbt:23` |
| `com.norbitltd:spoiwo_2.13` | `1.8.0` | `project/Dependencies.scala:317` |
| `com.rabbitmq:amqp-client` | `5.26.0` | `project/Dependencies.scala:173` |
| `com.sendgrid:sendgrid-java` | `4.9.2` | `project/Dependencies.scala:287` |
| `com.softwaremill.sttp.tapir:tapir-akka-http-server_2.13` | `0.20.2` | `project/Dependencies.scala:271` |
| `com.softwaremill.sttp.tapir:tapir-core_2.13` | `0.20.2` | `project/Dependencies.scala:267` |
| `com.softwaremill.sttp.tapir:tapir-enumeratum_2.13` | `0.20.2` | `project/Dependencies.scala:272` |
| `com.softwaremill.sttp.tapir:tapir-json-circe_2.13` | `0.20.2` | `project/Dependencies.scala:268` |
| `com.softwaremill.sttp.tapir:tapir-openapi-circe-yaml_2.13` | `0.20.2` | `project/Dependencies.scala:270` |
| `com.softwaremill.sttp.tapir:tapir-openapi-docs_2.13` | `0.20.2` | `project/Dependencies.scala:269` |
| `com.squareup.okhttp3:okhttp` | `4.12.0` | `project/Dependencies.scala:424` |
| `com.squareup.okio:okio` | `3.9.0` | `project/Dependencies.scala:425` |
| `com.sun.mail:jakarta.mail` | `2.0.2` | `project/Dependencies.scala:426` |
| `com.tngtech.archunit:archunit` | `0.18.0` | `project/Dependencies.scala:225` |
| `com.typesafe.akka:akka-actor-testkit-typed_2.13` | `2.6.19` | `project/Dependencies.scala:200` |
| `com.typesafe.akka:akka-actor-typed_2.13` | `2.6.19` | `project/Dependencies.scala:95` |
| `com.typesafe.akka:akka-cluster-sharding-typed_2.13` | `2.6.19` | `project/Dependencies.scala:98` |
| `com.typesafe.akka:akka-cluster-typed_2.13` | `2.6.19` | `project/Dependencies.scala:97` |
| `com.typesafe.akka:akka-discovery_2.13` | `2.6.19` | `project/Dependencies.scala:106` |
| `com.typesafe.akka:akka-http_2.13` | `10.2.9` | `project/Dependencies.scala:133`, `project/Dependencies.scala:309` |
| `com.typesafe.akka:akka-http-caching_2.13` | `10.2.9` | `project/Dependencies.scala:134` |
| `com.typesafe.akka:akka-http-jackson_2.13` | `10.2.9` | `project/Dependencies.scala:414` |
| `com.typesafe.akka:akka-http-spray-json_2.13` | `10.2.9` | `project/Dependencies.scala:310`, `project/Dependencies.scala:411` |
| `com.typesafe.akka:akka-http-testkit_2.13` | `10.2.9` | `project/Dependencies.scala:203` |
| `com.typesafe.akka:akka-http-xml_2.13` | `10.2.9` | `project/Dependencies.scala:135`, `project/Dependencies.scala:311` |
| `com.typesafe.akka:akka-http2-support_2.13` | `10.2.9` | `project/Dependencies.scala:415` |
| `com.typesafe.akka:akka-persistence-query_2.13` | `2.6.19` | `project/Dependencies.scala:100` |
| `com.typesafe.akka:akka-persistence-testkit_2.13` | `2.6.19` | `project/Dependencies.scala:201` |
| `com.typesafe.akka:akka-persistence-typed_2.13` | `2.6.19` | `project/Dependencies.scala:99` |
| `com.typesafe.akka:akka-slf4j_2.13` | `2.6.19` | `project/Dependencies.scala:96` |
| `com.typesafe.akka:akka-stream_2.13` | `2.6.19` | `project/Dependencies.scala:312` |
| `com.typesafe.akka:akka-stream-kafka_2.13` | `4.0.2` | `project/Dependencies.scala:117` |
| `com.typesafe.akka:akka-stream-testkit_2.13` | `2.6.19` | `project/Dependencies.scala:202` |
| `com.typesafe.akka:akka-stream-typed_2.13` | `2.6.19` | `project/Dependencies.scala:146` |
| `com.typesafe.sbt:sbt-native-packager` | `1.8.1` | `project/plugins.sbt:2`, `project/plugins.sbt:2` |
| `com.typesafe.slick:slick-hikaricp_2.13` | `3.3.3` | `project/Dependencies.scala:229` |
| `commons-beanutils:commons-beanutils` | `1.11.0` | `project/Dependencies.scala:418` |
| `commons-io:commons-io` | `2.22.0` | `project/Dependencies.scala:419` |
| `commons-net:commons-net` | `3.13.0` | `project/Dependencies.scala:420` |
| `commons-validator:commons-validator` | `1.7` | `project/Dependencies.scala:240` |
| `dev.optics:monocle-core_2.13` | `3.1.0` | `project/Dependencies.scala:322` |
| `dev.optics:monocle-macro_2.13` | `3.1.0` | `project/Dependencies.scala:323` |
| `io.circe:circe-core_2.13` | `0.14.1` | `project/Dependencies.scala:183` |
| `io.circe:circe-extras_2.13` | `0.14.1` | `project/Dependencies.scala:183` |
| `io.circe:circe-generic_2.13` | `0.14.1` | `project/Dependencies.scala:183` |
| `io.circe:circe-golden_2.13` | `0.3.0` | `project/Dependencies.scala:192` |
| `io.circe:circe-literal_2.13` | `0.14.1` | `project/Dependencies.scala:191` |
| `io.circe:circe-parser_2.13` | `0.14.1` | `project/Dependencies.scala:183` |
| `io.gatling:gatling-sbt` | `4.1.6` | `project/plugins.sbt:14`, `project/plugins.sbt:14` |
| `io.gatling:gatling-test-framework` | `3.7.6` | `project/Dependencies.scala:257` |
| `io.gatling.highcharts:gatling-charts-highcharts` | `3.7.6` | `project/Dependencies.scala:256` |
| `io.github.microutils:kotlin-logging-jvm` | `2.1.16` | `project/Dependencies.scala:171` |
| `io.github.microutils:kotlin-logging` | `2.1.16` | `project/Dependencies.scala:170` |
| `io.github.nafg.slick-migration-api:slick-migration-api-flyway_2.13` | `0.8.1` | `project/Dependencies.scala:235` |
| `io.kamon:kamon-bundle_2.13` | `2.5.4` | `project/Dependencies.scala:300` |
| `io.kamon:kamon-prometheus_2.13` | `2.5.4` | `project/Dependencies.scala:302` |
| `io.kamon:sbt-kanela-runner` | `2.0.14` | `project/plugins.sbt:32`, `project/plugins.sbt:32` |
| `io.reactivex.rxjava2:rxkotlin` | `2.4.0` | `project/Dependencies.scala:174` |
| `io.scalaland:chimney_2.13` | `0.6.1` | `project/Dependencies.scala:283` |
| `jakarta.xml.bind:jakarta.xml.bind-api` | `2.3.2` | `project/Dependencies.scala:165` |
| `net.logstash.logback:logstash-logback-encoder` | `7.2` | `project/Dependencies.scala:151` |
| `org.apache.avro:avro` | `1.12.1` | `project/Dependencies.scala:427` |
| `org.apache.commons:commons-compress` | `1.28.0` | `project/Dependencies.scala:428` |
| `org.apache.commons:commons-lang3` | `3.20.0` | `project/Dependencies.scala:429` |
| `org.apache.commons:commons-text` | `1.10.0` | `project/Dependencies.scala:245` |
| `org.bouncycastle:bcpkix-jdk15on` | `1.70` | `project/Dependencies.scala:430` |
| `org.bouncycastle:bcprov-jdk15on` | `1.70` | `project/Dependencies.scala:431` |
| `org.codehaus.janino:janino` | `3.1.7` | `project/Dependencies.scala:152` |
| `org.flywaydb:flyway-core` | `8.5.13` | `project/Dependencies.scala:236` |
| `org.glassfish.jaxb:jaxb-runtime` | `2.3.2` | `project/Dependencies.scala:166` |
| `org.jboss.resteasy:resteasy-multipart-provider` | `3.15.6.Final` | `project/Dependencies.scala:432` |
| `org.jetbrains.kotlin:kotlin-stdlib-jdk8` | `1.6.0` | `project/Dependencies.scala:169` |
| `org.keycloak:keycloak-adapter-core` | `17.0.1` | `project/Dependencies.scala:249` |
| `org.keycloak:keycloak-admin-client` | `17.0.1` | `project/Dependencies.scala:251` |
| `org.keycloak:keycloak-authz-client` | `17.0.1` | `project/Dependencies.scala:252` |
| `org.keycloak:keycloak-core` | `17.0.1` | `project/Dependencies.scala:250` |
| `org.passay:passay` | `1.6.1` | `project/Dependencies.scala:241` |
| `org.postgresql:postgresql` | `42.7.12` | `project/Dependencies.scala:433` |
| `org.reflections:reflections` | `0.10.2` | `project/Dependencies.scala:211` |
| `org.scala-lang.modules:scala-xml_2.13` | `2.1.0` | `project/Dependencies.scala:213` |
| `org.scalameta:sbt-scalafmt` | `2.4.6` | `project/plugins.sbt:8`, `project/plugins.sbt:8`, `project/project/plugins.sbt:2`, `project/project/plugins.sbt:2` |
| `org.scalamock:scalamock_2.13` | `5.2.0` | `project/Dependencies.scala:209` |
| `org.scalastyle:scalastyle-sbt-plugin_2.13` | `1.0.0` | `project/plugins.sbt:20`, `project/plugins.sbt:20` |
| `org.scalatest:scalatest_2.13` | `3.2.12` | `project/Dependencies.scala:208`, `project/Dependencies.scala:307` |
| `org.scalatra.scalate:scalate-core_2.13` | `1.9.6` | `project/Dependencies.scala:291` |
| `org.slf4j:jcl-over-slf4j` | `1.7.36` | `project/Dependencies.scala:156` |
| `org.slf4j:slf4j-api` | `1.7.36` | `project/Dependencies.scala:153` |
| `org.testcontainers:postgresql` | `1.16.3` | `project/Dependencies.scala:221` |
| `org.typelevel:cats-core_2.13` | `2.8.0` | `project/Dependencies.scala:263` |
| `org.typelevel:kittens_2.13` | `2.3.2` | `project/Dependencies.scala:215` |
| `org.virtuslab.ash:sbt-akka-serialization-helper` | `0.6.0` | `project/plugins.sbt:29`, `project/plugins.sbt:29` |
| `org.webjars:swagger-ui` | `4.1.3` | `project/Dependencies.scala:273` |
| `org.xerial.snappy:snappy-java` | `1.1.10.8` | `project/Dependencies.scala:434` |

## Required Follow-Up

1. Run the SBT/JVM baseline once Java and `sbt` are available to capture the resolved transitive dependency graph and evictions.
2. Triage the direct OSV findings above, prioritizing runtime dependencies before test/plugin-only dependencies.
3. Add a full JVM SCA tool gate when Java/SBT or another resolver-backed SCA tool is available.
