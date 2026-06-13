import sbt._

object Dependencies {
  object Versions {
    //GMX
    val sbtechAvro           = "2.0.20"
    val internalAvro         = "0.1.0"
    //LOGGING
    val slf4j                = "1.7.30"
    val logback              = "1.2.3"
    val scalaLogging         = "3.9.2"
    val logstashLogbackEncoder = "6.0"
    val janino               = "3.0.8"
    //PLAY
    val playJson             = "2.7.4"
    val playSlick            = "5.0.0"
    val jodaTime             = "2.10.6"
    //DI
    val macwire              = "2.3.3"
    val scalaGuice           = "4.2.6"
    //AKKA
    val akkaClusterBootstrap = "1.0.8"
    val akkaDiscovery        = "2.6.4"
    val akkaDiscoveryAWS     = "1.0.8"
    val akkaDiscoverKubernetes = "1.0.8"
    //KAFKA
    val kafkaAvroSerialiser  = "5.3.1"
    //DB
    val postgresDriver       = "42.1.4"
    //KAMON
    val kamon                = "2.1.0"
    //OTHER
    val twitterBijection     = "0.9.7"
    val icu4j                = "67.1"
    val silencio             = "2.3.0"
    val faker                = "1.0.2"
    //TESTS
    val h2Driver             = "1.4.200"
    val scalatest            = "3.1.1"
    val mockito              = "2.28.2"
    val mockitoScala         = "1.5.18"
    val gatling              = "3.1.0"

  }

  //GMX
  //TODO use scala 2.13 | https://flipsports.atlassian.net/browse/GMV3-256
  val sbtechLogin                 = "net.flipsports.gmx.dataapi.sbtech.bet" % "login_2.12"                               % Versions.sbtechAvro
  val sbtechCustomer              = "net.flipsports.gmx.dataapi.sbtech.bet" % "customer-detail_2.12"                     % Versions.sbtechAvro
  val sbtechCasinoBet             = "net.flipsports.gmx.dataapi.sbtech.bet" % "casino-bet_2.12"                          % Versions.sbtechAvro
  val sbtechWalletTransaction     = "net.flipsports.gmx.dataapi.sbtech.bet" % "wallet-transaction_2.12"                  % Versions.sbtechAvro

  val internalCustomer            = "gmx.dataapi.internal"           % "customer_2.12"                                   % Versions.internalAvro

  //LOGGING
  val logging = Seq(
                                    "org.slf4j"                      % "slf4j-api"                                       % Versions.slf4j,
                                    "org.slf4j"                      % "jul-to-slf4j"                                    % Versions.slf4j,
                                    "org.slf4j"                      % "jcl-over-slf4j"                                  % Versions.slf4j,
                                    "ch.qos.logback"                 % "logback-classic"                                 % Versions.logback,
                                    "ch.qos.logback"                 % "logback-core"                                    % Versions.logback,
                                    "net.logstash.logback"           % "logstash-logback-encoder"                        % Versions.logstashLogbackEncoder,
                                    "org.codehaus.janino"            % "janino"                                          % Versions.janino,
                                    "com.typesafe.scala-logging"    %% "scala-logging"                                   % Versions.scalaLogging
  )

  //PLAY
  val playJson                    = "com.typesafe.play"             %% "play-json"                                       % Versions.playJson
  val playSlick                   = "com.typesafe.play"             %% "play-slick"                                      % Versions.playSlick
  val jodaTime                    = "joda-time"                      % "joda-time"                                       % Versions.jodaTime

  //DI
  val macwire                     = "com.softwaremill.macwire"      %% "macros"                                          % Versions.macwire                 % Provided
  val scalaGuice                  = "net.codingwell"                %% "scala-guice"                                     % Versions.scalaGuice

  //AKKA
  val akkaClusterBootstrap        = "com.lightbend.akka.management" %% "akka-management-cluster-bootstrap"               % Versions.akkaClusterBootstrap
  val akkaDiscovery               = "com.typesafe.akka"             %% "akka-discovery"                                  % Versions.akkaDiscovery
  val akkaDiscoveryKubernetes     = "com.lightbend.akka.discovery"  %% "akka-discovery-kubernetes-api"                   % Versions.akkaDiscoverKubernetes
  val akkaDiscoveryAWS            = "com.lightbend.akka.discovery"  %% "akka-discovery-aws-api-async"                    % Versions.akkaDiscoveryAWS

  //KAFKA
  val kafkaAvroSerialiser         = "io.confluent"                   % "kafka-avro-serializer"                           % Versions.kafkaAvroSerialiser

  //DB
  val postgresDriver              = "org.postgresql"                 % "postgresql"                                      % Versions.postgresDriver

  //KAMON
  val kamonBundle                 = "io.kamon"                      %% "kamon-bundle"                                    % Versions.kamon
  val kamonAPM                    = "io.kamon"                      %% "kamon-apm-reporter"                              % Versions.kamon

  //OTHER
  val twitterBijection            = "com.twitter"                   %% "bijection-avro"                                  % Versions.twitterBijection
  val icu4j                       = "com.ibm.icu"                    % "icu4j"                                           % Versions.icu4j
  val silencio                    = "pl.damianszczepanik"            % "silencio"                                        % Versions.silencio
  val faker                       = "com.github.javafaker"           % "javafaker"                                       % Versions.faker

  //TESTS
  val h2Driver                    = "com.h2database"                 % "h2"                                              % Versions.h2Driver                % Test
  val scalaTest                   = "org.scalatest"                 %% "scalatest"                                       % Versions.scalatest               % Test
  val mockito                     = "org.mockito"                    % "mockito-core"                                    % Versions.mockito                 % Test
  val mockitoScala                = "org.mockito"                   %% "mockito-scala"                                   % Versions.mockitoScala            % Test

  val gatlingCharts               = "io.gatling.highcharts"          % "gatling-charts-highcharts"                       % Versions.gatling                 % Test
  val gatling                     = "io.gatling"                     % "gatling-test-framework"                          % Versions.gatling                 % Test

}
