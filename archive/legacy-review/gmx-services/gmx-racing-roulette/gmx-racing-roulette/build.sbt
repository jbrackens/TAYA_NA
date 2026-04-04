import au.com.onegeek.sbtdotenv.SbtDotenv.autoImport.envFileName
import play.sbt.routes.RoutesKeys


val dockerRegistry = "259420793117.dkr.ecr.eu-west-1.amazonaws.com"
val dockerRegistryGroup = "gmx-racing-roulette"

val commonSettings = Seq(organization := "net.flipsports.gmx.game.argyll.racingroulette",
  scalaVersion := Versions.scalaVersion,
  classpathTypes += "maven-plugin",
  aggregate in update := false,
  resolvers ++= Seq(
    "Apache Development Snapshot Repository".at("https://repository.apache.org/content/repositories/snapshots/"),
    "Artima Maven Repository".at("https://repo.artima.com/releases"),
    "FS Maven Repository".at("https://lena-srv01.flipsports.net:4566/repository/maven-group/"),
    "Confluent" at "https://packages.confluent.io/maven/",
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
  envFileName in ThisBuild := ".env"
)

val dockerJavaOps = Seq(
  "-showversion",
  "-J-XshowSettings:vm",
  "-J-XX:+PrintCommandLineFlags",
  "-server",
  "-J-XX:MaxRAMPercentage=80.0"
)

lazy val `gmx-racing-roulette` = (project in file("."))
  .enablePlugins(SemVerPlugin)
  .settings(commonSettings)
  .aggregate(
    `web-gateway`,
    `utils`
  )

lazy val `web-gateway` = (project in file("web-gateway"))
  .enablePlugins(PlayScala, LagomPlay, AshScriptPlugin, BuildInfoPlugin)
  .disablePlugins(PlayLayoutPlugin)
  .settings(commonSettings)
  .settings(libraryDependencies ++= Deps.webGateway)
  .settings(dependencyOverrides ++= Deps.webGatewayOverride)
  .settings(
    buildInfoPackage := "net.flipsports.gmx.game.argyll.racingroulette.webgateway.info",
    buildInfoKeys := Seq[BuildInfoKey](name, version, scalaVersion, sbtVersion),
    buildInfoOptions += BuildInfoOption.BuildTime,
    buildInfoOptions += BuildInfoOption.ToJson
  )
  .settings(
    packageName in Docker := s"$dockerRegistryGroup/web-gateway",
    dockerRepository := Some(dockerRegistry),
    dockerAliases ++= Seq(dockerAlias.value.withTag(Option("latest"))),

    dockerBaseImage := "adoptopenjdk/openjdk12:alpine-jre",
    dockerLabels := Map("project" -> "racing-roulette", "module" -> "web-gateway", "vcs-ref" -> sys.env.getOrElse("VCS_REF", "null")),
    dockerExposedPorts := Seq(9000),

    javaOptions in Universal ++= dockerJavaOps
  )
  .settings(
    //get rid of "Unused import import _root_.controllers.Assets.Asset"
    RoutesKeys.routesImport := Seq.empty
  )

lazy val `utils` = (project in file("utils"))
  .settings(commonSettings)
  .settings(libraryDependencies ++= Deps.utils)





