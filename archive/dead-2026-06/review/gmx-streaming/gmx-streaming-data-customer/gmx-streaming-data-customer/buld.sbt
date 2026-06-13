import sbt._

import scala.concurrent.duration.Duration

val settings = Seq(organization := "net.flipsports.gmx.streaming.internal.customers",
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

lazy val `gmx-streaming-data-customers` = (project in file("."))
  .aggregate(`customer-operations-jobs`)
  .settings(settings)

lazy val `customer-operations-jobs` = project
  .settings(settings)
  .settings(libraryDependencies ++= Deps.mainJob)
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
  .settings(addArtifact(artifact in (Compile, assembly), assembly))
  .settings(parallelExecution in Test := false)
