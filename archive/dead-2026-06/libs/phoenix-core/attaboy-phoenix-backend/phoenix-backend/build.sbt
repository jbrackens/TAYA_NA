import Build._
import Dependencies._
import com.typesafe.sbt.SbtNativePackager.autoImport.NativePackagerHelper._
import com.typesafe.sbt.packager.docker.Cmd

initialize ~= { _ =>
  // TODO (PHXD-3328): probably won't be needed after a migration to Keycloak 20+
  // Keycloak SDK uses JBoss Logging (and not slf4j) as its logging facade.
  // We need to force JBoss Logging to redirect all logs to slf4j.
  // By default, the logging provider would be org.jboss.logging.Log4jLoggerProvider,
  // which by defaults redirects to log4j (if present on classpath).
  System.setProperty("org.jboss.logging.provider", "slf4j")

  // See services/src/main/resources/logback.xml for why it's needed.
  System.setProperty("logback.level.kamon.module.ModuleRegistry", "ERROR")
}

// Note that it's NOT about hot reload of the akka-http server (in fact, akka-http does NOT possess this ability, unlike Play framework).
// Instead, it's solely about sbt console getting semi-automatically (when the next sbt REPL command is issued) reloaded
// if it discovers a change in project/ or *.sbt files.
Global / onChangedBuildSource := ReloadOnSourceChanges

// Taken from https://github.com/sbt/sbt-dynver#custom-version-string, with modifications:
// the most important change is that except when we're straight after a tag,
// we're using the *prospective* (next-to be-released) version from VERSION.txt,
// and not the version derived from the existing git tags.
ThisBuild / version := (dynverGitDescribeOutput.value match {
  case Some(gitDescribeOutput) =>
    val corePart = if (gitDescribeOutput.isCleanAfterTag) {
      // No commit info if clean after tag
      gitDescribeOutput.ref.dropPrefix
    } else {
      // commitSuffix is something like `-88-2318043a` (number of tags since the latest tag + short hash of HEAD commit)
      IO.read(new File("VERSION.txt"))
        .stripTrailing + gitDescribeOutput.commitSuffix.mkString(prefix = "-", infix = "-", suffix = "")
    }
    // dirtySuffix is something like `-20220502-1810` (date + hour)
    val dirtySuffix = gitDescribeOutput.dirtySuffix.dropPlus.mkString(prefix = "-", suffix = "")
    corePart + dirtySuffix

  case None =>
    s"HEAD-${sbtdynver.DynVer.timestamp(dynverCurrentDate.value)}"
})

inThisBuild(
  Seq(
    organization := "darkstormlabs",
    scalaVersion := Versions.scala,
    cloudflowDockerRegistry := sys.props.get("docker.repository"),
    cloudflowDockerRepository := None,
    semanticdbEnabled := true,
    semanticdbVersion := scalafixSemanticdb.revision,
    scalafixDependencies += ScalafixDependencies.organizeImports,
    scalafixScalaBinaryVersion := CrossVersion.binaryScalaVersion(scalaVersion.value),
    // Set to "placeholder", plugin will skip this `.env`
    envFileName := sys.props.get("dotenv.file").getOrElse(".<specifier>.env"),
    // Let's exclude commons-logging globally and instead substitute it with jcl-over-slf4j in Dependencies.scala.
    // This way, all the logs sent to commons-logging will be instead routed via jcl-over-slf4j and sl4fj to logback.
    // See http://www.slf4j.org/legacy.html for the details.
    excludeDependencies += "commons-logging" % "commons-logging",
    // log4j v1.2.x and slf4j-log4j12 are pulled in by cloudflow sbt plugin v2.3.0
    // (albeit only in Test scope, not to production classpath),
    // see https://github.com/lightbend/cloudflow/blob/v2.3.0/core/cloudflow-sbt-plugin/src/main/scala/cloudflow/sbt/CloudflowLocalRunnerPlugin.scala#L43
    // and https://github.com/lightbend/cloudflow/issues/1116
    excludeDependencies += "log4j" % "log4j",
    excludeDependencies += "org.slf4j" % "slf4j-log4j12"))

lazy val allSubprojects: Seq[ProjectReference] = Seq(
  `phoenix-backend`,
  `phoenix-load-tests`,
  `phoenix-contract-tests`,
  `phoenix-core`,
  `phoenix-data-models`,
  `phoenix-ingestion-betgenius-lib`,
  `phoenix-ingestion-betgenius`,
  `phoenix-ingestion-oddin-lib`,
  `phoenix-ingestion-oddin`,
  `phoenix-keycloak-to-db-migration`,
  `scalafix-rules`,
  `scalafix-input`)

lazy val `phoenix` = (project in file("."))
  .aggregate(allSubprojects: _*)
  .dependsOn(`scalafix-rules` % ScalafixConfig)
  .dependsOn(allSubprojects.map(_ % "test->test"): _*)
  .libraries(topLevelDependencies)
  .settings(commonSettings)
  .settings(publish / skip := true, publishArtifact := false, Docker / publish := {}, Docker / aggregate := false)

lazy val `phoenix-backend` = (project in file("services"))
  .enablePlugins(JavaAppPackaging, AkkaSerializationHelperPlugin, SbtKanelaRunner)
  // NOTE: keep ci/enforce_env_vars_consistent_k8s_vs_app.sh updated when changing the dependencies
  .dependsOn(
    `phoenix-core`,
    `phoenix-core` % "test->test",
    `phoenix-data-models`,
    `phoenix-ingestion-oddin-lib`,
    `phoenix-ingestion-oddin-lib` % "test->test",
    `phoenix-ingestion-betgenius-lib`,
    `scalafix-rules` % ScalafixConfig)
  .libraries(phoenixBackendDependencies)
  .overrides(cloudflowLibDependencyOverrides)
  .settings(commonSettings)
  .settings(
    ashDumpPersistenceSchema / ashDumpPersistenceSchemaOutputFilename := "akka-persistence-schema.yaml",
    Compile / mainClass := Some("phoenix.main.KubernetesApplication"),
    // The default class loader layering strategy is ScalaLibrary... this, however, completely disables Kamon Instrumentation:
    //   The Kanela instrumentation can only be attached on the current JVM when using the ClassLoaderLayeringStrategy.Flat strategy
    //   but you are currently using [ScalaLibrary]. The application will run without instrumentation and might fail to behave properly.
    // See https://github.com/kamon-io/sbt-kanela-runner#running for why a flat class loader layering is needed.
    classLoaderLayeringStrategy := ClassLoaderLayeringStrategy.Flat)

lazy val `phoenix-core` = (project in file("core"))
  .dependsOn(`scalafix-rules` % ScalafixConfig)
  .libraries(coreDependencies)
  .settings(commonSettings)

lazy val `phoenix-data-models` = (project in file("data-pipeline/models"))
  .enablePlugins(CloudflowLibraryPlugin)
  .dependsOn(`scalafix-rules` % ScalafixConfig)
  .libraries(Cloudflow.library.CloudflowAvro)
  .settings(commonSettings)
  .settings(Compile / sourceGenerators += (Compile / avroScalaGenerateSpecific).taskValue)

lazy val `phoenix-ingestion-betgenius-lib` = (project in file("data-pipeline/betgenius/lib"))
  .dependsOn(`phoenix-core`, `phoenix-core` % "test->test", `phoenix-data-models`, `scalafix-rules` % ScalafixConfig)
  .libraries(betgeniusDependencies)
  .overrides(cloudflowLibDependencyOverrides)
  .settings(commonSettings)

lazy val `phoenix-ingestion-betgenius` = (project in file("data-pipeline/betgenius/app"))
  .enablePlugins(CloudflowAkkaPlugin, CloudflowApplicationPlugin)
  .dependsOn(
    `phoenix-core`,
    `phoenix-core` % "test->test",
    `phoenix-data-models`,
    `phoenix-ingestion-betgenius-lib`,
    `scalafix-rules` % ScalafixConfig)
  .libraries(betgeniusIngestionDependencies)
  .overrides(cloudflowDependencyOverrides)
  .settings(commonSettings)
  .settings(cloudflowDockerBaseImage := "docker.io/eclipse-temurin:11-alpine")

lazy val `phoenix-ingestion-oddin-lib` = (project in file("data-pipeline/oddin/lib"))
  .dependsOn(`phoenix-core`, `phoenix-core` % "test->test", `phoenix-data-models`, `scalafix-rules` % ScalafixConfig)
  .libraries(oddinDependencies)
  .overrides(cloudflowLibDependencyOverrides)
  .settings(commonSettings)

lazy val `phoenix-ingestion-oddin` = (project in file("data-pipeline/oddin/app"))
  .enablePlugins(CloudflowAkkaPlugin, CloudflowApplicationPlugin)
  .dependsOn(
    `phoenix-core`,
    `phoenix-core` % "test->test",
    `phoenix-data-models`,
    `phoenix-ingestion-oddin-lib`,
    `scalafix-rules` % ScalafixConfig)
  .libraries(oddinIngestionDependencies)
  .overrides(cloudflowDependencyOverrides)
  .settings(commonSettings)
  .settings(
    runLocalConfigFile := Some("data-pipeline/oddin/app/src/main/resources/local.conf"),
    cloudflowDockerBaseImage := "docker.io/eclipse-temurin:11-alpine")

lazy val `phoenix-load-tests` = (project in file("load-tests"))
  .enablePlugins(JavaAppPackaging, GatlingPlugin)
  .dependsOn(`phoenix-core` % "test->test", `scalafix-rules` % ScalafixConfig)
  .libraries(loadTestsDependencies)
  .settings(commonSettings)
  .settings(
    Docker / mappings ++= directory(s"${baseDirectory.value}/src"),
    dockerCommands := Seq(
        Cmd("FROM", "denvazh/gatling:3.2.1"), // scalastyle:ignore regex
        Cmd("COPY", "src/test/scala", "/opt/gatling/user-files/simulations") // scalastyle:ignore regex
      ))

lazy val `phoenix-contract-tests` = (project in file("contract-tests"))
  .configs(ContractTest)
  .dependsOn(`phoenix-core` % "test->test", `scalafix-rules` % ScalafixConfig)
  .libraries(contractTestsDependencies)
  .settings(commonSettings)
  .settings(contractSettings)

lazy val `phoenix-keycloak-to-db-migration` = (project in file("migrations/keycloak-to-db"))
  .enablePlugins(JavaAppPackaging)
  .dependsOn(
    `phoenix-backend`,
    `phoenix-backend` % "test->test",
    `phoenix-core` % "test->test",
    `scalafix-rules` % ScalafixConfig)
  .overrides(cloudflowLibDependencyOverrides)
  .settings(commonSettings)
  .settings(Compile / mainClass := Some("phoenix.keycloakmigrator.MigratorApp"))

lazy val `scalafix-rules` = (project in file("scalafix/rules"))
  .disablePlugins(ScalafixPlugin)
  .settings(
    libraryDependencies ++= scalafixRulesDependencies,
    scalafixTestkitOutputSourceDirectories := Seq(file("scalafix/output")),
    scalafixTestkitInputSourceDirectories :=
      (`scalafix-input` / Compile / sourceDirectories).value,
    scalafixTestkitInputClasspath :=
      (`scalafix-input` / Compile / fullClasspath).value,
    scalafixTestkitInputScalacOptions :=
      (`scalafix-input` / Compile / scalacOptions).value,
    scalafixTestkitInputScalaVersion :=
      (`scalafix-input` / Compile / scalaVersion).value)
  .dependsOn(`scalafix-input`)
  .enablePlugins(ScalafixTestkitPlugin)
lazy val `scalafix-input` = (project in file("scalafix/input"))
  .disablePlugins(ScalafixPlugin)
  .settings(libraryDependencies += "com.beachape" %% "enumeratum" % Versions.enumeratum)
