import Build._
import Dependencies._

ThisBuild / organization := "stella"
name := "stella-event-ingestor"
ThisBuild / scalaVersion := Versions.scala

Global / onChangedBuildSource := ReloadOnSourceChanges

ThisBuild / semanticdbEnabled := true
ThisBuild / semanticdbVersion := scalafixSemanticdb.revision
ThisBuild / scalafixDependencies += ScalafixDependencies.organizeImports

lazy val root =
  project
    .in(file("."))
    .settings(name := "stella-event-ingestor")
    .settings(Docker / aggregate := false)
    .aggregate(`event-ingestor`, `load-tests`)

lazy val `event-ingestor` = project
  .in(file("event-ingestor"))
  .settings(name := "event-ingestor")
  .settings(eventIngestorSettings)
  .enablePlugins(JavaAppPackaging)
  .configs(IntegrationTest.extend(Test))
  .libraries(eventIngestorDeps)

lazy val `load-tests` = project
  .in(file("load-tests"))
  .settings(name := "load-tests")
  .settings(commonSettings)
  .enablePlugins(GatlingPlugin)
  .libraries(loadTestsDeps)
