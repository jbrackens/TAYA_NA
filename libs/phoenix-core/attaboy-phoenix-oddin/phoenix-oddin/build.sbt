import sbt._
import sbt.Keys._
import Dependencies._
import ReleaseTransformations._
import ReleasePlugin.autoImport._
import sbtrelease.{ Git, Utilities }
import Utilities._

lazy val scala212 = "2.12.12"
lazy val scala213 = "2.13.3"
lazy val libScalaVersions = List(scala212, scala213)
lazy val pipelineScalaVersions = List(scala212)
lazy val deployBranch = "master"

ThisBuild / organization := "phoenix"
ThisBuild / cloudflowDockerRegistry := Some("461765575148.dkr.ecr.eu-central-1.amazonaws.com")
ThisBuild / cloudflowDockerRepository := None

lazy val `phoenix-oddin` =
  (project in file("."))
    .settings(skip in publish := true, crossScalaVersions := Nil)
    .aggregate(
      `phoenix-test-utils`,
      `phoenix-oddin-lib`,
      `phoenix-oddin-ingestion-lib`,
      `phoenix-oddin-ingestion-pipeline`)

lazy val `phoenix-test-utils` = (project in file("test-utils"))
  .enablePlugins(ScalafmtPlugin)
  .settings(
    scalafmtOnCompile := true,
    crossScalaVersions := libScalaVersions,
    libraryDependencies ++= phoenixTestUtilsDependencies,
    commonSettings)

lazy val `phoenix-oddin-lib` = (project in file("oddin-lib"))
  .enablePlugins(ScalafmtPlugin)
  .settings(
    scalafmtOnCompile := true,
    crossScalaVersions := libScalaVersions,
    libraryDependencies ++= oddinLibDependencies,
    commonSettings)
  .dependsOn(`phoenix-test-utils`)

lazy val `phoenix-oddin-ingestion-lib` = (project in file("ingestion-lib"))
  .enablePlugins(CloudflowAkkaPlugin, ScalafmtPlugin)
  .settings(
    scalafmtOnCompile := true,
    crossScalaVersions := pipelineScalaVersions,
    libraryDependencies ++= oddinIngestionLibDependencies,
    commonSettings)
  .dependsOn(`phoenix-oddin-lib`)

lazy val `phoenix-oddin-ingestion-pipeline` = (project in file("ingestion-pipeline"))
  .enablePlugins(CloudflowApplicationPlugin, ScalafmtPlugin)
  .settings(
    scalafmtOnCompile := true,
    crossScalaVersions := pipelineScalaVersions,
    runLocalConfigFile := Some("ingestion-pipeline/src/main/resources/local.conf"),
    libraryDependencies ++= oddinIngestionPipelineDependencies,
    commonSettings)
  .dependsOn(`phoenix-oddin-ingestion-lib`, `phoenix-oddin-lib`)

lazy val commonSettings = Seq(
  scalaVersion := Versions.scala,
  scalacOptions ++= Seq(
      "-encoding",
      "UTF-8",
      "-Xlog-reflective-calls",
      "-Ywarn-unused",
      "-deprecation",
      "-feature",
      "-language:_",
      "-unchecked"),
  scalafmtOnCompile := true,
  scalacOptions in (Compile, console) --= Seq("-Ywarn-unused"),
  scalacOptions in (Test, console) := (scalacOptions in (Compile, console)).value,
  // Forking in tests serves as a workaround for https://github.com/testcontainers/testcontainers-java/issues/584:
  // without that, each test container (and its associated `ryuk` container) lives as long as the JVM that spawned them.
  // In case of long-running interactive sbt sessions, the local machine would accumulate a lot of running Docker containers.
  // Forking a separate sbt process for the tests causes the containers to terminate right after the tests are complete.
  fork in Test := false,
  testOptions in Test += Tests.Argument("-oDIF"),
  parallelExecution in Test := true,
  logBuffered in Test := false,
  concurrentRestrictions := Seq(Tags.limit(Tags.ForkedTestGroup, 4)),
  resolvers ++= Seq(
      Resolver.mavenCentral,
      Resolver.mavenLocal),
  // By default, disable remote publishing in local/offline environments.
  // Set PHOENIX_ODDIN_PUBLISH_TO to override, e.g. file:///... or https://...
  publishTo := sys.env.get("PHOENIX_ODDIN_PUBLISH_TO").map("custom".at))

// scalastyle:off
def merge: (State) => State = { st: State =>
  val git = st.extract.get(releaseVcs).get.asInstanceOf[Git]
  val curBranch = (git.cmd("rev-parse", "--abbrev-ref", "HEAD") !!).trim

  git.cmd("checkout", deployBranch) ! st.log
  git.cmd("pull") ! st.log
  git.cmd("merge", curBranch, "--no-ff", "--no-edit") ! st.log
  git.cmd("push", "origin", s"$deployBranch:$deployBranch") ! st.log
  git.cmd("checkout", curBranch) ! st.log

  st
}
// scalastyle:on

lazy val mergeReleaseVersionAction = { st: State =>
  val newState = merge(st)
  newState
}

val mergeReleaseVersion = ReleaseStep(mergeReleaseVersionAction)

releaseProcess := Seq[ReleaseStep](
  checkSnapshotDependencies,
  inquireVersions,
  runClean,
  runTest,
  setReleaseVersion,
  commitReleaseVersion,
  pushChanges, //to make sure develop branch is pulled
  tagRelease,
  mergeReleaseVersion, //will merge into master and push
  setNextVersion,
  commitNextVersion,
  pushChanges)
