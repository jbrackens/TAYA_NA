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
    "com.typesafe.scala-logging" %% "scala-logging" % Versions.scalaLogging)

  private val scalaTests = Seq(
    "junit" % "junit" % Versions.junit % Test,
    "org.scalatest" %% "scalatest" % Versions.scalaTest % Test,
    "org.scalatestplus.play" %% "scalatestplus-play" % Versions.scalaTestPlus % Test,
    "org.mockito" % "mockito-core" % Versions.mockito % Test,
    "org.mockito" %% "mockito-scala" % Versions.mockitoScala % Test
  )

  private val config = Seq(
    "com.typesafe" % "config" % Versions.typesafeConfig,
    "com.github.pureconfig" %% "pureconfig" % Versions.pureConfig)

  private val playJson = Seq("com.typesafe.play" %% "play-json" % Versions.playJson)

  private val enumeratum = Seq(
    "com.beachape" %% "enumeratum" % Versions.enumeratum,
    "com.beachape" %% "enumeratum-play" % Versions.enumeratum
  )

  private val sttp = Seq(
    "com.softwaremill.sttp" %% "core" % Versions.sttp,
    "com.softwaremill.sttp" %% "async-http-client-backend-future" % Versions.sttp
  )

  // MODULES
  val betting = Deps.logging ++
    Deps.scalaTests ++
    Deps.config ++
    Deps.playJson ++
    Deps.enumeratum ++
    Deps.sttp
}

object Versions {
  val scalaVersion = "2.12.7"

  val slf4j = "1.7.22"
  val logbackClassic = "1.2.3"
  val scalaLogging = "3.9.0"
  val logstashLogbackEncoder = "6.0"
  val janino = "3.0.8"

  val pureConfig = "0.11.1"
  val typesafeConfig = "1.3.4"

  val playJson = "2.7.3"

  val enumeratum = "1.5.13"

  val sttp = "1.6.4"

  val junit = "4.12"
  val scalaTest = "3.0.5"
  val scalaTestPlus = "3.1.2"
  val mockito = "2.28.2"
  val mockitoScala = "1.5.18"
}
