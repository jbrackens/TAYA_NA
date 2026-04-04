import com.lightbend.cinnamon.sbt.Cinnamon
import sbt._

// @formatter:off
object Dependencies {
  object Versions {

    val scala                   = "2.12.12"

    // INTERNAL
    val siteExtensionsApi       = "0.2.10"

    // loggingDeps
    val logback                 = "1.2.3"
    val logstashLogbackEncoder  = "6.3" // 6.4 depends on com.fasterxml.jackson.core:jackson-databind:2.11.x, which is incompatible with 2.10.x pulled in by akka-serialization 2.6.9
    val janino                  = "3.0.6"
    val slf4jApi                = "1.7.30"
    val scalaLogging            = "3.9.0"

    // DI & config
    val macwire                 = "2.3.1"
    val pureConfig              = "0.13.0"

    // Akka
    val akka                    = "2.6.10"
    val akkaManagement          = "1.0.9"

    // Kafka
    val alpakkaKafka            = "2.0.5"
    val confluentAvroSerializer = "5.3.1"

    // tools
    val jsonassert              = "0.2.5"
    val enumeratum              = "1.6.1"
    val caffeine                = "2.9.2"
    val scaffeine               = "2.5.0"

    // testingDeps
    val scalaTest               = "3.2.10"
    val scalaMock               = "4.4.0"
    val faker                   = "1.0.2"
    val upickle                 = "0.9.5"
    val jackson                 = "2.10.1"
    val h2Driver                = "1.4.200"
    val assertj                 = "3.8.0"
    // the last version (at least up to 0.39.3) with which our Kafka container utils work
    val testContainers          = "0.34.3" // need testContainers 1.15.0 because of https://github.com/testcontainers/testcontainers-java/pull/3159
    val streamingEngine         = "0.0.37"

    val archUnit                = "0.14.1"

    // legacy =====================
    val javax                   = "2.2.11"
    val activation              = "1.1.1"
    val lombok                  = "1.16.20"

    val commonsPartners         = "0.2.9"
    val nextRace                = "1.6.5-SNAPSHOT"
    val commonsLang3            = "3.5"
    val commonsIo               = "2.6"

    val guava                   = "24.1-jre"
    val quartz                  = "2.3.2"

    val javaxInject             = "1"
    val guice                   = "3.0"

    val jacksonLegacy           = "2.4.1"
    val woodstox                = "4.4.1"

    val testng                  = "6.8.5"
    val mockito                 = "1.10.19"
    val jsonPath                = "2.4.0"
    // =====================
  }

  private val internalApiDeps = Seq(
    "gmx.dataapi.internal"          %% "site-extensions"                  % Versions.siteExtensionsApi
  )

  private val loggingDeps = Seq(
    "ch.qos.logback"                 % "logback-classic"                   % Versions.logback,
    "net.logstash.logback"           % "logstash-logback-encoder"          % Versions.logstashLogbackEncoder,
    "org.codehaus.janino"            % "janino"                            % Versions.janino, // for conditional statements in logback.xml
    "org.slf4j"                      % "slf4j-api"                         % Versions.slf4jApi,
    "com.typesafe.scala-logging"    %% "scala-logging"                     % Versions.scalaLogging
  )

  private val cinnamonDeps = Seq(
    Cinnamon.library.cinnamonAkkaTyped,
    Cinnamon.library.cinnamonAkkaStream,
    Cinnamon.library.cinnamonPrometheus,
    Cinnamon.library.cinnamonJvmMetricsProducer,
    Cinnamon.library.cinnamonPrometheusHttpServer,
    Cinnamon.library.cinnamonSlf4jMdc
  )

  private val macwireDeps = Seq(
    "com.softwaremill.macwire"      %% "macros"                           % Versions.macwire % Provided,
    "com.softwaremill.macwire"      %% "macrosakka"                       % Versions.macwire % Provided,
    "com.softwaremill.macwire"      %% "util"                             % Versions.macwire
  )

  private val pureConfigDeps = Seq(
    "com.github.pureconfig"         %% "pureconfig"                       % Versions.pureConfig
  )

  private val akkaStreamDeps = Seq(
    "com.typesafe.akka"             %% "akka-protobuf"                    % Versions.akka,
    "com.typesafe.akka"             %% "akka-actor-typed"                 % Versions.akka,
    "com.typesafe.akka"             %% "akka-stream-typed"                % Versions.akka
  )

  private val akkaManagementDeps = Seq(
    "com.lightbend.akka.management" %% "akka-management"                  % Versions.akkaManagement
  )

  private val kafkaDeps = Seq(
    "com.typesafe.akka" %% "akka-stream-kafka"                            % Versions.alpakkaKafka,
    "io.confluent" % "kafka-avro-serializer"                              % Versions.confluentAvroSerializer
  )

  private val jsoncompareDeps = Seq(
    "com.stephenn"                  %% "scalatest-json-jsonassert"        % Versions.jsonassert
  )

  private val enumeratumDeps: Seq[ModuleID] = Seq(
    "com.beachape"                  %% "enumeratum"                         % Versions.enumeratum
  )

  private val scaffeineDeps = Seq(
    "com.github.ben-manes.caffeine" % "caffeine"                     % Versions.caffeine,
    "com.github.blemale"            %% "scaffeine"                   % Versions.scaffeine
  )

  private val testingDeps = Seq(
    "org.scalatest"                 %% "scalatest-wordspec"               % Versions.scalaTest,
    "org.scalatest"                 %% "scalatest-shouldmatchers"         % Versions.scalaTest,
    "org.scalamock"                 %% "scalamock"                        % Versions.scalaMock,
    "com.github.javafaker"           % "javafaker"                        % Versions.faker,

    "com.lihaoyi"                   %% "upickle"                          % Versions.upickle,
    "com.fasterxml.jackson.module"  %% "jackson-module-scala"             % Versions.jackson,

    "com.h2database"                 % "h2"                               % Versions.h2Driver,
    "org.assertj"                    % "assertj-core"                     % Versions.assertj,

    "com.h2database"                 % "h2"                               % Versions.h2Driver,
    "org.assertj"                    % "assertj-core"                     % Versions.assertj,

    "com.typesafe.akka"             %% "akka-stream-testkit"              % Versions.akka,
    "com.typesafe.akka"             %% "akka-actor-testkit-typed"         % Versions.akka,
    "com.dimafeng"                  %% "testcontainers-scala"             % Versions.testContainers,
    "com.dimafeng"                  %% "testcontainers-scala-kafka"       % Versions.testContainers,

    "net.flipsports.gmx.streaming.internal.engine" %% "tests"             % Versions.streamingEngine,
    "net.flipsports.gmx.widget.argyll.nextrace"     % "common"            % Versions.nextRace classifier "tests",
    "net.flipsports.gmx.widget.argyll.nextrace"     % "domain"            % Versions.nextRace classifier "tests"
  ).map(_ % Test)

  private val archUnitDeps = Seq(
    "com.tngtech.archunit"           % "archunit"                          % Versions.archUnit
  ).map(_ % Test)

  val legacyDependencies: Seq[ModuleID] = Seq(
//  <!-- COMMONS
    "net.flipsports.gmx.common.internal.partner" % "partner-atr_2.12" % Versions.commonsPartners,
    "net.flipsports.gmx.common.internal.partner" % "partner-rmg_2.12" % Versions.commonsPartners,
    "net.flipsports.gmx.common.internal.partner" % "partner-sis_2.12" % Versions.commonsPartners,

//  <!-- OWN
    "net.flipsports.gmx.widget.argyll.nextrace" % "common" % Versions.nextRace,
    "net.flipsports.gmx.widget.argyll.nextrace" % "domain" % Versions.nextRace,
    "net.flipsports.gmx.widget.argyll.nextrace" % "core" % Versions.nextRace,

//  <!-- General
    "org.apache.commons" % "commons-lang3" % Versions.commonsLang3,
    "commons-io" % "commons-io" % Versions.commonsIo,
//    "com.github.javafaker" % "javafaker" % Versions.javafaker,
    "com.google.guava" % "guava" % Versions.guava,
    "org.quartz-scheduler" % "quartz" % Versions.quartz,

//  <!-- Dependency Injection
    "javax.inject" % "javax.inject" % Versions.javaxInject,
    "com.google.inject" % "guice" % Versions.guice,
    "com.google.inject.extensions" % "guice-assistedinject" % Versions.guice,
    "com.google.inject.extensions" % "guice-multibindings" % Versions.guice,

//  <!-- Serialization: XML, JSON
    "org.codehaus.woodstox" % "woodstox-core-asl" % Versions.woodstox,
    "com.fasterxml.jackson.core" % "jackson-databind" % Versions.jacksonLegacy,
    "com.fasterxml.jackson.datatype" % "jackson-datatype-jsr310" % Versions.jacksonLegacy,

//  <!-- Testing
    ("net.flipsports.gmx.widget.argyll.nextrace" % "common" % Versions.nextRace classifier "tests") % Test,
    ("net.flipsports.gmx.widget.argyll.nextrace" % "domain" % Versions.nextRace classifier "tests") % Test,
    "com.jayway.jsonpath" % "json-path" % Versions.jsonPath,
    "com.h2database" % "h2" % Versions.h2Driver,

// <!-- PARENT
    "org.slf4j" % "slf4j-api" % Versions.slf4jApi,
    "org.slf4j" % "jul-to-slf4j" % Versions.slf4jApi,
    "org.slf4j" % "jcl-over-slf4j" % Versions.slf4jApi,
    "ch.qos.logback" % "logback-classic" % Versions.logback,
    "ch.qos.logback" % "logback-core" % Versions.logback,
    "net.logstash.logback" % "logstash-logback-encoder" % Versions.logstashLogbackEncoder,
    "org.codehaus.janino" % "janino" % Versions.janino,

    "javax.xml.bind" % "jaxb-api" % Versions.javax,
    "com.sun.xml.bind" % "jaxb-core" % Versions.javax,
    "com.sun.xml.bind" % "jaxb-impl" % Versions.javax,
    "javax.activation" % "activation" % Versions.activation,

    "org.projectlombok" % "lombok" % Versions.lombok % Compile,

    "org.testng" % "testng" % Versions.testng  % Test,
    "org.mockito" % "mockito-all" % Versions.mockito  % Test,
    "org.assertj" % "assertj-core" % Versions.assertj % Test
  )

  val datafeedDependencies: Seq[ModuleID] =
    internalApiDeps ++
    loggingDeps ++
    cinnamonDeps ++
    macwireDeps ++
    pureConfigDeps ++
    akkaStreamDeps ++
    akkaManagementDeps ++
    kafkaDeps ++
    scaffeineDeps ++
    enumeratumDeps ++
    testingDeps

  val datafeedDependenciesOverride: Seq[ModuleID] =
    akkaStreamDeps

  val toolsDependencies: Seq[ModuleID] =
    loggingDeps ++
    jsoncompareDeps

  val topLevelDependencies: Seq[ModuleID] =
    testingDeps ++
    archUnitDeps
}

object ScalafixDependencies {
  val organizeImports = "com.github.liancheng" %% "organize-imports" % "0.4.4"
}
// @formatter:on
