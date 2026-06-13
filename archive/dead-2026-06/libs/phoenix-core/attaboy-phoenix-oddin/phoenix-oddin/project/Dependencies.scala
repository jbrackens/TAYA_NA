import sbt._

// @formatter:off
object Dependencies {
  object Versions {

    val scala                   = "2.12.12"

    // Internal dependencies
    val phoenixDataModels       = "0.0.4"

    val logback                 = "1.2.3"

    val akka                    = "2.6.10"
    val akkaHttp                = "10.2.0"
    val akkaProjection          = "1.0.0"
    val alpakkaKafka            = "2.0.5"
    val alpakkaSlick            = "2.0.2"
    val akkaManagement          = "1.0.9"
    val akkaDiscovery           = "2.6.8"
    val akkaDiscoveryKubernetes = "1.0.9"
    val akkaPersistenceJdbc     = "4.0.0"
    val akkaStream              = "2.5.31"
    val gatling                 = "3.3.1"
    val glassfishJaxb           = "2.3.3"
    val h2Driver                = "1.4.200"
    val jaxb                    = "2.3.3"
    val jaxbApi                 = "2.3.0"
    val jakartaActivation       = "1.2.2"
    val jakartaXmlBind          = "2.3.3"
    
    val logstashLogbackEncoder  = "6.3" // 6.4 depends on com.fasterxml.jackson.core:jackson-databind:2.11.x, which is incompatible with 2.10.x pulled in by akka-serialization 2.6.9
    val janino                  = "3.0.6"
    val oddinSdk                = "1.0.15.internal"
    val postgresDriver          = "42.1.4"
    val pureConfig              = "0.13.0"
    val scalaMock               = "4.4.0"
    val scalaTest               = "3.1.1"
    val scalaXml                = "1.2.0"
    val cats                    = "2.2.0"
    val jose4j                  = "0.7.2"
    val slf4jApi                = "1.7.30"
    val faker                   = "1.0.2"
    val slick                   = "3.3.3"
    val slickPg                 = "0.19.3"
    val slickMigrationApi       = "0.7.0"
    val testContainers          = "1.15.0-rc2" // RC release fixes issue running on Macs (cf. https://github.com/testcontainers/testcontainers-java/pull/3159)
    val silhouette              = "6.1.1"
    val scalaGuice              = "4.2.6"
    val ficus                   = "1.4.7"
    val akkaQuartzScheduler     = "1.8.2-akka-2.6.x"
    val playMailer              = "6.0.1"
    val playSlick               = "4.0.2"
    val sendgrid                = "4.4.1"
    val keycloak                = "11.0.2"
    val akkaHttpCors            = "1.0.0"  // version supporting akka http 10.1.12
  }

  private val dataModelDeps = Seq(
    "phoenix" %% "phoenix-models-oddin" % Versions.phoenixDataModels
  )

  private val akkaDeps = Seq(
    "com.typesafe.akka"             %% "akka-actor-typed"                  % Versions.akka,
    "com.typesafe.akka"             %% "akka-slf4j"                        % Versions.akka,
    "com.typesafe.akka"             %% "akka-cluster-typed"                % Versions.akka,
    "com.typesafe.akka"             %% "akka-cluster-sharding-typed"       % Versions.akka,
    "com.typesafe.akka"             %% "akka-persistence-typed"            % Versions.akka,
    "com.typesafe.akka"             %% "akka-persistence-query"            % Versions.akka,
    "com.typesafe.akka"             %% "akka-serialization-jackson"        % Versions.akka
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

  private val alpakkaKafkaDeps = Seq(
    "com.typesafe.akka"             %% "akka-stream-kafka"                 % Versions.alpakkaKafka
  )

  private val alpakkaSlickDeps = Seq(
    "com.lightbend.akka"            %% "akka-stream-alpakka-slick"         % Versions.alpakkaSlick
  )

  private val akkaHttpDeps = Seq(
    "com.typesafe.akka"             %% "akka-http"                         % Versions.akkaHttp,
    "com.typesafe.akka"             %% "akka-http-caching"                 % Versions.akkaHttp,
    "com.typesafe.akka"             %% "akka-http-xml"                     % Versions.akkaHttp,
    "com.typesafe.akka"             %% "akka-http-spray-json"              % Versions.akkaHttp,
    "ch.megard"                     %% "akka-http-cors"                    % Versions.akkaHttpCors
  )

  private val akkaProjectionDeps = Seq(
    "com.lightbend.akka"            %% "akka-projection-core"              % Versions.akkaProjection,
    "com.lightbend.akka"            %% "akka-projection-eventsourced"      % Versions.akkaProjection,
    "com.lightbend.akka"            %% "akka-projection-jdbc"              % Versions.akkaProjection
  )

  private val akkaStream = Seq(
    "com.typesafe.akka"             %% "akka-stream-typed"                 % Versions.akkaStream
  )

  private val jaxbDeps = Seq(
    "javax.xml.bind"                 % "jaxb-api"                          % Versions.jaxbApi,
    "com.sun.xml.bind"               % "jaxb-core"                         % Versions.jaxbApi,
    "com.sun.xml.bind"               % "jaxb-impl"                         % Versions.jaxb,
    "com.sun.activation"             % "jakarta.activation"                % Versions.jakartaActivation,
    "jakarta.xml.bind"               % "jakarta.xml.bind-api"              % Versions.jakartaXmlBind,
    "org.glassfish.jaxb"             % "jaxb-runtime"                      % Versions.glassfishJaxb
  )

  private val loggingDeps = Seq(
    "ch.qos.logback"                 % "logback-classic"                   % Versions.logback,
    "net.logstash.logback"           % "logstash-logback-encoder"          % Versions.logstashLogbackEncoder,
    "org.codehaus.janino"            % "janino"                            % Versions.janino, // for conditional statements in logback.xml
    "org.slf4j"                      % "slf4j-api"                         % Versions.slf4jApi
  )

  private val oddinSDKDeps = Seq(
    "com.oddin"                      % "oddsfeedsdk"                       % Versions.oddinSdk
  )

  private val akkaPersistenceDeps = Seq(
    "com.lightbend.akka"            %% "akka-persistence-jdbc"             % Versions.akkaPersistenceJdbc
  )

  private val postgresDeps = Seq(
    "org.postgresql"                 % "postgresql"                        % Versions.postgresDriver
  )

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
    "com.h2database"                 % "h2"                                % Versions.h2Driver,
    "org.scalatest"                 %% "scalatest"                         % Versions.scalaTest,
    "org.scalamock"                 %% "scalamock"                         % Versions.scalaMock,
    "com.github.javafaker"           % "javafaker"                         % Versions.faker,
    "org.testcontainers"             % "kafka"                             % Versions.testContainers,
    "org.testcontainers"             % "postgresql"                        % Versions.testContainers
  ).map(_ % Test)

  private val playTestingDeps = Seq(
    "org.scalatestplus.play" %% "scalatestplus-play" % "5.0.0"
  ).map(_ % Test)

  private val xmlDeps = Seq(
    "org.scala-lang.modules"        %% "scala-xml"                         % Versions.scalaXml
  )

  private val slickDeps = Seq(
    "com.typesafe.slick"            %% "slick-hikaricp"                    % Versions.slick,
    "com.github.tminglei"           %% "slick-pg"                          % Versions.slickPg,
    "com.github.tminglei"           %% "slick-pg_spray-json"               % Versions.slickPg
  )

  private val webGatewayDeps = Seq(
    "net.codingwell"                %% "scala-guice"                        % Versions.scalaGuice,
    "com.github.tminglei"           %% "slick-pg"                           % Versions.slickPg,
    "com.github.tminglei"           %% "slick-pg_play-json"                 % Versions.slickPg,
    "com.typesafe.play"             %% "play-slick"                         % Versions.playSlick,
    "com.typesafe.play"             %% "play-slick-evolutions"              % Versions.playSlick,
    "com.sendgrid"                   % "sendgrid-java"                      % Versions.sendgrid
  )

  private val keycloakDeps = Seq(
    "org.keycloak"                   % "keycloak-adapter-core"              % Versions.keycloak,
    "org.keycloak"                   % "keycloak-core"                      % Versions.keycloak,
    "org.keycloak"                   % "keycloak-admin-client"              % Versions.keycloak,
    "org.keycloak"                   % "keycloak-authz-client"              % Versions.keycloak
  )

  private val silhouetteDeps = Seq(
    "com.mohiva"                    %% "play-silhouette"                    % Versions.silhouette,
    "com.mohiva"                    %% "play-silhouette-password-bcrypt"    % Versions.silhouette,
    "com.mohiva"                    %% "play-silhouette-persistence"        % Versions.silhouette,
    "com.mohiva"                    %% "play-silhouette-crypto-jca"         % Versions.silhouette,
    "com.mohiva"                    %% "play-silhouette-testkit"            % Versions.silhouette,
  )

  val gatlingDependencies: Seq[ModuleID] = Seq(
    "io.gatling.highcharts"          % "gatling-charts-highcharts"         % Versions.gatling,
    "io.gatling"                     % "gatling-test-framework"            % Versions.gatling
  ).map(_ % Test)

  private val catsDependencies: Seq[ModuleID] = Seq(
    "org.typelevel"                 %% "cats-core"                          % Versions.cats
  )

  private val jwtDependencies: Seq[ModuleID] = Seq(
    "org.bitbucket.b_c"              % "jose4j"                             % Versions.jose4j
  )
  
  val phoenixTestUtilsDependencies: Seq[ModuleID] =
    xmlDeps
  
  val oddinLibDependencies: Seq[ModuleID] =
    loggingDeps ++
    pureConfigDeps ++
    slickDeps ++  
    akkaDeps ++
    akkaHttpDeps ++
    testingDeps ++
    akkaTestingDeps ++
    akkaDiscoveryDeps ++
    oddinSDKDeps ++
    dataModelDeps

  val oddinIngestionLibDependencies: Seq[ModuleID] =
    loggingDeps ++
    akkaDeps ++
    akkaHttpDeps ++
    oddinSDKDeps ++
    pureConfigDeps ++
    postgresDeps ++
    slickDeps ++
    testingDeps ++
    akkaTestingDeps ++
    akkaDiscoveryDeps ++
    dataModelDeps
    
  val oddinIngestionPipelineDependencies: Seq[ModuleID] =
    loggingDeps ++
    akkaDeps ++
    akkaHttpDeps ++
    oddinSDKDeps ++
    pureConfigDeps ++
    postgresDeps ++
    slickDeps ++ 
    testingDeps ++
    akkaTestingDeps ++
    akkaDiscoveryDeps ++
    dataModelDeps
    
}

