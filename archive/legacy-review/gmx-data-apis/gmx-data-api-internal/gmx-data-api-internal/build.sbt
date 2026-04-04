import sbt._
import gmx.sbt.plugin.kafkascripts.TopicSchema
import sbt._

val resolverSettings = Seq(
  resolvers ++= Seq(
    "FS Maven Repository".at("https://lena-srv01.flipsports.net:4566/repository/maven-group/"),
    "Atlassian Releases".at("https://maven.atlassian.com/public/"),
    Resolver.jcenterRepo,
    Resolver.mavenLocal),
)

val jarPublishSettings = Seq(
  publishTo := (isSnapshot.value match {
    case true => Some("snapshots" at "https://lena-srv01.flipsports.net:4566/repository/maven-snapshots/")
    case false => Some("releases" at "https://lena-srv01.flipsports.net:4566/repository/maven-releases/")
  })
)

val commonSettings = Seq(
  organization := "gmx.dataapi.internal",
  scalaVersion := Versions.scalaVersion,
  classpathTypes in ThisBuild += "maven-plugin",
  aggregate in update := false,
  libraryDependencies ++= Deps.moduleDeps
) ++ resolverSettings ++ jarPublishSettings

lazy val `gmx-data-api-internal` = (project in file("."))
  .aggregate(`site-extensions`, `customer`, `responsible-gambling`, `sbt-kafka-scripts`, `system-notification`)
  .settings(commonSettings)

lazy val `site-extensions` = (project in file("site-extensions"))
  .settings(commonSettings)

lazy val `customer` =  (project in file("customer"))
  .settings(commonSettings)

lazy val `responsible-gambling` = (project in file("responsible-gambling"))
  .settings(commonSettings)

lazy val `system-notification` = (project in file("system-notification"))
  .enablePlugins(KafkaScriptsPlugin)
  .settings(commonSettings)
  .settings(
    kafkascriptsRegisterSchemaOutput := file(".") / "scripts" / "system-notification-publish-schema.sh",
    kafkascriptsTopics := Seq(
      TopicSchema(
        topic = "eeg-technical.sportnation-system-notification",
        keyClass = Some("net.eeg.gmx.dataapi.internal.systemnotification.SystemNotificationId"),
        valueClass = "net.eeg.gmx.dataapi.internal.systemnotification.SystemNotification"))
  )

//TODO move to separate project? Yes
val pluginSettings = Seq(
  organization := "gmx.sbt.plugin",
  scalaVersion := Versions.scalaVersion,
  sbtVersion := Versions.sbtVersion,
  sbtPlugin := true,
  publishMavenStyle := true
) ++ resolverSettings ++ jarPublishSettings
lazy val `sbt-kafka-scripts` = (project in file("sbt-kafka-scripts"))
  .enablePlugins(SbtPlugin)
  .settings(pluginSettings)
  .settings(
    scriptedLaunchOpts := { scriptedLaunchOpts.value ++
      Seq("-Xmx1024M", "-Dplugin.version=" + version.value)
    },
    scriptedBufferLog := false
  )
