import Build._
import Dependencies._

ThisBuild / organization := "stella"
name := "stella-common"
lazy val supportedScalaVersions = List(Versions.scala212, Versions.scala213)
ThisBuild / crossScalaVersions := supportedScalaVersions
ThisBuild / scalaVersion := Versions.scala213

Global / onChangedBuildSource := ReloadOnSourceChanges

ThisBuild / semanticdbEnabled := true
ThisBuild / semanticdbVersion := scalafixSemanticdb.revision
ThisBuild / scalafixDependencies += ScalafixDependencies.organizeImports

ThisBuild / libraryDependencySchemes += "org.scala-lang.modules" %% "scala-java8-compat" % "always"

lazy val root = project
  .in(file("."))
  .settings(name := "stella-common")
  .settings(publish / skip := true)
  .aggregate(`common-core`, `common-http`, `common-kafka`, `common-play-test-utils`, `common-models`, `common-test`)

lazy val `common-core` =
  project.in(file("common-core")).settings(commonSettings).libraries(commonCoreDeps)

lazy val `common-http` =
  project
    .in(file("common-http"))
    .settings(commonSettings)
    .libraries(commonHttpDeps)
    .dependsOn(`common-models`)
    .dependsOn(`common-test` % "test")

lazy val `common-kafka` =
  project.in(file("common-kafka")).settings(commonSettings).libraries(commonKafkaDeps)

lazy val `common-play-test-utils` =
  project
    .in(file("common-play-test-utils"))
    .settings(commonSettings)
    .libraries(commonPlayTestUtilsDeps)
    .dependsOn(`common-core`)

lazy val `common-models` =
  project.in(file("common-models")).settings(commonSettings).libraries(commonModelsDeps)

lazy val `common-test` =
  project.in(file("common-test")).settings(commonSettings).libraries(commonTestDeps)
