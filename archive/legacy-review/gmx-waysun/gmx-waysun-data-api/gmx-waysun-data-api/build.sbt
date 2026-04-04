import Build._
import Dependencies._

ThisBuild / organization := "stella"
lazy val supportedScalaVersions = List(Versions.scala212, Versions.scala213)
ThisBuild / crossScalaVersions := supportedScalaVersions

Global / onChangedBuildSource := ReloadOnSourceChanges

ThisBuild / semanticdbEnabled := true
ThisBuild / semanticdbVersion := scalafixSemanticdb.revision
ThisBuild / scalafixDependencies += ScalafixDependencies.organizeImports

lazy val `stella-data-api` =
  project
    .in(file("."))
    .enablePlugins(SemVerPlugin)
    .settings(publish / skip := true)
    .aggregate(
      `validators`,
      `platform-events`,
      `event-configurations`,
      `aggregation-rule-configurations`,
      `aggregation-results`,
      `achievement-rule-configurations`,
      `achievement-events`)

lazy val `validators` =
  project.in(file("validators")).libraries(validatorsDeps).settings(validatorsSettings)

lazy val `platform-events` =
  project.in(file("platform-events")).libraries(avroModuleDeps).settings(avroModuleSettings)

lazy val `event-configurations` =
  project.in(file("event-configurations")).libraries(avroModuleDeps).settings(avroModuleSettings)

lazy val `aggregation-rule-configurations` =
  project.in(file("aggregation-rule-configurations")).libraries(avroModuleDeps).settings(avroModuleSettings)

lazy val `aggregation-results` =
  project.in(file("aggregation-results")).libraries(avroModuleDeps).settings(avroModuleSettings)

lazy val `achievement-rule-configurations` =
  project.in(file("achievement-rule-configurations")).libraries(avroModuleDeps).settings(avroModuleSettings)

lazy val `achievement-events` =
  project.in(file("achievement-events")).libraries(avroModuleDeps).settings(avroModuleSettings)
