import gmx.sbt.plugin.kafkascripts.TopicSchema
import sbt._

val settings = Seq(
  organization := "eeg-waysun",
  scalaVersion := Versions.scalaVersion,
  classpathTypes += "maven-plugin",
  aggregate in update := false,
  resolvers ++= Seq(
    "Apache Development Snapshot Repository".at("https://repository.apache.org/content/repositories/snapshots/"),
    "FS Maven Repository".at("https://lena-srv01.flipsports.net:4566/repository/maven-group/"),
    "Confluent".at("https://packages.confluent.io/maven/"),
    Resolver.mavenLocal),
  scalacOptions := Seq(
    "-feature",
    "-unchecked",
    "-deprecation",
    "-encoding",
    "utf8",
    "-language:experimental.macros",
    "-Xlint",
    "-Xmacro-settings:materialize-derivations"),
  publishTo := (isSnapshot.value match {
    case true  => Some("snapshots".at("https://lena-srv01.flipsports.net:4566/repository/maven-snapshots/"))
    case false => Some("releases".at("https://lena-srv01.flipsports.net:4566/repository/maven-releases/"))
  }))

lazy val `eeg-waysun-event-validator` = (project in file(".")).aggregate(`event-validators`).settings(settings)

lazy val `event-validators` = project
  .enablePlugins(KafkaScriptsPlugin)
  .settings(settings)
  .settings(libraryDependencies ++= Deps.mainJob)
  .settings(Compile / run / fork := true)
  .settings(Global / cancelable := true)
  .settings(Compile / run := Defaults
    .runTask(Compile / fullClasspath, Compile / run / mainClass, Compile / run / runner)
    .evaluated)
  .settings(test in assembly := {})
  .settings(assemblyMergeStrategy in assembly := {
    case PathList("META-INF", xs @ _*) => MergeStrategy.discard
    case x                             => MergeStrategy.first
  })
  .settings(artifact in (Compile, assembly) := {
    val art = (artifact in (Compile, assembly)).value
    art.withClassifier(Some("assembly"))
  })
  .settings(addArtifact(artifact in (Compile, assembly), assembly))
  .settings(parallelExecution in Test := false)
  .settings(
    kafkascriptsRegisterSchemaOutput := file(".") / "scripts" / "publish-schema.sh",
    kafkascriptsTopics := Seq(
      TopicSchema(
        topic = "stella-messaging.default-event-definition",
        keyClass = Some("stella.dataapi.eventconfigurations.EventConfigurationKey"),
        valueClass = "stella.dataapi.eventconfigurations.EventConfiguration"),
      TopicSchema(
        topic = "stella-streaming.default-event-raw",
        keyClass = Some("stella.dataapi.platformevents.EventKey"),
        valueClass = "stella.dataapi.platformevents.EventEnvelope"),
      TopicSchema(
        topic = "v-streaming.default-event-validated",
        keyClass = Some("stella.dataapi.platformevents.EventKey"),
        valueClass = "stella.dataapi.platformevents.ValidatedEventEnvelope"),
      TopicSchema(
        topic = "stella-streaming.default-event-failed",
        keyClass = Some("stella.dataapi.platformevents.EventKey"),
        valueClass = "stella.dataapi.platformevents.FailedEventEnvelope")))
