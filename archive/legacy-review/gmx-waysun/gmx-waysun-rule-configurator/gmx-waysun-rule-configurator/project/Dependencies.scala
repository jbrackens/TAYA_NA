import sbt._

object Dependencies {

  // @formatter:off
  object Versions {
    val scala                     = "2.13.8"

    // internal dependencies
    val stellaCommon              = "0.0.30"
    val stellaDataApi             = "0.0.34"

    // external dependencies
    val avro                      = "1.10.1"
    val cats                      = "2.7.0"
    val enumeratum                = "1.7.0"
    val enumeratumPlayJson        = "1.7.0"
    val enumeratumSlick           = "1.7.0"
    val jackson                   = "2.13.2"
    val janino                    = "3.1.6"
    val kafkaClient               = "2.3.1"
    val kafkaAvroSerializer       = "5.3.1"
    val kafkaSchemaRegistryClient = "5.3.1"
    val kebs                      = "1.9.4"
    val liquibase                 = "4.9.0"
    val logback                   = "1.2.11"
    val logstashLogbackEncoder    = "7.0.1"
    val macWire                   = "2.5.6"
    val play                      = "2.8.15"
    val playSlick                 = "5.0.0"
    val postgresDriver            = "42.3.2"
    val pureConfig                = "0.17.1"
    val quicklens                 = "1.8.4"
    val scalaCheck                = "1.15.4"
    val scalaMock                 = "5.2.0"
    val scalaTest                 = "3.2.11"
    val scalaTestContainers       = "0.34.3" // the last version (at least up to 0.39.3) with which our Kafka container utils work
    val scalaTestPlay             = "5.1.0"
    val scalaTestScalaCheck       = "3.2.11.0"
    val sealerate                 = "0.0.6"
    val slf4jApi                  = "1.7.36"
    val slickPg                   = "0.20.2"
    val tapir                     = "1.0.0-M8"
  }

  // internal dependencies
  private val stellaCommonDeps = Seq(
    "stella"                           %% "common-core"                     % Versions.stellaCommon,
    "stella"                           %% "common-http"                     % Versions.stellaCommon,
    "stella"                           %% "common-models"                   % Versions.stellaCommon,
    "stella"                           %% "common-kafka"                    % Versions.stellaCommon
  )

  private val stellaDataApiDeps = Seq(
    "stella"                           %% "event-configurations"            % Versions.stellaDataApi,
    "stella"                           %% "aggregation-rule-configurations" % Versions.stellaDataApi,
    "stella"                           %% "achievement-rule-configurations" % Versions.stellaDataApi
  )

  // external dependencies
  private val catsDeps = Seq(
    "org.typelevel"                    %% "cats-core"                       % Versions.cats
  )

  private val dbDeps = Seq (
    "com.github.tminglei"              %% "slick-pg"                        % Versions.slickPg,
    "com.typesafe.play"                %% "play-slick"                      % Versions.playSlick,
    "org.postgresql"                   % "postgresql"                       % Versions.postgresDriver
  )

  private val enumeratumDeps = Seq(
    "com.beachape"                     %% "enumeratum"                      % Versions.enumeratum,
    "com.beachape"                     %% "enumeratum-play-json"            % Versions.enumeratumPlayJson,
    "com.beachape"                     %% "enumeratum-slick"                % Versions.enumeratumSlick
  )

  private val integrationTestsDeps = Seq(
    "com.dimafeng"                     %% "testcontainers-scala-core"       % Versions.scalaTestContainers,
    "com.dimafeng"                     %% "testcontainers-scala-kafka"      % Versions.scalaTestContainers,
    "com.dimafeng"                     %% "testcontainers-scala-postgresql" % Versions.scalaTestContainers,
    "com.dimafeng"                     %% "testcontainers-scala-scalatest"  % Versions.scalaTestContainers,
    "org.liquibase"                    % "liquibase-core"                   % Versions.liquibase
  ).map(_ % Test) // for some reason the classes can't be found when using % IntegrationTest

  private val jacksonDeps = Seq(
    "com.fasterxml.jackson.core"       % "jackson-annotations"              % Versions.jackson,
    "com.fasterxml.jackson.core"       % "jackson-core"                     % Versions.jackson,
    "com.fasterxml.jackson.core"       % "jackson-databind"                 % Versions.jackson,
    "com.fasterxml.jackson.dataformat" % "jackson-dataformat-cbor"          % Versions.jackson,
    "com.fasterxml.jackson.datatype"   % "jackson-datatype-jdk8"            % Versions.jackson,
    "com.fasterxml.jackson.datatype"   % "jackson-datatype-jsr310"          % Versions.jackson,
    "com.fasterxml.jackson.module"     %% "jackson-module-scala"            % Versions.jackson,
    "com.fasterxml.jackson.module"     % "jackson-module-parameter-names"   % Versions.jackson
  )

  private val kafkaDeps = Seq(
    "io.confluent"                     % "kafka-avro-serializer"            % Versions.kafkaAvroSerializer,
    "io.confluent"                     % "kafka-schema-registry-client"     % Versions.kafkaSchemaRegistryClient,
    "org.apache.avro"                  % "avro"                             % Versions.avro,
    "org.apache.kafka"                 % "kafka-clients"                    % Versions.kafkaClient
  )

  private val kebsDeps = Seq(
    "pl.iterators"                     %% "kebs-spray-json"                 % Versions.kebs,
    "pl.iterators"                     %% "kebs-tagged"                     % Versions.kebs
  )

  private val loggingDeps = Seq(
    "ch.qos.logback"                   % "logback-classic"                  % Versions.logback,
    "net.logstash.logback"             % "logstash-logback-encoder"         % Versions.logstashLogbackEncoder,
    "org.codehaus.janino"              % "janino"                           % Versions.janino, // for conditional statements in logback.xml
    "org.slf4j"                        % "slf4j-api"                        % Versions.slf4jApi
  )

  private val macWireDeps = Seq(
    "com.softwaremill.macwire"         %% "macros"                          % Versions.macWire % "provided",
    "com.softwaremill.macwire"         %% "proxy"                           % Versions.macWire,
    "com.softwaremill.macwire"         %% "util"                            % Versions.macWire
  )

  private val pureConfigDeps = Seq(
    "com.github.pureconfig"            %% "pureconfig"                      % Versions.pureConfig
  )

  private val quicklensDeps = Seq(
    "com.softwaremill.quicklens"       %% "quicklens"                       % Versions.quicklens
  )

  private val sealerateDeps = Seq(
    "ca.mrvisser"                      %% "sealerate"                       % Versions.sealerate
  )

  private val tapirDeps = Seq(
    "com.softwaremill.sttp.tapir"      %% "tapir-core"                      % Versions.tapir,
    "com.softwaremill.sttp.tapir"      %% "tapir-enumeratum"                % Versions.tapir,
    "com.softwaremill.sttp.tapir"      %% "tapir-json-spray"                % Versions.tapir,
    "com.softwaremill.sttp.tapir"      %% "tapir-openapi-circe-yaml"        % Versions.tapir,
    "com.softwaremill.sttp.tapir"      %% "tapir-openapi-docs"              % Versions.tapir
  )

  private val tapirPlayDeps = Seq(
    "com.softwaremill.sttp.tapir"      %% "tapir-play-server"               % Versions.tapir,
    "com.softwaremill.sttp.tapir"      %% "tapir-swagger-ui-bundle"         % Versions.tapir,
    "com.typesafe.play"                %% "play-akka-http-server"           % Versions.play
  )

  private val testingDeps = Seq(
    "org.scalacheck"                   %% "scalacheck"                      % Versions.scalaCheck,
    "org.scalamock"                    %% "scalamock"                       % Versions.scalaMock,
    "org.scalatest"                    %% "scalatest"                       % Versions.scalaTest,
    "org.scalatestplus"                %% "scalacheck-1-15"                 % Versions.scalaTestScalaCheck,
    "org.scalatestplus.play"           %% "scalatestplus-play"              % Versions.scalaTestPlay
  ).map(_ % "it,test")
  // @formatter:on

  val ruleConfiguratorDeps =
    catsDeps ++
    dbDeps ++
    enumeratumDeps ++
    integrationTestsDeps ++
    jacksonDeps ++
    kafkaDeps ++
    kebsDeps ++
    loggingDeps ++
    macWireDeps ++
    pureConfigDeps ++
    quicklensDeps ++
    sealerateDeps ++
    stellaCommonDeps ++
    stellaDataApiDeps ++
    tapirDeps ++
    tapirPlayDeps ++
    testingDeps
}

object ScalafixDependencies {
  val organizeImports = "com.github.liancheng" %% "organize-imports" % "0.4.4"
}
