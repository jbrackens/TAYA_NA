import sbt.Keys._
import sbt._

resolvers in ThisBuild ++= Seq(
  "FS Maven Repository" at "https://lena-srv01.flipsports.net:4566/repository/maven-group/",
  ("Confluent" at "https://packages.confluent.io/maven/").withAllowInsecureProtocol(true),
  Resolver.mavenLocal
)

lazy val `gmx-service-responsible-gambling` =
  (project in file("."))
    .enablePlugins(ScalafmtPlugin)
    .settings(
      skip in publish := true,
      scalafmtOnCompile := true,
    )
    .settings(commonSettings)
    .aggregate(
      pipeline,
      datamodel,
      generators,
      handlers,
      calculators
    )

lazy val pipeline = (project in file("pipeline"))
  .enablePlugins(CloudflowApplicationPlugin)
  .settings(commonSettings)
  .settings(
    name := "gmx-service-responsible-gambling",
    runLocalConfigFile := Some("local.conf")
  )

lazy val datamodel = (project in file("datamodel"))
  .enablePlugins(CloudflowLibraryPlugin)
  .settings(
    commonSettings,
  )

lazy val generators = (project in file("alert-generators"))
  .enablePlugins(CloudflowFlinkPlugin)
  .settings(
    commonSettings,
    scalafmtOnCompile := true,
    libraryDependencies ++= Seq(
      "ch.qos.logback"         %  "logback-classic"        % "1.2.3",
      "org.scalactic" %% "scalactic" % "3.2.0",
      "org.scalatest" %% "scalatest-wordspec" % "3.2.0" % Test,
      "org.scalamock" %% "scalamock" % "4.4.0" % Test,
      "org.scalatest" %% "scalatest" % "3.2.0" % Test
    )
  )
  .settings(
    parallelExecution in Test := false
  )
  .dependsOn(datamodel)

lazy val handlers = (project in file("alert-handlers"))
  .enablePlugins(CloudflowAkkaPlugin)
  .settings(
    commonSettings,
    scalafmtOnCompile := true,
    libraryDependencies ++= Seq(
      "ch.qos.logback"         %  "logback-classic"        % "1.2.3",
      "org.scalactic" %% "scalactic" % "3.2.0",
      "org.scalatest" %% "scalatest-wordspec" % "3.2.0" % Test,
      "org.scalamock" %% "scalamock" % "4.4.0" % Test,
      "org.scalatest" %% "scalatest" % "3.2.0" % Test
    )
  )
  .settings(
    parallelExecution in Test := false
  )
  .dependsOn(datamodel)

lazy val calculators = (project in file("calculators"))
  .enablePlugins(CloudflowFlinkPlugin)
  .settings(
    commonSettings,
    libraryDependencies ++= Seq(
      "ch.qos.logback"         %  "logback-classic"        % "1.2.3",
      "org.scalactic" %% "scalactic" % "3.2.0",
      "org.scalatest" %% "scalatest-wordspec" % "3.2.0" % Test,
      "org.scalamock" %% "scalamock" % "4.4.0" % Test,
      "org.scalatest" %% "scalatest" % "3.2.0" % Test
    )
  )
  .dependsOn(datamodel)

lazy val commonSettings = Seq(
  scalaVersion := "2.12.11",
  scalacOptions ++= Seq(
    "-encoding", "UTF-8",
    "-target:jvm-1.8",
    "-Xlog-reflective-calls",
    "-Xlint",
    "-Ywarn-unused",
    "-Ywarn-unused-import",
    "-deprecation",
    "-feature",
    "-language:_",
    "-unchecked"
  ),

  scalacOptions in (Compile, console) --= Seq("-Ywarn-unused", "-Ywarn-unused-import"),
  scalacOptions in (Test, console) := (scalacOptions in (Compile, console)).value,
)
