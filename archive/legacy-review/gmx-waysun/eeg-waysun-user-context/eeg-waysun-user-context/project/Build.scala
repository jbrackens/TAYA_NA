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

  lazy val userContextSettings = {

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

    val playDevSettings = Seq(PlayKeys.devSettings := Seq("play.server.http.port" -> "14000"))

    mainSettings ++ compilationSettings ++ playDevSettings ++ integrationTestsSettings("it") ++ Seq(
      dockerChmodType := DockerChmodType.UserGroupWriteExecute,
      Docker / packageName := "stella-user-context",
      dockerExposedPorts := {
        val httpServerPort = 14000
        val akkaRemotingPort = 25520
        val akkaManagementPort = 8558
        Seq(httpServerPort, akkaRemotingPort, akkaManagementPort)
      })
  }

  private lazy val mainSettings = {

    // workaround for javadoc linking issues
    // based on https://stackoverflow.com/questions/19786841/can-i-use-sbts-apimappings-setting-for-managed-dependencies/35673212#35673212
    val docsMappings = Seq(apiMappings ++= {
      def mappingsFor(
          organization: String,
          names: List[String],
          location: String,
          revision: String => String = identity): Seq[(File, URL)] =
        for {
          entry: Attributed[File] <- (Compile / fullClasspath).value
          module: ModuleID <- entry.get(moduleID.key)
          if module.organization == organization
          if names.exists(module.name.startsWith)
        } yield entry.data -> url(location.format(revision(module.revision)))

      val mappings: Seq[(File, URL)] =
        mappingsFor("io.circe", List("circe-core"), "https://circe.github.io/circe/api/io/circe/")

      mappings.toMap
    })

    // workaround for "[error] dropping dependency on node with no phase object: refchecks"
    val docsCompileSettings = Seq(Compile / doc / scalacOptions := Seq("-groups"))

    val additionalResolvers = Seq(
      resolvers ++= Seq(
        "FS Maven Repository".at("https://lena-srv01.flipsports.net:4566/repository/maven-group/"),
        Resolver.jcenterRepo))

    val dockerSettings = Seq(
      dockerUpdateLatest := true,
      dockerBaseImage := "adoptopenjdk/openjdk11",
      dockerRepository := sys.props.get("docker.repository"),
      Compile / publishArtifact := false,
      packageDoc / publishArtifact := false)

    val runSettings = Seq(run / connectInput := true, run / fork := true)

    val testSettings = Seq(
      Test / logBuffered := false,
      Test / parallelExecution := true,
      Test / testOptions += Tests.Argument("-oDIF"),
      concurrentRestrictions := Seq(Tags.limit(Tags.ForkedTestGroup, max = 4)))

    docsMappings ++ docsCompileSettings ++ additionalResolvers ++ dockerSettings ++ runSettings ++ testSettings
  }

  private def integrationTestsSettings(itSourcePath: String) = inConfig(IntegrationTest)(
    itSettings ++ Seq(
      fork := true,
      logBuffered := false,
      parallelExecution := false,
      scalaSource := baseDirectory.value / itSourcePath,
      testOptions += Tests.Argument("-oDIF")) ++
    scalafixConfigSettings(IntegrationTest) ++
    org.scalafmt.sbt.ScalafmtPlugin.scalafmtConfigSettings)
}
