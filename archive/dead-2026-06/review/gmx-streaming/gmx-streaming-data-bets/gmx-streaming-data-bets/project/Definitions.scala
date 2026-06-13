import sbt._

object Deps {

  private val common = Seq(
    "com.chuusai" %% "shapeless" % Versions.common.shapeless,
    "com.typesafe" % "config" % Versions.common.typeSafe,
    "ca.mrvisser" %% "sealerate" % Versions.common.sealerate
  )

  private val flink = Seq(
    "org.apache.flink" %% "flink-scala" % Versions.flink.version % Provided,
    "org.apache.flink" %% "flink-streaming-scala" % Versions.flink.version % Provided,
    "org.apache.flink" %% "flink-statebackend-rocksdb" % Versions.flink.version
  )

  private val flinkKafka = Seq(
    "org.apache.flink" % "flink-avro-confluent-registry" % Versions.flink.version,
    "org.apache.flink" %% "flink-connector-kafka" % Versions.flink.version,
    "org.apache.flink" % "flink-avro" % Versions.flink.version
  )

  private val flinkMetrics =  Seq(
    "org.apache.flink" % "flink-metrics-dropwizard" % Versions.flink.version
  )

  private val logging = Seq(
    "com.typesafe.scala-logging" %% "scala-logging" % Versions.logging.scalaLogging,
    "ch.qos.logback" % "logback-classic" % Versions.logging.logbackClassic,
    "net.logstash.logback" % "logstash-logback-encoder" % Versions.logging.logstashEncoder
  )

  private val scalaTests = Seq(
    "org.scalactic" %% "scalactic" % Versions.scalaTests.version % Test,
    "org.scalatest" %% "scalatest" % Versions.scalaTests.version % Test,
    "org.mockito" % "mockito-core" % Versions.scalaTests.mockito % Test,
    "org.apache.flink" %% "flink-test-utils" % Versions.flink.version % Test,
    "com.dimafeng" %% "testcontainers-scala" % Versions.scalaTests.testContainers % Test,
    "com.dimafeng" %% "testcontainers-scala-kafka" % Versions.scalaTests.testContainers % Test,
    "org.apache.flink" %% "flink-runtime" % Versions.flink.version % Test classifier("tests"),
    "org.apache.flink" %% "flink-streaming-java" % Versions.flink.version % Test classifier("tests")
  )

  private val internalApi = Seq(
    "net.flipsports.gmx.streaming.internal.engine" %% "base" % Versions.internalApi.streamingEngine,
    "net.flipsports.gmx.streaming.internal.engine" %% "tests" % Versions.internalApi.streamingEngine % Test,
    "net.flipsports.gmx.dataapi.internal.rewardpoints" %% "reward-calculator" % Versions.internalApi.rewardsPoints
  )
  private val sbtech = Seq(
    "net.flipsports.gmx.dataapi.sbtech.bet" %% "casino-bet" % Versions.externalApi.bets,
    "net.flipsports.gmx.dataapi.sbtech.bet" %% "customer-detail" % Versions.externalApi.bets,
    "net.flipsports.gmx.dataapi.sbtech.bet" %% "settlement-data" % Versions.externalApi.bets,
    "net.flipsports.gmx.dataapi.sbtech.bet" %% "login" % Versions.externalApi.bets
  )

  private val json = Seq(
    "com.fasterxml.jackson.core" % "jackson-databind" % Versions.jackson.version % Test
  )

  private val kafka = Seq(
    "io.confluent" % "kafka-avro-serializer" % Versions.kafka.version
  )

  val streamingEngingDependencies: Seq[ModuleID] = flink ++
    kafka ++
    flinkKafka ++
    flinkMetrics ++
    common ++
    logging ++
    scalaTests ++
    sbtech ++
    internalApi ++
    json

}

object Versions {

  val scalaVersion = "2.12.6"

  object common {

    val shapeless = "2.3.3"

    val typeSafe = "1.3.2"

    val sealerate = "0.0.5"
  }

  object flink {
    val version  = "1.9.1"

  }

  object avro {

    val version = "1.9.0"

  }

  object logging  {

    val logbackClassic = "1.2.3"

    val scalaLogging = "3.9.0"

    val logstashEncoder = "6.1"

  }

  object scalaTests {


    val version = "3.0.5"

    val mockito = "1.8.5"

    val kafka = "2.2.1"

    val testContainers = "0.34.3"

  }

  object jackson {

    val version = "2.10.1"
  }

  object internalApi {

    val streamingEngine = "0.0.37"

    val rewardsPoints = "1.1.9"
  }

  object externalApi {

    val bets = "2.0.20"
  }

  object kafka {
    val version = "5.3.1"
  }

}