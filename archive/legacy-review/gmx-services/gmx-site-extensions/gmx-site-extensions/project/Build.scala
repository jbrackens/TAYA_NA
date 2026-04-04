import com.typesafe.sbt.SbtNativePackager.autoImport.packageName
import com.typesafe.sbt.SbtNativePackager.{Docker, Universal}
import com.typesafe.sbt.packager.docker.DockerPlugin.autoImport.{dockerBaseImage, dockerLabels, dockerRepository, dockerUpdateLatest}
import net.vonbuchholtz.sbt.dependencycheck.DependencyCheckPlugin.autoImport.{dependencyCheckFailBuildOnCVSS, dependencyCheckHintsFile, dependencyCheckSuppressionFile}
import org.scalafmt.sbt.ScalafmtPlugin.autoImport.scalafmtOnCompile
import sbt.Keys._
import sbt._

import scala.sys.env

object Build {

  implicit class ProjectOps(self: Project) {
    def libraries(libs: Seq[ModuleID]): Project = {
      self.settings(libraryDependencies ++= libs)
    }

    def overrides(libs: Seq[ModuleID]): Project = {
      self.settings(dependencyOverrides ++= libs)
    }
  }

  val dockerJavaOps = Seq(
    "-showversion",
    "-J-XshowSettings:vm",
    "-J-XX:+PrintCommandLineFlags",
    "-J-XX:+UseG1GC",
    "-J-XX:+PrintGCDetails -verbose:gc",
    "-server",
    // Ideally we would have fixed values here, but until we perform JVM memory optimization, it's reasonable setting, application memory is controlled by setting POD memory
    // We need to leave at least 30% of mem free for other structures like: Java threads, Garbage collection, metaspace, native memory, socket buffers...
    "-J-XX:MaxRAMPercentage=65.0",
    // We start with full memory allocation, because "whenever heap size grows from the initial allocated size, it will pause the JVM"
    "-J-XX:InitialRAMPercentage=65.0",
    // Trigger pre-zeroed memory-mapped pages at startup, during JVM initialization, to avoid commit hiccups. Might cause the longer startup.
    "-J-XX:+AlwaysPreTouch")



  def dockerSettings(project: String, module: String) = Seq(
    dockerRepository := sys.env.get("docker.repository").orElse(Some("259420793117.dkr.ecr.eu-west-1.amazonaws.com")),

    packageName in Docker := s"$project/$module",
    dockerLabels := Map("project" -> project, "module" -> module, "git-commit" -> sys.env.getOrElse("GIT_COMMIT", "null")),

    dockerBaseImage := "adoptopenjdk/openjdk11:alpine-jre",
    javaOptions in Universal ++= dockerJavaOps,
    dockerUpdateLatest := true,
    publishArtifact in (Compile, packageDoc) := false
  )

  object ExposedPorts {
    val akkaRemotingPort = 2552
    val akkaManagementPort = 8558
    val httpEndpointsPort = 9000
    val lightbendTelemetryMetricsPort = 9001
    val devHttpEndpointsPort = 9090
    val internalHttpEndpointsPort = 9099
    val websocketsPort = 10000
  }

  lazy val commonSettings = {

    val resolverSettings = Seq(
      resolvers ++= Seq(
        "FS Maven Repository".at("https://lena-srv01.flipsports.net:4566/repository/maven-group/"),
        "Confluent".at("https://packages.confluent.io/maven/"),
        "Atlassian Releases".at("https://maven.atlassian.com/public/"),
        Resolver.jcenterRepo,
        Resolver.mavenLocal),
      resolvers ++= env.get("LIGHTBEND_COMMERCIAL_TOKEN").toSeq.flatMap(Lightbend.commercialResolvers)
    )

    val jarPublishSettings = Seq(
      publishTo := (isSnapshot.value match {
        case true => Some("snapshots" at "https://lena-srv01.flipsports.net:4566/repository/maven-snapshots/")
        case false => Some("releases" at "https://lena-srv01.flipsports.net:4566/repository/maven-releases/")
      })
    )

    val compilationSettings = Seq(
      scalacOptions ++= Seq(
        "-encoding", "UTF-8",
        "-Xlog-reflective-calls",
        "-Xfatal-warnings",
        "-Ywarn-dead-code",
        "-Ywarn-unused:-imports,_",
        "-Ywarn-macros:after",
        "-deprecation",
        "-feature",
        "-language:_",
        "-unchecked",
        "-Xlint:_"),
      scalafmtOnCompile := true
    )

    val depCheckSettings = Seq(
      dependencyCheckFailBuildOnCVSS := 10.0f,
      dependencyCheckSuppressionFile := Some(new File("conf/owasp/dependency-check-suppressions.xml")),
      dependencyCheckHintsFile := Some(new File("conf/owasp/dependency-check-hint.xml"))
    )

    val testSettings = Seq(
      testOptions in Test += Tests.Argument("-oDIF"),
      parallelExecution in Test := false,
      logBuffered in Test := false,
      concurrentRestrictions := Seq(Tags.limit(Tags.ForkedTestGroup, 4))
    )

    resolverSettings ++ jarPublishSettings ++ compilationSettings ++ depCheckSettings ++ testSettings
  }
}
