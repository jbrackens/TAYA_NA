import Build._
import Dependencies._

ThisBuild / organization := "stella"
name := "stella-achievement"
ThisBuild / scalaVersion := Versions.scala

Global / onChangedBuildSource := ReloadOnSourceChanges

ThisBuild / semanticdbEnabled := true
ThisBuild / semanticdbVersion := scalafixSemanticdb.revision
ThisBuild / scalafixDependencies += ScalafixDependencies.organizeImports

ThisBuild / libraryDependencySchemes += "org.scala-lang.modules" %% "scala-java8-compat" % "always"

lazy val root = project
  .in(file("."))
  .settings(name := "stella-achievement")
  .settings(Docker / aggregate := false)
  .aggregate(`achievement`, `tools`)

lazy val `achievement` = project
  .in(file("achievement"))
  .settings(name := "achievement")
  .settings(achievementSettings)
  .enablePlugins(JavaAppPackaging)
  .enablePlugins(PlayScala)
  .configs(IntegrationTest.extend(Test))
  .libraries(achievementDeps)

lazy val `tools` = project.in(file("tools")).settings(name := "tools").settings(commonSettings).libraries(toolsDeps)
