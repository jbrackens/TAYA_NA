import Build._
import Dependencies._

ThisBuild / organization := "stella"
name := "stella-user-context"
ThisBuild / scalaVersion := Versions.scala

Global / onChangedBuildSource := ReloadOnSourceChanges

ThisBuild / semanticdbEnabled := true
ThisBuild / semanticdbVersion := scalafixSemanticdb.revision
ThisBuild / scalafixDependencies += ScalafixDependencies.organizeImports

ThisBuild / libraryDependencySchemes += "org.scala-lang.modules" %% "scala-java8-compat" % "always"

lazy val root = project.in(file(".")).settings(name := "stella-user-context").aggregate(`user-context`)

lazy val `user-context` = project
  .in(file("user-context"))
  .settings(name := "user-context")
  .settings(userContextSettings)
  .enablePlugins(AkkaSerializationHelperPlugin)
  .enablePlugins(JavaAppPackaging)
  .enablePlugins(PlayScala)
  .configs(IntegrationTest.extend(Test))
  .libraries(userContextDeps)
