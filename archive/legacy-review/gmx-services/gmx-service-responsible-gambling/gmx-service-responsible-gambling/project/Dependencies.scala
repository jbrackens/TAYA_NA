import sbt._

object Dependencies {
  object Versions {

    val slf4jApi = "1.7.28"
    val playJson = "2.7.4"
    val playSlick = "5.0.0"
    val akkaClusterBootstrap = "1.0.8"
    val akkaDiscovery = "2.6.4"
    val akkaDiscoveryAWS = "1.0.8"
    val akkaDiscoverKubernetes = "1.0.8"
    val macwire = "2.3.3"
    val scalaGuice = "4.2.6"
    val postgresDriver = "42.1.4"
    val scalatest = "3.1.1"
    val gatling = "3.1.0"
    val kamon = "2.1.0"
  }

  val slf4jApi = "org.slf4j" % "slf4j-api" % Versions.slf4jApi
  val playJson = "com.typesafe.play" %% "play-json" % Versions.playJson
  val playSlick = "com.typesafe.play" %% "play-slick" % Versions.playSlick
  val akkaClusterBootstrap = "com.lightbend.akka.management" %% "akka-management-cluster-bootstrap" % Versions.akkaClusterBootstrap
  val akkaDiscovery = "com.typesafe.akka" %% "akka-discovery" % Versions.akkaDiscovery
  val akkaDiscoveryKubernetes = "com.lightbend.akka.discovery" %% "akka-discovery-kubernetes-api" % Versions.akkaDiscoverKubernetes
  val akkaDiscoveryAWS = "com.lightbend.akka.discovery" %% "akka-discovery-aws-api-async" % Versions.akkaDiscoveryAWS
  val macwire = "com.softwaremill.macwire" %% "macros" % Versions.macwire % Provided
  val scalaGuice = "net.codingwell" %% "scala-guice" % Versions.scalaGuice
  val postgresDriver = "org.postgresql" % "postgresql" % Versions.postgresDriver
  val kamonBundle = "io.kamon" %% "kamon-bundle" % Versions.kamon
  val scalaTest = "org.scalatest" %% "scalatest" % Versions.scalatest % Test
  val gatlingCharts = "io.gatling.highcharts" % "gatling-charts-highcharts" % Versions.gatling % Test
  val gatling = "io.gatling" % "gatling-test-framework" % Versions.gatling % Test
}
