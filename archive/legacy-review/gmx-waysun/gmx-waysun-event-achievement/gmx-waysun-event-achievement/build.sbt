import gmx.sbt.plugin.kafkascripts.TopicSchema
import sbt._

import scala.concurrent.duration.Duration

val settings = Seq(
  organization := "eeg-waysun",
  scalaVersion := Versions.scalaVersion,
  classpathTypes += "maven-plugin",
  update / aggregate := false,
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

lazy val `eeg-waysun-event-achievement` = (project in file(".")).aggregate(`event-achievements`).settings(settings)

lazy val `event-achievements` = project
  .enablePlugins(KafkaScriptsPlugin)
  .settings(settings)
  .settings(libraryDependencies ++= Deps.mainJob)
  .settings(Compile / run / fork := true)
  .settings(Global / cancelable := true)
  .settings(Compile / run := Defaults
    .runTask(Compile / fullClasspath, Compile / run / mainClass, Compile / run / runner)
    .evaluated)
  .settings(assembly / test := {})
  .settings(forceUpdatePeriod := Some(Duration.Zero))
  .settings(assembly / assemblyMergeStrategy := {
    case PathList("META-INF", xs @ _*) => MergeStrategy.discard
    case x                             => MergeStrategy.first
  })
  .settings(Compile / artifact := {
    val art = (Compile / artifact).value
    art.withClassifier(Some("assembly"))
  })
  .settings(assembly / artifact := {
    val art = (assembly / artifact).value
    art.withClassifier(Some("assembly"))
  })
  .settings(addArtifact(Compile / artifact, assembly))
  .settings(addArtifact(assembly / artifact, assembly))
  .settings(Test / parallelExecution := false)
  .settings(
    kafkascriptsRegisterSchemaOutput := file(".") / "scripts" / "publish-schema.sh",
    kafkascriptsTopics := Seq(
      TopicSchema(
        topic = "stella-messaging.default-achievement-definition",
        keyClass = Some("stella.dataapi.achievement.AchievementConfigurationKey"),
        valueClass = "stella.dataapi.achievement.AchievementConfiguration"),
      TopicSchema(
        topic = "stella-streaming.default-aggregation-aggregated",
        keyClass = Some("stella.dataapi.aggregation.AggregationResult"),
        valueClass = "stella.dataapi.aggregation.AggregationResultKey"),
      TopicSchema(
        topic = "stella-streaming.default-achievement-achievement",
        keyClass = Some("stella.dataapi.achievement.event.AchievementEventKey"),
        valueClass = "stella.dataapi.achievement.event.AchievementEvent")))
