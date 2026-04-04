import gmx.sbt.plugin.kafkascripts.TopicSchema

lazy val root = (project in file("."))
  .enablePlugins(KafkaScriptsPlugin)
  .settings(
    version := "0.1",
    scalaVersion := "2.12.6"
  )
  .settings(libraryDependencies ++= Seq(
    "gmx.dataapi.internal" %% "site-extensions" % "0.1.1",
    "net.flipsports.gmx.dataapi.internal.racingroulette" %% "events" % "0.0.21"
  ))
  .settings(
    resolvers ++= Seq(
      "FS Maven Repository".at("https://lena-srv01.flipsports.net:4566/repository/maven-group/"),
      Resolver.mavenLocal)
  )
  .settings(
    kafkascriptsTopics := Seq(
      TopicSchema(
        topic = "gmx-messaging.sportnation-site-extensions-sportevents",
        keyClass = Some("gmx.dataapi.internal.siteextensions.SportEventUpdateKey"),
        valueClass = "gmx.dataapi.internal.siteextensions.SportEventUpdate",
      ),
      TopicSchema(
        topic = "gmx-messaging.sportnation-racing-roulette-horse-event",
        valueClass = "net.flipsports.gmx.racingroulette.api.Event",
      )
    )
  )
