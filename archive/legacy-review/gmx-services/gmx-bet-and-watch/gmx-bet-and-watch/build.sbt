import au.com.onegeek.sbtdotenv.SbtDotenv.autoImport.envFileName
import play.sbt.routes.RoutesKeys


val dockerRegistry = "259420793117.dkr.ecr.eu-west-1.amazonaws.com"
val dockerRegistryGroup = "gmx-bet-and-watch"

val commonSettings = Seq(organization := "net.flipsports.gmx.widget.argyll.betandwatch",
  scalaVersion := Versions.scalaVersion,
  classpathTypes += "maven-plugin",
  aggregate in update := false,
  resolvers ++= Seq(
    "Apache Development Snapshot Repository".at("https://repository.apache.org/content/repositories/snapshots/"),
    "Artima Maven Repository".at("https://repo.artima.com/releases"),
    "FS Maven Repository".at("https://lena-srv01.flipsports.net:4566/repository/maven-group/"),
    Resolver.mavenLocal),
  publishTo := (if (isSnapshot.value) {
    Some("snapshots".at("https://lena-srv01.flipsports.net:4566/repository/maven-snapshots/"))
  } else {
    Some("releases".at("https://lena-srv01.flipsports.net:4566/repository/maven-releases/"))
  }),

  scalacOptions := Seq("-feature", "-unchecked", "-deprecation", "-encoding", "utf8", "-language:experimental.macros", "-Xlint", "-Xmacro-settings:materialize-derivations"),

  parallelExecution in Test := false,
  lagomKafkaEnabled in ThisBuild := false,
  lagomCassandraEnabled in ThisBuild := false,
  envFileName in ThisBuild := ".env",

  dependencyCheckFailBuildOnCVSS := 10.0f,
  dependencyCheckSuppressionFile := Some(new File("conf/owasp/dependency-check-suppressions.xml")),
  dependencyCheckHintsFile := Some(new File("conf/owasp/dependency-check-hint.xml")),

  dependencyOverrides ++= Deps.commonsOverride
)

val dockerJavaOps = Seq(
  "-showversion",
  "-J-XshowSettings:vm",
  "-J-XX:+PrintCommandLineFlags",
  "-server",
  "-J-XX:MaxRAMPercentage=80.0"
)

lazy val `gmx-bet-and-watch` = (project in file("."))
  .enablePlugins(SemVerPlugin)
  .settings(commonSettings)
  .aggregate(`commons`,`security`, `events-api`, `events-impl`, `webgateway`)

lazy val `commons` = (project in file("commons"))
  .settings(libraryDependencies ++= Deps.commons)
  .settings(commonSettings)

lazy val `security` = (project in file("security"))
  .dependsOn(`commons`)
  .settings(commonSettings)
  .settings(libraryDependencies ++= Deps.security)

lazy val `events-api` = (project in file("events-api"))
  .dependsOn(`commons`)
  .settings(commonSettings)
  .settings(libraryDependencies ++= Deps.eventsApi)

lazy val `events-impl` = (project in file("events-impl"))
  .enablePlugins(LagomScala, AshScriptPlugin)
  .dependsOn(`commons`, `events-api`)
  .settings(commonSettings)
  .settings(libraryDependencies ++= Deps.eventsImpl)
  .settings(
    packageName in Docker := s"$dockerRegistryGroup/events",
    dockerRepository := Some(dockerRegistry),
    dockerAliases ++= Seq(dockerAlias.value.withTag(Option("latest"))),

    dockerBaseImage := "adoptopenjdk/openjdk12:alpine-jre",
    dockerLabels := Map("project" -> "bet-and-watch", "module" -> "events", "vcs-ref" -> sys.env.getOrElse("VCS_REF", "null")),
    dockerExposedPorts := Seq(9000),

    javaOptions in Universal ++= dockerJavaOps
  )

lazy val `webgateway` = (project in file("web-gateway"))
  .enablePlugins(PlayScala, LagomPlay, AshScriptPlugin, BuildInfoPlugin)
  .disablePlugins(PlayLayoutPlugin)
  .dependsOn(`security`, `events-api`)
  .settings(commonSettings)
  .settings(libraryDependencies ++= Deps.webGateway)
  .settings(
    buildInfoPackage := "net.flipsports.gmx.widget.argyll.betandwatch.webgateway.info",
    buildInfoKeys := Seq[BuildInfoKey](name, version, scalaVersion, sbtVersion),
    buildInfoOptions += BuildInfoOption.BuildTime,
    buildInfoOptions += BuildInfoOption.ToJson
  )
  .settings(
    packageName in Docker := s"$dockerRegistryGroup/webgateway",
    dockerRepository := Some(dockerRegistry),
    dockerAliases ++= Seq(dockerAlias.value.withTag(Option("latest"))),

    dockerBaseImage := "adoptopenjdk/openjdk12:alpine-jre",
    dockerLabels := Map("project" -> "bet-and-watch", "module" -> "webgateway", "vcs-ref" -> sys.env.getOrElse("VCS_REF", "null")),
    dockerExposedPorts := Seq(9000),

    javaOptions in Universal ++= dockerJavaOps
  )
  .settings(
    //get rid of "Unused import import _root_.controllers.Assets.Asset"
    RoutesKeys.routesImport := Seq.empty
  )