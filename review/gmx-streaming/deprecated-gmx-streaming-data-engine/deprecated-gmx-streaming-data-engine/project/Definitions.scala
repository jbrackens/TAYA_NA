import sbt._

object Deps {

  val flink: Seq[ModuleID] = Seq(
    "org.apache.flink" %% "flink-scala" % Versions.flink % "provided",
    "org.apache.flink" %% "flink-streaming-scala" % Versions.flink % "provided"
  )

  val avroHugger = "com.julianpeeters" %% "avrohugger-core" % Versions.avroHugger

  val avro = "org.apache.avro" % "avro" % Versions.avro

  val avro4s = "com.sksamuel.avro4s" %% "avro4s-core" % Versions.avro4s

  val avro4smacros = "com.sksamuel.avro4s" %% "avro4s-macros" % Versions.avro4s

  val typeSafeConfig = "com.typesafe" % "config" % Versions.typeSafe

  val flinkKafkaConnector = "org.apache.flink" % "flink-connector-kafka_2.12" % Versions.flink

  val sbtTechApiCasinoBet = "net.flipsports.gmx" %% "gmx-sbtech-data-api-casino-bet" % Versions.sbTechApi

  val sbtTechApiCustomerDetail = "net.flipsports.gmx" %% "gmx-sbtech-data-api-customer-detail" % Versions.sbTechApi

  val sbtTechApiSettlementData = "net.flipsports.gmx" %% "gmx-sbtech-data-api-settlement-data" % Versions.sbTechApi

  val sbtTechApiLogin = "net.flipsports.gmx" %% "gmx-sbtech-data-api-login" % Versions.sbTechApi

  val gmxRewardsPointsApi = "net.flipsports.gmx" %% "gmx-rewards-points-data-api" % Versions.rewardsPointApi

  val logbackClassic = "ch.qos.logback" % "logback-classic" % Versions.logbackClassic

  val scalaLogging = "com.typesafe.scala-logging" %% "scala-logging" % Versions.scalaLogging

  val flinkCore = "org.apache.flink" %% "flink-scala" % Versions.flink % "provided"

  val flinkMetrics = "org.apache.flink" % "flink-metrics-dropwizard" % Versions.flink 

  val flinkFormats = "org.apache.flink" % "flink-avro" % Versions.flink

  val flinkTests = "org.apache.flink" %% "flink-test-utils" % Versions.flink

  val flinkStateBackendRocksDb = "org.apache.flink" %% "flink-statebackend-rocksdb" % Versions.flink

  val flinkAvroConfluentRegistry = "org.apache.flink" % "flink-avro-confluent-registry" % Versions.flink

  val scalastic = "org.scalactic" %% "scalactic" % Versions.scalaTest % Test

  val scalaTest = "org.scalatest" %% "scalatest" % Versions.scalaTest % Test

  val mockito = "org.mockito" % "mockito-core" % Versions.mockito % Test

  val embeddedKafka = "io.github.embeddedkafka" %% "embedded-kafka-streams" % Versions.kafka % Test

  val shapless = "com.chuusai" %% "shapeless" % "2.3.3"

  val logstashLogbackEncoder = "net.logstash.logback" % "logstash-logback-encoder" % Versions.logstashEncoder


  val scalaTests = Seq(
    scalastic, scalaTest, mockito
  )

  val streamingEngingDependencies: Seq[ModuleID] = flink ++ Seq(
    flinkKafkaConnector,
    flinkAvroConfluentRegistry,
    sbtTechApiCasinoBet,
    sbtTechApiCustomerDetail,
    sbtTechApiSettlementData,
    sbtTechApiLogin,
    avroHugger,
    typeSafeConfig,
    logbackClassic,
    scalaLogging,
    avro,
    flinkFormats,
    avro4smacros,
    avro4s,
    gmxRewardsPointsApi,
    flinkTests,
    flinkMetrics,
    embeddedKafka,
    shapless,
    flinkStateBackendRocksDb
  ) ++ scalaTests

  val commonStreamingEnging: Seq[ModuleID] = flink ++ Seq(flinkKafkaConnector,
    flinkAvroConfluentRegistry,
    flinkMetrics,
    flinkStateBackendRocksDb,
    typeSafeConfig,
    logstashLogbackEncoder,
    logbackClassic,
    scalaLogging,
    flinkCore,
    flinkFormats,
    avro4s,
    avro4smacros,
    avro) ++ scalaTests

}

object Versions {

  val scalaTest = "3.0.5"

  val mockito = "1.8.5"

  val scalaVersion = "2.11.11"

  val flink = "1.7.2"

  val sbTechApi = "1.0.0"

  val rewardsPointApi = "1.1.0"

  val avroHugger = "1.0.0-RC15"

  val avro = "1.8.2"

  val avro4s = "1.7.0"

  val typeSafe = "1.3.2"

  val pureConfig = "0.10.2"

  val logbackClassic = "1.2.3"

  val scalaLogging = "3.9.0"

  val kafka = "2.1.1"

  val logstashEncoder = "6.1"
}
