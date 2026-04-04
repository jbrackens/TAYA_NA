import sbt._

object Deps {

  val jackson = "com.fasterxml.jackson.core" % "jackson-databind" % Versions.jackson % Provided

  val avroSourceDirectory = Seq("src/main/resources")

  val moduleDependencies = Seq(jackson)

}

object Versions {

  val scalaVersion = "2.12.7"

  val jackson = "2.10.1"

}