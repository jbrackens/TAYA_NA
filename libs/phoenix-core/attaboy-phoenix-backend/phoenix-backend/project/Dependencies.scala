import Build.ContractTest
import Dependencies.Versions
import org.virtuslab.ash.AkkaSerializationHelperPlugin
import sbt._

object Dependencies {
  // @formatter:off
  object Versions {

    val scala                   = "2.13.8"

    val advxml                  = "2.4.2"
    val akka                    = "2.6.19"
    val akkaDiagnostics         = "1.1.16"
    val akkaDiscoveryKubernetes = "1.1.3"
    val akkaHttp                = "10.2.9"
    val akkaHttpCors            = "1.1.3"
    val akkaManagement          = "1.1.3"
    val akkaPersistenceJdbc     = "5.0.4"
    val akkaProjection          = "1.2.4"
    val akkaStreamKafka         = "3.0.0"
    val alpakkaCsv              = "3.0.4"
    val alpakkaFtp              = "2.0.2"
    val alpakkaXml              = "3.0.4"
    val apacheCommonsText       = "1.9"
    val apacheCommonsValidator  = "1.7"
    val archUnit                = "0.18.0"
    val amqp                    = "5.8.0"
    val cats                    = "2.8.0"
    val chimney                 = "0.6.1"
    val circe                   = "0.14.1"
    val circeGolden             = "0.3.0"
    val enumeratum              = "1.7.0"
    val faker                   = "1.0.2"
    val flyway                  = "8.5.13"
    val fuel                    = "2.3.1"
    val gatling                 = "3.7.6"
    val guice                   = "5.0.1"
    val janino                  = "3.1.7"
    val jaxb                    = "2.3.2"
    val kamon                   = "2.5.4"
    val keycloak                = "17.0.1"
    val kittens                 = "2.3.2"
    val kotlin                  = "1.6.0"
    val kotlinLoging            = "2.1.16"
    val logback                 = "1.2.11"
    val logstashLogbackEncoder  = "7.2"
    val monocle                 = "3.1.0"
    val oddinSdk                = "0.0.27"
    val passay                  = "1.6.1"
    val playSlick               = "4.0.2"
    val pureConfig              = "0.17.1"
    val reactiveKotlin          = "2.4.0"
    val reflections             = "0.10.2"
    val scalafixOrganizeImports = "0.6.0"
    val scalaGuice              = "4.2.6"
    val scalaMock               = "5.2.0"
    val scalaTest               = "3.2.12"
    val scalaXml                = "2.1.0"
    val scalaXmlDiff            = "3.0.1"
    val scalate                 = "1.9.6"
    val sendgrid                = "4.9.2"
    val scalacheckShapeless     = "1.3.0"
    val silhouette              = "6.1.1"
    val slf4jApi                = "1.7.36"
    val slick                   = "3.3.3"
    val slickMigrationApi       = "0.8.1"
    val slickPostgres           = "0.20.3"
    val spoiwo                  = "1.8.0"
    // Let's stick to 4.1.2 since higher versions always display the sample Petstore docs instead of the provided docs for some reason
    val swaggerUi               = "4.1.2"
    val tapir                   = "0.20.2"
    val testContainers          = "1.16.3"
    val testContainersKeycloak  = "1.10.0"
    val wiremock                = "2.33.2"
  }

  private val akkaDeps = Seq(
    "com.typesafe.akka"             %% "akka-actor-typed"                  % Versions.akka,
    "com.typesafe.akka"             %% "akka-slf4j"                        % Versions.akka,
    "com.typesafe.akka"             %% "akka-cluster-typed"                % Versions.akka,
    "com.typesafe.akka"             %% "akka-cluster-sharding-typed"       % Versions.akka,
    "com.typesafe.akka"             %% "akka-persistence-typed"            % Versions.akka,
    "com.typesafe.akka"             %% "akka-persistence-query"            % Versions.akka,
    AkkaSerializationHelperPlugin.annotation,
    AkkaSerializationHelperPlugin.circeAkkaSerializer
  )

  private val akkaDiscoveryDeps = Seq(
    "com.typesafe.akka"             %% "akka-discovery"                    % Versions.akka,
    "com.lightbend.akka.discovery"  %% "akka-discovery-kubernetes-api"     % Versions.akkaDiscoveryKubernetes
  )

  private val akkaManagementDeps = Seq(
    "com.lightbend.akka.management" %% "akka-management"                   % Versions.akkaManagement,
    "com.lightbend.akka.management" %% "akka-management-cluster-bootstrap" % Versions.akkaManagement,
    "com.lightbend.akka.management" %% "akka-management-cluster-http"      % Versions.akkaManagement
  )

  private val akkaStreamKafkaDeps = Seq(
    "com.typesafe.akka"             %% "akka-stream-kafka"                 % Versions.akkaStreamKafka
  )

  private val alpakkaCsvDeps = Seq(
    "com.lightbend.akka"            %% "akka-stream-alpakka-csv"           % Versions.alpakkaCsv
  )

  private val alpakkaFtpDeps = Seq(
    "com.lightbend.akka"             %% "akka-stream-alpakka-ftp"          % Versions.alpakkaFtp
  )

  private val alpakkaXmlDeps = Seq(
    "com.lightbend.akka"            %% "akka-stream-alpakka-xml"           % Versions.alpakkaXml
  )

  private val akkaHttpDeps = Seq(
    "com.typesafe.akka"             %% "akka-http"                         % Versions.akkaHttp,
    "com.typesafe.akka"             %% "akka-http-caching"                 % Versions.akkaHttp,
    "com.typesafe.akka"             %% "akka-http-xml"                     % Versions.akkaHttp,
    "ch.megard"                     %% "akka-http-cors"                    % Versions.akkaHttpCors
  )

  private val akkaProjectionDeps = Seq(
    "com.lightbend.akka"            %% "akka-projection-core"              % Versions.akkaProjection,
    "com.lightbend.akka"            %% "akka-projection-eventsourced"      % Versions.akkaProjection,
    "com.lightbend.akka"            %% "akka-projection-jdbc"              % Versions.akkaProjection
  )

  private val akkaStream = Seq(
    "com.typesafe.akka"             %% "akka-stream-typed"                 % Versions.akka
  )

  private val loggingDeps = Seq(
    "ch.qos.logback"                 % "logback-classic"                   % Versions.logback,
    "net.logstash.logback"           % "logstash-logback-encoder"          % Versions.logstashLogbackEncoder,
    "org.codehaus.janino"            % "janino"                            % Versions.janino, // for conditional statements in logback.xml
    "org.slf4j"                      % "slf4j-api"                         % Versions.slf4jApi,
    // Let's capture the logs that libraries (like Resteasy) send to Apache commons-logging,
    // and redirect them to slf4j for the sake of consistency.
    "org.slf4j"                      % "jcl-over-slf4j"                    % Versions.slf4jApi
  )

  private val oddinSdkDeps = Seq(
    "com.oddin.oddsfeed"             % "odds-feed"                     % Versions.oddinSdk from s"https://github.com/oddin-gg/javasdk/releases/download/v${Versions.oddinSdk}/odds-feed-${Versions.oddinSdk}.jar",
    // TODO (PHXD-2575): Oddin SDK library (built under Java 8, see https://github.com/oddin-gg/javasdk)
    //   depends on `java.xml.bind` classes which are no longer included in JDK 11.
    //   We need to add JAXB libraries explicitly to avoid a possibility for NoClassDefFoundError in the runtime.
    //   See https://stackoverflow.com/questions/43574426/how-to-resolve-java-lang-noclassdeffounderror-javax-xml-bind-jaxbexception
    "jakarta.xml.bind"               % "jakarta.xml.bind-api"          % Versions.jaxb,
    "org.glassfish.jaxb"             % "jaxb-runtime"                  % Versions.jaxb,
    // Kotlin required by odds-feed > 0.0.27
    // "org.jetbrains.kotlin.jvm"       % "org.jetbrains.kotlin.jvm.gradle.plugin" % Versions.kotlin,
    "org.jetbrains.kotlin"           % "kotlin-stdlib-jdk8"            % Versions.kotlin,
    "io.github.microutils"           % "kotlin-logging"                % Versions.kotlinLoging,
    "io.github.microutils"           % "kotlin-logging-jvm"            % Versions.kotlinLoging,
    "com.google.inject"              % "guice"                         % Versions.guice,
    "com.rabbitmq"                   % "amqp-client"                   % Versions.amqp,
    "io.reactivex.rxjava2"           % "rxkotlin"                      % Versions.reactiveKotlin,
    "com.github.kittinunf.fuel"      % "fuel"                          % Versions.fuel,
    "com.github.kittinunf.fuel"      % "fuel-coroutines"               % Versions.fuel
  )

  private val akkaPersistenceDeps = Seq(
    "com.lightbend.akka"            %% "akka-persistence-jdbc"             % Versions.akkaPersistenceJdbc
  )

  private val circeDeps = Seq(
    "io.circe" %% "circe-core",
    "io.circe" %% "circe-generic",
    "io.circe" %% "circe-extras",
    "io.circe" %% "circe-parser"
  ).map(_ % Versions.circe)
  
  private val circeTestDeps = Seq(
    "io.circe"                      %% "circe-literal"                     % Versions.circe,
    "io.circe"                      %% "circe-golden"                      % Versions.circeGolden
  ).map(_ % Test)

  private val pureConfigDeps = Seq(
    "com.github.pureconfig"         %% "pureconfig"                        % Versions.pureConfig
  )

  private val akkaTestingDeps = Seq(
    "com.typesafe.akka"             %% "akka-actor-testkit-typed"          % Versions.akka,
    "com.typesafe.akka"             %% "akka-persistence-testkit"          % Versions.akka,
    "com.typesafe.akka"             %% "akka-stream-testkit"               % Versions.akka,
    "com.typesafe.akka"             %% "akka-http-testkit"                 % Versions.akkaHttp,
    "com.lightbend.akka"            %% "akka-projection-testkit"           % Versions.akkaProjection
  ).map(_ % Test)

  private val testingDeps = Seq(
    "org.scalatest"                 %% "scalatest"                         % Versions.scalaTest,
    "org.scalamock"                 %% "scalamock"                         % Versions.scalaMock,
    "com.github.javafaker"           % "javafaker"                         % Versions.faker,
    "org.reflections"                % "reflections"                       % Versions.reflections,
    "com.github.tomakehurst"         % "wiremock-jre8-standalone"          % Versions.wiremock,
    "org.scala-lang.modules"        %% "scala-xml"                         % Versions.scalaXml,
    "com.github.geirolz"            %% "advxml-core"                       % Versions.advxml,
    "org.typelevel"                 %% "kittens"                           % Versions.kittens,
    "com.github.alexarchambault"    %% "scalacheck-shapeless_1.15"         % Versions.scalacheckShapeless
  ).map(_ % Test)

  private val testContainersDeps = Seq(
    "com.github.dasniko"             % "testcontainers-keycloak"           % Versions.testContainersKeycloak,
    "org.testcontainers"             % "postgresql"                        % Versions.testContainers
  ).map(_ % Test)

  private val archUnitDeps = Seq(
    "com.tngtech.archunit"           % "archunit"                          % Versions.archUnit
  ).map(_ % Test)

  private val slickDeps = Seq(
    "com.typesafe.slick"            %% "slick-hikaricp"                    % Versions.slick,
    "com.github.tminglei"           %% "slick-pg"                          % Versions.slickPostgres,
    "com.github.tminglei"           %% "slick-pg_circe-json"               % Versions.slickPostgres
  )

  private val migrationDeps = Seq(
    "io.github.nafg.slick-migration-api" %% "slick-migration-api-flyway"   % Versions.slickMigrationApi,
    "org.flywaydb"                        %  "flyway-core"                 % Versions.flyway
  )

  private val validatorDeps = Seq(
    "commons-validator"              % "commons-validator"                  % Versions.apacheCommonsValidator,
    "org.passay"                     % "passay"                             % Versions.passay
  )

  private val apacheCommonsText = Seq(
    "org.apache.commons"             % "commons-text"                       % Versions.apacheCommonsText
  )

  private val keycloakDeps = Seq(
    "org.keycloak"                   % "keycloak-adapter-core"              % Versions.keycloak,
    "org.keycloak"                   % "keycloak-core"                      % Versions.keycloak,
    "org.keycloak"                   % "keycloak-admin-client"              % Versions.keycloak,
    "org.keycloak"                   % "keycloak-authz-client"              % Versions.keycloak
  )

  val gatlingDependencies: Seq[ModuleID] = Seq(
    "io.gatling.highcharts"          % "gatling-charts-highcharts"          % Versions.gatling,
    "io.gatling"                     % "gatling-test-framework"             % Versions.gatling
  ).map(_ % Test)

  val loadTestsDependencies: Seq[ModuleID] = gatlingDependencies ++ circeDeps

  private val catsDeps: Seq[ModuleID] = Seq(
    "org.typelevel"                 %% "cats-core"                          % Versions.cats
  )

  private val tapirDeps: Seq[ModuleID] = Seq(
    "com.softwaremill.sttp.tapir"   %% "tapir-core"                         % Versions.tapir,
    "com.softwaremill.sttp.tapir"   %% "tapir-json-circe"                   % Versions.tapir,
    "com.softwaremill.sttp.tapir"   %% "tapir-openapi-docs"                 % Versions.tapir,
    "com.softwaremill.sttp.tapir"   %% "tapir-openapi-circe-yaml"           % Versions.tapir,
    "com.softwaremill.sttp.tapir"   %% "tapir-akka-http-server"             % Versions.tapir,
    "com.softwaremill.sttp.tapir"   %% "tapir-enumeratum"                   % Versions.tapir,
    "org.webjars"                    % "swagger-ui"                         % Versions.swaggerUi
  )

  private val enumeratumDeps: Seq[ModuleID] = Seq(
    "com.beachape"                  %% "enumeratum"                         % Versions.enumeratum,
    "com.beachape"                  %% "enumeratum-slick"                   % Versions.enumeratum,
    "com.beachape"                  %% "enumeratum-circe"                   % Versions.enumeratum
  )

  private val chimneyDeps: Seq[ModuleID] = Seq(
    "io.scalaland"                  %% "chimney"                            % Versions.chimney
  )

  private val sendgridDeps: Seq[ModuleID] = Seq(
    "com.sendgrid"                   % "sendgrid-java"                      % Versions.sendgrid
  )

  private val templatingDeps: Seq[ModuleID] = Seq(
    "org.scalatra.scalate"          %% "scalate-core"                       % Versions.scalate
  )

  private val xmlDeps: Seq[ModuleID] = Seq(
    "com.github.andyglow"           %% "scala-xml-diff"                     % Versions.scalaXmlDiff
  ).map(_ % Test)

  private val kamonDependencies: Seq[ModuleID] =
    Seq(
      "io.kamon" %% "kamon-bundle"     % Versions.kamon,
      // kamon-bundle includes many things, but not kamon-prometheus.
      "io.kamon" %% "kamon-prometheus" % Versions.kamon
    )

  val contractTestsDependencies: Seq[ModuleID] =
    Seq(
      "org.scalatest"           %% "scalatest"              % Versions.scalaTest,
      "com.github.pureconfig"   %% "pureconfig"             % Versions.pureConfig,
      "com.typesafe.akka"       %% "akka-http"              % Versions.akkaHttp,
      "com.typesafe.akka"       %% "akka-http-spray-json"   % Versions.akkaHttp,
      "com.typesafe.akka"       %% "akka-http-xml"          % Versions.akkaHttp,
      "com.typesafe.akka"       %% "akka-stream"            % Versions.akka
    ).map(_ % ContractTest)

  private val reportsDependencies: Seq[ModuleID] =
    Seq(
      "com.norbitltd" %% "spoiwo" % Versions.spoiwo
    )

  private val monocleDependencies: Seq[ModuleID] =
    Seq(
      "dev.optics" %% "monocle-core"  % Versions.monocle,
      "dev.optics" %% "monocle-macro" % Versions.monocle
    ).map(_ % Test)
  
  // @formatter:on

  val phoenixBackendDependencies: Seq[ModuleID] = {
    akkaDeps ++
    akkaDiscoveryDeps ++
    akkaManagementDeps ++
    akkaStream ++
    akkaStreamKafkaDeps ++
    alpakkaCsvDeps ++
    alpakkaFtpDeps ++
    alpakkaXmlDeps ++
    akkaHttpDeps ++
    akkaProjectionDeps ++
    akkaPersistenceDeps ++
    loggingDeps ++
    testingDeps ++
    akkaTestingDeps ++
    xmlDeps ++
    catsDeps ++
    slickDeps ++
    tapirDeps ++
    enumeratumDeps ++
    chimneyDeps ++
    keycloakDeps ++
    sendgridDeps ++
    reportsDependencies ++
    templatingDeps ++
    validatorDeps ++
    apacheCommonsText ++
    monocleDependencies ++
    circeTestDeps
  }

  val coreDependencies: Seq[ModuleID] =
    kamonDependencies ++
    akkaDeps ++
    akkaHttpDeps ++
    catsDeps ++
    enumeratumDeps ++
    loggingDeps ++
    testingDeps ++
    pureConfigDeps ++
    keycloakDeps ++
    slickDeps ++
    migrationDeps ++
    testContainersDeps ++
    akkaTestingDeps ++
    chimneyDeps

  val betgeniusDependencies: Seq[ModuleID] =
    akkaDeps ++
    akkaHttpDeps ++
    akkaStreamKafkaDeps ++
    akkaDiscoveryDeps ++
    circeDeps ++
    kamonDependencies ++
    testingDeps ++
    akkaTestingDeps ++
    tapirDeps ++
    monocleDependencies

  // To explain why the override is needed, let's take cloudflow-akka-util v2.2.2 and Versions.akkaHttp = 10.2.7.
  //
  // Even without declaring akka-http-jackson explicitly anywhere,
  // it's still gonna be included as a transitive dependency of cloudflow-akka-util v2.2.2,
  // but in version 10.2.4 (and not Versions.akkaHttp).
  // This would NOT be acceptable due to Akka's checks (akka.util.ManifestInfo.checkSameVersion):
  // Akka checks internally whether all akka-* libraries are present in the same version, and fails to start an ActorSystem if not.
  // We need to have akka-http-jackson in 10.2.7, since akka-http in 10.2.7 will be present on phoenix-ingestion-* classpath.
  //
  // Now to ensure akka-http-jackson is in 10.2.7 version, we could just add it to phoenix-ingestion-*'s `libraryDependencies`.
  // This way, however, we'll effectively rely on sbt's eviction mechanism
  // that would just select the highest version of the given artifact present across direct & transitive deps...
  // but this is a bit brittle (what if a future version of cloudflow-akka-util depends on akka-http-jackson, say, 10.2.8?).
  //
  // Instead, the dependencyOverrides approach forces akka-http-jackson to be picked in 10.2.7
  // (i.e. it bypasses the eviction mechanism).
  // In practice, the difference b/w `libraryDependencies` and `dependencyOverrides` is that with the latter,
  // even if a future version of cloudflow-akka-util depends on higher version of akka-http-jackson (e.g. 10.2.8),
  // then 10.2.7 will NOT get evicted.
  // Hence, Akka's check will report that all akka-http-* dependencies are in the same 10.2.7 version, with NO 10.2.8 outlier.
  //
  // Also, note that Jackson is just used internally by Cloudflow.
  // We have full flexibility around how we parse entities in Cloudflow HTTP endpoints so we can use e.g. Circe or Spray.
  val cloudflowLibDependencyOverrides: Seq[ModuleID] = Seq(
    "com.typesafe.akka" %% "akka-http-spray-json" % Versions.akkaHttp)

  val cloudflowDependencyOverrides: Seq[ModuleID] = Seq(
      "com.typesafe.akka" %% "akka-http-jackson" % Versions.akkaHttp,
      "com.typesafe.akka" %% "akka-http2-support" % Versions.akkaHttp) ++ cloudflowLibDependencyOverrides

  val betgeniusIngestionDependencies: Seq[ModuleID] = akkaHttpDeps

  val oddinDependencies: Seq[ModuleID] =
    akkaDeps ++
    akkaStreamKafkaDeps ++
    akkaDiscoveryDeps ++
    oddinSdkDeps ++
    slickDeps ++
    akkaTestingDeps

  val oddinIngestionDependencies: Seq[ModuleID] = akkaHttpDeps

  val topLevelDependencies: Seq[ModuleID] =
    testingDeps ++
    archUnitDeps

  val scalafixRulesDependencies: Seq[ModuleID] = Seq(
    "com.beachape" %% "enumeratum" % Versions.enumeratum,
    "ch.epfl.scala" %% "scalafix-core" % _root_.scalafix.sbt.BuildInfo.scalafixVersion,
    "ch.epfl.scala" %% "scalafix-rules" % _root_.scalafix.sbt.BuildInfo.scalafixVersion,
    ("ch.epfl.scala" % "scalafix-testkit" % _root_.scalafix.sbt.BuildInfo.scalafixVersion % Test)
      .cross(CrossVersion.full))
}

object ScalafixDependencies {
  val organizeImports = "com.github.liancheng" %% "organize-imports" % Versions.scalafixOrganizeImports
}
