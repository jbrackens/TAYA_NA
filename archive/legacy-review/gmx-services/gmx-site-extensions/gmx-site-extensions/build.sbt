import Build._
import Build.ExposedPorts._
import Dependencies._

organization in ThisBuild := "gmx.widget.siteextentions"

scalaVersion in ThisBuild := Versions.scala
classpathTypes in ThisBuild += "maven-plugin"
aggregate in update := false
dynverSeparator in ThisBuild := "-"
dynverSonatypeSnapshots in ThisBuild := true
onChangedBuildSource in Global := ReloadOnSourceChanges

semanticdbEnabled in ThisBuild := true
semanticdbVersion in ThisBuild := scalafixSemanticdb.revision
scalafixDependencies in ThisBuild += ScalafixDependencies.organizeImports

lazy val `gmx-site-extensions` = (project in file("."))
  .aggregate(`legacy`, `data-feed`, `tools`)
  .settings(commonSettings)
//  .settings(publish in Docker := {}, publishArtifact := false, aggregate in Docker := false)

lazy val `legacy` = (project in file("legacy"))
  .enablePlugins(TestNGPlugin)
  .libraries(legacyDependencies)
  .settings(commonSettings)
  .settings(testNGSuites := Seq("legacy/src/test/resources/testng.xml"))

lazy val `data-feed` = (project in file("data-feed"))
  .enablePlugins(JavaAppPackaging, AshScriptPlugin, Cinnamon)
  .dependsOn(`legacy`)
  .libraries(datafeedDependencies)
  .overrides(datafeedDependenciesOverride)
  .settings(commonSettings)
  .settings(
    dockerSettings("site-extensions", "data-feed"),
    dockerExposedPorts := {
      Seq(
        akkaRemotingPort,
        akkaManagementPort,
        httpEndpointsPort,
        lightbendTelemetryMetricsPort,
        devHttpEndpointsPort,
        internalHttpEndpointsPort,
        websocketsPort)
    })
  .settings(cinnamon in run := true)

lazy val `tools` = (project in file("tools"))
  .dependsOn(`data-feed`)
  .libraries(toolsDependencies)
  .settings(commonSettings)
