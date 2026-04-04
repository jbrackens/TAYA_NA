import com.typesafe.sbt.packager.docker.DockerPlugin.autoImport.{
  dockerBaseImage,
  dockerLabels,
  dockerRepository,
  dockerUpdateLatest
}
import com.typesafe.sbt.SbtNativePackager.Universal
import sbt.Defaults._
import sbt.Keys._
import sbt._
import sbt.librarymanagement.Configurations.{Compile, IntegrationTest, Test}
import scalafix.sbt.ScalafixPlugin.autoImport.scalafixConfigSettings

import scala.sys.env

object Build {

  implicit class ProjectOps(self: Project) {
    def libraries(lib: ModuleID, libs: ModuleID*): Project = {
      libraries(lib +: libs)
    }
    def libraries(libs: Seq[ModuleID]): Project = {
      self.settings(libraryDependencies ++= libs)
    }
    def overrides(libs: Seq[ModuleID]): Project = {
      self.settings(dependencyOverrides ++= libs)
    }
  }

  lazy val ContractTest = Configuration.of("Contract", "contract").extend(Test)

  lazy val contractSettings = inConfig(ContractTest)(
    testSettings ++
    scalafixConfigSettings(ContractTest) ++
    Seq(logBuffered := false, parallelExecution := false, testOptions += Tests.Argument("-oDIF")))

  lazy val commonSettings = {
    val dockerJavaOpts = Seq(
      // Keycloak SDK uses JBoss Logging (and not slf4j) as its logging facade.
      // We need to force JBoss Logging to redirect all logs to slf4j.
      // By default, the logging provider would be org.jboss.logging.Log4jLoggerProvider,
      // which by defaults redirects to log4j (if present on classpath).
      "-Dorg.jboss.logging.provider=slf4j",
      "-J-showversion",
      "-J-XshowSettings:vm",
      "-J-XX:+HeapDumpOnOutOfMemoryError",
      "-J-XX:+PrintCommandLineFlags",
      "-J-server",
      // Before changing the memory settings please read:
      // https://community.oracle.com/tech/developers/discussion/4478818/best-practices-java-memory-arguments-for-containers
      // and: https://ionutbalosin.com/2020/01/hotspot-jvm-performance-tuning-guidelines/#gc_g1
      "-J-XX:+HeapDumpOnOutOfMemoryError",
      "-J-XX:+UseG1GC",
      // Ideally we would have fixed values here, but until we perform JVM memory optimization, it's reasonable setting, application memory is controlled by setting POD memory
      // We need to leave at least 30% of mem free for other structures like: Java threads, Garbage collection, metaspace, native memory, socket buffers...
      "-J-XX:MaxRAMPercentage=65.0",
      // We start with full memory allocation, because "whenever heap size grows from the initial allocated size, it will pause the JVM"
      "-J-XX:InitialRAMPercentage=65.0",
      // Trigger pre-zeroed memory-mapped pages at startup, during JVM initialization, to avoid commit hiccups. Might cause the longer startup.
      "-J-XX:+AlwaysPreTouch")

    val nativePackagerDockerSettings = Seq(
      dockerRepository := sys.props.get("docker.repository"),
      dockerBaseImage := "docker.io/eclipse-temurin:11",
      dockerUpdateLatest := true,
      dockerLabels := Map("git-commit" -> sys.env.getOrElse("GIT_COMMIT", "null")),
      // Ideally this would be set as `Docker / ...` but this config is not available for that packaging type:
      // https://github.com/sbt/sbt-native-packager/issues/853
      Universal / javaOptions ++= dockerJavaOpts,
      Compile / packageDoc / publishArtifact := false)

    val resolverSettings = Seq(
      resolvers ++= Seq(
          Resolver.mavenLocal,
          Resolver.sonatypeRepo("snapshots")))

    // This option is critical in production code to avoid dangling Futures,
    // which are the most common cause of race conditions.
    // This could theoretically also be enforced in test code...
    // but would lead to multiple false-flag errors since non-Unit values are often discarded in test code on purpose.
    val productionOnlyScalacOptions = Seq("-Ywarn-value-discard")
    // workaround for (https://youtrack.jetbrains.com/issue/SCL-11824)
    val isIntellijBuild = System.getProperty("intellij", "false").toBoolean
    val compilationSettings = Seq(
      scalacOptions ++= Seq(
          "-deprecation",
          "-encoding",
          "UTF-8",
          "-feature",
          "-language:_",
          "-unchecked",
          // Note that having a warning (reduced to an info) on unused imports
          // is necessary for RemoveUnused scalafix rule to work.
          "-Wconf:cat=unused-imports:info",
          "-Wunused",
          "-Wconf:src=target/scala-2.13/src_managed/main/compiled_avro/.*:silent",
          "-Wdead-code",
          "-Xfatal-warnings",
          "-Xlint:-byname-implicit,-multiarg-infix,_",
          "-Xlog-reflective-calls",
          "-Ybackend-parallelism",
          "8",
          "-Ywarn-macros:after",
          // Required to use circe semi-auto annotations, e.g. @JsonCodec, @ConfiguredJsonCodec
          "-Ymacro-annotations"),
      // Since Test configuration extends Runtime, which extends Compile,
      // all the settings are automatically inherited - hence we need to explicitly remove the unwanted option.
      // Note that this is unfortunately ignored by Intellij (https://youtrack.jetbrains.com/issue/SCL-11824).
      // therefore we use isIntellijBuild to disable this scalac options when sbt is setup with -Dintellij=true
      scalacOptions ++= (if (!isIntellijBuild) productionOnlyScalacOptions else Seq()),
      Test / scalacOptions --= productionOnlyScalacOptions)

    val testSettings = Seq(
      // Forking in tests (turned off by default) serves as a workaround for https://github.com/testcontainers/testcontainers-java/issues/584:
      // without that, each test container (and its associated `ryuk` container) lives as long as the JVM that spawned them.
      // In case of long-running interactive sbt sessions, the local machine would accumulate a lot of running Docker containers.
      // Forking a separate sbt process for the tests causes the containers to terminate right after the tests are complete.
      Test / fork := env.get("SBT_FORK_IN_TEST").map(_.toBoolean).getOrElse(false),
      Test / testOptions += Tests.Argument("-oDIF"),
      // There are issues running tests in parallel in our environments. These have been researched as part of PHXD-671,
      // stabilizing the test runs and minimizing the failure rates, but running them in parallel greatly increase the number
      // of failures in our test runs. There's an additional tech debt ticket to try to minimize these issues in the future:
      // https://eegtech.atlassian.net/browse/PHXD-693
      Test / parallelExecution := false,
      Test / logBuffered := false,
      concurrentRestrictions := Seq(Tags.limit(Tags.ForkedTestGroup, 4)))

    nativePackagerDockerSettings ++ resolverSettings ++ compilationSettings ++ testSettings
  }
}
