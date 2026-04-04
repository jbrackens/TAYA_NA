import com.lightbend.lagom.sbt.LagomImport.{lagomScaladslApi, lagomScaladslServer}
import sbt._

object Deps {

  private val logging = Seq(
    "org.slf4j" % "slf4j-api" % Versions.slf4j,
    "org.slf4j" % "jul-to-slf4j" % Versions.slf4j,
    "org.slf4j" % "jcl-over-slf4j" % Versions.slf4j,
    "ch.qos.logback" % "logback-classic" % Versions.logbackClassic,
    "ch.qos.logback" % "logback-core" % Versions.logbackClassic,
    "net.logstash.logback" % "logstash-logback-encoder" % Versions.logstashLogbackEncoder,
    "org.codehaus.janino" % "janino" % Versions.janino,
    "com.typesafe.scala-logging" %% "scala-logging" % Versions.scalaLogging
  )

  private val scalaTests = Seq(
    "junit" % "junit" % Versions.junit % Test,
    "org.scalatest" %% "scalatest" % Versions.scalaTest % Test,
    "org.scalatestplus.play" %% "scalatestplus-play" % Versions.scalaTestPlus % Test,
    "org.mockito" % "mockito-core" % Versions.mockito % Test,
    "org.mockito" %% "mockito-scala" % Versions.mockitoScala % Test
  )

  private val macwire = Seq(
    "com.softwaremill.macwire" %% "macros" % Versions.macwire % Provided,
    "com.softwaremill.macwire" %% "macrosakka" % Versions.macwire % Provided,
    "com.softwaremill.macwire" %% "util" % Versions.macwire
  )

  private val enumeratum = Seq(
    "com.beachape" %% "enumeratum" % Versions.enumeratum,
    "com.beachape" %% "enumeratum-play" % Versions.enumeratum
  )

  private val sttp = Seq(
    "com.softwaremill.sttp" %% "core" % Versions.sttp,
    "com.softwaremill.sttp" %% "async-http-client-backend-future" % Versions.sttp
  )

  private val lagom = Seq(
    lagomScaladslApi,
    lagomScaladslServer
  )

  private val akka = Seq(
    "com.typesafe.akka" %% "akka-protobuf" % Versions.akka,
    "com.typesafe.akka" %% "akka-actor" % Versions.akka,
    "com.typesafe.akka" %% "akka-stream" % Versions.akka
  )

  private val kafka = Seq(
    "com.typesafe.akka" %% "akka-stream-kafka" % Versions.akkaKafka
  )

  private val avro = Seq(
    "org.apache.avro" % "avro" % Versions.avro,
    "com.sksamuel.avro4s" %% "avro4s-core" % Versions.avro4s
  )

  private val confluentAvroSerializer = "io.confluent" % "kafka-avro-serializer" % Versions.confluentAvroSerializer

  private val akkaTests = Seq(
    "com.typesafe.akka" %% "akka-testkit" % Versions.akka % Test,
    "com.typesafe.akka" %% "akka-stream-testkit" % Versions.akka % Test
  )

  private val sbtechEvents = "net.flipsports.gmx.dataapi.internal.racingroulette" %% "events" % Versions.dataApiRacingRouletteEvents
  private val bettingApiClient = "net.flipsports.gmx.webapiclient.sbtech.betting" %% "gmx-web-api-client-sbtech-betting" % Versions.webApiClientBettingApi
  private val commonsPlay = "net.flipsports.gmx.common.internal.scala" %% "common-play" % Versions.commonsScala

  // MODULES
  val webGateway = Deps.lagom ++
    Deps.logging ++
    Deps.macwire ++
    Deps.akka ++
    Deps.kafka ++
    Deps.avro ++
    Deps.enumeratum ++
    Deps.scalaTests ++
    Deps.akkaTests :+
    Deps.confluentAvroSerializer :+
    Deps.bettingApiClient :+
    Deps.sbtechEvents :+
    Deps.commonsPlay

  val webGatewayOverride = Deps.akka

  val utils = Deps.lagom ++
    Deps.logging ++
    Deps.sttp
}

object Versions {
  val scalaVersion = "2.12.7"

  val webApiClientBettingApi = "1.0.3"
  val dataApiRacingRouletteEvents = "0.0.20"
  val commonsScala = "0.0.4"

  val slf4j = "1.7.22"
  val logbackClassic = "1.2.3"
  val scalaLogging = "3.9.0"
  val logstashLogbackEncoder = "6.0"
  val janino = "3.0.8"

  val macwire = "2.3.1"

  val sttp = "1.6.4"

  val enumeratum = "1.5.13"

  val junit = "4.12"
  val scalaTest = "3.0.5"
  val scalaTestPlus = "3.1.2"
  val mockito = "2.28.2"
  val mockitoScala = "1.5.18"

  val akka = "2.5.22"
  val akkaKafka = "1.0.5"

  val confluentAvroSerializer = "5.3.1"

  val avro = "1.8.2"
  val avro4s = "1.7.0"

}