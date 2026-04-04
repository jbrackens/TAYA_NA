import com.typesafe.sbt.packager.Keys.packageName
import com.typesafe.sbt.packager.docker.DockerPlugin.autoImport._
import org.scalafmt.sbt.ScalafmtPlugin.autoImport.scalafmtOnCompile
import sbt.Defaults.itSettings
import sbt.Keys._
import sbt._
import sbt.librarymanagement.Configurations.IntegrationTest
import scalafix.sbt.ScalafixPlugin.autoImport.scalafixConfigSettings

object Build {

  implicit class ProjectOps(self: Project) {
    def libraries(libs: Seq[ModuleID]): Project = {
      self.settings(libraryDependencies ++= libs)
    }
  }

  lazy val eventIngestorSettings = commonSettings ++ integrationTestsSettings ++
    Seq(
      Docker / packageName := "stella-event-ingestor",
      Compile / publishArtifact := true,
      dockerExposedPorts := Seq(9000))

  lazy val commonSettings = {

    val additionalResolvers = Seq(
      resolvers ++= Seq(
        "FS Maven Repository".at("https://lena-srv01.flipsports.net:4566/repository/maven-group/"),
        Resolver.jcenterRepo,
        "Confluent Repo".at("https://packages.confluent.io/maven")))

    val dockerSettings = Seq(
      dockerUpdateLatest := true,
      dockerBaseImage := "adoptopenjdk/openjdk11",
      dockerRepository := sys.props.get("docker.repository"),
      Compile / publishArtifact := false,
      packageDoc / publishArtifact := false)

    val compilationSettings = Seq(
      scalacOptions ++= Seq(
        "-deprecation",
        "-encoding",
        "UTF-8",
        "-feature",
        "-language:_",
        "-unchecked",
        "-Xlint:-byname-implicit,_",
        "-Ywarn-dead-code",
        "-Ywarn-value-discard",
        "-Xfatal-warnings",
        "-Ywarn-unused:_",
        "-Xlog-reflective-calls"),
      scalafmtOnCompile := true)

    val runSettings = Seq(run / connectInput := true, run / fork := true)

    val testSettings = Seq(
      Test / testOptions += Tests.Argument("-oDIF"),
      Test / parallelExecution := true,
      Test / logBuffered := false,
      concurrentRestrictions := Seq(Tags.limit(Tags.ForkedTestGroup, max = 4)))

    additionalResolvers ++ dockerSettings ++ compilationSettings ++ runSettings ++ testSettings
  }

  private lazy val integrationTestsSettings = inConfig(IntegrationTest)(
    itSettings ++ Seq(
      fork := true,
      logBuffered := false,
      parallelExecution := false,
      testOptions += Tests.Argument("-oDIF")) ++
    scalafixConfigSettings(IntegrationTest) ++
    org.scalafmt.sbt.ScalafmtPlugin.scalafmtConfigSettings)
}
