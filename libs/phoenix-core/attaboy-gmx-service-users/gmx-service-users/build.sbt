import sbt._
import Dependencies._
import flip.VersionGenerator

organization in ThisBuild := "gmx"
version in ThisBuild ~= (_.replace('+', '-'))

// the Scala version that will be used for cross-compiled libraries
scalaVersion in ThisBuild := "2.13.3"

lazy val `gmx-users` = (project in file("."))
  .aggregate(`commons`, `users-api`, `users-impl`, `tools`)
  .settings(
    publish in Docker := {},
    publishArtifact := false
  )

lazy val `commons` = (project in file("commons"))
  .settings(commonSettings)
  .settings(VersionGenerator.settings)
  .settings(
    libraryDependencies ++= Seq(
      lagomScaladslApi,
      kafkaAvroSerialiser,
      playJson,
      icu4j,
      scalaTest
    )
  )

lazy val `users-api` = (project in file("users-api"))
  .settings(commonSettings)
  .settings(VersionGenerator.settings)
  .settings(
    name := "gmx-api-users",
    sourceGenerators in Compile += (avroScalaGenerateSpecific in Compile).taskValue,
    libraryDependencies ++= Seq(
      lagomScaladslApi,
      kafkaAvroSerialiser,
      internalCustomer,
      jodaTime
    ),
    publish in Docker := {}
  )
  .dependsOn(`commons`)

lazy val `users-impl` = (project in file("users-impl"))
  .enablePlugins(LagomScala, JavaAgent)
  .settings(commonSettings)
  .settings(lagomForkedTestSettings)
  .settings(dockerSettings)
  .settings(VersionGenerator.settings)
  .settings(
    name := "gmx-service-users",
    sourceGenerators in Compile += (avroScalaGenerateSpecific in Compile).taskValue,
    libraryDependencies ++= Seq(
      akkaClusterBootstrap,
      akkaDiscovery,
      akkaDiscoveryKubernetes,
      lagomScaladslAkkaDiscovery,
      lagomScaladslPersistenceJdbc,
      postgresDriver,
      lagomScaladslKafkaBroker,
      kafkaAvroSerialiser,
      kamonBundle,
      lagomScaladslTestKit,
      macwire,
      h2Driver,
      scalaTest,
      mockito,
      mockitoScala,
      sbtechLogin,
      sbtechCustomer,
      sbtechWalletTransaction,
      sbtechCasinoBet
    ) ++ logging,
    lagomServiceHttpPort := 11000
  )
  .dependsOn(`users-api`, `commons`)

lazy val `tools` = (project in file("tools"))
  .settings(commonSettings)
  .settings(VersionGenerator.settings)
  .settings(
    libraryDependencies ++= Seq(
      silencio,
      faker,
      sbtechLogin,
      sbtechCustomer,
      sbtechWalletTransaction,
      sbtechCasinoBet
    )
  )

lazy val `load-tests` = (project in file("load-tests"))
  .settings(commonSettings)
  .enablePlugins(GatlingPlugin)
  .settings(
    libraryDependencies ++= Seq(
      gatling,
      gatlingCharts
    )
  )

lazy val `integration-tests` = (project in file("integration-tests"))
  .settings(commonSettings)
  .enablePlugins(GatlingPlugin)
  .settings(
    libraryDependencies ++= Seq(
      gatling,
      gatlingCharts
    )
  )

// Documentation for this project:
//    sbt "project docs" "~ paradox"
//    open docs/target/paradox/site/main/index.html
lazy val docs = (project in file("docs"))
  .enablePlugins(ParadoxPlugin)

def dockerSettings = Seq(
  dockerUpdateLatest := true,
  dockerBaseImage := getDockerBaseImage(),
  dockerUsername := sys.props.get("docker.username"),
  dockerRepository := sys.props.get("docker.repository"),
  dockerExposedPorts := Seq(8558, 2550, 9000)
)

def getDockerBaseImage(): String = sys.props.get("java.version") match {
  case Some(v) if v.startsWith("11") => "adoptopenjdk/openjdk11"
  case _ => "adoptopenjdk/openjdk8"
}

lazy val commonSettings = Seq(
  scalacOptions ++= Seq(
    "-encoding", "UTF-8",
    "-target:jvm-1.8",
    "-Xlog-reflective-calls",
    "-Xlint",
    "-Ywarn-unused",
    "-deprecation",
    "-feature",
    "-language:_",
    "-unchecked"
  ),

  scalacOptions in (Compile, console) --= Seq("-Ywarn-unused"),
  scalacOptions in (Test, console) := (scalacOptions in (Compile, console)).value,

  resolvers ++= Seq(
    "FS Maven Repository" at "https://lena-srv01.flipsports.net:4566/repository/maven-group/",
    ("Confluent" at "https://packages.confluent.io/maven/").withAllowInsecureProtocol(true),
    Resolver.mavenLocal
  ),

  publishTo := (if (version.value.count(_ == '-') > 1) {
    Some("snapshots".at("https://lena-srv01.flipsports.net:4566/repository/maven-snapshots/"))
  } else {
    Some("releases".at("https://lena-srv01.flipsports.net:4566/repository/maven-releases/"))
  })
)

// We're using Docker Compose to manage:
//  * Persistence (PostgreSQL)
// So we don't need Lagom's dev env to manage Cassandra for us
lagomCassandraEnabled in ThisBuild := false
lagomKafkaEnabled in ThisBuild := false

// We're also setting specific ports for each service in local development
// So we don't need Lagom's dev env to give us a Service Locator, either.
lagomServiceLocatorEnabled in ThisBuild := false
