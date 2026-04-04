import sbt._

object Deps {

  private val scalaTests = Seq(
    "junit" % "junit" % Versions.junit % Test,
    "org.scalatest" %% "scalatest" % Versions.scalaTest % Test,
    "org.scalatestplus.play" %% "scalatestplus-play" % Versions.scalaTestPlus % Test,
    "org.mockito" % "mockito-core" % Versions.mockito % Test,
    "org.mockito" %% "mockito-scala" % Versions.mockitoScala % Test
  )

  private val commonsCache = "net.flipsports.gmx.common.internal.scala" %% "common-cache" % Versions.commonsScala

  // MODULES
  private val sharedLibs = Deps.scalaTests

  val partnerCommons = Deps.sharedLibs

  val partnerAtr = Deps.sharedLibs

  val partnerRmg = Deps.sharedLibs

  val partnerSis = Deps.sharedLibs

  val partnerSbtech = Deps.sharedLibs :+
    Deps.commonsCache
}

object Versions {
  val scalaVersion = "2.12.7"

  val commonsScala = "0.0.4"

  val junit = "4.12"
  val scalaTest = "3.0.5"
  val scalaTestPlus = "3.1.2"
  val mockito = "2.28.2"
  val mockitoScala = "1.5.18"
}
