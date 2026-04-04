import sbt._

object Deps {

  private val commonsCore = "net.flipsports.gmx.dataapi.internal.common" %% "common-core" % Versions.commonsCore

  val avroSourceDirectory = Seq("src/main/resources")

  val moduleDeps = Seq(commonsCore)

}

object Versions {

  val scalaVersion = "2.12.6"

  val commonsCore = "0.1.0"

}