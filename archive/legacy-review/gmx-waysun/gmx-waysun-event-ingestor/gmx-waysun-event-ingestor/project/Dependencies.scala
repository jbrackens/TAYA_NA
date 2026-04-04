import sbt._

object Dependencies {

  // @formatter:off
  object Versions {
    val scala                     = "2.13.8"

    // internal dependencies
    val stellaCommon              = "0.0.32"
    val stellaDataApi             = "0.0.34"

    // external dependencies
    val akka                      = "2.6.19"
    val akkaHttp                  = "10.2.9"
    val akkaHttpCors              = "1.1.3"
    val avro                      = "1.10.1"
    val cats                      = "2.7.0"
    val enumeratum                = "1.7.0"
    val gatling                   = "3.7.6"
    val jackson                   = "2.13.2"
    val janino                    = "3.1.6"
    val kafkaClient               = "2.3.1"
    val kafkaAvroSerializer       = "5.3.1"
    val kafkaSchemaRegistryClient = "5.3.1"
    val kryo                      = "5.3.0"
    val logback                   = "1.2.11"
    val logstashLogbackEncoder    = "7.0.1"
    val macWire                   = "2.5.6"
    val pureConfig                = "0.17.1"
    val quartz                    = "2.3.2"
    val redisson                  = "3.17.0"
    val scalaCheck                = "1.15.4"
    val scalaMock                 = "5.2.0"
    val scalaTest                 = "3.2.11"
    val scalaTestContainers       = "0.34.3" // the last version (at least up to 0.39.3) with which our Kafka container utils work
    val scalaTestScalaCheck       = "3.2.11.0"
    val slf4jApi                  = "1.7.36"
    val tapir                     = "1.0.0-M8"
  }

  // internal dependencies
  private val stellaCommonDeps = Seq(
    "stella"                        %% "common-core"                 % Versions.stellaCommon,
    "stella"                        %% "common-http"                 % Versions.stellaCommon,
    "stella"                        %% "common-models"               % Versions.stellaCommon,
    "stella"                        %% "common-kafka"                % Versions.stellaCommon
  )

  private val stellaDataApiDeps = Seq(
    "stella"                        %% "platform-events"             % Versions.stellaDataApi,
    "stella"                        %% "validators"                  % Versions.stellaDataApi
  )

  // external dependencies
  private val akkaDeps = Seq(
    "com.typesafe.akka"             %% "akka-actor-typed"            % Versions.akka,
    "com.typesafe.akka"             %% "akka-protobuf-v3"            % Versions.akka,
    "com.typesafe.akka"             %% "akka-stream"                 % Versions.akka
  )

  private val akkaHttpDeps = Seq(
    "ch.megard"                     %% "akka-http-cors"              % Versions.akkaHttpCors,
    "com.typesafe.akka"             %% "akka-http"                   % Versions.akkaHttp,
    "com.typesafe.akka"             %% "akka-http-spray-json"        % Versions.akkaHttp
  )

  private val akkaHttpTestingDeps = Seq(
    "com.typesafe.akka"             %% "akka-actor-testkit-typed"    % Versions.akka,
    "com.typesafe.akka"             %% "akka-http-testkit"           % Versions.akkaHttp
  ).map(_ % Test)

  private val catsDeps = Seq(
    "org.typelevel"                 %% "cats-core"                   % Versions.cats
  )

  private val enumeratumDeps = Seq(
    "com.beachape"                  %% "enumeratum"                  % Versions.enumeratum
  )

  private val gatlingDeps = Seq(
    "io.gatling.highcharts"         % "gatling-charts-highcharts"    % Versions.gatling,
    "io.gatling"                    % "gatling-test-framework"       % Versions.gatling
  )

  private val integrationTestsDeps = Seq(
    "com.dimafeng"                  %% "testcontainers-scala-core"      % Versions.scalaTestContainers,
    "com.dimafeng"                  %% "testcontainers-scala-kafka"     % Versions.scalaTestContainers,
    "com.dimafeng"                  %% "testcontainers-scala-scalatest" % Versions.scalaTestContainers
  ).map(_ % Test)

  private val jacksonDeps = Seq(
    "com.fasterxml.jackson.core"    % "jackson-annotations"          % Versions.jackson,
    "com.fasterxml.jackson.core"    % "jackson-core"                 % Versions.jackson,
    "com.fasterxml.jackson.core"    % "jackson-databind"             % Versions.jackson
  )

  private val kafkaDeps = Seq(
    "org.apache.avro"               % "avro"                         % Versions.avro,
    "org.apache.kafka"              % "kafka-clients"                % Versions.kafkaClient,
    "io.confluent"                  % "kafka-avro-serializer"        % Versions.kafkaAvroSerializer,
    "io.confluent"                  % "kafka-schema-registry-client" % Versions.kafkaSchemaRegistryClient
  )

  private val kryoDeps = Seq(
    "com.esotericsoftware"          % "kryo"                         % Versions.kryo
  )

  private val loggingDeps = Seq(
    "ch.qos.logback"                % "logback-classic"              % Versions.logback,
    "net.logstash.logback"          % "logstash-logback-encoder"     % Versions.logstashLogbackEncoder,
    "org.codehaus.janino"           % "janino"                       % Versions.janino, // for conditional statements in logback.xml
    "org.slf4j"                     % "slf4j-api"                    % Versions.slf4jApi
  )
  
  private val macWireDeps = Seq(
    "com.softwaremill.macwire"      %% "macros"                      % Versions.macWire % "provided",
    "com.softwaremill.macwire"      %% "proxy"                       % Versions.macWire,
    "com.softwaremill.macwire"      %% "util"                        % Versions.macWire
  )

  private val pureConfigDeps = Seq(
    "com.github.pureconfig"         %% "pureconfig"                  % Versions.pureConfig,
    "com.github.pureconfig"         %% "pureconfig-enumeratum"       % Versions.pureConfig
  )

  private val quartzDeps = Seq(
    "org.quartz-scheduler"          % "quartz"                       % Versions.quartz
  )

  private val redissonDeps = Seq(
    "org.redisson"                  % "redisson"                     % Versions.redisson
  )

  private val tapirDeps = Seq(
    "com.softwaremill.sttp.tapir"   %% "tapir-core"                  % Versions.tapir,
    "com.softwaremill.sttp.tapir"   %% "tapir-json-spray"            % Versions.tapir,
    "com.softwaremill.sttp.tapir"   %% "tapir-openapi-circe-yaml"    % Versions.tapir,
    "com.softwaremill.sttp.tapir"   %% "tapir-openapi-docs"          % Versions.tapir
  )
  
  private val tapirAkkaDeps = Seq(
    ("com.softwaremill.sttp.tapir"  %% "tapir-akka-http-server"      % Versions.tapir)
      .excludeAll(ExclusionRule("com.typesafe.akka", "akka-http")),
    "com.softwaremill.sttp.tapir"   %% "tapir-swagger-ui-bundle"     % Versions.tapir
  )

  private val testingDeps = Seq(
    "org.scalacheck"                %% "scalacheck"                  % Versions.scalaCheck,
    "org.scalamock"                 %% "scalamock"                   % Versions.scalaMock,
    "org.scalatest"                 %% "scalatest"                   % Versions.scalaTest,
    "org.scalatestplus"             %% "scalacheck-1-15"             % Versions.scalaTestScalaCheck
  ).map(_ % Test)
  // @formatter:on

  val eventIngestorDeps =
    akkaDeps ++
    akkaHttpDeps ++
    akkaHttpTestingDeps ++
    catsDeps ++
    enumeratumDeps ++
    integrationTestsDeps ++
    jacksonDeps ++
    kafkaDeps ++
    kryoDeps ++
    loggingDeps ++
    macWireDeps ++
    pureConfigDeps ++
    quartzDeps ++
    redissonDeps ++
    stellaCommonDeps ++
    stellaDataApiDeps ++
    tapirAkkaDeps ++
    tapirDeps ++
    testingDeps

  val loadTestsDeps = gatlingDeps ++ jacksonDeps ++ loggingDeps
}

object ScalafixDependencies {
  val organizeImports = "com.github.liancheng" %% "organize-imports" % "0.4.4"
}
