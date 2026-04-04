import sbt._

object Deps {

  private val commonsCore = "net.flipsports.gmx.dataapi.internal.common" %% "common-core" % Versions.commonsCore
  private val avroCompiler = "org.apache.avro" % "avro" % Versions.avroCompiler

  val moduleDeps = Seq(commonsCore, avroCompiler)
}

object Versions {

  val scalaVersion = "2.12.6"
  val sbtVersion = "1.2.8"

  val commonsCore = "0.1.2"
  val avroCompiler = "1.9.1" // needs to match version used in plugins.sbt

}