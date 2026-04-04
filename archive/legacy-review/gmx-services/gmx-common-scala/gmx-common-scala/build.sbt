lazy val `gmx-common-scala` = (project in file("."))
  .settings(commonSettings)
  .aggregate(
    `common-cache`,
    `common-core`,
    `common-json`,
    `common-play`
  )

lazy val `common-core` = (project in file("common-core"))
  .settings(commonSettings)
  .settings(libraryDependencies ++= Deps.commonCore)

lazy val `common-cache` = (project in file("common-cache"))
  .settings(commonSettings)
  .settings(libraryDependencies ++= Deps.commonCache)

lazy val `common-json` = (project in file("common-json"))
  .settings(commonSettings)
  .settings(libraryDependencies ++= Deps.commonJson)

lazy val `common-play` = (project in file("common-play"))
  .settings(commonSettings)
  .settings(libraryDependencies ++= Deps.commonPlay)


val commonSettings = Seq(
  organization := "net.flipsports.gmx.common.internal.scala",
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
    case true => Some("snapshots".at("https://lena-srv01.flipsports.net:4566/repository/maven-snapshots/"))
    case false => Some("releases".at("https://lena-srv01.flipsports.net:4566/repository/maven-releases/"))
  })
)
