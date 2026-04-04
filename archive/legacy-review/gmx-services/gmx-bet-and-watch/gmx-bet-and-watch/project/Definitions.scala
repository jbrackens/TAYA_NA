import com.lightbend.lagom.sbt.LagomImport.{lagomScaladslApi, lagomScaladslServer}
import sbt._

object Deps {

  private val logging = Seq(
    "org.slf4j" % "slf4j-api" % Versions.slf4j,
    "org.slf4j" % "jul-to-slf4j" % Versions.slf4j,
    "org.slf4j" % "jcl-over-slf4j" % Versions.slf4j,
    "ch.qos.logback" % "logback-classic" % Versions.logback,
    "ch.qos.logback" % "logback-core" % Versions.logback,
    "net.logstash.logback" % "logstash-logback-encoder" % Versions.logstashLogbackEncoder,
    "org.codehaus.janino" % "janino" % Versions.janino,
    "com.typesafe.scala-logging" %% "scala-logging" % Versions.scalaLogging
  )

  private val config = Seq(
    "com.typesafe" % "config" % Versions.typesafeConfig,
    "com.github.pureconfig" %% "pureconfig" % Versions.pureConfig
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

  private val playJson = Seq(
    "com.typesafe.play" %% "play-json" % Versions.playJson,
    "org.julienrf" %% "play-json-derived-codecs" % Versions.playJsonCodecs
  )

  private val jackson = Seq(
    "com.fasterxml.jackson.core" % "jackson-annotations" % Versions.jackson,
    "com.fasterxml.jackson.core" % "jackson-core" % Versions.jackson,
    "com.fasterxml.jackson.core" % "jackson-databind" % Versions.jacksonDatabind,
    "com.fasterxml.jackson.datatype" % "jackson-datatype-jdk8" % Versions.jackson,
    "com.fasterxml.jackson.datatype" % "jackson-datatype-jsr310" % Versions.jackson
  )

  private val sttp = Seq(
    "com.softwaremill.sttp.client" %% "core" % Versions.sttp,
    "com.softwaremill.sttp.client" %% "async-http-client-backend-future" % Versions.sttp
  )

  private val lagom = Seq(
    lagomScaladslApi,
    lagomScaladslServer
  )

  private val jwt = "io.jsonwebtoken" % "jjwt" % Versions.jwt
  private val apacheLang3 = "org.apache.commons" % "commons-lang3" % Versions.apacheLang3
  private val apacheCodec = "commons-codec" % "commons-codec" % Versions.apacheCodec
  private val togglz = "org.togglz" % "togglz-core" % Versions.togglz
  private val javaCompat = "org.scala-lang.modules" %% "scala-java8-compat" % Versions.compat

  private val commonsCache = "net.flipsports.gmx.common.internal.scala" %% "common-cache" % Versions.commonsScala
  private val commonsCore = "net.flipsports.gmx.common.internal.scala" %% "common-core" % Versions.commonsScala
  private val commonsJson = "net.flipsports.gmx.common.internal.scala" %% "common-json" % Versions.commonsScala
  private val commonsPlay = "net.flipsports.gmx.common.internal.scala" %% "common-play" % Versions.commonsScala

  private val partnerCommons = "net.flipsports.gmx.common.internal.partner" %% "partner-commons" % Versions.commonsPartners
  private val partnerAtr = "net.flipsports.gmx.common.internal.partner" %% "partner-atr" % Versions.commonsPartners
  private val partnerRmg = "net.flipsports.gmx.common.internal.partner" %% "partner-rmg" % Versions.commonsPartners
  private val partnerSis = "net.flipsports.gmx.common.internal.partner" %% "partner-sis" % Versions.commonsPartners
  private val partnerSbtech = "net.flipsports.gmx.common.internal.partner" %% "partner-sbtech" % Versions.commonsPartners

  // MODULES
  private val sharedLibs = Deps.logging ++
    Deps.scalaTests

  val commonsOverride = Deps.jackson

  val commons = Deps.sharedLibs ++
    Deps.sttp ++
    Deps.playJson

  val security = Deps.sharedLibs ++
    Deps.config ++
    Deps.macwire ++
    Deps.sttp ++
    Deps.playJson :+
    Deps.commonsCore :+
    Deps.commonsCache :+
    Deps.commonsJson :+
    Deps.jwt :+
    Deps.apacheCodec

  val eventsApi = Deps.sharedLibs ++
    Deps.lagom ++
    Deps.playJson :+
    Deps.commonsCore :+
    Deps.commonsJson :+
    Deps.partnerCommons

  val eventsImpl = Deps.sharedLibs ++
    Deps.config ++
    Deps.macwire :+
    Deps.apacheCodec :+
    Deps.javaCompat :+
    Deps.commonsCache :+
    Deps.commonsPlay :+
    Deps.partnerAtr :+
    Deps.partnerRmg :+
    Deps.partnerSis :+
    Deps.partnerSbtech

  val webGateway = Deps.sharedLibs ++
    Deps.lagom ++
    Deps.macwire :+
    Deps.commonsJson :+
    Deps.commonsPlay :+
    Deps.togglz
}

object Versions {
  val scalaVersion = "2.12.7"

  val commonsScala = "0.0.5"
  val commonsPartners = "0.2.9"

  val slf4j = "1.7.22"
  val logback = "1.2.3"
  val scalaLogging = "3.9.0"
  val logstashLogbackEncoder = "6.0"
  val janino = "3.0.8"

  val pureConfig = "0.13.0"
  val typesafeConfig = "1.3.4"

  val macwire = "2.3.1"

  val jackson = "2.9.10"
  val jacksonDatabind = "2.9.10.4"
  val playJson = "2.7.3"
  val playJsonCodecs = "4.0.1"
  val scalaXml = "1.3.0"
  val sttp = "2.0.9"
  val jwt = "0.7.0"
  val apacheLang3 = "3.11"
  val apacheCodec = "1.11"
  val togglz = "2.6.1.Final"
  val compat = "0.9.0"

  val junit = "4.12"
  val scalaTest = "3.0.5"
  val scalaTestPlus = "3.1.2"
  val mockito = "4.0.0"
  val mockitoScala = "1.16.46"

}