import com.github.sbt.avro.SbtAvro.autoImport.avroSource
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

  lazy val avroModuleSettings = commonSettings ++
    Seq(Compile / managedSourceDirectories += (Compile / avroSource).value)

  lazy val validatorsSettings = commonSettings

  private lazy val commonSettings = {

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

    packaging ++ compilationSettings ++ testSettings
  }
}
