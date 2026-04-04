import sbt._

object Deps {

  private val logging = Seq(
    "ch.qos.logback" % "logback-classic" % Versions.logback,
    "ch.qos.logback" % "logback-core" % Versions.logback
  )

  private val scalaTests = Seq(
    "junit" % "junit" % Versions.junit % Test,
    "org.scalatest" %% "scalatest" % Versions.scalaTest % Test,
    "org.scalatestplus.play" %% "scalatestplus-play" % Versions.scalaTestPlus % Test,
    "org.mockito" % "mockito-core" % Versions.mockito % Test,
    "org.mockito" %% "mockito-scala" % Versions.mockitoScala % Test
  )

  val play = Seq("com.typesafe.play" %% "play" % Versions.play)

  val playJson = Seq("com.typesafe.play" %% "play-json" % Versions.playJson)

  val cache = Seq(
    "com.github.cb372" %% "scalacache-core" % Versions.scalacache,
    "com.github.cb372" %% "scalacache-cache2k" % Versions.scalacache
  )

  val commonsLang = "org.apache.commons" % "commons-lang3" % Versions.commonsLang

  // MODULES
  val commonCore = Deps.logging ++
    Deps.scalaTests

  val commonCache = Deps.scalaTests ++
    Deps.cache

  val commonJson = Deps.scalaTests ++
    Deps.playJson

  val commonPlay = Deps.scalaTests ++
    Deps.play :+
    Deps.commonsLang
}

object Versions {

  val scalaVersion = "2.12.7"

  val logback = "1.2.3"

  val junit = "4.12"
  val scalaTest = "3.0.5"
  val scalaTestPlus = "3.1.2"
  val mockito = "2.28.2"
  val mockitoScala = "1.5.18"

  val play = "2.7.3"
  val playJson = "2.7.3"

  val scalacache = "0.24.2"

  val commonsLang = "3.9"
}
