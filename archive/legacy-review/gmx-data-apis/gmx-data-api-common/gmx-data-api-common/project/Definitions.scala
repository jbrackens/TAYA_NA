import sbt._

object Deps {

  private val jackson = "com.fasterxml.jackson.core" % "jackson-databind" % Versions.jackson % Provided

  private val jacksonModuleScala = "com.fasterxml.jackson.module" %% "jackson-module-scala" % Versions.jackson % Provided

  val moduleDeps = Seq(jackson, jacksonModuleScala)

}

object Versions {

  val scalaVersion = "2.12.6"

  val jackson = "2.9.8"

}