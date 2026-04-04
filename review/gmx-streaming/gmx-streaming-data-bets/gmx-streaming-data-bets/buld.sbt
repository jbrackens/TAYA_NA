import sbt._

import scala.concurrent.duration.Duration

lazy val settings = Seq(organization := "net.flipsports.gmx.streaming.sbtech.bet",
  scalaVersion := Versions.scalaVersion,
  classpathTypes += "maven-plugin",
  aggregate in update := false,
  resolvers ++= Seq(
    "Apache Development Snapshot Repository" at "https://repository.apache.org/content/repositories/snapshots/",
    "Artima Maven Repository" at "https://repo.artima.com/releases",
    "FS Maven Repository" at "https://lena-srv01.flipsports.net:4566/repository/maven-group/",
    "Confluent" at "https://packages.confluent.io/maven/",
    Resolver.mavenLocal
  ),
  scalacOptions := Seq("-feature", "-unchecked", "-deprecation", "-encoding", "utf8", "-language:experimental.macros", "-Xlint", "-Xmacro-settings:materialize-derivations"),
  publishTo := (isSnapshot.value match {
    case true => Some("snapshots" at "https://lena-srv01.flipsports.net:4566/repository/maven-snapshots/")
    case false => Some("releases" at "https://lena-srv01.flipsports.net:4566/repository/maven-releases/")
  })

)

lazy val `gmx-streaming-data-bets` = (project in file("."))
  .aggregate(`customer-bets-jobs`)
  .settings(settings)

lazy val `customer-bets-jobs` = project
  .settings(settings)
  .settings(libraryDependencies ++= Deps.streamingEngingDependencies)
  .settings(Compile / run / fork := true)
  .settings(Global / cancelable := true)
  .settings(Compile / run := Defaults.runTask(Compile / fullClasspath, Compile / run / mainClass, Compile / run / runner).evaluated)
  .settings(test in assembly := {})
  .settings(assemblyMergeStrategy in assembly := {
    case PathList("META-INF", xs@_*) => MergeStrategy.discard
    case x => MergeStrategy.first
  })
  .settings(artifact in (Compile, assembly) := {
    val art = (artifact in (Compile, assembly)).value
    art.withClassifier(Some("assembly"))
  })
  .settings(parallelExecution in ThisBuild := false)
  .settings(addArtifact(artifact in (Compile, assembly), assembly))