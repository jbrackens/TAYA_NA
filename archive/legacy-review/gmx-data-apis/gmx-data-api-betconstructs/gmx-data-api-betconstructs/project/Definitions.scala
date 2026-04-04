import sbt._

object Deps {

  val jackson = "com.fasterxml.jackson.core" % "jackson-databind" % Versions.jackson % Provided

  val sealerate = "ca.mrvisser" %% "sealerate" % Versions.sealerate

  val avroSourceDirectory = Seq("src/main/resources")

  val moduleDependencies = Seq(jackson, sealerate)

}

object Versions {

  val sealerate = "0.0.5"

  val scalaVersion = "2.12.7"

  val jackson = "2.10.1"

}