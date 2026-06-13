import sbt._

object Deps {

  private val typeSafeConfig = "com.typesafe" % "config" % Versions.common.typeSafe % Provided

  private val flink: Seq[ModuleID] = Seq(
    "org.apache.flink" %% "flink-scala" % Versions.flink.version % Provided,
    "org.apache.flink" %% "flink-streaming-scala" % Versions.flink.version % Provided,
    "org.apache.flink" %% "flink-statebackend-rocksdb" % Versions.flink.version % Provided
  )

  private val flinkKafka: Seq[ModuleID] = Seq(
    "org.apache.flink" % "flink-avro-confluent-registry" % Versions.flink.version % Provided,
    "org.apache.flink" %% "flink-connector-kafka" % Versions.flink.version % Provided,
    "org.apache.flink" % "flink-avro" % Versions.flink.version % Provided,
    //TODO: we need to fix conflict there flink have some of it.
    "io.confluent" % "kafka-avro-serializer" % Versions.confluent.avroSerializer % Provided
  )

  private val common: Seq[ModuleID] = Seq(
    "net.flipsports.gmx.dataapi.internal.common" %% "common-core" % Versions.common.core
  )

  private val flinkMetrics: Seq[ModuleID] =  Seq(
    "org.apache.flink" % "flink-metrics-dropwizard" % Versions.flink.version % Provided
  )

  private val logging = Seq(
    "com.typesafe.scala-logging" %% "scala-logging" % Versions.logging.scalaLogging % Provided
  )

  private val scalaTests = Seq(
    "org.scalactic" %% "scalactic" % Versions.scalaTests.version,
    "org.scalatest" %% "scalatest" % Versions.scalaTests.version,
    "org.mockito" % "mockito-core" % Versions.scalaTests.mockito
  )


  private val testContainers = Seq(
    "com.dimafeng" %% "testcontainers-scala-scalatest" % Versions.scalaTests.testContainers,
    "com.dimafeng" %% "testcontainers-scala-kafka" % Versions.scalaTests.testContainers
  )

  private val flinkTest = Seq(
    "org.apache.flink" %% "flink-test-utils" % Versions.flink.version,
    "org.apache.flink" %% "flink-runtime" % Versions.flink.version
  )

  private val httpUtils = Seq(
    "com.softwaremill.sttp.client" %% "core" % Versions.http.client,
    "com.softwaremill.sttp.model" %% "core" %  Versions.http.model
  )

  val commonStreamingEnging: Seq[ModuleID] = flink ++ flinkKafka ++ flinkMetrics ++ Seq(typeSafeConfig) ++ logging ++ scalaTests ++ common

  val testStreamingEngine: Seq[ModuleID] = flink ++ flinkTest ++ testContainers ++ flinkKafka ++ flinkMetrics ++ Seq(typeSafeConfig) ++ logging ++ scalaTests ++ httpUtils

}

object Versions {

  val scalaVersion = "2.12.6"

  object common {

    val shapeless = "2.3.3"

    val typeSafe = "1.3.2"

    val core = "0.1.2"
  }

  object logging  {

    val logbackClassic = "1.2.3"

    val scalaLogging = "3.9.0"

    val logstashEncoder = "6.1"

  }

  object scalaTests {

    val version = "3.0.5"

    val mockito = "1.8.5"

    val testContainers = "0.40.9"

    val retry = "0.3.3"
  }

  object flink {
    val version  = "1.9.1"

  }

  object avro {

    val version = "1.8.2"

  }

  object confluent {

    val avroSerializer = "5.3.1"
  }

  object http {

    val client = "2.0.6"

    val model = "1.0.2"

  }

}
