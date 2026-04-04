import Build._
import Dependencies._

ThisBuild / organization := "stella"
name := "stella-wallet"
ThisBuild / scalaVersion := Versions.scala

Global / onChangedBuildSource := ReloadOnSourceChanges

ThisBuild / semanticdbEnabled := true
ThisBuild / semanticdbVersion := scalafixSemanticdb.revision
ThisBuild / scalafixDependencies += ScalafixDependencies.organizeImports

ThisBuild / libraryDependencySchemes += "org.scala-lang.modules" %% "scala-java8-compat" % "always"

lazy val root = project.in(file(".")).settings(name := "stella-wallet").aggregate(`wallet`)

lazy val `wallet` = project
  .in(file("wallet"))
  .settings(name := "wallet")
  .settings(walletSettings)
  .enablePlugins(AkkaSerializationHelperPlugin)
  .enablePlugins(JavaAppPackaging)
  .enablePlugins(PlayScala)
  .configs(IntegrationTest.extend(Test))
  .libraries(walletDeps)
