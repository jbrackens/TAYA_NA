import Build._
import Dependencies._

ThisBuild / organization := "stella"
name := "stella-leaderboard"
ThisBuild / scalaVersion := Versions.scala

Global / onChangedBuildSource := ReloadOnSourceChanges

ThisBuild / semanticdbEnabled := true
ThisBuild / semanticdbVersion := scalafixSemanticdb.revision
ThisBuild / scalafixDependencies += ScalafixDependencies.organizeImports

ThisBuild / libraryDependencySchemes += "org.scala-lang.modules" %% "scala-java8-compat" % "always"

lazy val root = project
  .in(file("."))
  .settings(name := "stella-leaderboard")
  .settings(Docker / aggregate := false)
  .aggregate(`integration-test-common`, `common`, `server`, `aggregation-result-ingestor`)

lazy val `server` = project
  .in(file("server"))
  .settings(name := "server")
  .settings(serverSettings)
  .enablePlugins(JavaAppPackaging)
  .enablePlugins(PlayScala)
  .configs(IntegrationTest.extend(Test))
  .libraries(serverDeps)
  .dependsOn(`common`)
  .dependsOn(`integration-test-common` % Test)

lazy val `aggregation-result-ingestor` = project
  .in(file("aggregation-result-ingestor"))
  .settings(name := "aggregation-result-ingestor")
  .settings(ingestorSettings)
  .enablePlugins(JavaAppPackaging)
  .configs(IntegrationTest.extend(Test))
  .libraries(ingestorDeps)
  .dependsOn(`common`)
  .dependsOn(`integration-test-common` % Test)

lazy val `common` =
  project.in(file("common")).settings(name := "common").settings(commonModuleSettings).libraries(commonModuleDeps)

lazy val `integration-test-common` = project
  .in(file("integration-test-common"))
  .settings(name := "integration-test-common")
  .settings(commonModuleSettings)
  .libraries(integrationTestCommonModuleDeps)
  .dependsOn(`common`)
