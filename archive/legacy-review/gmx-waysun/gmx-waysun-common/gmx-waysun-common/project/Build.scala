import org.scalafmt.sbt.ScalafmtPlugin.autoImport.scalafmtOnCompile
import sbt.Keys._
import sbt._

object Build {
  val publishSnapshotsDestination = "https://lena-srv01.flipsports.net:4566/repository/maven-snapshots/"
  val publishReleasesDestination = "https://lena-srv01.flipsports.net:4566/repository/maven-releases/"

  implicit class ProjectOps(self: Project) {
    def libraries(libs: Seq[ModuleID]): Project = {
      self.settings(libraryDependencies ++= libs)
    }
  }

  lazy val commonSettings = {

    val additionalResolvers = Seq(
      resolvers ++= Seq(Resolver.jcenterRepo, "Confluent Repo".at("https://packages.confluent.io/maven")))

    val packaging = Seq(publishTo := (if (isSnapshot.value) {
                                        Some("snapshots".at(publishSnapshotsDestination))
                                      } else {
                                        Some("releases".at(publishReleasesDestination))
                                      }))

    val compilationSettings = Seq(
      scalacOptions ++= Seq(
        "-deprecation",
        "-encoding",
        "UTF-8",
        "-feature",
        "-language:_",
        "-unchecked",
        "-Ywarn-dead-code",
        "-Ywarn-value-discard",
        "-Xfatal-warnings",
        "-Ywarn-unused:_",
        "-Xlog-reflective-calls"),
      scalafmtOnCompile := true)

    val testSettings = Seq(
      Test / testOptions += Tests.Argument("-oDIF"),
      Test / parallelExecution := true,
      Test / logBuffered := false,
      concurrentRestrictions := Seq(Tags.limit(Tags.ForkedTestGroup, max = 4)))

    additionalResolvers ++ packaging ++ compilationSettings ++ testSettings ++ macroSettings
  }

  def scala2_12(scalaVersion: String): Boolean =
    CrossVersion.partialVersion(scalaVersion) match {
      case Some((2, minor)) if minor < 13 => true
      case _                              => false
    }

  lazy val macroSettings: Seq[Setting[_]] = Seq(
    libraryDependencies ++= (if (scala2_12(scalaVersion.value)) {
                               Seq(
                                 compilerPlugin((("org.scalamacros" % "paradise" % "2.1.1").cross(CrossVersion.patch))))
                             } else Nil),
    scalacOptions ++= (if (scala2_12(scalaVersion.value)) Nil else Seq("-Ymacro-annotations")))
}
