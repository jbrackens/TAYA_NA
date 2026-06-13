import sbt._

import scala.concurrent.duration.Duration

val settings = Seq(organization := "net.flipsports.gmx",
  scalaVersion := Versions.scalaVersion,
  classpathTypes += "maven-plugin",
  aggregate in update := false,
  resolvers ++= Seq(
    "Apache Development Snapshot Repository" at "https://repository.apache.org/content/repositories/snapshots/",
    "Artima Maven Repository" at "https://repo.artima.com/releases",
    "FS Maven Repository" at "https://indus-srv01.flipsports.net/repository/gmx-central/",
      Resolver.mavenLocal
  ),
  scalacOptions := Seq("-feature", "-unchecked", "-deprecation", "-encoding", "utf8", "-language:experimental.macros", "-Xlint", "-Xmacro-settings:materialize-derivations"),
  publishTo := (isSnapshot.value match {
    case true => Some("snapshots" at "https://indus-srv01.flipsports.net/repository/maven-snapshots")
    case false => Some("releases" at "https://indus-srv01.flipsports.net/repository/maven-releases")
  })
)

lazy val `streaming-data-engine` = (project in file("."))
  .aggregate(`common-streaming-engine`, `sbt-streaming-engine-jobs`)
  .enablePlugins(SemVerPlugin)
  .settings(settings)

lazy val `common-streaming-engine` = project
  .settings(settings)
  .settings(libraryDependencies ++= Deps.commonStreamingEnging)


lazy val `sbt-streaming-engine-jobs` = project
  .settings(settings)
  .settings(libraryDependencies ++= Deps.streamingEngingDependencies)
  .settings(Compile / run / fork := true)
  .settings(Global / cancelable := true)
  .settings(Compile / run := Defaults.runTask(Compile / fullClasspath, Compile / run / mainClass, Compile / run / runner).evaluated)
  .settings(parallelExecution := false)
  .settings(test in assembly := {})
  .dependsOn(`common-streaming-engine`)
  .settings(assemblyMergeStrategy in assembly := {
    case PathList("META-INF", xs@_*) => MergeStrategy.discard
    case x => MergeStrategy.first
  })
  .settings(artifact in (Compile, assembly) := {
    val art = (artifact in (Compile, assembly)).value
    art.withClassifier(Some("assembly"))
  })
  .settings(addArtifact(artifact in (Compile, assembly), assembly))
