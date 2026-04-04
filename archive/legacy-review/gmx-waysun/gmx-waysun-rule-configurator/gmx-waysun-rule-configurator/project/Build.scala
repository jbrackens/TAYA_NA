import com.typesafe.sbt.packager.Keys.packageName
import com.typesafe.sbt.packager.docker.DockerChmodType
import com.typesafe.sbt.packager.docker.DockerPlugin.autoImport._
import org.scalafmt.sbt.ScalafmtPlugin.autoImport.scalafmtOnCompile
import play.sbt.PlayImport.PlayKeys
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

  lazy val ruleConfiguratorSettings = commonSettings ++ integrationTestsSettings ++
    Seq(
      dockerChmodType := DockerChmodType.UserGroupWriteExecute,
      Docker / packageName := "stella-rule-configurator",
      dockerExposedPorts := Seq(10000))

  private lazy val commonSettings = {

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
        "-Xlint:-byname-implicit,-unused,_", // routes file always produces unused imports warning
        "-Ywarn-dead-code",
        "-Ywarn-value-discard",
        "-Xfatal-warnings",
        // "-Ywarn-unused:_", // routes file always produces unused imports warning
        "-Xlog-reflective-calls"),
      scalafmtOnCompile := true)

    val playDevSettings = Seq(PlayKeys.devSettings := Seq("play.server.http.port" -> "10000"))

    val runSettings = Seq(run / connectInput := true, run / fork := true)

    val testSettings = Seq(
      Test / logBuffered := false,
      Test / parallelExecution := true,
      Test / testOptions += Tests.Argument("-oDIF"),
      concurrentRestrictions := Seq(Tags.limit(Tags.ForkedTestGroup, max = 4)))

    additionalResolvers ++ dockerSettings ++ compilationSettings ++ playDevSettings ++ runSettings ++ testSettings
  }

  private lazy val integrationTestsSettings = inConfig(IntegrationTest)(
    itSettings ++ Seq(
      fork := true,
      logBuffered := false,
      parallelExecution := false,
      scalaSource := baseDirectory.value / "it",
      testOptions += Tests.Argument("-oDIF")) ++
    scalafixConfigSettings(IntegrationTest) ++
    org.scalafmt.sbt.ScalafmtPlugin.scalafmtConfigSettings)
}
