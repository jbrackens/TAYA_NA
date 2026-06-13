import sbt._
import gmx.sbt.plugin.kafkascripts.TopicSchema

lazy val settings = Seq(organization := "net.flipsports.gmx.streaming.sbtech.odds",
  scalaVersion := Versions.scalaVersion,
  classpathTypes += "maven-plugin",
  aggregate in update := false,
  scalacOptions := Seq("-feature", "-unchecked", "-deprecation", "-encoding", "utf8", "-language:experimental.macros", "-Xlint", "-Xmacro-settings:materialize-derivations"),
  resolvers ++= Seq(
    "Apache Development Snapshot Repository" at "https://repository.apache.org/content/repositories/snapshots/",
    Resolver.mavenLocal,
    "Confluent" at "https://packages.confluent.io/maven/",
    "FS Maven Repository" at "https://lena-srv01.flipsports.net:4566/repository/maven-group/"
  ),
  publishTo := (isSnapshot.value match {
    case true => Some("snapshots" at "https://lena-srv01.flipsports.net:4566/repository/maven-snapshots/")
    case false => Some("releases" at "https://lena-srv01.flipsports.net:4566/repository/maven-releases/")
  })
)

lazy val `gmx-streaming-data-odds` = (project in file("."))
  .aggregate(`events-odds-jobs`)
  .settings(settings)

lazy val `events-odds-jobs` = project
  .enablePlugins(KafkaScriptsPlugin)
  .settings(settings)
  .settings(libraryDependencies ++= Deps.streaminDependencies)
  .settings(Compile / run / fork := true)
  .settings(Global / cancelable := true)
  .settings(Compile / run := Defaults.runTask(Compile / fullClasspath, Compile / run / mainClass, Compile / run / runner).evaluated)
  .settings(parallelExecution := false)
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
  .settings(
    kafkascriptsRegisterSchemaOutput := file(".") / "scripts" / "publish-schema.sh",
    kafkascriptsTopics := Seq(
      TopicSchema(
        topic = "gmx-messaging.sportnation-site-extensions-sportevents",
        keyClass = Some("gmx.dataapi.internal.siteextensions.SportEventUpdateKey"),
        valueClass = "gmx.dataapi.internal.siteextensions.SportEventUpdate",
      ),
      TopicSchema(
        topic = "gmx-messaging.redzone-site-extensions-sportevents",
        keyClass = Some("gmx.dataapi.internal.siteextensions.SportEventUpdateKey"),
        valueClass = "gmx.dataapi.internal.siteextensions.SportEventUpdate",
      )
    )
  )
