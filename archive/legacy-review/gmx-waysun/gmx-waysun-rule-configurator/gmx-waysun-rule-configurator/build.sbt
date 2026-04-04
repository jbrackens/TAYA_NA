import Build._
import Dependencies._

ThisBuild / organization := "stella"
name := "stella-rule-configurator"
ThisBuild / scalaVersion := Versions.scala

Global / onChangedBuildSource := ReloadOnSourceChanges

ThisBuild / semanticdbEnabled := true
ThisBuild / semanticdbVersion := scalafixSemanticdb.revision
ThisBuild / scalafixDependencies += ScalafixDependencies.organizeImports

ThisBuild / libraryDependencySchemes += "org.scala-lang.modules" %% "scala-java8-compat" % "always"

lazy val root = project.in(file(".")).settings(name := "stella-rule-configurator").aggregate(`rule-configurator`)

lazy val `rule-configurator` = project
  .in(file("rule-configurator"))
  .settings(name := "rule-configurator")
  .settings(ruleConfiguratorSettings)
  .enablePlugins(JavaAppPackaging)
  .enablePlugins(PlayScala)
  .configs(IntegrationTest.extend(Test))
  .libraries(ruleConfiguratorDeps)
