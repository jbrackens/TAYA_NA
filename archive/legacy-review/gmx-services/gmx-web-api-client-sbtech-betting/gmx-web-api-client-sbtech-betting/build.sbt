lazy val `gmx-web-api-client-sbtech-betting` = (project in file("."))
  .enablePlugins(BuildInfoPlugin)
  .settings(commonSettings)
  .settings(libraryDependencies ++= Deps.betting)
  .settings(
    buildInfoPackage := "net.flipsports.gmx.webapiclient.sbtech.betting.info",
    buildInfoKeys := Seq[BuildInfoKey](name, version, scalaVersion, sbtVersion),
    buildInfoOptions += BuildInfoOption.BuildTime,
    buildInfoOptions += BuildInfoOption.ToJson)

val commonSettings = Seq(
  organization := "net.flipsports.gmx.webapiclient.sbtech.betting",
  scalaVersion := Versions.scalaVersion,
  classpathTypes += "maven-plugin",
  aggregate in update := false,
  resolvers ++= Seq(
      "Apache Development Snapshot Repository".at("https://repository.apache.org/content/repositories/snapshots/"),
      "Artima Maven Repository".at("https://repo.artima.com/releases"),
      "FS Maven Repository".at("https://lena-srv01.flipsports.net:4566/repository/maven-group/"),
      Resolver.mavenLocal),
  scalacOptions := Seq(
      "-feature",
      "-unchecked",
      "-deprecation",
      "-encoding",
      "utf8",
      "-language:experimental.macros",
      "-Xlint",
      "-Xmacro-settings:materialize-derivations"),
  publishTo := (isSnapshot.value match {
      case true  => Some("snapshots".at("https://lena-srv01.flipsports.net:4566/repository/maven-snapshots/"))
      case false => Some("releases".at("https://lena-srv01.flipsports.net:4566/repository/maven-releases/"))
    }))
