import ReleaseTransformations._
import ReleasePlugin.autoImport._
import sbtrelease.{ Git, Utilities }
import Utilities._

ThisBuild / organization := "phoenix"

lazy val scala212 = "2.12.12"
lazy val scala213 = "2.13.3"
lazy val supportedScalaVersions = List(scala212, scala213)
lazy val deployBranch = "master"

lazy val avro = "org.apache.avro" % "avro" % "1.8.2"

lazy val `phoenix-data-models` =
  (project in file(".")).settings(crossScalaVersions := Nil, publish / skip := true).aggregate(`phoenix-models-oddin`)

lazy val `phoenix-models-oddin` = (project in file("oddin")).settings(
  commonSettings,
  libraryDependencies ++= Seq(avro),
  sourceGenerators in Compile += (avroScalaGenerateSpecific in Compile).taskValue)

lazy val commonSettings = Seq(
  scalafmtOnCompile := true,
  crossScalaVersions := supportedScalaVersions,
  publishTo := (if (isSnapshot.value) {
                  Some("snapshots".at("https://lena-srv01.flipsports.net:4566/repository/maven-snapshots/"))
                } else {
                  Some("releases".at("https://lena-srv01.flipsports.net:4566/repository/maven-releases/"))
                }))

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
